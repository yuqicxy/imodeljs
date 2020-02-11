/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { assert } from "chai";
import * as path from "path";
import { Id64String, Id64, DbResult, GuidString } from "@bentley/bentleyjs-core";
import { IModelVersion, ChangedValueState, ChangeOpCode } from "@bentley/imodeljs-common";
import { HubIModel, IModelQuery, ChangeSetPostPushEvent, NamedVersionCreatedEvent, RequestGlobalOptions, RequestTimeoutOptions } from "@bentley/imodeljs-clients";
import {
  IModelDb, OpenParams, BriefcaseManager, ChangeSummaryManager, AuthorizedBackendRequestContext,
  ECSqlStatement, ChangeSummary, ConcurrencyControl, IModelJsFs,
} from "../../imodeljs-backend";
import * as utils from "./../../../../clients-backend/lib/test/imodelhub/TestUtils";
import { ResponseBuilder, RequestType, ScopeType } from "./../../../../clients-backend/lib/test/ResponseBuilder";
import { IModelTestUtils } from "../IModelTestUtils";
import { TestUsers, TestConfig } from "../TestUsers";
import { HubUtility } from "./HubUtility";
import { createNewModelAndCategory } from "./IModelWrite.test";
import { TestPushUtility } from "./TestPushUtility";
import { KnownTestLocations } from "../KnownTestLocations";

