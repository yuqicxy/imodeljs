/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Authentication
 */

import { ClientRequestContext } from "@bentley/bentleyjs-core";
import { OidcClient, AccessToken, UserInfo } from "@bentley/imodeljs-clients";
import { Issuer, Client as OpenIdClient, ClientConfiguration, TokenSet } from "openid-client";
import { decode } from "jsonwebtoken";

/**
 * Client configuration to create OIDC/OAuth tokens for backend applications
 * @beta
 */
export interface OidcBackendClientConfiguration {
  /** Client application's identifier as registered with the Bentley IMS OIDC/OAuth2 provider. */
  clientId: string;
  /** Client application's secret key as registered with the Bentley IMS OIDC/OAuth2 provider. */
  clientSecret: string;
  /** List of space separated scopes to request access to various resources. */
  scope: string;
}

/**
 * Utility to generate OIDC/OAuth tokens for backend applications
 * @beta
 */
export abstract class OidcBackendClient extends OidcClient {
  protected _configuration: OidcBackendClientConfiguration;

  /**
   * Creates an instance of OidcBackendClient.
   */
  public constructor(configuration: OidcBackendClientConfiguration) {
    super();
    this._configuration = configuration;
  }

  private _issuer: Issuer;
  private async getIssuer(requestContext: ClientRequestContext): Promise<Issuer> {
    requestContext.enter();

    if (this._issuer)
      return this._issuer;

    const url = await this.getUrl(requestContext);
    this._issuer = await Issuer.discover(url);
    return this._issuer;
  }

  /**
   * Discover the endpoints of the service
   */
  public async discoverEndpoints(requestContext: ClientRequestContext): Promise<Issuer> {
    requestContext.enter();
    return this.getIssuer(requestContext);
  }

  private _client: OpenIdClient;
  protected async getClient(requestContext: ClientRequestContext): Promise<OpenIdClient> {
    requestContext.enter();

    if (this._client)
      return this._client;

    const clientConfiguration: ClientConfiguration = {
      client_id: this._configuration.clientId,
      client_secret: this._configuration.clientSecret,
    };
    const issuer = await this.getIssuer(requestContext);
    this._client = new issuer.Client(clientConfiguration);
    return this._client;
  }

  protected createToken(tokenSet: TokenSet, userInfo?: UserInfo): AccessToken {
    const startsAt: Date = new Date((tokenSet.expires_at - tokenSet.expires_in) * 1000);
    const expiresAt: Date = new Date(tokenSet.expires_at * 1000);
    return AccessToken.fromJsonWebTokenString(tokenSet.access_token, startsAt, expiresAt, userInfo);
  }

  public static parseUserInfo(jwt: string): UserInfo | undefined {
    const decoded: any = decode(jwt, { json: true, complete: false });
    const userInfo = UserInfo.fromJson(decoded);
    return userInfo;
  }
}
