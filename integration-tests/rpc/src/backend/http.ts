/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { BentleyCloudRpcManager } from "@bentley/imodeljs-common";
import { rpcInterfaces } from "../common/TestRpcInterface";
import { IModelJsExpressServer } from "@bentley/express-server";

import { registerBackendCallback } from "@bentley/certa/lib/utils/CallbackUtils";
import { BackendTestCallbacks } from "../common/SideChannels";
import "./CommonBackendSetup";

registerBackendCallback(BackendTestCallbacks.getEnvironment, () => "http");

async function init() {
  const rpcConfig = BentleyCloudRpcManager.initializeImpl({ info: { title: "rpc-integration-test", version: "v1.0" } }, rpcInterfaces);

  // create a basic express web server
  const port = Number(process.env.CERTA_PORT || 3021) + 2000;
  const server = new IModelJsExpressServer(rpcConfig.protocol);
  await server.initialize(port);
  // tslint:disable-next-line:no-console
  console.log("Web backend for integration-tests listening on port " + port);
}

module.exports = init();
