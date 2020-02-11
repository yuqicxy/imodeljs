/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import * as chai from "chai";
import { ClientRequestContext } from "@bentley/bentleyjs-core";
import { Config, AccessToken } from "@bentley/imodeljs-clients";
import { IModelJsConfig } from "@bentley/config-loader/lib/IModelJsConfig";
import { OidcDelegationClient, OidcDelegationClientConfiguration, OidcAgentClient, OidcAgentClientConfiguration } from "../imodeljs-clients-backend";
import { HubAccessTestValidator } from "./HubAccessTestValidator";

IModelJsConfig.init(true /* suppress exception */, false /* suppress error message */, Config.App);

chai.should();

describe("OidcDelegationClient (#integration)", () => {

  let validator: HubAccessTestValidator;
  let jwt: AccessToken;
  const requestContext = new ClientRequestContext();

  before(async () => {
    validator = await HubAccessTestValidator.getInstance();

    const agentConfiguration: OidcAgentClientConfiguration = {
      clientId: Config.App.getString("imjs_agent_test_client_id"),
      clientSecret: Config.App.getString("imjs_agent_test_client_secret"),
      scope: "imodelhub rbac-user:external-client reality-data:read urlps-third-party context-registry-service:read-only imodeljs-backend-2686",
    };

    const agentClient = new OidcAgentClient(agentConfiguration);
    jwt = await agentClient.getToken(requestContext);
  });

  it("should get valid SAML delegation tokens", async () => {

    const delegationConfiguration: OidcDelegationClientConfiguration = {
      clientId: Config.App.getString("imjs_delegation_test_client_id"),
      clientSecret: Config.App.getString("imjs_delegation_test_client_secret"),
      scope: Config.App.getString("imjs_default_relying_party_uri"),
    };

    const delegationClient = new OidcDelegationClient(delegationConfiguration);
    const saml = await delegationClient.getSamlFromJwt(requestContext, jwt);
    await validator.validateConnectAccess(saml);
    await validator.validateIModelHubAccess(saml);
  });

  it("should get valid OIDC delegation tokens", async () => {
    const delegationConfiguration: OidcDelegationClientConfiguration = {
      clientId: Config.App.getString("imjs_delegation_test_client_id"),
      clientSecret: Config.App.getString("imjs_delegation_test_client_secret"),
      scope: "context-registry-service imodelhub rbac-service",
    };

    const delegationClient = new OidcDelegationClient(delegationConfiguration);
    const delegationJwt = await delegationClient.getJwtFromJwt(requestContext, jwt);
    await validator.validateConnectAccess(delegationJwt);
    await validator.validateIModelHubAccess(delegationJwt);
  });

});
