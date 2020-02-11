/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as chai from "chai";
import { ClientRequestContext, GuidString } from "@bentley/bentleyjs-core";
import { ConnectSettingsClient } from "../SettingsClient";
import { SettingsStatus, SettingsResult, SettingsMapResult } from "../SettingsAdmin";
import { AuthorizationToken, AccessToken } from "../Token";
import { TestConfig, TestUsers } from "./TestConfig";
import { AuthorizedClientRequestContext } from "../AuthorizedClientRequestContext";

// compare simple arrays
function arraysEqual(array1: any, array2: any) {
  if (!array1 || !array2)
    return false;
  if (!(array1 instanceof Array) || !(array2 instanceof Array))
    return false;
  if (array1.length !== array2.length)
    return false;
  for (let index: number = 0; index < array1.length; index++) {
    if (array1[index] !== array2[index])
      return false;
  }
  return true;
}

chai.should();

describe("ConnectSettingsClient-User (#integration)", () => {
  let projectId: GuidString;
  let iModelId: GuidString;
  const settingsClient = new ConnectSettingsClient("1001");
  let requestContext: AuthorizedClientRequestContext;

  before(async () => {
    const authToken: AuthorizationToken = await TestConfig.login();
    const accessToken = await settingsClient.getAccessToken(new ClientRequestContext(), authToken);
    requestContext = new AuthorizedClientRequestContext(accessToken);

    projectId = (await TestConfig.queryProject(requestContext, TestConfig.projectName)).wsgId;
    chai.assert.isDefined(projectId);
    iModelId = (await TestConfig.queryIModel(requestContext, projectId)).wsgId;
    chai.assert.isDefined(iModelId);
  });

  interface AppSetting {
    appString: string;
    appNumber: number;
    appArray: number[];
  }

  // Application User Setting
  it("should save and retrieve a User setting for this Application (#integration)", async () => {
    const appUserSettings: AppSetting[] = [];

    // create an array of settings.
    for (let iSetting: number = 0; iSetting < 6; iSetting++) {
      const multiplier = Math.pow(10, iSetting);
      appUserSettings.push({ appString: `application User String ${iSetting}`, appNumber: 7 * iSetting, appArray: [(iSetting + 1) * multiplier, (iSetting + 2) * multiplier, (iSetting + 3) * multiplier, (iSetting + 4) * multiplier] });
    }

    // delete all the settings, so we know we are creating new ones.
    for (let iSetting: number = 0; iSetting < 6; iSetting++) {
      const deleteResult: SettingsResult = await settingsClient.deleteUserSetting(requestContext, "TestSettings", `AppUser${iSetting}`, true);
      chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");
    }

    // save new settings (deleted above, so we know it's new)
    for (let iSetting: number = 0; iSetting < 6; iSetting++) {
      const saveResult: SettingsResult = await settingsClient.saveUserSetting(requestContext, appUserSettings[iSetting], "TestSettings", `AppUser${iSetting}`, true);
      chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");
    }

    // read back the AppUser results.
    for (let iSetting: number = 0; iSetting < 6; iSetting++) {
      const getResult: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", `AppUser${iSetting}`, true);
      chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
      chai.assert(getResult.setting, "Setting should be returned");
      chai.expect(getResult.setting.appString).equals(appUserSettings[iSetting].appString);
      chai.expect(getResult.setting.appNumber).equals(appUserSettings[iSetting].appNumber);
      chai.assert(arraysEqual(getResult.setting.appArray, appUserSettings[iSetting].appArray), "retrieved array contents correct");
    }

    // change the value of an existing setting
    appUserSettings[0].appString = "new Application User String";
    appUserSettings[0].appNumber = 8;
    appUserSettings[0].appArray.splice(2, 1);  // is now 1, 2, 4
    const saveResult2: SettingsResult = await settingsClient.saveUserSetting(requestContext, appUserSettings[0], "TestSettings", "AppUser0", true);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "AppUser0", true);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.appString).equals(appUserSettings[0].appString);
    chai.expect(getResult2.setting.appNumber).equals(appUserSettings[0].appNumber);
    chai.assert(arraysEqual(getResult2.setting.appArray, appUserSettings[0].appArray), "retrieved array contents correct");

    // now try getting all settings by namespace
    const filterResult: SettingsMapResult = await settingsClient.getUserSettingsByNamespace(requestContext, "TestSettings", true);
    chai.assert(SettingsStatus.Success === filterResult.status, "Return by namespace should work");
    for (let iSetting: number = 0; iSetting < 6; iSetting++) {
      const setting: any | undefined = filterResult.settingsMap!.get(`AppUser${iSetting}`);
      chai.assert(setting !== undefined, `Setting named 'appUser${iSetting}' should be found in namespace 'TestSettings'`);
      chai.assert(setting.appNumber === appUserSettings[iSetting].appNumber, `Setting named 'appUser${iSetting}' should have appNumber of ${appUserSettings[iSetting].appNumber}`);
      chai.assert(setting.appString === appUserSettings[iSetting].appString, `Setting named 'appUser${iSetting}' should have appString of ${appUserSettings[iSetting].appString}`);
      chai.assert(arraysEqual(setting.appArray, appUserSettings[iSetting].appArray), `Setting named 'appUser${iSetting}' should have correct appArray`);
    }
  });

  // Project/Application/User -specific  Setting
  it("should save and retrieve a Project User setting for this Application (#integration)", async () => {
    const appProjectUserSetting = { appString: "application/Project User String", appNumber: 213, appArray: [10, 20, 30, 40, 50] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteUserSetting(requestContext, "TestSettings", "AppProjectUser", true, projectId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveUserSetting(requestContext, appProjectUserSetting, "TestSettings", "AppProjectUser", true, projectId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "AppProjectUser", true, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.appString).equals(appProjectUserSetting.appString);
    chai.expect(getResult.setting.appNumber).equals(appProjectUserSetting.appNumber);
    chai.assert(arraysEqual(getResult.setting.appArray, appProjectUserSetting.appArray), "retrieved array contents correct");

    // change the value of an existing setting
    appProjectUserSetting.appString = "new Application Project User String";
    appProjectUserSetting.appNumber = 8;
    appProjectUserSetting.appArray.splice(2, 1);
    const saveResult2: SettingsResult = await settingsClient.saveUserSetting(requestContext, appProjectUserSetting, "TestSettings", "AppProjectUser", true, projectId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "AppProjectUser", true, projectId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.appString).equals(appProjectUserSetting.appString);
    chai.expect(getResult2.setting.appNumber).equals(appProjectUserSetting.appNumber);
    chai.assert(arraysEqual(getResult2.setting.appArray, appProjectUserSetting.appArray), "retrieved array contents correct");

  });

  // iModel/Application/User -specific  Setting
  it("should save and retrieve an iModel User setting for this Application (#integration)", async () => {
    const appIModelUserSetting = { appString: "application/iModel User String", appNumber: 41556, appArray: [1, 2, 3, 5, 8, 13, 21, 34] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteUserSetting(requestContext, "TestSettings", "AppIModelUser", true, projectId, iModelId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveUserSetting(requestContext, appIModelUserSetting, "TestSettings", "AppIModelUser", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "AppIModelUser", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.appString).equals(appIModelUserSetting.appString);
    chai.expect(getResult.setting.appNumber).equals(appIModelUserSetting.appNumber);
    chai.assert(arraysEqual(getResult.setting.appArray, appIModelUserSetting.appArray), "retrieved array contents correct");

    // change the value of an existing setting
    appIModelUserSetting.appString = "new Application User iModel String";
    appIModelUserSetting.appNumber = 32757;
    appIModelUserSetting.appArray.splice(3, 2);
    const saveResult2: SettingsResult = await settingsClient.saveUserSetting(requestContext, appIModelUserSetting, "TestSettings", "AppIModelUser", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "AppIModelUser", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.appString).equals(appIModelUserSetting.appString);
    chai.expect(getResult2.setting.appNumber).equals(appIModelUserSetting.appNumber);
    chai.assert(arraysEqual(getResult2.setting.appArray, appIModelUserSetting.appArray), "retrieved array contents correct");
  });

  // Project/User -specific  Setting
  it("should save and retrieve a Project User setting (Application independent) (#integration)", async () => {
    const projectUserSetting = { projString: "Project User String", projNumber: 213, projArray: [1, 3, 5, 7, 11, 13, 17] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteUserSetting(requestContext, "TestSettings", "ProjectUser", false, projectId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveUserSetting(requestContext, projectUserSetting, "TestSettings", "ProjectUser", false, projectId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "ProjectUser", false, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.projString).equals(projectUserSetting.projString);
    chai.expect(getResult.setting.projNumber).equals(projectUserSetting.projNumber);
    chai.assert(arraysEqual(getResult.setting.projArray, projectUserSetting.projArray), "retrieved array contents correct");

    // change the value of an existing setting
    projectUserSetting.projString = "new Project User String";
    projectUserSetting.projNumber = 8;
    projectUserSetting.projArray.splice(2, 2);
    const saveResult2: SettingsResult = await settingsClient.saveUserSetting(requestContext, projectUserSetting, "TestSettings", "ProjectUser", false, projectId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "ProjectUser", false, projectId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.projString).equals(projectUserSetting.projString);
    chai.expect(getResult2.setting.projNumber).equals(projectUserSetting.projNumber);
    chai.assert(arraysEqual(getResult2.setting.projArray, projectUserSetting.projArray), "retrieved array contents correct");

  });

  // IModel/User -specific  Setting
  it("should save and retrieve an IModel User setting (Application independent) (#integration)", async () => {
    const iModelUserSetting = { iModelString: "iModel User String", iModelNumber: 723, iModelArray: [99, 98, 97, 96, 95] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteUserSetting(requestContext, "TestSettings", "IModelUser", false, projectId, iModelId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveUserSetting(requestContext, iModelUserSetting, "TestSettings", "IModelUser", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "IModelUser", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.iModelString).equals(iModelUserSetting.iModelString);
    chai.expect(getResult.setting.iModelNumber).equals(iModelUserSetting.iModelNumber);
    chai.assert(arraysEqual(getResult.setting.iModelArray, iModelUserSetting.iModelArray), "retrieved array contents correct");

    // change the value of an existing setting
    iModelUserSetting.iModelString = "new iModel User String";
    iModelUserSetting.iModelNumber = 327;
    iModelUserSetting.iModelArray.splice(2, 2);
    const saveResult2: SettingsResult = await settingsClient.saveUserSetting(requestContext, iModelUserSetting, "TestSettings", "IModelUser", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "IModelUser", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.iModelString).equals(iModelUserSetting.iModelString);
    chai.expect(getResult2.setting.iModelNumber).equals(iModelUserSetting.iModelNumber);
    chai.assert(arraysEqual(getResult2.setting.iModelArray, iModelUserSetting.iModelArray), "retrieved array contents correct");

  });

});

describe("ConnectSettingsClient-Administrator (#integration)", () => {
  let projectId: GuidString;
  let iModelId: GuidString;
  let settingsClient: ConnectSettingsClient;
  let requestContext: AuthorizedClientRequestContext;

  before(async () => {
    if (TestConfig.enableMocks)
      return;

    settingsClient = new ConnectSettingsClient("1001");
    const authToken: AuthorizationToken = await TestConfig.login(TestUsers.super);
    const accessToken = await settingsClient.getAccessToken(new ClientRequestContext(), authToken);
    requestContext = new AuthorizedClientRequestContext(accessToken);

    projectId = (await TestConfig.queryProject(requestContext, TestConfig.projectName)).wsgId;
    chai.assert.isDefined(projectId);
    iModelId = (await TestConfig.queryIModel(requestContext, projectId)).wsgId;
    chai.assert.isDefined(iModelId);
  });

  // Application Setting with the same name as a User App Setting (make sure they are independently stored.)
  it("should maintain app-specific settings separately from user settings with the same namespace/name (#integration)", async () => {
    const independentAppSetting = { stringValue: "App independence test", numberValue: 82919, arrayValue: [10, 14, 84, 1, 8, 87, 5, 13, 90, 7, 13, 92] };

    const deleteResult: SettingsResult = await settingsClient.deleteSetting(requestContext, "TestSettings", "AppUser1", true);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save the new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSetting(requestContext, independentAppSetting, "TestSettings", "AppUser1", true);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppUser1", true);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.stringValue).equals(independentAppSetting.stringValue);
    chai.expect(getResult.setting.numberValue).equals(independentAppSetting.numberValue);
    chai.assert(arraysEqual(getResult.setting.arrayValue, independentAppSetting.arrayValue), "retrieved array contents correct");

  });

  it("should save and retrieve an Application Setting (#integration)", async () => {
    const appSetting = { appString: "application String", appNumber: 112, appArray: [101, 102, 103, 104] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSetting(requestContext, "TestSettings", "AppSetting", true);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSetting(requestContext, appSetting, "TestSettings", "AppSetting", true);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppSetting", true);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.appString).equals(appSetting.appString);
    chai.expect(getResult.setting.appNumber).equals(appSetting.appNumber);
    chai.assert(arraysEqual(getResult.setting.appArray, appSetting.appArray), "retrieved array contents correct");

    // change the value of an existing setting
    appSetting.appString = "new Application String";
    appSetting.appArray.splice(2, 1);
    const saveResult2: SettingsResult = await settingsClient.saveSetting(requestContext, appSetting, "TestSettings", "AppSetting", true);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppSetting", true);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.appString).equals(appSetting.appString);
    chai.expect(getResult2.setting.appNumber).equals(appSetting.appNumber);
    chai.assert(arraysEqual(getResult2.setting.appArray, appSetting.appArray), "retrieved array contents correct");

  });

  // Application/Project Setting
  it("should save and retrieve a Project/Application Setting (#integration)", async () => {
    const projectAppSetting = { projAppString: "project Application String", projAppNumber: 592, projAppArray: [2101, 2102, 2103, 2104] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSetting(requestContext, "TestSettings", "AppProjectSetting", true, projectId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSetting(requestContext, projectAppSetting, "TestSettings", "AppProjectSetting", true, projectId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppProjectSetting", true, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.projAppString).equals(projectAppSetting.projAppString);
    chai.expect(getResult.setting.projAppNumber).equals(projectAppSetting.projAppNumber);
    chai.assert(arraysEqual(getResult.setting.projAppArray, projectAppSetting.projAppArray), "retrieved array contents correct");

    // change the value of an existing setting
    projectAppSetting.projAppString = "new Project Application String";
    projectAppSetting.projAppNumber = 1578;
    projectAppSetting.projAppArray.splice(2, 1);
    const saveResult2: SettingsResult = await settingsClient.saveSetting(requestContext, projectAppSetting, "TestSettings", "AppProjectSetting", true, projectId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppProjectSetting", true, projectId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.projAppString).equals(projectAppSetting.projAppString);
    chai.expect(getResult2.setting.projAppNumber).equals(projectAppSetting.projAppNumber);
    chai.assert(arraysEqual(getResult2.setting.projAppArray, projectAppSetting.projAppArray), "retrieved array contents correct");

  });

  // Application/IModel Setting
  it("should save and retrieve an iModel/Application Setting (#integration)", async () => {
    const iModelAppSetting = { iModelAppString: "iModel Application String", iModelAppNumber: 592, iModelAppArray: [3211, 3212, 3213, 3214, 3215] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSetting(requestContext, "TestSettings", "AppIModelSettings", true, projectId, iModelId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSetting(requestContext, iModelAppSetting, "TestSettings", "AppIModelSettings", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppIModelSettings", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.iModelAppString).equals(iModelAppSetting.iModelAppString);
    chai.expect(getResult.setting.iModelAppNumber).equals(iModelAppSetting.iModelAppNumber);
    chai.assert(arraysEqual(getResult.setting.iModelAppArray, iModelAppSetting.iModelAppArray), "retrieved array contents correct");

    // change the value of an existing setting
    iModelAppSetting.iModelAppString = "new IModel Application String";
    iModelAppSetting.iModelAppNumber = 1578;
    iModelAppSetting.iModelAppArray.splice(2, 1);
    const saveResult2: SettingsResult = await settingsClient.saveSetting(requestContext, iModelAppSetting, "TestSettings", "AppIModelSettings", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppIModelSettings", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.iModelAppString).equals(iModelAppSetting.iModelAppString);
    chai.expect(getResult2.setting.iModelAppNumber).equals(iModelAppSetting.iModelAppNumber);
    chai.assert(arraysEqual(getResult2.setting.iModelAppArray, iModelAppSetting.iModelAppArray), "retrieved array contents correct");

  });

  // Project Setting (application independent)
  it("should save and retrieve a Project Setting (Application independent) (#integration)", async () => {
    const projectSettingTemplate = { projNumber: 592, projArray: [8765, 4321, 9876, 5432, 1987] };

    const projectSettings: any[] = [];
    for (let iSetting = 0; iSetting < 5; iSetting++) {
      const tmpArray = projectSettingTemplate.projArray.map((value) => value * Math.pow(10, iSetting - 1));
      projectSettings.push({ projString: `Project String ${iSetting}`, projNumber: projectSettingTemplate.projNumber + 2 * iSetting, projArray: tmpArray });
    }

    // start by deleting the settings we're going to create.
    for (let iSetting = 0; iSetting < 5; iSetting++) {
      const deleteResult: SettingsResult = await settingsClient.deleteSetting(requestContext, "TestSettings", `ProjectSettings${iSetting}`, false, projectId);
      chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");
    }

    // save new settings (deleted above, so we know they are new)
    for (let iSetting = 0; iSetting < 5; iSetting++) {
      const saveResult: SettingsResult = await settingsClient.saveSetting(requestContext, projectSettings[iSetting], "TestSettings", `ProjectSettings${iSetting}`, false, projectId);
      chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");
    }

    // read back the result.
    for (let iSetting = 0; iSetting < 5; iSetting++) {
      const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", `ProjectSettings${iSetting}`, false, projectId);
      chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
      chai.assert(getResult.setting, "Setting should be returned");
      chai.expect(getResult.setting.projString).equals(projectSettings[iSetting].projString);
      chai.expect(getResult.setting.projNumber).equals(projectSettings[iSetting].projNumber);
      chai.assert(arraysEqual(getResult.setting.projArray, projectSettings[iSetting].projArray), "retrieved array contents correct");
    }

    // change the value of an existing setting
    projectSettings[1].projString = "new Project String";
    projectSettings[1].projNumber = 1578;
    projectSettings[1].projArray.splice(2, 1);
    const saveResult2: SettingsResult = await settingsClient.saveSetting(requestContext, projectSettings[1], "TestSettings", "ProjectSettings1", false, projectId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "ProjectSettings1", false, projectId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.projString).equals(projectSettings[1].projString);
    chai.expect(getResult2.setting.projNumber).equals(projectSettings[1].projNumber);
    chai.assert(arraysEqual(getResult2.setting.projArray, projectSettings[1].projArray), "retrieved array contents correct");

    // now try getting all the Project settings by namespace
    const filterResult: SettingsMapResult = await settingsClient.getSettingsByNamespace(requestContext, "TestSettings", false, projectId);
    chai.assert(SettingsStatus.Success === filterResult.status, "Return by namespace should work");
    for (let iSetting: number = 0; iSetting < 5; iSetting++) {
      const setting: any | undefined = filterResult.settingsMap!.get(`ProjectSettings${iSetting}`);
      chai.assert(setting !== undefined, `Setting named 'ProjectSettings${iSetting}' should be found in namespace 'TestSettings'`);
      chai.assert(setting.projNumber === projectSettings[iSetting].projNumber, `Setting named 'ProjectSettings${iSetting}' should have projNumber of ${projectSettings[iSetting].projNumber}`);
      chai.assert(setting.projString === projectSettings[iSetting].projString, `Setting named 'ProjectSettings${iSetting}' should have projString of ${projectSettings[iSetting].projString}`);
      chai.assert(arraysEqual(setting.projArray, projectSettings[iSetting].projArray), `Setting named 'ProjectSettings${iSetting}' should have correct projArray`);
    }

  });

  // IModel Setting (application independent)
  it("should save and retrieve an iModel Setting (Application independent) (#integration)", async () => {
    const iModelSetting = { iModelString: "iModel String", iModelNumber: 592, iModelArray: [33482, 29385, 99742, 32195, 99475] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSetting(requestContext, "TestSettings", "IModelSettings", false, projectId, iModelId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSetting(requestContext, iModelSetting, "TestSettings", "IModelSettings", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "IModelSettings", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.iModelString).equals(iModelSetting.iModelString);
    chai.expect(getResult.setting.iModelNumber).equals(iModelSetting.iModelNumber);
    chai.assert(arraysEqual(getResult.setting.iModelArray, iModelSetting.iModelArray), "retrieved array contents correct");

    // change the value of an existing setting
    iModelSetting.iModelString = "new IModel String";
    iModelSetting.iModelNumber = 1578;
    iModelSetting.iModelArray.splice(3, 1);
    const saveResult2: SettingsResult = await settingsClient.saveSetting(requestContext, iModelSetting, "TestSettings", "IModelSettings", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "IModelSettings", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.iModelString).equals(iModelSetting.iModelString);
    chai.expect(getResult2.setting.iModelNumber).equals(iModelSetting.iModelNumber);
    chai.assert(arraysEqual(getResult2.setting.iModelArray, iModelSetting.iModelArray), "retrieved array contents correct");
  });
});

describe("Reading non-user settings from ordinary user (#integration)", () => {
  let projectId: GuidString;
  let iModelId: GuidString;
  let settingsClient: ConnectSettingsClient;
  let requestContext: AuthorizedClientRequestContext;

  before(async () => {
    settingsClient = new ConnectSettingsClient("1001");
    const authToken: AuthorizationToken = await TestConfig.login();
    const accessToken: AccessToken = await settingsClient.getAccessToken(new ClientRequestContext(), authToken);
    requestContext = new AuthorizedClientRequestContext(accessToken);

    projectId = (await TestConfig.queryProject(requestContext, TestConfig.projectName)).wsgId;
    chai.assert.isDefined(projectId);
    iModelId = (await TestConfig.queryIModel(requestContext, projectId)).wsgId;
    chai.assert.isDefined(iModelId);
  });

  // Application Setting
  it("should successfully retrieve an Application Setting (#integration)", async () => {
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppSetting", true);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.appString).equals("new Application String");
  });

  // Application/Project Setting
  it("should successfully retrieve a Project/Application Setting (#integration)", async () => {
    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppProjectSetting", true, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.projAppString).equals("new Project Application String");
  });

  // Application/IModel Setting
  it("should successfully retrieve an iModel/Application Setting (#integration)", async () => {
    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "AppIModelSettings", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.iModelAppString).equals("new IModel Application String");
  });

  // Project Setting (application independent)
  it("should successfully retrieve a Project Setting (Application independent)  (#integration)", async () => {
    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "ProjectSettings1", false, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.projString).equals("new Project String");
  });

  // IModel Setting (application independent)
  it("should successfully retrieve an iModel Setting (Application independent) (#integration)", async () => {
    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSetting(requestContext, "TestSettings", "IModelSettings", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.iModelString).equals("new IModel String");
  });

});

describe("ConnectSettingsClient-Shared (#integration)", () => {
  let projectId: GuidString;
  let iModelId: GuidString;
  const settingsClient = new ConnectSettingsClient("1001");
  let requestContext: AuthorizedClientRequestContext;

  before(async () => {
    const authToken: AuthorizationToken = await TestConfig.login();
    const accessToken = await settingsClient.getAccessToken(new ClientRequestContext(), authToken);
    requestContext = new AuthorizedClientRequestContext(accessToken);

    projectId = (await TestConfig.queryProject(requestContext, TestConfig.projectName)).wsgId;
    chai.assert.isDefined(projectId);
    iModelId = (await TestConfig.queryIModel(requestContext, projectId)).wsgId;
    chai.assert.isDefined(iModelId);
  });

  // Note: There is no Application Shared Setting, so don't test that.

  // Project/Application/Shared -specific  Setting
  it("should save and retrieve a Project Shared setting for this Application (#integration)", async () => {
    const appProjectSharedSetting = { appString: "application/Project Shared String", appNumber: 213, appArray: [10, 20, 30, 40, 50] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSharedSetting(requestContext, "TestSettings", "AppProjectShared", true, projectId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSharedSetting(requestContext, appProjectSharedSetting, "TestSettings", "AppProjectShared", true, projectId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "AppProjectShared", true, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.appString).equals(appProjectSharedSetting.appString);
    chai.expect(getResult.setting.appNumber).equals(appProjectSharedSetting.appNumber);
    chai.assert(arraysEqual(getResult.setting.appArray, appProjectSharedSetting.appArray), "retrieved array contents correct");

    // change the value of an existing setting
    appProjectSharedSetting.appString = "new Application Project Shared String";
    appProjectSharedSetting.appNumber = 8;
    appProjectSharedSetting.appArray.splice(2, 1);
    const saveResult2: SettingsResult = await settingsClient.saveSharedSetting(requestContext, appProjectSharedSetting, "TestSettings", "AppProjectShared", true, projectId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "AppProjectShared", true, projectId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.appString).equals(appProjectSharedSetting.appString);
    chai.expect(getResult2.setting.appNumber).equals(appProjectSharedSetting.appNumber);
    chai.assert(arraysEqual(getResult2.setting.appArray, appProjectSharedSetting.appArray), "retrieved array contents correct");

  });

  // iModel/Application/Shared -specific  Setting
  it("should save and retrieve an iModel Shared setting for this Application (#integration)", async () => {
    const appIModelSharedSetting = { appString: "application/iModel Shared String", appNumber: 41556, appArray: [1, 2, 3, 5, 8, 13, 21, 34] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSharedSetting(requestContext, "TestSettings", "AppIModelShared", true, projectId, iModelId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSharedSetting(requestContext, appIModelSharedSetting, "TestSettings", "AppIModelShared", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "AppIModelShared", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.appString).equals(appIModelSharedSetting.appString);
    chai.expect(getResult.setting.appNumber).equals(appIModelSharedSetting.appNumber);
    chai.assert(arraysEqual(getResult.setting.appArray, appIModelSharedSetting.appArray), "retrieved array contents correct");

    // change the value of an existing setting
    appIModelSharedSetting.appString = "new Application Shared iModel String";
    appIModelSharedSetting.appNumber = 32757;
    appIModelSharedSetting.appArray.splice(3, 2);
    const saveResult2: SettingsResult = await settingsClient.saveSharedSetting(requestContext, appIModelSharedSetting, "TestSettings", "AppIModelShared", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "AppIModelShared", true, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.appString).equals(appIModelSharedSetting.appString);
    chai.expect(getResult2.setting.appNumber).equals(appIModelSharedSetting.appNumber);
    chai.assert(arraysEqual(getResult2.setting.appArray, appIModelSharedSetting.appArray), "retrieved array contents correct");
  });

  // Project/Shared -specific  Setting
  it("should save and retrieve a Project Shared setting (Application independent) (#integration)", async () => {
    const projectSharedSetting = { projString: "Project Shared String", projNumber: 213, projArray: [1, 3, 5, 7, 11, 13, 17] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSharedSetting(requestContext, "TestSettings", "ProjectShared", false, projectId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSharedSetting(requestContext, projectSharedSetting, "TestSettings", "ProjectShared", false, projectId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "ProjectShared", false, projectId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.projString).equals(projectSharedSetting.projString);
    chai.expect(getResult.setting.projNumber).equals(projectSharedSetting.projNumber);
    chai.assert(arraysEqual(getResult.setting.projArray, projectSharedSetting.projArray), "retrieved array contents correct");

    // change the value of an existing setting
    projectSharedSetting.projString = "new Project Shared String";
    projectSharedSetting.projNumber = 8;
    projectSharedSetting.projArray.splice(2, 2);
    const saveResult2: SettingsResult = await settingsClient.saveSharedSetting(requestContext, projectSharedSetting, "TestSettings", "ProjectShared", false, projectId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "ProjectShared", false, projectId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.projString).equals(projectSharedSetting.projString);
    chai.expect(getResult2.setting.projNumber).equals(projectSharedSetting.projNumber);
    chai.assert(arraysEqual(getResult2.setting.projArray, projectSharedSetting.projArray), "retrieved array contents correct");

  });

  // IModel/Shared -specific  Setting
  it("should save and retrieve an IModel Shared setting (Application independent) (#integration)", async () => {
    const iModelSharedSetting = { iModelString: "iModel Shared String", iModelNumber: 723, iModelArray: [99, 98, 97, 96, 95] };

    // start by deleting the setting we're going to create.
    const deleteResult: SettingsResult = await settingsClient.deleteSharedSetting(requestContext, "TestSettings", "IModelShared", false, projectId, iModelId);
    chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");

    // save a new setting (deleted above, so we know it's new)
    const saveResult: SettingsResult = await settingsClient.saveSharedSetting(requestContext, iModelSharedSetting, "TestSettings", "IModelShared", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult.status, "Save should work");

    // read back the result.
    const getResult: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "IModelShared", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
    chai.assert(getResult.setting, "Setting should be returned");
    chai.expect(getResult.setting.iModelString).equals(iModelSharedSetting.iModelString);
    chai.expect(getResult.setting.iModelNumber).equals(iModelSharedSetting.iModelNumber);
    chai.assert(arraysEqual(getResult.setting.iModelArray, iModelSharedSetting.iModelArray), "retrieved array contents correct");

    // change the value of an existing setting
    iModelSharedSetting.iModelString = "new iModel Shared String";
    iModelSharedSetting.iModelNumber = 327;
    iModelSharedSetting.iModelArray.splice(2, 2);
    const saveResult2: SettingsResult = await settingsClient.saveSharedSetting(requestContext, iModelSharedSetting, "TestSettings", "IModelShared", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === saveResult2.status, "Second save should work");
    const getResult2: SettingsResult = await settingsClient.getSharedSetting(requestContext, "TestSettings", "IModelShared", false, projectId, iModelId);
    chai.assert(SettingsStatus.Success === getResult2.status, "Retrieval should work");
    chai.assert(getResult2.setting, "Setting should be returned");
    chai.expect(getResult2.setting.iModelString).equals(iModelSharedSetting.iModelString);
    chai.expect(getResult2.setting.iModelNumber).equals(iModelSharedSetting.iModelNumber);
    chai.assert(arraysEqual(getResult2.setting.iModelArray, iModelSharedSetting.iModelArray), "retrieved array contents correct");

  });

  it("should be able to retrieve more than 20 IModel Shared settings by Namespace (Application independent)", async () => {
    // start by deleting the settings we are going to create.
    for (let iSetting = 0; iSetting < 42; ++iSetting) {
      const deleteResult: SettingsResult = await settingsClient.deleteSharedSetting(requestContext, "NamespaceTest", `ManySettings${iSetting}`, false, projectId, iModelId);
      chai.assert((SettingsStatus.Success === deleteResult.status) || (SettingsStatus.SettingNotFound === deleteResult.status), "Delete should work or give SettingNotFound");
    }

    // now create many settings.
    for (let iSetting = 0; iSetting < 40; ++iSetting) {
      const newSetting: any = { testString: `Setting${iSetting}`, value: iSetting };
      const saveResult: SettingsResult = await settingsClient.saveSharedSetting(requestContext, newSetting, "NamespaceTest", `ManySettings${iSetting}`, false, projectId, iModelId);
      chai.assert((SettingsStatus.Success === saveResult.status), `Save of ManySettings${iSetting} should work`);
    }

    // now read back the (hopefully 40) settings by namespace and check them.
    let readResult: SettingsMapResult = await settingsClient.getSharedSettingsByNamespace(requestContext, "NamespaceTest", false, projectId, iModelId);
    chai.assert((SettingsStatus.Success === readResult.status), "Reading settings by namespace 'NamespaceTest' should work");
    chai.assert(((undefined !== readResult.settingsMap) && (40 === readResult.settingsMap.size)), "NamespaceTest should contain 40 settings");
    for (let iSetting = 0; iSetting < 40; iSetting++) {
      const returnedValue: any = readResult.settingsMap!.get(`ManySettings${iSetting}`);
      chai.assert (((undefined !== returnedValue) && (returnedValue.testString === `Setting${iSetting}`) && (returnedValue.value === iSetting)), `Returned Setting ${iSetting} should contain the right values`);
    }

    // add two more and read again.
    for (let iSetting = 40; iSetting < 42; ++iSetting) {
      const newSetting: any = { testString: `Setting${iSetting}`, value: iSetting };
      const saveResult: SettingsResult = await settingsClient.saveSharedSetting(requestContext, newSetting, "NamespaceTest", `ManySettings${iSetting}`, false, projectId, iModelId);
      chai.assert((SettingsStatus.Success === saveResult.status), `Save of ManySettings${iSetting} should work`);
    }

    // now read back the now (hopefully 42) settings by namespace and check them again/
    readResult = await settingsClient.getSharedSettingsByNamespace(requestContext, "NamespaceTest", false, projectId, iModelId);
    chai.assert((SettingsStatus.Success === readResult.status), "Reading settings by namespace 'NamespaceTest' should work");
    chai.assert(((undefined !== readResult.settingsMap) && (42 === readResult.settingsMap.size)), "NamespaceTest should contain 40 settings");
    for (let iSetting = 0; iSetting < 42; iSetting++) {
      const returnedValue: any = readResult.settingsMap!.get(`ManySettings${iSetting}`);
      chai.assert (((undefined !== returnedValue) && (returnedValue.testString === `Setting${iSetting}`) && (returnedValue.value === iSetting)), `Returned Setting ${iSetting} should contain the right values`);
    }

  });

});

describe("ConnectSettingsClient-User (#integration)", () => {
  let projectId: GuidString;
  let iModelId: GuidString;
  const settingsClient = new ConnectSettingsClient("1001");
  let requestContext: AuthorizedClientRequestContext;

  before(async () => {
    const authToken: AuthorizationToken = await TestConfig.login();
    const accessToken = await settingsClient.getAccessToken(new ClientRequestContext(), authToken);
    requestContext = new AuthorizedClientRequestContext(accessToken);

    projectId = (await TestConfig.queryProject(requestContext, TestConfig.projectName)).wsgId;
    chai.assert.isDefined(projectId);
    iModelId = (await TestConfig.queryIModel(requestContext, projectId)).wsgId;
    chai.assert.isDefined(iModelId);
  });

  // Application User Setting
  it("should still retrieve a user setting after an App setting with the same name is stored. (#integration)", async () => {
    const appUserSettings = { appString: "application User String 1", appNumber: 7, appArray: [20, 30, 40, 50] };

    // read back the AppUser results.
    for (let iSetting: number = 0; iSetting < 6; iSetting++) {
      const getResult: SettingsResult = await settingsClient.getUserSetting(requestContext, "TestSettings", "AppUser1", true);
      chai.assert(SettingsStatus.Success === getResult.status, "Retrieval should work");
      chai.assert(getResult.setting, "Setting should be returned");
      chai.expect(getResult.setting.appString).equals(appUserSettings.appString);
      chai.expect(getResult.setting.appNumber).equals(appUserSettings.appNumber);
      chai.assert(arraysEqual(getResult.setting.appArray, appUserSettings.appArray), "retrieved array contents correct");
    }
  });

});
