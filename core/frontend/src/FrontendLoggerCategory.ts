/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Logging
 */

/** Logger categories used by this package
 * @note All logger categories in this package start with the `imodeljs-frontend` prefix.
 * @see [Logger]($bentley)
 * @public
 */
export enum FrontendLoggerCategory {
  Package = "imodeljs-frontend",

  /** The logger category used by the [[FrontendRequestContext]] class and other related classes. */
  FrontendRequestContext = "imodeljs-frontend.FrontendRequestContext",

  /** The logger category used by the [[IModelConnection]] class and other related classes. */
  IModelConnection = "imodeljs-frontend.IModelConnection",

  /** The logger category used by OIDC-related functions in the browser.
   * @deprecated
   */
  OidcBrowserClient = "imodeljs-frontend.OidcBrowserClient",

  /** The logger category used by OIDC-related functions on iOS. */
  OidcIOSClient = "imodeljs-frontend.OidcIOSClient",

  /** The logger category used by EventSource */
  EventSource = "imodeljs-frontend.EventSource",

  /** The logger category used for general authorization purposes */
  Authorization = "imodeljs-frontend.Authorization",

  /** The logger category used by feature-flag-related functions */
  FeatureToggle = "imodeljs-frontend.FeatureToggles",
}
