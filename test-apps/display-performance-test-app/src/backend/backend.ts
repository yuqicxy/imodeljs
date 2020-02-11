/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { IModelHost, IModelHostConfiguration, IModelJsFs } from "@bentley/imodeljs-backend";
import { IModelTileRpcInterface, SnapshotIModelRpcInterface, IModelReadRpcInterface, MobileRpcConfiguration } from "@bentley/imodeljs-common";
import * as path from "path";
import { IModelJsConfig } from "@bentley/config-loader/lib/IModelJsConfig";
import { IModelBankClient, Config } from "@bentley/imodeljs-clients";
import { UrlFileHandler } from "@bentley/imodeljs-clients-backend";
import { SVTConfiguration } from "../common/SVTConfiguration";
import "./DisplayPerfRpcImpl"; // just to get the RPC implementation registered
import DisplayPerfRpcInterface from "../common/DisplayPerfRpcInterface";

IModelJsConfig.init(true /* suppress exception */, true /* suppress error message */, Config.App);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // (needed temporarily to use self-signed cert to communicate with iModelBank via https)

export function getRpcInterfaces() {
  return [DisplayPerfRpcInterface, IModelTileRpcInterface, SnapshotIModelRpcInterface, IModelReadRpcInterface];
}

function setupStandaloneConfiguration() {
  const filename = process.env.SVT_STANDALONE_FILENAME;
  if (filename !== undefined) {
    const configuration: any = {};
    configuration.standalone = true;
    configuration.standalonePath = process.env.SVT_STANDALONE_FILEPATH; // optional (browser-use only)
    configuration.viewName = process.env.SVT_STANDALONE_VIEWNAME; // optional
    configuration.iModelName = filename;
    const configPathname = path.normalize(path.join(__dirname, "../webresources", "configuration.json"));
    IModelJsFs.writeFileSync(configPathname, JSON.stringify(configuration));
  }
}

export function initializeBackend() {
  setupStandaloneConfiguration();

  const hostConfig = new IModelHostConfiguration();
  if (!MobileRpcConfiguration.isMobileBackend) {
    // tslint:disable-next-line:no-var-requires
    const configPathname = path.normalize(path.join(__dirname, "../webresources", "configuration.json"));
    const svtConfig: SVTConfiguration = require(configPathname);
    if (svtConfig.customOrchestratorUri)
      hostConfig.imodelClient = new IModelBankClient(svtConfig.customOrchestratorUri, new UrlFileHandler());
  }

  IModelHost.startup(hostConfig);
}
