
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { Config } from "@bentley/imodeljs-clients";
import { OidcConfiguration } from "@bentley/oidc-signin-tool";
import { IModelJsConfig } from "@bentley/config-loader/lib/IModelJsConfig";
IModelJsConfig.init(true /* suppress exception */, false /* suppress error message */, Config.App);

export interface UserCredentials {
  email: string;
  password: string;
}

export class TestConfig {
  public static get projectName(): string { return Config.App.get("imjs_test_project_name"); }
  public static get iModelName(): string { return Config.App.get("imjs_test_imodel_name"); }
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

  /** ulas Oidc configuration */
  public static get ulasOidcConfig(): OidcConfiguration {
    return {
      clientId: Config.App.getString("imjs_oidc_ulas_test_client_id"),
      redirectUri: Config.App.getString("imjs_oidc_ulas_test_redirect_uri"),
    };
  }

  public static get ulasScopes(): string {
    return Config.App.getString("imjs_oidc_ulas_test_scopes");
  }

  /** User with the typical permissions of the regular/average user - Co-Admin: No, Connect-Services-Admin: No */
  public static get regular(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_regular_user_name"),
      password: Config.App.getString("imjs_test_regular_user_password"),
    };
  }

  /** User with typical permissions of the project administrator - Co-Admin: Yes, Connect-Services-Admin: No */
  public static get manager(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_manager_user_name"),
      password: Config.App.getString("imjs_test_manager_user_password"),
    };
  }

  /** User with the typical permissions of the connected services administrator - Co-Admin: No, Connect-Services-Admin: Yes */
  public static get super(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_super_user_name"),
      password: Config.App.getString("imjs_test_super_user_password"),
    };
  }

  /** User with the typical permissions of the connected services administrator - Co-Admin: Yes, Connect-Services-Admin: Yes */
  public static get superManager(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_super_manager_user_name"),
      password: Config.App.getString("imjs_test_super_manager_user_password"),
    };
  }

  public static get qaUser(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_qa_user_name"),
      password: Config.App.getString("imjs_test_qa_user_password"),
    };
  }

  public static get prodUser(): UserCredentials {
    return {
      email: Config.App.getString("imjs_test_prod_user_name"),
      password: Config.App.getString("imjs_test_prod_user_password"),
    };
  }
}
