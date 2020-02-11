/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import * as path from "path";
import * as chai from "chai";
import { Base64 } from "js-base64";
import { GuidString, Guid, Id64, Id64String, ClientRequestContext, Logger, WSStatus } from "@bentley/bentleyjs-core";
import {
  ECJsonTypeMap, AccessToken, UserInfo, Project, Asset, ProgressInfo,
  IModelHubClient, HubCode, CodeState, MultiCode, Briefcase, BriefcaseQuery, ChangeSet, Version,
  Thumbnail, SmallThumbnail, LargeThumbnail, IModelQuery, LockType, LockLevel,
  MultiLock, Lock, VersionQuery, Config, IModelBaseHandler,
  IModelBankClient, IModelBankFileSystemContextClient, AuthorizedClientRequestContext,
  ImsUserCredentials,
  WsgError,
} from "@bentley/imodeljs-clients";
import { AzureFileHandler } from "../../imodelhub/AzureFileHandler";
import { IModelCloudEnvironment } from "@bentley/imodeljs-clients/lib/IModelCloudEnvironment";
import { ResponseBuilder, RequestType, ScopeType, UrlDiscoveryMock } from "../ResponseBuilder";
import { TestConfig } from "../TestConfig";
import { TestUsers } from "../TestUsers";
import { TestIModelHubCloudEnv } from "./IModelHubCloudEnv";
import { getIModelBankCloudEnv } from "./IModelBankCloudEnv";
import { MobileRpcConfiguration } from "@bentley/imodeljs-common";
import { IOSAzureFileHandler } from "../../imodelhub/IOSAzureFileHandler";
import { UrlFileHandler } from "../../UrlFileHandler";
import { LocalhostHandler } from "../../imodelhub/LocalhostFileHandler";

const loggingCategory = "imodeljs-clients-backend.TestUtils";

const bankProjects: string[] = [];

function configMockSettings() {
  if (!TestConfig.enableMocks)
    return;

  Config.App.set("imjs_imodelhub_url", "https://mockimodelhub.com");
  Config.App.set("imjs_buddi_url", "https://mockbuddi.com");
  Config.App.set("imjs_buddi_resolve_url_using_region", 0);
  Config.App.set("imjs_test_serviceAccount1_user_name", "test");
  Config.App.set("imjs_test_serviceAccount1_user_password", "test");
  Config.App.set("imjs_test_manager_user_name", "test");
  Config.App.set("imjs_test_manager_user_password", "test");
}
export function createFileHanlder(useDownloadBuffer?: boolean) {
  if (MobileRpcConfiguration.isMobileBackend) {
    return new IOSAzureFileHandler();
  } else if (TestConfig.enableIModelBank && !TestConfig.enableMocks) {
    return createIModelBankFileHandler(useDownloadBuffer);
  }
  return new AzureFileHandler(useDownloadBuffer);
}

export function createIModelBankFileHandler(useDownloadBuffer?: boolean) {
  const handler = Config.App.getString("imjs_test_imodel_bank_file_handler", "url");
  switch (handler.toLowerCase()) {
    case "azure":
      return new AzureFileHandler(useDownloadBuffer);
    case "localhost":
      return new LocalhostHandler();
    case "url":
      return new UrlFileHandler();
    default:
      throw new Error(`File handler '${handler}' is not supported.`);
  }
}

export function getExpectedFileHandlerUrlSchemes(): string[] {
  const handler = Config.App.getString("imjs_test_imodel_bank_file_handler", "url");
  switch (handler.toLowerCase()) {
    case "localhost":
      return ["file://"];
    default:
      return ["https://", "http://"];
  }
}

export function doesMatchExpectedUrlScheme(url?: string) {
  if (!url)
    return false;

  const expectedSchemes = getExpectedFileHandlerUrlSchemes();
  for (const scheme of expectedSchemes)
    if (url!.startsWith(scheme))
      return true;

  return false;
}

export function removeFileUrlExpirationTimes(changesets: ChangeSet[]) {
  for (const cs of changesets) {
    cs.downloadUrl = removeFileUrlExpirationTime(cs.downloadUrl);
    cs.uploadUrl = removeFileUrlExpirationTime(cs.uploadUrl);
  }
  return changesets;
}

