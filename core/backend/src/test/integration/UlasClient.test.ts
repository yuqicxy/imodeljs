/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import { assert } from "chai";
import { Guid, BentleyStatus } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext, AccessToken } from "@bentley/imodeljs-clients";
import { IModelJsNative } from "@bentley/imodeljs-native";
import * as os from "os";
import { AuthorizedBackendRequestContext } from "../../imodeljs-backend";
import { IModelTestUtils } from "../IModelTestUtils";
import { UlasUtilities } from "../../ulas/UlasUtilities";

describe("UlasUtilities - OIDC Token (#integration)", () => {
  const imodelJsProductId = 2686;
  const OIDC_TYPE = 2;
  let requestContext: AuthorizedBackendRequestContext;

  before(async () => {
    requestContext = await IModelTestUtils.getUlasTestUserRequestContext();
  });

  it("Check Entitlements (#integration)", async function (this: Mocha.Context) {
    const status: IModelJsNative.Entitlement = UlasUtilities.checkEntitlement(requestContext, Guid.createValue(), OIDC_TYPE, imodelJsProductId, "localhost");

    assert.equal(status.allowed, true);
    assert.equal(status.usageType, "Production");
  });

  it("Invalid project id check entitlements (#integration)", async function (this: Mocha.Context) {
    let exceptionThrown = false;
    try {
      UlasUtilities.checkEntitlement(requestContext, "", OIDC_TYPE, imodelJsProductId, "localhost");
    } catch (error) {
      exceptionThrown = true;
    }
    assert.isTrue(exceptionThrown);
  });

  it("Invalid app version check entitlements (#integration)", async function (this: Mocha.Context) {
    let exceptionThrown = false;
    try {
      UlasUtilities.checkEntitlement(requestContext, "", OIDC_TYPE, imodelJsProductId, "localhost");
    } catch (error) {
      exceptionThrown = true;
    }
    assert.isTrue(exceptionThrown);
  });

  it("Post usage log (#integration)", async function (this: Mocha.Context) {
    for (const usageType of [IModelJsNative.UsageType.Beta, IModelJsNative.UsageType.HomeUse, IModelJsNative.UsageType.PreActivation, IModelJsNative.UsageType.Production, IModelJsNative.UsageType.Trial]) {
      const status: BentleyStatus = UlasUtilities.trackUsage(requestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), usageType);
      assert.equal(status, BentleyStatus.SUCCESS);
    }
  });

  it("Post usage log with session id (#integration)", async function (this: Mocha.Context) {
    const status: BentleyStatus = UlasUtilities.trackUsage(requestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), IModelJsNative.UsageType.Trial);
    assert.equal(status, BentleyStatus.SUCCESS);
  });

  it("Post usage log without product version (#integration)", async function (this: Mocha.Context) {
    let exceptionThrown = false;
    try {
      const localRequestContext = new AuthorizedClientRequestContext(requestContext.accessToken, undefined, "43");
      UlasUtilities.trackUsage(localRequestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), IModelJsNative.UsageType.Trial);
    } catch (error) {
      exceptionThrown = true;
    }
    assert.isTrue(exceptionThrown);
  });

  it("Post usage log - hostName special cases (#integration)", async function (this: Mocha.Context) {
    const localRequestContext = new AuthorizedClientRequestContext(requestContext.accessToken, undefined, "43", "3.4.5");
    for (const hostName of [
      "::1",
      "127.0.0.1",
      "localhost",
    ]) {
      const status: BentleyStatus = UlasUtilities.trackUsage(localRequestContext, Guid.createValue(), OIDC_TYPE, hostName, IModelJsNative.UsageType.Beta);

      assert.equal(status, BentleyStatus.SUCCESS);
    }
  });

  it("Invalid usage log entry (#integration)", async function (this: Mocha.Context) {
    let exceptionThrown = false;
    try {
      const localRequestContext = new AuthorizedClientRequestContext(requestContext.accessToken, undefined, "43", "3.4.5.101");
      UlasUtilities.trackUsage(localRequestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), 100 as IModelJsNative.UsageType);
    } catch (error) {
      exceptionThrown = true;
    }
    assert.isTrue(exceptionThrown);
  });

  it("AccessToken without feature tracking claims (#integration)", async function (this: Mocha.Context) {
    enum TokenMode {
      Complete,
      NoUserProfile,
      NoUserId,
      NoUltimateId,
    }

    const passingTokenModes = [TokenMode.Complete, TokenMode.NoUserId, TokenMode.NoUltimateId];

    for (const mode of [TokenMode.Complete, TokenMode.NoUserProfile, TokenMode.NoUserId, TokenMode.NoUltimateId]) {
      let tempAccessToken: AccessToken;

      if (mode === TokenMode.NoUserProfile) {
        // fake token that does not contain a user profile
        tempAccessToken = AccessToken.fromForeignProjectAccessTokenJson(JSON.stringify({ ForeignProjectAccessToken: {} }))!;
      } else {
        // token from which some user profile information is removed. UlasClient does not utilize this information, and instead defers this task to the ULAS server, which examines the token string itself.
        tempAccessToken = requestContext.accessToken;

        switch (mode) {
          case TokenMode.NoUserId:
            tempAccessToken.getUserInfo()!.id = "";
            break;

          case TokenMode.NoUltimateId:
            tempAccessToken.getUserInfo()!.featureTracking = { ultimateSite: "", usageCountryIso: "" };
            break;

          default:
            break;
        }
      }

      let tempRequestContext = new AuthorizedClientRequestContext(tempAccessToken, undefined, "43", "3.4.5.101");
      let exceptionThrown = false;
      try {
        UlasUtilities.trackUsage(tempRequestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), IModelJsNative.UsageType.Production);
      } catch (err) {
        exceptionThrown = true;
      }
      assert.equal(exceptionThrown, !passingTokenModes.includes(mode), `UlasClient.logUsage is expected to throw if access token does not have required user profile info for ${TokenMode[mode]}.`);

      tempRequestContext = new AuthorizedClientRequestContext(tempAccessToken, undefined, "43", "3.4.99");
      try {
        UlasUtilities.markFeature(tempRequestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), IModelJsNative.UsageType.Trial);
      } catch (error) {
        exceptionThrown = true;
      }
      assert.equal(exceptionThrown, !passingTokenModes.includes(mode), `UlasClient.trackFeature is expected to throw if access token does not have required user profile info ${TokenMode[mode]}.`);
    }
  });

  it("Post feature log (#integration)", async function (this: Mocha.Context) {
    for (const usageType of [IModelJsNative.UsageType.Beta, IModelJsNative.UsageType.HomeUse, IModelJsNative.UsageType.PreActivation, IModelJsNative.UsageType.Production, IModelJsNative.UsageType.Trial]) {
      const status = UlasUtilities.markFeature(requestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), usageType);

      assert.equal(status, BentleyStatus.SUCCESS);
    }
  });

  it("Post feature log with project id (#integration)", async function (this: Mocha.Context) {
    const localRequestContext = new AuthorizedClientRequestContext(requestContext.accessToken, undefined, "43", "3.4.99");
    const status = UlasUtilities.markFeature(localRequestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), IModelJsNative.UsageType.Production, Guid.createValue());

    assert.equal(status, BentleyStatus.SUCCESS);
  });

  it("Post feature log without product version (#integration)", async function (this: Mocha.Context) {
    const localRequestContext = new AuthorizedClientRequestContext(requestContext.accessToken, undefined, "43");
    const status = UlasUtilities.markFeature(localRequestContext, Guid.createValue(), OIDC_TYPE, os.hostname(), IModelJsNative.UsageType.Production);
    assert.equal(status, BentleyStatus.SUCCESS);
  });

  it("Post feature log - hostName special cases (#integration)", async function (this: Mocha.Context) {
    for (const hostName of [
      "::1",
      "127.0.0.1",
      "localhost",
    ]) {
      const status = UlasUtilities.markFeature(requestContext, Guid.createValue(), OIDC_TYPE, hostName, IModelJsNative.UsageType.Production);
      assert.equal(status, BentleyStatus.SUCCESS);
    }
  });
});
