/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

// This is all required to simulate a browser environment in React tests.
const jsdom = require("jsdom");
const document = new jsdom.JSDOM("", { url: "http://localhost/" });
const window = document.window;

global.document = window.document
global.window = window
window.console = global.console

Object.keys(window).forEach((property) => {
  if (typeof global[property] === "undefined") {
    global[property] = window[property];
  }
});

global.navigator = {
  userAgent: "node.js"
};

// polyfill requestAnimationFrame to avoid a react warning
global.requestAnimationFrame = function (callback) {
  setTimeout(callback, 0)
}