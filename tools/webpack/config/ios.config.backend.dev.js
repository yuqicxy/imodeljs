/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
"use strict";

const webpack = require("webpack");
const paths = require("./paths");
const helpers = require("./helpers");

// Webpack uses `publicPath` to determine where the app is being served from.
// It requires a trailing slash, or the file assets will get an incorrect path.
// In development, we always serve from the root. This makes config easier.
const publicPath = "/";

const baseConfiguration = require("./webpack.config.backend.base")(publicPath);

//======================================================================================================================================
// This is the DEVELOPMENT configuration.
// It is focused on developer experience and fast rebuilds.
//======================================================================================================================================
const config = helpers.mergeWebpackConfigs(baseConfiguration, {
  mode: "development",
  // You may want "eval" instead if you prefer to see the compiled output in DevTools.
  // See the discussion in https://github.com/facebook/create-react-app/issues/343.
  devtool: "cheap-module-source-map",
  externals: {
    // This is needed to install electron devtools extensions.
    "7zip": "7zip",
    "electron":"electron",
    "fs":"fs",
    "net":"net",
    "./IModelJsFs": "IModelJsFs",
    "../IModelJsFs": "IModelJsFs",
    "../../IModelJsFs": "IModelJsFs",
  },
  target: "webworker",
  output: {
    // Add /* filename */ comments to generated require()s in the output.
    pathinfo: true,
  },
  plugins: [
    // Add module names to factory functions so they appear in browser profiler.
    new webpack.NamedModulesPlugin(),
    // If you require a missing module and then `npm install` it, you still have
    // to restart the development server for Webpack to discover it. This plugin
    // makes the discovery automatic so you don't have to restart.
    // See https://github.com/facebook/create-react-app/issues/186
    // FIXME: new WatchMissingNodeModulesPlugin(paths.appNodeModules),
  ],
  // Turn off performance hints during development because we don't do any
  // splitting or minification in interest of speed. These warnings become
  // cumbersome.
  performance: {
    hints: false,
  },
});

module.exports = helpers.getCustomizedWebpackConfig(paths.appWebpackConfigBackend, config);