function removeFileUrlExpirationTime(url?: string) {
  if (!url)
    return url;
  if (url.toLowerCase().startsWith("http")) {
    const index = url.indexOf("?");
    if (index > 0)
      return url.substring(0, index);
  }
  return url;
}

/** Other services */
export class MockAccessToken extends AccessToken {
  public constructor() {
    super();
    this._samlAssertion = "";
  }

  public getUserInfo(): UserInfo | undefined {
    const id = "596c0d8b-eac2-46a0-aa4a-b590c3314e7c";
    const email = { id: "testuser001@mailinator.com" };
    const profile = { firstName: "test", lastName: "user" };
    const organization = { id: "fefac5b-bcad-488b-aed2-df27bffe5786", name: "Bentley" };
    const featureTracking = { ultimateSite: "1004144426", usageCountryIso: "US" };
    return new UserInfo(id, email, profile, organization, featureTracking);
  }

  public toTokenString() { return ""; }
}

export type RequestBehaviorOptionsList =
  "DoNotScheduleRenderThumbnailJob" |
  "DisableGlobalEvents" |
  "DisableNotifications";

export class RequestBehaviorOptions {
  private _currentOptions: RequestBehaviorOptionsList[] = this.getDefaultOptions();

  private getDefaultOptions(): RequestBehaviorOptionsList[] {
    return ["DoNotScheduleRenderThumbnailJob", "DisableGlobalEvents", "DisableNotifications"];
  }

  public resetDefaultBehaviorOptions(): void {
    this._currentOptions = this.getDefaultOptions();
  }

  public enableBehaviorOption(option: RequestBehaviorOptionsList) {
    if (!this._currentOptions.find((el) => el === option)) {
      this._currentOptions.push(option);
    }
  }
  public disableBehaviorOption(option: RequestBehaviorOptionsList) {
    const foundIdx: number = this._currentOptions.findIndex((el) => el === option);
    if (-1 < foundIdx) {
      this._currentOptions.splice(foundIdx, 1);
    }
  }

  public toCustomRequestOptions(): { [index: string]: string } {
    return { BehaviourOptions: this._currentOptions.join(",") };
  }
}

const requestBehaviorOptions = new RequestBehaviorOptions();

let _imodelHubClient: IModelHubClient;
function getImodelHubClient() {
  if (_imodelHubClient !== undefined)
    return _imodelHubClient;
  _imodelHubClient = new IModelHubClient(createFileHanlder());
  if (!TestConfig.enableMocks) {
    _imodelHubClient.requestOptions.setCustomOptions(requestBehaviorOptions.toCustomRequestOptions());
  }
  return _imodelHubClient;
}

let _imodelBankClient: IModelBankClient;

export class IModelHubUrlMock {
  public static getUrl(): string {
    configMockSettings();
    return Config.App.get("imjs_imodelhub_url", "");
  }

  public static mockGetUrl() {
    if (!TestConfig.enableMocks)
      return;
    const url = IModelHubUrlMock.getUrl();
    UrlDiscoveryMock.mockGetUrl(IModelBaseHandler.searchKey, Config.App.get("imjs_buddi_resolve_url_using_region"), url);
  }
}

export function getDefaultClient() {
  IModelHubUrlMock.mockGetUrl();
  return getCloudEnv().isIModelHub ? getImodelHubClient() : _imodelBankClient;
}

export function getRequestBehaviorOptionsHandler(): RequestBehaviorOptions {
  return requestBehaviorOptions;
}

export const assetsPath = __dirname + "/../../../lib/test/assets/";
export const workDir = __dirname + "/../../../lib/test/output/";

/**
 * Generates request URL.
 * @param scope Specifies scope.
 * @param id Specifies scope id.
 * @param className Class name that request is sent to.
 * @param query Request query.
 * @returns Created URL.
 */
