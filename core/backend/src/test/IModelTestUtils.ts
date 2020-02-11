/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { assert } from "chai";
import { Logger, OpenMode, Id64, Id64String, IDisposable, BeEvent, LogLevel, BentleyLoggerCategory } from "@bentley/bentleyjs-core";
import { AccessToken, Config, ChangeSet, AuthorizedClientRequestContext, ClientsLoggerCategory } from "@bentley/imodeljs-clients";
import { Code, ElementProps, RpcManager, GeometricElement3dProps, IModel, IModelReadRpcInterface, RelatedElement, RpcConfiguration, CodeProps } from "@bentley/imodeljs-common";
import {
  IModelHostConfiguration, IModelHost, BriefcaseManager, IModelDb, Model, Element,
  InformationPartitionElement, SpatialCategory, IModelJsFs, PhysicalPartition, PhysicalModel, SubjectOwnsPartitionElements,
  IModelJsNative, NativeLoggerCategory,
} from "../imodeljs-backend";
import { BackendLoggerCategory as BackendLoggerCategory } from "../BackendLoggerCategory";
import { KnownTestLocations } from "./KnownTestLocations";
import { HubUtility } from "./integration/HubUtility";
import * as path from "path";
import { Schema, Schemas } from "../Schema";
import { ElementDrivesElement, RelationshipProps } from "../Relationship";
import { PhysicalElement } from "../Element";
import { ClassRegistry } from "../ClassRegistry";
import { IModelJsConfig } from "@bentley/config-loader/lib/IModelJsConfig";
import { AuthorizedBackendRequestContext } from "../BackendRequestContext";

import { TestUsers, UserCredentials } from "./TestUsers";
import { getToken } from "@bentley/oidc-signin-tool";

/** Class for simple test timing */
export class Timer {
  private _label: string;
  private _start: Date;
  constructor(label: string) {
    this._label = "\t" + label;
    this._start = new Date();
  }

  public end() {

    const stop = new Date();
    const elapsed = stop.getTime() - this._start.getTime();
    // tslint:disable-next-line:no-console
    console.log(`${this._label}: ${elapsed}ms`);
  }
}

export class TestIModelInfo {
  private _name: string;
  private _id: string;
  private _localReadonlyPath: string;
  private _localReadWritePath: string;
  private _changeSets: ChangeSet[];

  constructor(name: string) {
    this._name = name;
    this._id = "";
    this._localReadonlyPath = "";
    this._localReadWritePath = "";
    this._changeSets = [];
  }

  get name(): string { return this._name; }
  set name(name: string) { this._name = name; }
  get id(): string { return this._id; }
  set id(id: string) { this._id = id; }
  get localReadonlyPath(): string { return this._localReadonlyPath; }
  set localReadonlyPath(localReadonlyPath: string) { this._localReadonlyPath = localReadonlyPath; }
  get localReadWritePath(): string { return this._localReadWritePath; }
  set localReadWritePath(localReadWritePath: string) { this._localReadWritePath = localReadWritePath; }
  get changeSets(): ChangeSet[] { return this._changeSets; }
  set changeSets(changeSets: ChangeSet[]) { this._changeSets = changeSets; }
}

RpcConfiguration.developmentMode = true;

// Initialize the RPC interface classes used by tests
RpcManager.initializeInterface(IModelReadRpcInterface);

export interface IModelTestUtilsOpenOptions {
  copyFilename?: string;
  enableTransactions?: boolean;
  openMode?: OpenMode;
}

/**
 * Disables native code assertions from firing. This can be used by tests that intentionally
 * test failing operations. If those failing operations raise assertions in native code, the test
 * would fail unexpectedly in a debug build. In that case the native code assertions can be disabled with
 * this class.
 */
export class DisableNativeAssertions implements IDisposable {
  private _native: IModelJsNative.DisableNativeAssertions | undefined;

  constructor() {
    this._native = new IModelHost.platform.DisableNativeAssertions();
  }

  public dispose(): void {
    if (!this._native)
      return;

    this._native!.dispose();
    this._native = undefined;
  }
}

