/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModelHubClient
 */
import { assert, ClientRequestContext } from "@bentley/bentleyjs-core";
import { IModelBaseHandler } from "../imodelhub/BaseHandler";
import { FileHandler } from "../imodeljs-clients";

/**
 * This class acts as the WsgClient for other iModelBank Handlers.
 * @beta
 */
export class IModelBankHandler extends IModelBaseHandler {
  private _baseUrl: string;

  /**
   * Creates an instance of IModelBankWsgClient.
   * @param handler The upload/download handler to use -- backends only.
   * @param keepAliveDuration TBD
   */
  public constructor(url: string, handler: FileHandler | undefined, keepAliveDuration = 30000) {
    super(keepAliveDuration, handler);
    this._baseUrl = url;
  }

  protected getUrlSearchKey(): string { assert(false, "Bentley cloud-specific method should be factored out of WsgClient base class"); return ""; }

  public async getUrl(_requestContext: ClientRequestContext, excludeApiVersion?: boolean): Promise<string> {
    if (this._url)
      return Promise.resolve(this._url!);

    this._url = this._baseUrl;
    if (!excludeApiVersion) {
      this._url += "/" + this.apiVersion;
    }
    return Promise.resolve(this._url!);
  }
}