export function createRequestUrl(scope: ScopeType, id: string | GuidString, className: string, query?: string): string {
  let requestUrl: string = "/sv1.1/Repositories/";

  switch (scope) {
    case ScopeType.iModel:
      requestUrl += `iModel--${id}/iModelScope/`;
      break;
    case ScopeType.Context:
      requestUrl += `Context--${id}/ContextScope/`;
      break;
    case ScopeType.Global:
      requestUrl += "Global--Global/GlobalScope/";
      break;
  }

  requestUrl += className + "/";
  if (query !== undefined) {
    requestUrl += query;
  }

  return requestUrl;
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(userCredentials?: ImsUserCredentials): Promise<AccessToken> {
  if (TestConfig.enableMocks)
    return new MockAccessToken();

  userCredentials = userCredentials || TestUsers.regular;
  return getCloudEnv().authorization.authorizeUser(new ClientRequestContext(), undefined, userCredentials);
}

export async function bootstrapBankProject(requestContext: AuthorizedClientRequestContext, projectName: string): Promise<void> {
  if (getCloudEnv().isIModelHub || bankProjects.includes(projectName))
    return;

  const bankContext = getCloudEnv().contextMgr as IModelBankFileSystemContextClient;
  let project: Project | undefined;
  try {
    project = await bankContext.queryProjectByName(requestContext, projectName);
  } catch (err) {
    if (err instanceof WsgError && err.errorNumber === WSStatus.InstanceNotFound) {
      project = undefined;
    } else {
      throw err;
    }
  }
  if (!project)
    await bankContext.createContext(requestContext, projectName);

  bankProjects.push(projectName);
}

export async function getAssetId(requestContext: AuthorizedClientRequestContext, assetName?: string): Promise<string> {
  if (TestConfig.enableMocks)
    return Guid.createValue();

  assetName = assetName || TestConfig.assetName;

  await bootstrapBankProject(requestContext, assetName);

  const asset: Asset = await getCloudEnv().contextMgr.queryAssetByName(requestContext, assetName);

  if (!asset || !asset.wsgId)
    return Promise.reject(`Asset with name ${assetName} doesn't exist.`);

  return asset.wsgId;
}

export async function getProjectId(requestContext: AuthorizedClientRequestContext, projectName?: string): Promise<string> {
  if (TestConfig.enableMocks)
    return Guid.createValue();

  projectName = projectName || TestConfig.projectName;

  await bootstrapBankProject(requestContext, projectName);

  const project: Project = await getCloudEnv().contextMgr.queryProjectByName(requestContext, projectName);

  if (!project || !project.wsgId)
    return Promise.reject(`Project with name ${TestConfig.projectName} doesn't exist.`);

  return project.wsgId;
}

/** iModels */
export async function deleteIModelByName(requestContext: AuthorizedClientRequestContext, contextId: string, imodelName: string): Promise<void> {
  if (TestConfig.enableMocks)
    return;

  const client = getDefaultClient();
  const imodels = await client.iModels.get(requestContext, contextId, new IModelQuery().byName(imodelName));

  for (const imodel of imodels) {
    await client.iModels.delete(requestContext, contextId, imodel.id!);
  }
}

export async function getIModelId(requestContext: AuthorizedClientRequestContext, imodelName: string): Promise<GuidString> {
  if (TestConfig.enableMocks)
    return Guid.createValue();

  const projectId = await getProjectId(requestContext);

  const client = getDefaultClient();
  const imodels = await client.iModels.get(requestContext, projectId, new IModelQuery().byName(imodelName));

  if (!imodels[0] || !imodels[0].id)
    return Promise.reject(`iModel with name ${imodelName} doesn't exist.`);

  return imodels[0].id!;
}

export function mockFileResponse(times = 1) {
  if (TestConfig.enableMocks)
    ResponseBuilder.mockFileResponse("https://imodelhubqasa01.blob.core.windows.net", "/imodelhubfile", getMockSeedFilePath(), times);
}

export function getMockFileSize(): string {
  return fs.statSync(getMockSeedFilePath()).size.toString();
}

export function mockUploadFile(imodelId: GuidString, chunks = 1) {
  for (let i = 0; i < chunks; ++i) {
    const blockId = Base64.encode(i.toString(16).padStart(5, "0"));
    ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Put, `/imodelhub-${imodelId}/123456&comp=block&blockid=${blockId}`);
  }
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Put, `/imodelhub-${imodelId}/123456&comp=blocklist`);
}

