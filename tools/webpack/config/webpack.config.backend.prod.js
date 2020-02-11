/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
"use strict";

const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const paths = require("./paths");
const helpers = require("./helpers");

// Webpack uses `publicPath` to determine where the app is being served from.
// It requires a trailing slash, or the file assets will get an incorrect path.
const publicPath = paths.servedPath;

// We'll exclude web backend source in an electron build and electron backend source in a web build
let excludedDirs = [];
if (process.env.ELECTRON_ENV === "production")
  excludedDirs.push(paths.appSrcBackendWeb)
else
  excludedDirs.push(paths.appSrcBackendElectron)

// If these paths don't end in "/" (or "\"), they'll also exclude files beginning with "web" or "electron"
excludedDirs = excludedDirs.map((p) => path.normalize(p + path.sep));

const baseConfiguration = require("./webpack.config.backend.base")(publicPath);

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
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: path.join(__dirname, "strip-assert-loader.js"),
        enforce: "pre",
      },
      // Exclude web backend source in an electron build; electron backend source in a web build
      {
        test: /\.(t|j)sx?$/,
        loader: require.resolve("null-loader"),
        include: excludedDirs,
      },
    ],
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
});

module.exports = helpers.getCustomizedWebpackConfig(paths.appWebpackConfigBackend, config);
