/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Logging
 */

/** Logger categories used by this package
 * @note All logger categories in this package start with the `imodeljs-clients` prefix.
 * @see [Logger]($bentley)
 * @public
 */
export enum ClientsBackendLoggerCategory {
  /** The logger category used for interactions with iModelHub.
   * @note Should match ClientsBackendLoggerCategory.IModelHub from @bentley/imodeljs-clients.
   */
  IModelHub = "imodeljs-clients.imodelhub",

  /** The logger category used by OidcDeviceClient */
  OidcDeviceClient = "imodeljs-clients-backend.OidcDeviceClient",

  /** The logger category used by OidcAgentClient */
  OidcAgentClient = "imodeljs-clients-backend.OidcAgentClient",

  /** The logger category used by OidcDesktopClient */
  OidcDesktopClient = "imodeljs-clients.OidcDesktopClient",
}
