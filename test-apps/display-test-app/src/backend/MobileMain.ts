/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { IModelTileRpcInterface, SnapshotIModelRpcInterface, IModelReadRpcInterface, MobileRpcManager } from "@bentley/imodeljs-common";
import { initializeBackend } from "./backend";
import SVTRpcInterface from "../common/SVTRpcInterface";
// tslint:disable:no-console

export function getRpcInterfaces() {
  return [IModelTileRpcInterface, SnapshotIModelRpcInterface, IModelReadRpcInterface, SVTRpcInterface];
}

// Initialize the backend
initializeBackend();
MobileRpcManager.initializeImpl(getRpcInterfaces());