/** Briefcases */
export async function getBriefcases(requestContext: AuthorizedClientRequestContext, imodelId: GuidString, count: number): Promise<Briefcase[]> {
  if (TestConfig.enableMocks) {
    let briefcaseId = 2;
    const fileId: GuidString = Guid.createValue();
    return Array(count).fill(0).map(() => {
      const briefcase = new Briefcase();
      briefcase.briefcaseId = briefcaseId++;
      briefcase.fileId = fileId;
      return briefcase;
    });
  }

  const client = getDefaultClient();
  let briefcases = await client.briefcases.get(requestContext, imodelId, new BriefcaseQuery().ownedByMe());
  if (briefcases.length < count) {
    for (let i = 0; i < count - briefcases.length; ++i) {
      await client.briefcases.create(requestContext, imodelId);
    }
    briefcases = await client.briefcases.get(requestContext, imodelId, new BriefcaseQuery().ownedByMe());
  }
  return briefcases;
}

export function generateBriefcase(id: number): Briefcase {
  const briefcase = new Briefcase();
  briefcase.briefcaseId = id;
  briefcase.wsgId = id.toString();
  return briefcase;
}

export function mockGetBriefcase(imodelId: GuidString, ...briefcases: Briefcase[]) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Briefcase");
  const requestResponse = ResponseBuilder.generateGetArrayResponse<Briefcase>(briefcases);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
}

export function mockCreateBriefcase(imodelId: GuidString, id: number) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Briefcase");
  const postBody = ResponseBuilder.generatePostBody<Briefcase>(ResponseBuilder.generateObject<Briefcase>(Briefcase));
  const requestResponse = ResponseBuilder.generatePostResponse<Briefcase>(generateBriefcase(id));
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody);
}

/** ChangeSets */
export function generateChangeSetId(): string {
  let result = "";
  for (let i = 0; i < 20; ++i) {
    result += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return result;
}

export function generateChangeSet(id?: string): ChangeSet {
  const changeSet = new ChangeSet();
  id = id || generateChangeSetId();
  changeSet.fileName = id + ".cs";
  changeSet.wsgId = id;
  return changeSet;
}

export function mockGetChangeSet(imodelId: GuidString, getDownloadUrl: boolean, query?: string, ...changeSets: ChangeSet[]) {
  if (!TestConfig.enableMocks)
    return;

  let i = 1;
  changeSets.forEach((value) => {
    value.wsgId = value.id!;
    if (getDownloadUrl) {
      value.downloadUrl = "https://imodelhubqasa01.blob.core.windows.net/imodelhubfile";
      value.fileSize = getMockFileSize();
    }
    if (!value.index) {
      value.index = `${i++}`;
    }
  });
  if (!query)
    query = "";
  const requestPath = createRequestUrl(ScopeType.iModel, imodelId.toString(), "ChangeSet",
    getDownloadUrl ? `?$select=*,FileAccessKey-forward-AccessKey.DownloadURL` + query : query);
  const requestResponse = ResponseBuilder.generateGetArrayResponse<ChangeSet>(changeSets);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
}

/** Codes */
export function randomCodeValue(prefix: string): string {
  return (prefix + Math.floor(Math.random() * Math.pow(2, 30)).toString());
}

export function randomCode(briefcase: number): HubCode {
  const code = new HubCode();
  code.briefcaseId = briefcase;
  code.codeScope = "TestScope";
  code.codeSpecId = Id64.fromString("0XA");
  code.state = CodeState.Reserved;
  code.value = randomCodeValue("TestCode");
  return code;
}

function convertCodesToMultiCodes(codes: HubCode[]): MultiCode[] {
  const map = new Map<string, MultiCode>();
  for (const code of codes) {
    const id: string = `${code.codeScope}-${code.codeSpecId}-${code.state}`;

    if (map.has(id)) {
      map.get(id)!.values!.push(code.value!);
    } else {
      const multiCode = new MultiCode();
      multiCode.changeState = "new";
      multiCode.briefcaseId = code.briefcaseId;
      multiCode.codeScope = code.codeScope;
      multiCode.codeSpecId = code.codeSpecId;
      multiCode.state = code.state;
      multiCode.values = [code.value!];
      map.set(id, multiCode);
    }
  }
  return Array.from(map.values());
}

export function mockGetCodes(imodelId: GuidString, query?: string, ...codes: HubCode[]) {
  if (!TestConfig.enableMocks)
    return;

  if (query === undefined) {
    const requestResponse = ResponseBuilder.generateGetArrayResponse<HubCode>(codes);
    const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Code", "$query");
    ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse);
  } else {
    const requestResponse = ResponseBuilder.generateGetArrayResponse<MultiCode>(convertCodesToMultiCodes(codes));
    const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "MultiCode", query);
    ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
  }
}

