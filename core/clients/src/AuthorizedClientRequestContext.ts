/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Authentication
 */

import { AccessToken } from "./Token";
import { Guid, ClientRequestContext, ClientRequestContextProps, GuidString } from "@bentley/bentleyjs-core";

/** The properties of AuthorizedClientRequestContext.
 * @public
 */
export interface AuthorizedClientRequestContextProps extends ClientRequestContextProps {
  accessToken: any;
}

/** Provides generic context for a server application to get details of a particular request that originated at the client.
 * This context includes an [[AccessToken]] that carries authorization information. For services that do not require authorization
 * it's sufficient to pass an instance of the base class [[ClientRequestContext]].
 * @see [ClientRequestContext rules]($docs/learning/backend/managingclientrequestcontext.md).
 * @see [[ClientRequestContext]]
 * @public
 */
export class AuthorizedClientRequestContext extends ClientRequestContext implements AuthorizedClientRequestContextProps {
  /** The access token value of the client application.
   * @beta
   */
  public accessToken: AccessToken;

  /** Constructor
   * @beta
   */
  public constructor(accessToken: AccessToken, activityId: GuidString = Guid.createValue(), applicationId: string = "", applicationVersion: string = "", sessionId: GuidString = Guid.empty) {
    super(activityId, applicationId, applicationVersion, sessionId);
    this.accessToken = accessToken;
  }

  /**
   * @internal
   */
  public toJSON(): AuthorizedClientRequestContextProps {
    const obj = super.toJSON() as AuthorizedClientRequestContextProps;
    obj.accessToken = this.accessToken;
    return obj;
  }
}
