/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { assert } from "chai";
import { RpcManager, IModelReadRpcInterface } from "@bentley/imodeljs-common";
import { OpenMode } from "@bentley/bentleyjs-core";
import { AccessToken, ConnectClient, Config } from "@bentley/imodeljs-clients";
import { IModelDb, IModelHost, IModelHostConfiguration, KnownLocations } from "@bentley/imodeljs-backend";
import { IModelJsFs, IModelJsFsStats } from "@bentley/imodeljs-backend/lib/IModelJsFs";
import * as path from "path";
import { IModelJsConfig } from "@bentley/config-loader/lib/IModelJsConfig";
import { getToken, OidcConfiguration } from "@bentley/oidc-signin-tool";
IModelJsConfig.init(true /* suppress exception */, false /* suppress error message */, Config.App);

RpcManager.initializeInterface(IModelReadRpcInterface);

export interface IModelTestUtilsOpenOptions {
  copyFilename?: string;
  enableTransactions?: boolean;
  openMode?: OpenMode;
}

export interface UserCredentials {
  email: string;
  password: string;
}

/** Test users with various permissions */
export class TestUsers {

  /** Browser Oidc configuration for all test users */
  public static get oidcConfig(): OidcConfiguration {
    return {
      clientId: Config.App.getString("imjs_oidc_browser_test_client_id"),
      redirectUri: Config.App.getString("imjs_oidc_browser_test_redirect_uri"),
    };
  }

  public static get scopes(): string {
    return Config.App.getString("imjs_oidc_browser_test_scopes");
  }

  /** User with the typical permissions of the regular/average user - Co-Admin: No, Connect-Services-Admin: No */
  public static get regular(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_regular_user_name"),
      password: Config.App.getString("imjs_test_regular_user_password"),
    };
  }
}

export class KnownTestLocations {

  /** The directory where test assets are stored. Keep in mind that the test is playing the role of the app. */
  public static get assetsDir(): string {
    // Assume that we are running in nodejs
    return path.join(__dirname, "assets");
  }

  /** The directory where tests can write. */
  public static get outputDir(): string {
    // Assume that we are running in nodejs
    return path.join(__dirname, "output");
  }

}

export class IModelTestUtils {

  private static _connectClient: ConnectClient | undefined;
  public static get connectClient(): ConnectClient {
    if (!IModelTestUtils._connectClient)
      IModelTestUtils._connectClient = new ConnectClient();
    return IModelTestUtils._connectClient!;
  }

  public static async getTestUserAccessToken(userCredentials?: UserCredentials): Promise<AccessToken> {
    if (userCredentials === undefined)
      userCredentials = TestUsers.regular;
    const accessToken = await getToken(userCredentials.email, userCredentials.password, TestUsers.scopes, TestUsers.oidcConfig);
    assert(accessToken);
    return accessToken;
  }

  private static getStat(name: string) {
    let stat: IModelJsFsStats | undefined;
    try {
      stat = IModelJsFs.lstatSync(name);
    } catch (err) {
      stat = undefined;
    }
    return stat;
  }

  public static openIModel(filename: string, opts?: IModelTestUtilsOpenOptions): IModelDb {
    const destPath = KnownTestLocations.outputDir;
    if (!IModelJsFs.existsSync(destPath))
      IModelJsFs.mkdirSync(destPath);

    if (opts === undefined)
      opts = {};

    const srcName = path.join(KnownTestLocations.assetsDir, filename);
    const dbName = path.join(destPath, (opts.copyFilename ? opts.copyFilename! : filename));
    const srcStat = IModelTestUtils.getStat(srcName);
    const destStat = IModelTestUtils.getStat(dbName);
    if (!srcStat || !destStat || srcStat.mtimeMs !== destStat.mtimeMs) {
      IModelJsFs.copySync(srcName, dbName, { preserveTimestamps: true });
    }

    const iModel: IModelDb = IModelDb.openStandalone(dbName, opts.openMode, opts.enableTransactions); // could throw Error
    assert.exists(iModel);
    return iModel!;
  }

  // __PUBLISH_EXTRACT_START__ IModelHost.startup
  public static startupIModelHost() {
    // The host configuration.
    // The defaults will work for most backends.
    // Here is an example of how the briefcasesCacheDir property of the host configuration
    // could be set from an environment variable, which could be set by a cloud deployment mechanism.
    let briefcaseCacheDir = process.env.MY_SERVICE_BRIEFCASES_DIR;
    if (briefcaseCacheDir === undefined) {
      const tempDir = process.env.MY_SERVICE_TMP_DIR || KnownLocations.tmpdir;
      briefcaseCacheDir = path.join(tempDir, "iModelJs_cache");
    }

    const imHostConfig = new IModelHostConfiguration();
    imHostConfig.briefcaseCacheDir = briefcaseCacheDir;

    // Start up IModelHost, supplying the configuration.
    IModelHost.startup(imHostConfig);
  }
  // __PUBLISH_EXTRACT_END__

}

// Start the backend
IModelTestUtils.startupIModelHost();