export class TestBim extends Schema {
  public static get schemaName(): string { return "TestBim"; }

}
export interface TestRelationshipProps extends RelationshipProps {
  property1: string;
}
export class TestElementDrivesElement extends ElementDrivesElement implements TestRelationshipProps {
  public static get className(): string { return "TestElementDrivesElement"; }
  public property1!: string;
  public static rootChanged = new BeEvent<(props: RelationshipProps, imodel: IModelDb) => void>();
  public static validateOutput = new BeEvent<(props: RelationshipProps, imodel: IModelDb) => void>();
  public static deletedDependency = new BeEvent<(props: RelationshipProps, imodel: IModelDb) => void>();
  public static onRootChanged(props: RelationshipProps, imodel: IModelDb): void { this.rootChanged.raiseEvent(props, imodel); }
  public static onValidateOutput(props: RelationshipProps, imodel: IModelDb): void { this.validateOutput.raiseEvent(props, imodel); }
  public static onDeletedDependency(props: RelationshipProps, imodel: IModelDb): void { this.deletedDependency.raiseEvent(props, imodel); }
}
export interface TestPhysicalObjectProps extends GeometricElement3dProps {
  intProperty: number;
}
export class TestPhysicalObject extends PhysicalElement implements TestPhysicalObjectProps {
  public static get className(): string { return "TestPhysicalObject"; }
  public intProperty!: number;
  public static beforeOutputsHandled = new BeEvent<(id: Id64String, imodel: IModelDb) => void>();
  public static allInputsHandled = new BeEvent<(id: Id64String, imodel: IModelDb) => void>();
  public static onBeforeOutputsHandled(id: Id64String, imodel: IModelDb): void { this.beforeOutputsHandled.raiseEvent(id, imodel); }
  public static onAllInputsHandled(id: Id64String, imodel: IModelDb): void { this.allInputsHandled.raiseEvent(id, imodel); }
}

export class IModelTestUtils {
  public static async getTestModelInfo(requestContext: AuthorizedClientRequestContext, testProjectId: string, iModelName: string): Promise<TestIModelInfo> {
    const iModelInfo = new TestIModelInfo(iModelName);
    iModelInfo.id = await HubUtility.queryIModelIdByName(requestContext, testProjectId, iModelInfo.name);

    const cacheDir = IModelHost.configuration!.briefcaseCacheDir;
    iModelInfo.localReadonlyPath = path.join(cacheDir, iModelInfo.id, "readOnly");
    iModelInfo.localReadWritePath = path.join(cacheDir, iModelInfo.id, "readWrite");

    iModelInfo.changeSets = await BriefcaseManager.imodelClient.changeSets.get(requestContext, iModelInfo.id);
    return iModelInfo;
  }

  // Cache the users and access token so each call doesn't need to sign-in again
  private static _testUsers: Map<string, AccessToken> = new Map<string, AccessToken>();

  public static async getTestUserRequestContext(userCredentials: UserCredentials = TestUsers.regular): Promise<AuthorizedBackendRequestContext> {
    // TODO: This caching won't work if the current token times out.  Need to implement some kind of refresh or purge it from the cache when it expires
    // to trigger another signin cycle.
    let accessToken: AccessToken;
    if (IModelTestUtils._testUsers.has(userCredentials.email))
      accessToken = IModelTestUtils._testUsers.get(userCredentials.email)!;
    else {
      accessToken = await getToken(userCredentials.email, userCredentials.password, TestUsers.scopes, TestUsers.oidcConfig, Config.App.getNumber("imjs_buddi_resolve_url_using_region", 0));
      IModelTestUtils._testUsers.set(userCredentials.email, accessToken);
    }

    return new AuthorizedBackendRequestContext(accessToken);
  }