export function mockUpdateCodes(imodelId: GuidString, ...codes: HubCode[]) {
  // assumes all have same scope / specId
  if (!TestConfig.enableMocks)
    return;

  const multicodes = convertCodesToMultiCodes(codes);
  const requestPath = `/sv1.1/Repositories/iModel--${imodelId}/$changeset`;
  const requestResponse = ResponseBuilder.generateChangesetResponse<MultiCode>(multicodes);
  const postBody = ResponseBuilder.generateChangesetBody<MultiCode>(multicodes);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody);
}

export function mockDeniedCodes(imodelId: GuidString, requestOptions?: object, ...codes: HubCode[]) {
  // assumes all have same scope / specId
  if (!TestConfig.enableMocks)
    return;

  const multicodes = convertCodesToMultiCodes(codes);

  const requestPath = `/sv1.1/Repositories/iModel--${imodelId}/$changeset`;
  const requestResponse = ResponseBuilder.generateError("iModelHub.CodeReservedByAnotherBriefcase", "", "",
    new Map<string, any>([
      ["ConflictingCodes", JSON.stringify(codes.map((value) => {
        const obj = ECJsonTypeMap.toJson<HubCode>("wsg", value);
        return obj.properties;
      }))],
    ]));
  const postBody = ResponseBuilder.generateChangesetBody<MultiCode>(multicodes, requestOptions);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody, undefined, 409);
}

export function mockDeleteAllCodes(imodelId: GuidString, briefcaseId: number) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Code", `DiscardReservedCodes-${briefcaseId}`);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Delete, requestPath, {});
}

/** Locks */
export function incrementLockObjectId(objectId: Id64String): Id64String {
  let low = Id64.getLowerUint32(objectId) + 1;
  let high = Id64.getUpperUint32(objectId);
  if (low === 0xFFFFFFFF) {
    low = 0;
    high = high + 1;
  }
  return Id64.fromUint32Pair(low, high);
}

export async function getLastLockObjectId(requestContext: AuthorizedClientRequestContext, imodelId: GuidString): Promise<Id64String> {
  if (TestConfig.enableMocks)
    return Id64.fromString("0x0");

  const client = getDefaultClient();
  const locks = await client.locks.get(requestContext, imodelId);

  locks.sort((lock1, lock2) => (parseInt(lock1.objectId!.toString(), 16) > parseInt(lock2.objectId!.toString(), 16) ? -1 : 1));

  return (locks.length === 0 || locks[0].objectId === undefined) ? Id64.fromString("0x0") : locks[0].objectId!;
}

export function generateLock(briefcaseId?: number, objectId?: Id64String,
  lockType?: LockType, lockLevel?: LockLevel, seedFileId?: GuidString,
  releasedWithChangeSet?: string, releasedWithChangeSetIndex?: string): Lock {
  const result = new Lock();
  result.briefcaseId = briefcaseId || 1;
  result.seedFileId = seedFileId;
  result.objectId = Id64.fromJSON(objectId || "0x0");
  result.lockLevel = lockLevel || 1;
  result.lockType = lockType || 1;
  result.releasedWithChangeSet = releasedWithChangeSet;
  result.releasedWithChangeSetIndex = releasedWithChangeSetIndex;
  return result;
}

