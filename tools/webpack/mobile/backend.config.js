/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

const path = require("path");
const webpack = require("webpack");
module.exports = (env) => {
  return getConfig(env);
};

function getConfig(env) {
  // set sourcedir if not specified in arguments.
  if (!env.sourcedir)
    env.sourcedir = "./";

  if (!env.outdir)
    env.outdir = "./lib/module" + (env.prod ? "/prod" : "/dev");

  // get the directory for the bundle.
  const bundleDirectory = path.resolve(env.sourcedir, env.outdir);

  // unless specified with env.prod, create a development build.
  const devMode = !(env.prod);

  // this is the "barrel" file of the module, which imports all of the sources.
  const bundleEntry = env.entry;

  // name of the output bundle.
  const bundleName = env.bundlename;

  const webConfig = {
    mode: devMode ? "development" : "production",
    entry: bundleEntry,
    output: {
      libraryTarget: "commonjs2",
      library: bundleName,
      path: bundleDirectory,
      pathinfo: true,
    },
    target: "webworker",
    devtool: "source-map",
    module: {
      rules: [{
        test: /growl\.js$/,
        use: 'null-loader'
      },
      {
        test: /xunit\.js$/,
        use: 'null-loader'
      },
      {
        test: /bunyan/,
        use: 'null-loader'
      },
      {
        test: /@azure/,
        use: 'null-loader'
      },
      {
        test: /IModelBankCloudEnv\.js$/,
        use: 'null-loader'
      },
      {
        test: /DevTools\.js$/,
        use: 'null-loader'
      },
      {
        test: /OidcDesktopClient\.js$/,
        use: 'null-loader'
      },
      {
        test: /oidc-signin-tool/,
        use: 'null-loader'
      },
      {
        test: /AzCopy\.js$/,
        use: 'null-loader'
      },
      ]
    },
    externals: {
      "@bentley/imodeljs-native/package.json": "@bentley/imodeljs-native/package.json",
      "@bentley/imodeljs-native/loadNativePlatform.js": "@bentley/imodeljs-native/loadNativePlatform.js",
      "electron": "electron",
      "IModelJsFs": "IModelJsFs",
      "./IModelJsFs": "IModelJsFs",
      "../IModelJsFs": "IModelJsFs",
      "../../IModelJsFs": "IModelJsFs",
      "./lib/IModelJsFs.js": "IModelJsFs",
      "fs": "fs",
      "fs-extra": "fs",
      "express": "express",
    },
    stats: {
      warnings: false
    },
    node: {
      fs: false,
      console: false,
      process: false,
      Buffer: true,
    },
    plugins: [
      new webpack.DefinePlugin({ "global.location.search": "''" }),
      new webpack.ProvidePlugin({}),
      new webpack.EnvironmentPlugin({})
    ],
  };

  return webConfig;
}