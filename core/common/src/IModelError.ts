/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModels
 */

import { BentleyStatus, BentleyError, IModelStatus, BriefcaseStatus, GetMetaDataFunction, LogFunction, DbResult, AuthStatus, RepositoryStatus, ChangeSetStatus, RpcInterfaceStatus } from "@bentley/bentleyjs-core";
export { BentleyStatus, BentleyError, IModelStatus, BriefcaseStatus, GetMetaDataFunction, LogFunction, DbResult, AuthStatus, RepositoryStatus, ChangeSetStatus, RpcInterfaceStatus } from "@bentley/bentleyjs-core";

/** The error type thrown by this module. See [[IModelStatus]] for `errorNumber` values.
 * @public
 */
export class IModelError extends BentleyError {
  public constructor(errorNumber: number | IModelStatus | DbResult | BentleyStatus | BriefcaseStatus | RepositoryStatus | ChangeSetStatus | RpcInterfaceStatus | AuthStatus, message: string, log?: LogFunction, category?: string, getMetaData?: GetMetaDataFunction) {
    super(errorNumber, message, log, category, getMetaData);
  }
}

/** @public */
export class ServerError extends IModelError {
  public constructor(errorNumber: number, message: string, log?: LogFunction) {
    super(errorNumber, message, log);
    this.name = "Server error (" + errorNumber + ")";
  }
}

/** @public */
export class ServerTimeoutError extends ServerError {
  public constructor(message: string, log?: LogFunction) {
    super(IModelStatus.ServerTimeout, message, log);
    this.name = "Server timeout error";
  }
}

/** @public */
export class BackendError extends IModelError {
  public constructor(errorNumber: number, name: string, message: string, log?: LogFunction, category?: string, getMetaData?: GetMetaDataFunction) {
    super(errorNumber, message, log, category, getMetaData);
    this.name = name;
  }
}
