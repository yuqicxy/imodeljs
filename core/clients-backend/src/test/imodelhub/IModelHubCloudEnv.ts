/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { ClientRequestContext } from "@bentley/bentleyjs-core";
import { AccessToken, UserInfo, ConnectClient, Project, Asset, AuthorizedClientRequestContext } from "@bentley/imodeljs-clients";
import { ContextManagerClient, IModelAuthorizationClient, IModelCloudEnvironment } from "@bentley/imodeljs-clients/lib/IModelCloudEnvironment";
import { TestConfig } from "../TestConfig";

/** An implementation of IModelProjectAbstraction backed by a iModelHub/Connect project */
class TestConnectClient implements ContextManagerClient {
  public async queryProjectByName(requestContext: AuthorizedClientRequestContext, name: string): Promise<Project> {
    const client = new ConnectClient();
    return client.getProject(requestContext, {
      $select: "*",
      $filter: `Name+eq+'${name}'`,
    });
  }

  public async queryAssetByName(requestContext: AuthorizedClientRequestContext, name: string): Promise<Asset> {
    const client = new ConnectClient();
    return client.getAsset(requestContext, {
      $select: "*",
      $filter: `Name+eq+'${name}'`,
    });
  }
}

class TestIModelHubUserMgr implements IModelAuthorizationClient {
  public async authorizeUser(requestContext: ClientRequestContext, _userInfo: UserInfo | undefined, userCredentials: any): Promise<AccessToken> {
    requestContext.enter();
    return TestConfig.getAccessToken(userCredentials);
  }
}

export class TestIModelHubCloudEnv implements IModelCloudEnvironment {
  public get isIModelHub(): boolean { return true; }
  public readonly contextMgr = new TestConnectClient();
  public readonly authorization = new TestIModelHubUserMgr();
  public async startup(): Promise<void> { return Promise.resolve(); }
  public async shutdown(): Promise<number> { return Promise.resolve(0); }
}
