/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
"use strict";

const paths = require("./paths");
const helpers = require("./helpers");

const baseConfiguration = require("./webpack.config.test");

module.exports = helpers.mergeWebpackConfigs(baseConfiguration, {
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        include: paths.appSrc, // instrument only testing sources with Istanbul, after ts-loader runs
        exclude: helpers.modulesToExcludeFromTests,
        loader: require.resolve("istanbul-instrumenter-loader"),
        options: {
          esModules: true,
          debug: true
        },
        enforce: "post",
      },
    ]
  }
});
