/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iTwinServiceClients
 */

import { Logger } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "./AuthorizedClientRequestContext";
import { Config } from "./Config";
import { ECJsonTypeMap, WsgInstance } from "./ECJsonTypeMap";
import { ClientsLoggerCategory } from "./ClientsLoggerCategory";
import { request, RequestOptions, RequestQueryOptions, Response, ResponseError } from "./Request";
import { WsgClient, WsgRequestOptions } from "./WsgClient";

const loggerCategory: string = ClientsLoggerCategory.Clients;

/** Content */
@ECJsonTypeMap.classToJson("wsg", "ContentSchema.Content", { schemaPropertyName: "schemaName", classPropertyName: "className" })
export class Content extends WsgInstance {
  @ECJsonTypeMap.propertyToJson("wsg", "properties.Filter")
  public filter?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.GroupLabel")
  public groupLabel?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.IsShared")
  public isShared?: boolean;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.Module")
  public module?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.ModuleVersion")
  public moduleVersion?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.Name")
  public name?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.ProjectId")
  public projectId?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.Created")
  public createdDate?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.Updated")
  public updatedDate?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.ParentId")
  public parentId?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.Owner")
  public owner?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.DataId")
  public dataId?: string;

  @ECJsonTypeMap.propertyToJson("wsg", "properties.IsDeleted")
  public isDeleted?: boolean;
}

/**
 * Client wrapper to Reality Data Service
 */
export class BIMReviewShareClient extends WsgClient {
  public static readonly searchKey: string = "BIMReviewShare";
  public static readonly configURL = "imjs_bim_review_share_url";
  public static readonly configRelyingPartyUri = "imjs_bim_review_share_relying_party_uri";
  public static readonly configRegion = "imjs_bim_review_share_region";
  /**
   * Creates an instance of RealityDataServicesClient.
   */
  public constructor() {
    super("v2.5");
  }

  private byteCount(s: string) {
    return encodeURI(s).split(/%..|./).length;
  }

  /** BIM Review Share functionality to post an instance and data
   * Not REST-ful, they treat 308 differently without returning a redirect location
   * However, this is handled by this call to act as expected by the service
   * @param requestContext The client request context
   * @param typedConstructor Used by clients to post a strongly typed instance through the REST API that's expected to return a standard response.
   * @param relativeUrlPath Relative path to the REST resource.
   * @param instance Strongly typed instance to be posted.
   * @param data JSON string that will be sent in second request for posting the data of the content
   * @param requestOptions WSG options for the request.
   * @returns The posted instance that's returned back from the server.
   */
  private async postInstanceAndData<T extends WsgInstance>(requestContext: AuthorizedClientRequestContext, _typedConstructor: new () => T, relativeUrlPath: string, instance: T, data: any, requestOptions?: WsgRequestOptions): Promise<T> {
    requestContext.enter();

    if (typeof window !== undefined)
      return Promise.reject(new Error(`Method cannot be used in the browser`));

    const url: string = await this.getUrl(requestContext) + relativeUrlPath;
    requestContext.enter();
    Logger.logInfo(loggerCategory, "Sending POST request", () => ({ url }));
    const untypedInstance: any = ECJsonTypeMap.toJson<T>("wsg", instance);

    const byteCount = this.byteCount(JSON.stringify({ ...data })) - 1;

    let res: any | undefined;
    // BIM Review Share sends back a 308 without a redirect location
    // This causes super agent to treat it as an error, but it is expected
    // Obtain the response here and keep working if so
    const errorCallback = (value: any) => {
      if (value.response.statusCode === 308)
        res = value.response;
      return ResponseError.parse(value);
    };

    const options: RequestOptions = {
      method: "POST",
      headers: {
        "authorization": requestContext.accessToken.toTokenString(),
        "Content-Disposition": `attachment; filename="attachment.json"`,
        "Content-Range": "bytes */" + byteCount.toString(),
        "Content-Type": "application/json",
      },
      body: {
        instance: untypedInstance,
      },
      redirects: 1,
      errorCallback,
    };
    if (requestOptions) {
      options.body.requestOptions = requestOptions;
    }

    await this.setupOptionDefaults(options);
    requestContext.enter();
    await request(requestContext, url, options).then((response: Response) => {
      // no-op
      res = response;
    }).catch((_reason: any) => {
      // don't do anything
    });
    requestContext.enter();

    // Make sure the error callback set the response
    if (!res || !res.headers)
      return Promise.reject(new Error(`POST failed`));

    Logger.logTrace(loggerCategory, "Successful POST request", () => ({ url }));
    // Setup options for posting the instance data
    const dataOptions: RequestOptions = {
      method: "POST",
      headers: {
        "authorization": requestContext.accessToken.toTokenString(),
        "If-Match": res.headers.etag,
        "Cookie": res.headers["set-cookie"][0],
        "Content-Range": "bytes 0-" + (byteCount - 1).toString() + "/" + (byteCount),
        "Content-Length": byteCount.toString(),
      },
      body: {
        ...data,
      },
    };

    await this.setupOptionDefaults(dataOptions);
    requestContext.enter();
    const dataRes: Response = await request(requestContext, url, dataOptions);
    requestContext.enter();
    if (!dataRes.body || !dataRes.body.changedInstance || !dataRes.body.changedInstance.instanceAfterChange) {
      return Promise.reject(new Error(`POST to URL ${url} executed successfully, but did not return the expected result.`));
    }

    return Promise.resolve(dataRes.body.changedInstance.instanceAfterChange);
  }