describe("PushRetry", () => {
  let requestContext: AuthorizedBackendRequestContext;
  let testProjectId: string;
  let testIModelId: GuidString;
  let testIModel: IModelDb;
  const testPushUtility: TestPushUtility = new TestPushUtility();
  const iModelName = "PushRetryTest";
  const pause = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let backupTimeout: RequestTimeoutOptions;

  before(async () => {
    requestContext = await IModelTestUtils.getTestUserRequestContext(TestUsers.superManager);
    testProjectId = await HubUtility.queryProjectIdByName(requestContext, TestConfig.projectName);

    backupTimeout = RequestGlobalOptions.timeout;
    RequestGlobalOptions.timeout = {
      deadline: 100000,
      response: 100000,
    };
  });

  after(async () => {
    RequestGlobalOptions.timeout = backupTimeout;
  });

  /** Extract a summary of information in the change set - who changed it, when it was changed, what was changed, and how it was changed */
  const extractChangeSummary = async (changeSetId: string) => {
    if (!testIModel) {
      // Open a new local briefcase of the iModel at the specified version
      testIModel = await IModelDb.open(requestContext, testProjectId, testIModelId.toString(), OpenParams.pullAndPush(), IModelVersion.asOfChangeSet(changeSetId));
    } else {
      // Update the existing local briefcase of the iModel to the specified version
      await testIModel.pullAndMergeChanges(requestContext, IModelVersion.asOfChangeSet(changeSetId));
    }

    // Extract summary information about the current (or latest change set) of the briefcase/iModel into the change cache
    await ChangeSummaryManager.extractChangeSummaries(requestContext, testIModel, { currentVersionOnly: true });

    // Attach a change cache file to the iModel
    ChangeSummaryManager.attachChangeCache(testIModel);

    // Find the change summary that was just created
    const changeSummary: ChangeSummary = testIModel.withPreparedStatement<ChangeSummary>("SELECT cset.Summary.Id as changeSummaryId FROM imodelchange.ChangeSet cset WHERE cset.WsgId=?", (stmt: ECSqlStatement): ChangeSummary => {
      stmt.bindString(1, changeSetId);
      const result: DbResult = stmt.step();
      assert(result === DbResult.BE_SQLITE_ROW);
      return ChangeSummaryManager.queryChangeSummary(testIModel, Id64.fromJSON(stmt.getRow().changeSummaryId));
    });

    // Dump contents of the change summary
    const content = { id: changeSummary.id, changeSet: changeSummary.changeSet, instanceChanges: {} };
    content.instanceChanges = testIModel.withPreparedStatement<any[]>("SELECT ECInstanceId FROM ecchange.change.InstanceChange WHERE Summary.Id=? ORDER BY ECInstanceId", (stmt: ECSqlStatement): any[] => {
      stmt.bindId(1, changeSummary.id);
      const instanceChanges = new Array<any>();
      while (stmt.step() === DbResult.BE_SQLITE_ROW) {
        const row = stmt.getRow();

        const instanceChange: any = ChangeSummaryManager.queryInstanceChange(testIModel, Id64.fromJSON(row.id));
        switch (instanceChange.opCode) {
          case ChangeOpCode.Insert: {
            const rows: any[] = testIModel.executeQuery(ChangeSummaryManager.buildPropertyValueChangesECSql(testIModel, instanceChange, ChangedValueState.AfterInsert));
            assert.equal(rows.length, 1);
            instanceChange.after = rows[0];
            break;
          }
          case ChangeOpCode.Update: {
            let rows: any[] = testIModel.executeQuery(ChangeSummaryManager.buildPropertyValueChangesECSql(testIModel, instanceChange, ChangedValueState.BeforeUpdate));
            assert.equal(rows.length, 1);
            instanceChange.before = rows[0];
            rows = testIModel.executeQuery(ChangeSummaryManager.buildPropertyValueChangesECSql(testIModel, instanceChange, ChangedValueState.AfterUpdate));
            assert.equal(rows.length, 1);
            instanceChange.after = rows[0];
            break;
          }
          case ChangeOpCode.Delete: {
            const rows: any[] = testIModel.executeQuery(ChangeSummaryManager.buildPropertyValueChangesECSql(testIModel, instanceChange, ChangedValueState.BeforeDelete));
            assert.equal(rows.length, 1);
            instanceChange.before = rows[0];
            break;
          }
          default:
            throw new Error("Unexpected ChangedOpCode " + instanceChange.opCode);
        }

        instanceChanges.push(instanceChange);
      }

      return instanceChanges;
    });

    // Create a location to dump change summary
    const outDir = path.join(KnownTestLocations.outputDir, `imodelid_${testIModelId.toString().substr(0, 5)}`);
    if (!IModelJsFs.existsSync(outDir))
      IModelJsFs.mkdirSync(outDir);
    const filePath = path.join(outDir, `${changeSummary.id}.json`);
    if (IModelJsFs.existsSync(filePath))
      IModelJsFs.unlinkSync(filePath);

    // Dump the change summary
    IModelJsFs.writeFileSync(filePath, JSON.stringify(content, (name, value) => {
      if (name === "opCode")
        return ChangeOpCode[value];

      if (name === "pushDate")
        return new Date(value).toLocaleString();

      return value;
    }, 2));

    ChangeSummaryManager.detachChangeCache(testIModel);
  };

  it("should be able to listen to posted named versions and change sets, and extract summary information from them (#integration)", async () => {
    await testPushUtility.initialize(TestConfig.projectName, "PushTest");
    testIModelId = await testPushUtility.pushTestIModel();

    const expectedCount: number = 5;
    let actualChangeSetCount: number = 0;
    let actualVersionCount: number = 0;

    // Subscribe to change set and version events
    const changeSetSubscription = await BriefcaseManager.imodelClient.events.subscriptions.create(requestContext, testIModelId, ["ChangeSetPostPushEvent"]);
    const deleteChangeSetListener = BriefcaseManager.imodelClient.events.createListener(requestContext, async () => requestContext.accessToken, changeSetSubscription.wsgId, testIModelId, async (_receivedEvent: ChangeSetPostPushEvent) => {
      actualChangeSetCount++;
    });
    const namedVersionSubscription = await BriefcaseManager.imodelClient.events.subscriptions.create(requestContext, testIModelId, ["VersionEvent"]);
    const deleteNamedVersionListener = BriefcaseManager.imodelClient.events.createListener(requestContext, async () => requestContext.accessToken, namedVersionSubscription.wsgId, testIModelId, async (receivedEvent: NamedVersionCreatedEvent) => {
      actualVersionCount++;
      extractChangeSummary(receivedEvent.changeSetId!); // tslint:disable-line:no-floating-promises
    });

    // Start pushing change sets and versions
    await testPushUtility.pushTestChangeSetsAndVersions(expectedCount);
    await pause(10 * 1000); // Pause 10 seconds to ensure all the events have been received

    assert.equal(actualChangeSetCount, expectedCount);
    assert.equal(actualVersionCount, expectedCount);

    deleteChangeSetListener();
    deleteNamedVersionListener();
  });

  it.skip("should retry to push changes (#integration)", async () => {
    const iModels: HubIModel[] = await BriefcaseManager.imodelClient.iModels.get(requestContext, testProjectId, new IModelQuery().byName(iModelName));
    for (const iModelTemp of iModels) {
      await BriefcaseManager.imodelClient.iModels.delete(requestContext, testProjectId, iModelTemp.id!);
    }

    const pushRetryIModel: IModelDb = await IModelDb.create(requestContext, testProjectId, iModelName, { rootSubject: { name: "TestSubject" } });
    const pushRetryIModelId = pushRetryIModel.iModelToken.iModelId;
    assert.isNotEmpty(pushRetryIModelId);

    pushRetryIModel.concurrencyControl.setPolicy(new ConcurrencyControl.OptimisticPolicy());

    const r: { modelId: Id64String, spatialCategoryId: Id64String } = await createNewModelAndCategory(requestContext, pushRetryIModel);

    pushRetryIModel.elements.insertElement(IModelTestUtils.createPhysicalObject(pushRetryIModel, r.modelId, r.spatialCategoryId));
    pushRetryIModel.saveChanges("User created model, category, and two elements");

    let retryCount = 1;
    const responseFunction = () => {
      switch (retryCount++) {
        case 1:
          return ResponseBuilder.generateError("iModelHub.PullIsRequired");
        case 2:
          return ResponseBuilder.generateError("iModelHub.DatabaseTemporarilyLocked");
        case 3:
          return ResponseBuilder.generateError("iModelHub.AnotherUserPushing");
        default:
          ResponseBuilder.clearMocks();
          return ResponseBuilder.generateError("iModelHub.iModelHubOperationFailed");
      }
    };

    ResponseBuilder.mockResponse(utils.IModelHubUrlMock.getUrl(), RequestType.Get,
      utils.createRequestUrl(ScopeType.iModel, pushRetryIModelId!, "ChangeSet", "?$top=1&$orderby=Index+desc"),
      responseFunction, 5, undefined, undefined, 409);

    await pushRetryIModel.pushChanges(requestContext);
    ResponseBuilder.clearMocks();
    await BriefcaseManager.imodelClient.iModels.delete(requestContext, testProjectId, pushRetryIModelId!);
  });

  it.skip("should fail to push and not retry again (#integration)", async () => {
    const iModels: HubIModel[] = await BriefcaseManager.imodelClient.iModels.get(requestContext, testProjectId, new IModelQuery().byName(iModelName));
    for (const iModelTemp of iModels) {
      await BriefcaseManager.imodelClient.iModels.delete(requestContext, testProjectId, iModelTemp.id!);
    }

    const pushRetryIModel: IModelDb = await IModelDb.create(requestContext, testProjectId, iModelName, { rootSubject: { name: "TestSubject" } });
    const pushRetryIModelId = pushRetryIModel.iModelToken.iModelId;
    assert.isNotEmpty(pushRetryIModelId);

    const r: { modelId: Id64String, spatialCategoryId: Id64String } = await createNewModelAndCategory(requestContext, pushRetryIModel);

    pushRetryIModel.elements.insertElement(IModelTestUtils.createPhysicalObject(pushRetryIModel, r.modelId, r.spatialCategoryId));
    pushRetryIModel.saveChanges("User created model, category, and two elements");

    const response = ResponseBuilder.generateError("UnknownPushError");
    ResponseBuilder.mockResponse(utils.IModelHubUrlMock.getUrl(), RequestType.Get,
      utils.createRequestUrl(ScopeType.iModel, pushRetryIModelId!, "ChangeSet", "?$top=1&$orderby=Index+desc"),
      response, 5, undefined, undefined, 409);

    try {
      await pushRetryIModel.pushChanges(requestContext);
    } catch (error) {
      assert.exists(error);
      assert.equal(error.name, "UnknownPushError");
    }
    ResponseBuilder.clearMocks();
    await BriefcaseManager.imodelClient.iModels.delete(requestContext, testProjectId, pushRetryIModelId!);
  });

});