function convertLocksToMultiLocks(locks: Lock[]): MultiLock[] {
  const map = new Map<string, MultiLock>();
  for (const lock of locks) {
    const id: string = `${lock.briefcaseId}-${lock.lockType}-${lock.lockLevel}`;

    if (map.has(id)) {
      map.get(id)!.objectIds!.push(lock.objectId!);
    } else {
      const multiLock = new MultiLock();
      multiLock.changeState = "new";
      multiLock.briefcaseId = lock.briefcaseId;
      multiLock.seedFileId = lock.seedFileId;
      multiLock.releasedWithChangeSet = lock.releasedWithChangeSet;
      multiLock.releasedWithChangeSetIndex = lock.releasedWithChangeSetIndex;
      multiLock.lockLevel = lock.lockLevel;
      multiLock.lockType = lock.lockType;
      multiLock.objectIds = [lock.objectId!];
      map.set(id, multiLock);
    }
  }
  return Array.from(map.values());
}

export function mockGetLocks(imodelId: GuidString, query?: string, ...locks: Lock[]) {
  if (!TestConfig.enableMocks)
    return;

  if (query === undefined) {
    const requestResponse = ResponseBuilder.generateGetArrayResponse<Lock>(locks);
    const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Lock", "$query");
    ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse);
  } else {
    const requestResponse = ResponseBuilder.generateGetArrayResponse<MultiLock>(convertLocksToMultiLocks(locks));
    const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "MultiLock", query);
    ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
  }
}

export function mockUpdateLocks(imodelId: GuidString, locks: Lock[], requestOptions?: object) {
  if (!TestConfig.enableMocks)
    return;

  const multilocks = convertLocksToMultiLocks(locks);
  const requestPath = `/sv1.1/Repositories/iModel--${imodelId}/$changeset`;
  const requestResponse = ResponseBuilder.generateChangesetResponse<MultiLock>(multilocks);
  const postBody = ResponseBuilder.generateChangesetBody<MultiLock>(multilocks, requestOptions);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody);
}

export function mockDeniedLocks(imodelId: GuidString, locks: Lock[], requestOptions?: object) {
  if (!TestConfig.enableMocks)
    return;

  const multilocks = convertLocksToMultiLocks(locks);

  const requestPath = `/sv1.1/Repositories/iModel--${imodelId}/$changeset`;
  const requestResponse = ResponseBuilder.generateError("iModelHub.LockOwnedByAnotherBriefcase", "", "",
    new Map<string, any>([
      ["ConflictingLocks", JSON.stringify(locks.map((value) => {
        const obj = ECJsonTypeMap.toJson<Lock>("wsg", value);
        return obj.properties;
      }))],
    ]));
  const postBody = ResponseBuilder.generateChangesetBody<MultiLock>(multilocks, requestOptions);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody, undefined, 409);
}

/** Named versions */
export function generateVersion(name?: string, changesetId?: string, addInstanceId: boolean = true, smallThumbnailId?: GuidString, largeThumbnailId?: GuidString): Version {
  const result = new Version();
  if (addInstanceId) {
    result.id = Guid.createValue();
    result.wsgId = result.id;
  }
  result.changeSetId = changesetId === undefined || changesetId === null ? generateChangeSetId() : changesetId;
  result.name = name || `TestVersion-${result.changeSetId!}`;
  result.smallThumbnailId = smallThumbnailId;
  result.largeThumbnailId = largeThumbnailId;
  return result;
}

export function mockGetVersions(imodelId: GuidString, query?: string, ...versions: Version[]) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId.toString(), "Version", query);
  const requestResponse = ResponseBuilder.generateGetArrayResponse<Version>(versions);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
}

export function mockGetVersionById(imodelId: GuidString, version: Version) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId.toString(), "Version", version.wsgId);
  const requestResponse = ResponseBuilder.generateGetResponse<Version>(version);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
}

export function mockCreateVersion(imodelId: GuidString, name?: string, changesetId?: string) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId.toString(), "Version");
  const postBodyObject = generateVersion(name, changesetId, false);
  delete (postBodyObject.wsgId);
  const postBody = ResponseBuilder.generatePostBody<Version>(postBodyObject);
  const requestResponse = ResponseBuilder.generatePostResponse<Version>(generateVersion(name, changesetId, true));
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody);
}

export function mockUpdateVersion(imodelId: GuidString, version: Version) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId.toString(), "Version", version.wsgId);
  const postBody = ResponseBuilder.generatePostBody<Version>(version);
  const requestResponse = ResponseBuilder.generatePostResponse<Version>(version);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Post, requestPath, requestResponse, 1, postBody);
}