  public static async getUlasTestUserRequestContext(userCredentials: UserCredentials = TestUsers.regular): Promise<AuthorizedBackendRequestContext> {
    // TODO: This caching won't work if the current token times out.  Need to implement some kind of refresh or purge it from the cache when it expires
    // to trigger another signin cycle.
    let accessToken: AccessToken;
    if (IModelTestUtils._testUsers.has(userCredentials.email))
      accessToken = IModelTestUtils._testUsers.get(userCredentials.email)!;
    else {
      accessToken = await getToken(userCredentials.email, userCredentials.password, TestUsers.ulasScopes, TestUsers.ulasOidcConfig, Config.App.getNumber("imjs_buddi_resolve_url_using_region", 0));
      IModelTestUtils._testUsers.set(userCredentials.email, accessToken);
    }

    return new AuthorizedBackendRequestContext(accessToken);
  }

  /** Prepare for an output file by:
   * - Resolving the output file name under the known test output directory
   * - Making directories as necessary
   * - Removing a previous copy of the output file
   * @param subDirName Sub-directory under known test output directory. Should match the name of the test file minus the .test.ts file extension.
   * @param fileName Name of output fille
   */
  public static prepareOutputFile(subDirName: string, fileName: string): string {
    if (!IModelJsFs.existsSync(KnownTestLocations.outputDir))
      IModelJsFs.mkdirSync(KnownTestLocations.outputDir);

    const outputDir = path.join(KnownTestLocations.outputDir, subDirName);
    if (!IModelJsFs.existsSync(outputDir))
      IModelJsFs.mkdirSync(outputDir);

    const outputFile = path.join(outputDir, fileName);
    if (IModelJsFs.existsSync(outputFile))
      IModelJsFs.unlinkSync(outputFile);

    return outputFile;
  }

  /** Resolve an asset file path from the asset name by looking in the known assets directory */
  public static resolveAssetFile(assetName: string): string {
    const assetFile = path.join(KnownTestLocations.assetsDir, assetName);
    assert.isTrue(IModelJsFs.existsSync(assetFile));
    return assetFile;
  }

  /** Orchestrates the steps necessary to create a new snapshot iModel from a seed file. */
  public static createSnapshotFromSeed(testFileName: string, seedFileName: string): IModelDb {
    const seedDb: IModelDb = IModelDb.openSnapshot(seedFileName);
    const testDb: IModelDb = seedDb.createSnapshot(testFileName);
    seedDb.closeSnapshot();
    return testDb;
  }

  public static getUniqueModelCode(testIModel: IModelDb, newModelCodeBase: string): Code {
    let newModelCode: string = newModelCodeBase;
    let iter: number = 0;
    while (true) {
      const modelCode = InformationPartitionElement.createCode(testIModel, IModel.rootSubjectId, newModelCode);
      if (testIModel.elements.queryElementIdByCode(modelCode) === undefined)
        return modelCode;

      newModelCode = newModelCodeBase + iter;
      ++iter;
    }
  }

  // Create and insert a PhysicalPartition element (in the repositoryModel) and an associated PhysicalModel.
  public static createAndInsertPhysicalPartition(testImodel: IModelDb, newModelCode: CodeProps): Id64String {
    const modeledElementProps: ElementProps = {
      classFullName: PhysicalPartition.classFullName,
      parent: new SubjectOwnsPartitionElements(IModel.rootSubjectId),
      model: IModel.repositoryModelId,
      code: newModelCode,
    };
    const modeledElement: Element = testImodel.elements.createElement(modeledElementProps);
    return testImodel.elements.insertElement(modeledElement);
  }

  // Create and insert a PhysicalPartition element (in the repositoryModel) and an associated PhysicalModel.
  public static createAndInsertPhysicalModel(testImodel: IModelDb, modeledElementRef: RelatedElement, privateModel: boolean = false): Id64String {
    const newModel = testImodel.models.createModel({ modeledElement: modeledElementRef, classFullName: PhysicalModel.classFullName, isPrivate: privateModel });
    const newModelId = testImodel.models.insertModel(newModel);
    assert.isTrue(Id64.isValidId64(newModelId));
    assert.isTrue(Id64.isValidId64(newModel.id));
    assert.deepEqual(newModelId, newModel.id);
    return newModelId;
  }

