/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
export * from "./ECJsonTypeMap";
export * from "./Client";
export * from "./Config";
export * from "./Token";
export * from "./AuthorizationClient";
export * from "./UserInfo";
export * from "./ConnectClients";
export * from "./WsgClient";
export * from "./FileHandler";
export * from "./IModelClient";
export * from "./ImsClients";
export * from "./ClientsLoggerCategory";
export * from "./Config";
export * from "./projectshare/ProjectShareClient";
export * from "./Request";
export * from "./RealityDataServicesClient";
export * from "./SettingsAdmin";
export * from "./SettingsClient";
export * from "./AuthorizedClientRequestContext";
export * from "./WsgQuery";

export * from "./imodelbank/IModelBankClient";
export * from "./imodelbank/IModelBankHandler";
export * from "./imodelbank/IModelBankFileSystemContextClient";

export * from "./imodelhub/BaseHandler";
export * from "./imodelhub/Client";
export * from "./imodelhub/HubQuery";
export * from "./imodelhub/Errors";
export * from "./imodelhub/Briefcases";
export * from "./imodelhub/ChangeSets";
export * from "./imodelhub/Checkpoints";
export * from "./imodelhub/Codes";
export * from "./imodelhub/Events";
export * from "./imodelhub/GlobalEvents";
export * from "./imodelhub/iModels";
export * from "./imodelhub/Locks";
export * from "./imodelhub/Users";
export * from "./imodelhub/Versions";
export * from "./imodelhub/Thumbnails";

export * from "./oidc/OidcClient";
export * from "./oidc/OidcFrontendClient";

export * from "./ulas/LogEntryConverter";
export * from "./ulas/UlasClient";

// Set the version number so it can be found at runtime. BUILD_SEMVER is replaced at build time by the webpack DefinePlugin.
declare var BUILD_SEMVER: string;
if ((typeof (BUILD_SEMVER) !== "undefined") && (typeof window !== "undefined") && window) {
  if (!(window as any).iModelJsVersions)
    (window as any).iModelJsVersions = new Map<string, string>();
  (window as any).iModelJsVersions.set("imodeljs-clients", BUILD_SEMVER);
}

/** @docs-package-description
 * The imodeljs-clients package allows sending requests to various CONNECT services.
 *
 * It works both on [backend]($docs/learning/backend/index.md) and [frontend]($docs/learning/frontend/index.md).
 */
/**
 * @docs-group-description Configuration
 * Class for easily managing configuration variables for an iModel.js application.
 */
/**
 * @docs-group-description Authentication
 * Classes for managing [AccessToken]($clients) used for all requests in other classes.
 */
/**
 * @docs-group-description iTwinServiceClients
 * Classes for communicating with various iTwin services.
 */

/**
 * @docs-group-description iModelHubClient
 * Classes for communicating directly with [iModelHub]($docs/learning/iModelHub/index.md).
 */
/**
 * @docs-group-description Logging
 * Logger categories used by this package.
 */