/** Thumbnails */
export function generateThumbnail(size: "Small" | "Large"): Thumbnail {
  const result = size === "Small" ? new SmallThumbnail() : new LargeThumbnail();
  result.id = Guid.createValue();
  result.wsgId = result.id;
  return result;
}

function mockThumbnailResponse(requestPath: string, size: "Small" | "Large", ...thumbnails: Thumbnail[]) {
  const requestResponse = size === "Small" ?
    ResponseBuilder.generateGetArrayResponse<SmallThumbnail>(thumbnails) :
    ResponseBuilder.generateGetArrayResponse<LargeThumbnail>(thumbnails);
  ResponseBuilder.mockResponse(IModelHubUrlMock.getUrl(), RequestType.Get, requestPath, requestResponse);
}

export function mockGetThumbnails(imodelId: GuidString, size: "Small" | "Large", ...thumbnails: Thumbnail[]) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, `${size}Thumbnail`);
  mockThumbnailResponse(requestPath, size, ...thumbnails);
}

export function mockGetThumbnailById(imodelId: GuidString, size: "Small" | "Large", thumbnail: Thumbnail) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, `${size}Thumbnail`, thumbnail.wsgId);
  mockThumbnailResponse(requestPath, size, thumbnail);
}

export function mockGetThumbnailsByVersionId(imodelId: GuidString, size: "Small" | "Large", versionId: GuidString, ...thumbnails: Thumbnail[]) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, `${size}Thumbnail`, `?$filter=HasThumbnail-backward-Version.Id+eq+%27${versionId}%27`);
  mockThumbnailResponse(requestPath, size, ...thumbnails);
}

/** Integration utilities */
export function getMockSeedFilePath() {
  const dir = path.join(assetsPath, "SeedFile");
  return path.join(dir, fs.readdirSync(dir).find((value) => value.endsWith(".bim"))!);
}

export async function createIModel(requestContext: AuthorizedClientRequestContext, name: string, contextId?: string, deleteIfExists = false, fromSeedFile = false) {
  if (TestConfig.enableMocks)
    return;

  contextId = contextId || await getProjectId(requestContext, TestConfig.projectName);

  const client = getDefaultClient();

  const imodels = await client.iModels.get(requestContext, contextId, new IModelQuery().byName(name));

  if (imodels.length > 0) {
    if (deleteIfExists) {
      await client.iModels.delete(requestContext, contextId, imodels[0].id!);
    } else {
      return;
    }
  }

  const pathName = fromSeedFile ? getMockSeedFilePath() : undefined;
  return client.iModels.create(requestContext, contextId, name, { path: pathName, timeOutInMilliseconds: 240000 });
}

export function getMockChangeSets(briefcase: Briefcase): ChangeSet[] {
  const dir = path.join(assetsPath, "SeedFile");
  const files = fs.readdirSync(dir);
  let parentId = "";
  return files.filter((value) => value.endsWith(".cs") && value.length === 45).map((file) => {
    const result = new ChangeSet();
    const fileName = path.basename(file, ".cs");
    result.id = fileName.substr(2);
    result.index = fileName.slice(0, 1);
    result.fileSize = fs.statSync(path.join(dir, file)).size.toString();
    result.briefcaseId = briefcase.briefcaseId;
    result.seedFileId = briefcase.fileId;
    result.parentId = parentId;
    result.fileName = result.id + ".cs";
    parentId = result.id;
    return result;
  });
}

export function getMockChangeSetPath(index: number, changeSetId: string) {
  return path.join(assetsPath, "SeedFile", `${index}_${changeSetId!}.cs`);
}

