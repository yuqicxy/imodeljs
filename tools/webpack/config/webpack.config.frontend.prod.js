/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
"use strict";

const autoprefixer = require("autoprefixer");
const path = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require("webpack-manifest-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const paths = require("./paths");
const helpers = require("./helpers");

// Webpack uses `publicPath` to determine where the app is being served from.
// It requires a trailing slash, or the file assets will get an incorrect path.
const publicPath = paths.servedPath;

const baseConfiguration = require("./webpack.config.frontend.base")(publicPath);

//======================================================================================================================================
// This is the PRODUCTION configuration.
// It compiles slowly and is focused on producing a fast and minimal bundle.
//======================================================================================================================================
const config = helpers.mergeWebpackConfigs(baseConfiguration, {
  mode: "production",
  // Don't attempt to continue if there are any errors.
  bail: true,
  // We generate sourcemaps in production. This is slow but gives good results.
  // You can exclude the *.map files from the build during deployment.
  devtool: (process.env.DISABLE_SOURCE_MAPS) ? false : "source-map",
  // In production, we only want to load the polyfills and the app code.
  entry: [require.resolve("./polyfills"), paths.appIndexJs],
  output: {
    // Generated JS file names (with nested folders).
    // There will be one main bundle, and one file per asynchronous chunk.
    // We don't currently advertise code splitting but Webpack supports it.
    filename: "static/js/[name].[chunkhash:8].js",
    chunkFilename: "static/js/[name].[chunkhash:8].chunk.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: path.join(__dirname, "strip-assert-loader.js"),
        enforce: "pre",
      },
      // "postcss" loader applies autoprefixer to our CSS.
      // "css" loader resolves paths in CSS and adds assets as dependencies.
      // `MiniCSSExtractPlugin` extracts styles into CSS files.
      // If you use code splitting, async bundles will have their own separate CSS chunk file.
      {
        test: /\.s?css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: require.resolve('css-loader'),
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          },
          {
            loader: require.resolve('postcss-loader'),
            options: {
              // Necessary for external CSS imports to work
              // https://github.com/facebook/create-react-app/issues/2677
              ident: "postcss",
              plugins: () => [
                require("cssnano"),
                require("postcss-flexbugs-fixes"),
                autoprefixer({
                  browsers: [
                    ">1%",
                    "last 4 versions",
                    "Firefox ESR",
                    "not ie < 9", // React doesn't support IE8 anyway
                  ],
                  flexbox: "no-2009",
                }),
              ],
            },
          },
        ],
      }
    ]
  },
  optimization: {
    // Minify the code.
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          ecma: 8,
          mangle: {
            safari10: true,
            // NEEDSWORK: Mangling classnames appears to break gateway marshalling...
            keep_classnames: true,
          },
          compress: {
            warnings: false,
            // Disabled because of an issue with Uglify breaking seemingly valid code:
            // https://github.com/facebook/create-react-app/issues/2376
            // Pending further investigation:
            // https://github.com/mishoo/UglifyJS2/issues/2011
            comparisons: false,
            // Compressing classnames also breaks reflection
            keep_classnames: true,
          },
          output: {
            comments: false,
            // Turned on because emoji and regex is not minified properly using default
            // https://github.com/facebook/create-react-app/issues/2488
            ascii_only: true,
          },
        },
        // Use multi-process parallel running to improve the build speed
        // Default number of concurrent runs: os.cpus().length - 1
        parallel: true,
        // Enable file caching
        cache: true,
        sourceMap: true,
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: 'static/css/[name].[chunkhash:8].css',
      chunkFilename: 'static/css/[name].[chunkhash:8].chunk.css',
    }),
    // Generate a manifest file which contains a mapping of all asset filenames
    // to their corresponding output file so that tools can pick it up without
    // having to parse `index.html`.
    new ManifestPlugin({
      fileName: "asset-manifest.json",
      publicPath: publicPath,
    }),
  ],
});

module.exports = helpers.getCustomizedWebpackConfig(paths.appWebpackConfigFrontend, config);