  //
  // Create and insert a PhysicalPartition element (in the repositoryModel) and an associated PhysicalModel.
  // @return [modeledElementId, modelId]
  //
  public static createAndInsertPhysicalPartitionAndModel(testImodel: IModelDb, newModelCode: CodeProps, privateModel: boolean = false): Id64String[] {
    const eid = IModelTestUtils.createAndInsertPhysicalPartition(testImodel, newModelCode);
    const modeledElementRef = new RelatedElement({ id: eid });
    const mid = IModelTestUtils.createAndInsertPhysicalModel(testImodel, modeledElementRef, privateModel);
    return [eid, mid];
  }

  public static getUniqueSpatialCategoryCode(scopeModel: Model, newCodeBaseValue: string): Code {
    let newCodeValue: string = newCodeBaseValue;
    let iter: number = 0;
    while (true) {
      if (SpatialCategory.queryCategoryIdByName(scopeModel.iModel, scopeModel.id, newCodeValue) === undefined)
        return SpatialCategory.createCode(scopeModel.iModel, scopeModel.id, newCodeValue);

      newCodeValue = newCodeBaseValue + iter;
      ++iter;
    }
  }

  // Create a PhysicalObject. (Does not insert it.)
  public static createPhysicalObject(testImodel: IModelDb, modelId: Id64String, categoryId: Id64String, elemCode?: Code): Element {
    const elementProps: GeometricElement3dProps = {
      classFullName: "Generic:PhysicalObject",
      model: modelId,
      category: categoryId,
      code: elemCode ? elemCode : Code.createEmpty(),
    };
    return testImodel.elements.createElement(elementProps);
  }

  public static startBackend() {
    IModelJsConfig.init(true /* suppress exception */, false /* suppress error message */, Config.App);
    const config = new IModelHostConfiguration();
    config.concurrentQuery.concurrent = 4; // for test restrict this to two threads. Making closing connection faster
    IModelHost.startup(config);
  }

  public static registerTestBimSchema() {
    if (undefined === Schemas.getRegisteredSchema(TestBim.schemaName)) {
      Schemas.registerSchema(TestBim);
      ClassRegistry.register(TestPhysicalObject, TestBim);
      ClassRegistry.register(TestElementDrivesElement, TestBim);
    }
  }

  public static shutdownBackend() {
    IModelHost.shutdown();
  }

  public static setupLogging() {
    Logger.initializeToConsole();
    Logger.setLevelDefault(LogLevel.Error);

    if (process.env.imjs_test_logging_config === undefined) {
      // tslint:disable-next-line:no-console
      console.log(`You can set the environment variable imjs_test_logging_config to point to a logging configuration json file.`);
    }
    const loggingConfigFile: string = process.env.imjs_test_logging_config || path.join(__dirname, "logging.config.json");

    if (IModelJsFs.existsSync(loggingConfigFile)) {
      // tslint:disable-next-line:no-console
      console.log(`Setting up logging levels from ${loggingConfigFile}`);
      // tslint:disable-next-line:no-var-requires
      Logger.configureLevels(require(loggingConfigFile));
    }
  }
  public static init() {
    // dummy method to get this script included
  }

  // Setup typical programmatic log level overrides here
  // Convenience method used to debug specific tests/fixtures
  public static setupDebugLogLevels() {
    Logger.setLevelDefault(LogLevel.Warning);
    Logger.setLevel(BentleyLoggerCategory.Performance, LogLevel.Info);
    Logger.setLevel(BackendLoggerCategory.IModelDb, LogLevel.Trace);
    Logger.setLevel(ClientsLoggerCategory.Clients, LogLevel.Trace);
    Logger.setLevel(ClientsLoggerCategory.IModelHub, LogLevel.Trace);
    Logger.setLevel(ClientsLoggerCategory.Request, LogLevel.Trace);
    Logger.setLevel(NativeLoggerCategory.DgnCore, LogLevel.Error);
    Logger.setLevel(NativeLoggerCategory.BeSQLite, LogLevel.Error);
  }
}

IModelTestUtils.setupLogging();
IModelTestUtils.startBackend();