export async function createChangeSets(requestContext: AuthorizedClientRequestContext, imodelId: GuidString, briefcase: Briefcase,
  startingId = 0, count = 1): Promise<ChangeSet[]> {
  if (TestConfig.enableMocks)
    return getMockChangeSets(briefcase).slice(startingId, startingId + count);

  const maxCount = 10;

  if (startingId + count > maxCount)
    throw Error(`Only have ${maxCount} changesets generated`);

  const client = getDefaultClient();

  const existingChangeSets: ChangeSet[] = await client.changeSets.get(requestContext, imodelId);
  const result: ChangeSet[] = existingChangeSets.slice(startingId);

  const changeSets = getMockChangeSets(briefcase);

  for (let i = existingChangeSets.length; i < startingId + count; ++i) {
    const changeSetPath = getMockChangeSetPath(i, changeSets[i].id!);
    const changeSet = await client.changeSets.create(requestContext, imodelId, changeSets[i], changeSetPath);
    result.push(changeSet);
  }
  return result;
}

export async function createLocks(requestContext: AuthorizedClientRequestContext, imodelId: GuidString, briefcase: Briefcase, count = 1,
  lockType: LockType = 1, lockLevel: LockLevel = 1, releasedWithChangeSet?: string, releasedWithChangeSetIndex?: string) {
  if (TestConfig.enableMocks)
    return;

  const client = getDefaultClient();
  let lastObjectId: Id64String = await getLastLockObjectId(requestContext, imodelId);
  const generatedLocks: Lock[] = [];

  for (let i = 0; i < count; i++) {
    lastObjectId = incrementLockObjectId(lastObjectId);
    generatedLocks.push(generateLock(briefcase.briefcaseId!,
      lastObjectId, lockType, lockLevel, briefcase.fileId,
      releasedWithChangeSet, releasedWithChangeSetIndex));
  }

  await client.locks.update(requestContext, imodelId, generatedLocks);
}

export async function createVersions(requestContext: AuthorizedClientRequestContext, imodelId: GuidString, changesetIds: string[], versionNames: string[]) {
  if (TestConfig.enableMocks)
    return;

  const client = getDefaultClient();
  for (let i = 0; i < changesetIds.length; i++) {
    // check if changeset does not have version
    const version = await client.versions.get(requestContext, imodelId, new VersionQuery().byChangeSet(changesetIds[i]));
    if (!version || version.length === 0) {
      await client.versions.create(requestContext, imodelId, changesetIds[i], versionNames[i]);
    }
  }
}

export class ProgressTracker {
  private _loaded: number = 0;
  private _total: number = 0;
  private _count: number = 0;

  public track() {
    return (progress: ProgressInfo) => {
      this._loaded = progress.loaded;
      this._total = progress.total!;
      this._count++;
    };
  }

  public check(expectCalled: boolean = true) {
    if (expectCalled) {
      chai.expect(this._count).to.be.greaterThan(0);
      chai.expect(this._loaded).to.be.greaterThan(0);
      chai.expect(this._loaded).to.be.equal(this._total);
    } else {
      chai.expect(this._count).to.be.eq(0);
      chai.expect(this._loaded).to.be.eq(0);
      chai.expect(this._loaded).to.be.eq(0);
    }
  }
}

let cloudEnv: IModelCloudEnvironment | undefined;

if (!TestConfig.enableIModelBank || TestConfig.enableMocks) {
  cloudEnv = new TestIModelHubCloudEnv();
} else {
  [cloudEnv, _imodelBankClient] = getIModelBankCloudEnv();
}
if (cloudEnv === undefined)
  throw new Error("could not create cloudEnv");

cloudEnv.startup()
  .catch((_err) => {
    Logger.logError(loggingCategory, "Error starting cloudEnv");
  });

// TRICKY! All of the "describe" functions are called first. Many of them call getCloudEnv,
//  but they don't try to use it.

export function getCloudEnv(): IModelCloudEnvironment {
  return cloudEnv!;
}

// TRICKY! After all describe functions are called, the following global before function is called
// before any test suite's before function is called. So, we do have a chance to wait for the
// iModel server to finish starting up.

before(async () => {
  if (cloudEnv === undefined) {
    Logger.logError(loggingCategory, "cloudEnv was not defined before tests began");
    return Promise.reject();
  }

  Logger.logInfo(loggingCategory, "Waiting for cloudEnv to startup...");
  await cloudEnv.startup();
  Logger.logInfo(loggingCategory, "cloudEnv started.");
  return Promise.resolve();
});

after(async () => {
  if (cloudEnv !== undefined)
    await cloudEnv.shutdown();
});