  // @todo Use lower level utilities instead of the node based Request API.
  /**
   * Used by clients to get strongly typed instances from standard WSG REST queries that return EC JSON instances.
   * @param requestContext The client request context
   * @param relativeUrlPath Relative path to the REST resource.
   * @param queryOptions Query options.
   * @returns Array of strongly typed instances.
   */
  private async getBlob(requestContext: AuthorizedClientRequestContext, relativeUrlPath: string, queryOptions?: RequestQueryOptions): Promise<any> {
    requestContext.enter();

    if (typeof window !== undefined)
      return Promise.reject(new Error(`Method cannot be used in the browser`));

    const url: string = await this.getUrl(requestContext) + relativeUrlPath;
    requestContext.enter();
    Logger.logInfo(loggerCategory, "Sending GET request", () => ({ url }));

    const options: RequestOptions = {
      method: "GET",
      headers: { authorization: requestContext.accessToken.toTokenString() },
      qs: queryOptions,
      responseType: "blob",
      accept: "application/octet-stream",
    };

    await this.setupOptionDefaults(options);
    requestContext.enter();

    const res: Response = await request(requestContext, url, options);
    requestContext.enter();
    if (!res.body || !res.body.buffer) {
      return Promise.reject(new Error(`Query to URL ${url} executed successfully, but did NOT return the blob data.`));
    }

    const blobStr = String.fromCharCode.apply(null, res.body);
    const data = JSON.parse(blobStr);

    Logger.logTrace(loggerCategory, "Successful GET request", () => ({ url }));
    return Promise.resolve(data);
  }

  /**
   * Post content to BIM Review Share
   * @param requestContext The client request context
   * @param filter Filter property in content, defines the name of the iModel that relates to this content
   * @param groupLabel GroupLabel property in content
   * @param module Module property (e.g. 'DataViz')
   * @param moduleVersion Module version string (e.g. 1.0.0)
   * @param name User-defined name of data (e.g. 'My Saved View 1')
   * @param owner Id of the user that owns this content
   * @param projectId Project ID that this content refers to
   * @param data JSON string with the data that wants to be saved
   * @param instanceId Wsg Instance Id if updating the instance instead of creating a new one
   */
  public async postContent(requestContext: AuthorizedClientRequestContext, filter: string, groupLabel: string, module: string, moduleVersion: string, name: string, owner: string, projectId: string, data: any, instanceId?: string) {
    const content = new Content();
    Object.assign(content, { filter, groupLabel, module, moduleVersion, name, owner, projectId });
    let url = `/Repositories/ContentPlugin--default/ContentSchema/Content`;
    if (instanceId !== undefined)
      url += `/${instanceId}`;

    const instance = await this.postInstanceAndData<Content>(requestContext, Content, url, content, data);
    return instance;
  }

