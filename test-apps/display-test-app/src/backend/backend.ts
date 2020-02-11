/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { IModelHost, IModelHostConfiguration } from "@bentley/imodeljs-backend";
import { Logger, LogLevel } from "@bentley/bentleyjs-core";
import {
  IModelReadRpcInterface,
  IModelTileRpcInterface,
  MobileRpcConfiguration,
  NativeAppRpcInterface,
  SnapshotIModelRpcInterface,
} from "@bentley/imodeljs-common";
import * as fs from "fs";
import * as path from "path";
import { IModelJsConfig } from "@bentley/config-loader/lib/IModelJsConfig";
import { IModelBankClient, Config } from "@bentley/imodeljs-clients";
import { UrlFileHandler } from "@bentley/imodeljs-clients-backend";
import { SVTConfiguration } from "../common/SVTConfiguration";
import "./SVTRpcImpl"; // just to get the RPC implementation registered
import SVTRpcInterface from "../common/SVTRpcInterface";
import { FakeTileCacheService } from "./FakeTileCacheService";

IModelJsConfig.init(true /* suppress exception */, true /* suppress error message */, Config.App);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // (needed temporarily to use self-signed cert to communicate with iModelBank via https)

export function getRpcInterfaces() {
  return [IModelTileRpcInterface, SnapshotIModelRpcInterface, IModelReadRpcInterface, SVTRpcInterface, NativeAppRpcInterface];
}

function setupStandaloneConfiguration(): SVTConfiguration {
  const configuration: SVTConfiguration = {};
  if (MobileRpcConfiguration.isMobileBackend)
    return configuration;

  // Currently display-test-app ONLY supports opening files from local disk - i.e., "standalone" mode.
  // At some point we will reinstate ability to open from hub.
  configuration.standalone = true;
  configuration.iModelName = process.env.SVT_STANDALONE_FILENAME;
  configuration.standalonePath = process.env.SVT_STANDALONE_FILEPATH; // optional (browser-use only)
  configuration.viewName = process.env.SVT_STANDALONE_VIEWNAME; // optional

  if (undefined !== process.env.SVT_DISABLE_DIAGNOSTICS)
    configuration.enableDiagnostics = false;

  if (undefined !== process.env.SVT_STANDALONE_SIGNIN)
    configuration.signInForStandalone = true;

  if (undefined !== process.env.SVT_DISABLE_INSTANCING)
    configuration.disableInstancing = true;

  if (undefined !== process.env.SVT_IMPROVED_ELISION)
    configuration.enableImprovedElision = true;

  if (undefined !== process.env.SVT_DISABLE_MAGNIFICATION)
    configuration.disableMagnification = true;

  configuration.useProjectExtents = undefined === process.env.SVT_NO_USE_PROJECT_EXTENTS;
  const treeExpiration = process.env.SVT_TILETREE_EXPIRATION_SECONDS;
  if (undefined !== treeExpiration)
    try {
      configuration.tileTreeExpirationSeconds = Number.parseInt(treeExpiration, 10);
    } catch (_) {
      //
    }

  if (undefined !== process.env.SVT_DISABLE_LOG_Z)
    configuration.logarithmicZBuffer = false;

  if (undefined !== process.env.SVT_ENABLE_MAP_TEXTURE_FILTER)
    configuration.filterMapTextures = true;

  if (undefined !== process.env.SVT_DISABLE_MAP_DRAPE_TEXTURE_FILTER)
    configuration.filterMapDrapeTextures = false;

  if (undefined !== process.env.SVT_PRESERVE_SHADER_SOURCE_CODE)
    configuration.preserveShaderSourceCode = true;

  if (undefined !== process.env.SVT_DISABLE_DPI_AWARE_VIEWPORTS)
    configuration.dpiAwareViewports = false;

  if (undefined !== process.env.SVT_NO_CANCEL_TILE_REQUESTS)
    configuration.cancelBackendTileRequests = false;

  const extensions = process.env.SVT_DISABLED_EXTENSIONS;
  if (undefined !== extensions)
    configuration.disabledExtensions = extensions.split(";");

  configuration.useFakeCloudStorageTileCache = undefined !== process.env.SVT_FAKE_CLOUD_STORAGE;

  const configPathname = path.normalize(path.join(__dirname, "../webresources", "configuration.json"));
  fs.writeFileSync(configPathname, JSON.stringify(configuration), "utf8");

  return configuration;
}

export function initializeBackend() {
  const svtConfig = setupStandaloneConfiguration();

  const hostConfig = new IModelHostConfiguration();
  hostConfig.logTileLoadTimeThreshold = 3;
  hostConfig.logTileSizeThreshold = 500000;

  let logLevel = LogLevel.None;
  if (MobileRpcConfiguration.isMobileBackend) {
    // Does not seem SVTConfiguraiton is used anymore.
  } else {
    if (svtConfig.customOrchestratorUri)
      hostConfig.imodelClient = new IModelBankClient(svtConfig.customOrchestratorUri, new UrlFileHandler());

    if (svtConfig.useFakeCloudStorageTileCache)
      hostConfig.tileCacheCredentials = { service: "external", account: "", accessKey: "" };

    const logLevelEnv = process.env.SVT_LOG_LEVEL as string;
    if (undefined !== logLevelEnv)
      logLevel = Logger.parseLogLevel(logLevelEnv);
  }

  IModelHost.startup(hostConfig);

  // Set up logging (by default, no logging is enabled)
  Logger.initializeToConsole();
  Logger.setLevelDefault(logLevel);
  Logger.setLevel("SVT", LogLevel.Trace);

  if (svtConfig.useFakeCloudStorageTileCache)
    IModelHost.tileCacheService = new FakeTileCacheService(path.normalize(path.join(__dirname, "../webresources", "tiles/")));
}