  /**
   * Updates the data of an already existing instance using a retrieved Content
   * @param requestContext The client request context
   * @param content instance of the Content
   * @param data updated data
   */
  public async updateContent(requestContext: AuthorizedClientRequestContext, content: Content, data: any) {
    let url = `/Repositories/ContentPlugin--default/ContentSchema/Content`;
    if (content.wsgId !== undefined)
      url += `/${content.wsgId}`;

    const instance = await this.postInstanceAndData<Content>(requestContext, Content, url, content, data);
    return instance;
  }

  /**
   * Get all content instances
   * @param requestContext The client request context
   * @param projectId Id of the project to get the instances from
   * @param module Name of the module (e.g. 'DataViz')
   */
  public async getContentInstances(requestContext: AuthorizedClientRequestContext, projectId: string, module: string, owner?: string) {
    const queryOptions: RequestQueryOptions = {
      $filter: `ProjectId+eq+'${projectId}'+and+Module+eq+'${module}'` + (owner ? `+and+owner+eq+'${owner}'` : ``),
    };
    const url = `/Repositories/ContentPlugin--default/ContentSchema/Content`;
    return this.getInstances<Content>(requestContext, Content, url, queryOptions);
  }

  /**
   * Get an instance of a Content
   * @param requestContext The client request context
   * @param projectId Project Id where the content resides
   * @param moduleName Module name of the content (e.g. 'DataViz')
   * @param instanceId Instance Id of the Content
   * @param queryOptions Query options for filtering
   */
  public async getContentInstance(requestContext: AuthorizedClientRequestContext, projectId: string, moduleName: string, instanceId: string, queryOptions?: RequestQueryOptions) {
    const url = `/Repositories/ContentPlugin--default/ContentSchema/Content/${projectId}${moduleName}${instanceId}`;
    return this.getInstances<Content>(requestContext, Content, url, queryOptions);
  }

  /**
   * Deletes a content instance
   * @param requestContext The client request context
   * @param content Content instance
   * @param options WsgRequestOptions optional
   */
  public async deleteContentInstance(requestContext: AuthorizedClientRequestContext, content: Content, options?: WsgRequestOptions) {
    const url = `/Repositories/ContentPlugin--default/ContentSchema/Content/${content.wsgId}`;
    return this.deleteInstance(requestContext, url, content, options);
  }

  /**
   * Gets the data related to an instance of a Content
   * @param requestContext The client request context
   * @param instanceId Instance Id of the Content instance
   * @param queryOptions Query options for filtering
   */
  public async getContentData(requestContext: AuthorizedClientRequestContext, instanceId: string, queryOptions?: RequestQueryOptions) {
    const url = `/Repositories/ContentPlugin--default/ContentSchema/Content/${instanceId}/$file`;
    return this.getBlob(requestContext, url, queryOptions);
  }

  /**
   * Gets name/key to query the service URLs from the URL Discovery Service ("Buddi")
   * @returns Search key for the URL.
   */
  protected getUrlSearchKey(): string {
    return BIMReviewShareClient.searchKey;
  }

  /**
   * Gets the default URL for the service.
   * @returns Default URL for the service.
   */
  protected getDefaultUrl(): string {
    if (Config.App.has(BIMReviewShareClient.configURL))
      return Config.App.get(BIMReviewShareClient.configURL);

    throw new Error(`Service URL not set. Set it in Config.App using key ${BIMReviewShareClient.configURL}`);
  }

  /**
   * Override default region for this service
   * @returns region id or undefined
   */
  protected getRegion(): number | undefined {
    if (Config.App.has(BIMReviewShareClient.configRegion))
      return Config.App.get(BIMReviewShareClient.configRegion);

    return undefined;
  }

  /**
   * Gets theRelyingPartyUrl for the service.
   * @returns RelyingPartyUrl for the service.
   */
  protected getRelyingPartyUrl(): string {
    if (Config.App.has(BIMReviewShareClient.configRelyingPartyUri))
      return Config.App.get(BIMReviewShareClient.configRelyingPartyUri) + "/";

    if (Config.App.getBoolean(WsgClient.configUseHostRelyingPartyUriAsFallback, true)) {
      if (Config.App.has(WsgClient.configHostRelyingPartyUri))
        return Config.App.get(WsgClient.configHostRelyingPartyUri) + "/";
    }

    throw new Error(`RelyingPartyUrl not set. Set it in Config.App using key ${BIMReviewShareClient.configRelyingPartyUri}`);
  }
}
