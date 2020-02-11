/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import {
  IModelDb, OpenParams, ElementAspect, DictionaryModel, SpatialCategory,
  ConcurrencyControl, IModelJsFs,
} from "../imodeljs-backend";
import { Config, AuthorizedClientRequestContext } from "@bentley/imodeljs-clients";
import { IModelTestUtils } from "../test/IModelTestUtils";
import { IModelVersion, ElementAspectProps, IModel, SubCategoryAppearance } from "@bentley/imodeljs-common";
import { assert } from "chai";
import { Id64String } from "@bentley/bentleyjs-core";
import { KnownTestLocations } from "../test/KnownTestLocations";
import * as path from "path";
import { Reporter } from "@bentley/perf-tools/lib/Reporter";

export async function createNewModelAndCategory(requestContext: AuthorizedClientRequestContext, rwIModel: IModelDb) {
  // Create a new physical model.
  const [, modelId] = IModelTestUtils.createAndInsertPhysicalPartitionAndModel(rwIModel, IModelTestUtils.getUniqueModelCode(rwIModel, "newPhysicalModel"), true);
  // Find or create a SpatialCategory.
  const dictionary: DictionaryModel = rwIModel.models.getModel(IModel.dictionaryId) as DictionaryModel;
  const newCategoryCode = IModelTestUtils.getUniqueSpatialCategoryCode(dictionary, "ThisTestSpatialCategory");
  const spatialCategoryId: Id64String = SpatialCategory.insert(rwIModel, IModel.dictionaryId, newCategoryCode.value!, new SubCategoryAppearance({ color: 0xff0000 }));
  // Reserve all of the codes that are required by the new model and category.
  try {
    await rwIModel.concurrencyControl.request(requestContext);
  } catch (err) {
    if (err instanceof ConcurrencyControl.RequestError) {
      assert.fail(JSON.stringify(err.unavailableCodes) + ", " + JSON.stringify(err.unavailableLocks));
    }
  }
  return { modelId, spatialCategoryId };
}

describe("ElementAspectPerfomance", () => {
  const reporter = new Reporter();
  let requestContext: AuthorizedClientRequestContext;
  let imodeldbhub: IModelDb;

  before(async () => {
    if (!IModelJsFs.existsSync(KnownTestLocations.outputDir))
      IModelJsFs.mkdirSync(KnownTestLocations.outputDir);
    const configData = require(path.join(__dirname, "CSPerfConfig.json"));
    const projectId = configData.projectId;
    const imodelId = configData.aspectIModelId;

    const myAppConfig = {
      imjs_buddi_resolve_url_using_region: 102,
      imjs_default_relying_party_uri: "https://connect-wsg20.bentley.com",
    };
    Config.App.merge(myAppConfig);

    requestContext = await IModelTestUtils.getTestUserRequestContext();
    imodeldbhub = await IModelDb.open(requestContext, projectId, imodelId, OpenParams.fixedVersion(), IModelVersion.latest());
    assert.exists(imodeldbhub);
  });

  after(async () => {
    const csvPath = path.join(KnownTestLocations.outputDir, "ElementAspectPerfTests.csv");
    reporter.exportCSV(csvPath);

    await imodeldbhub.close(requestContext);
  });

  it("SimpleElement-Insertion-Updation-Deletion-Read", async () => {
    const snapshotPath = path.join(KnownTestLocations.outputDir, "SimpleELe.bim");
    assert.exists(imodeldbhub);
    const imodeldb = imodeldbhub.createSnapshot(snapshotPath);
    assert.exists(imodeldb);

    let eleId: Id64String;
    const count1 = 10000;
    let totalTimeReadSimpELeGet = 0;
    let totalTimeInsertSimpELeGet = 0;
    let totalTimeUpdateSimpELeGet = 0;
    let totalTimeDeleteSimpELeGet = 0;

    const r: { modelId: Id64String, spatialCategoryId: Id64String } = await createNewModelAndCategory(requestContext, imodeldb);

    for (let m = 0; m < count1; ++m) {
      // insert simple element with no aspect
      const startTime1 = new Date().getTime();
      eleId = imodeldb.elements.insertElement(IModelTestUtils.createPhysicalObject(imodeldb, r.modelId, r.spatialCategoryId));
      const endTime1 = new Date().getTime();
      const elapsedTime1 = (endTime1 - startTime1) / 1000.0;
      totalTimeInsertSimpELeGet = totalTimeInsertSimpELeGet + elapsedTime1;

      // read simple element with no aspect
      const startTime = new Date().getTime();
      const returnEle = imodeldb.elements.getElement(eleId);
      const endTime = new Date().getTime();
      const elapsedTime = (endTime - startTime) / 1000.0;
      totalTimeReadSimpELeGet = totalTimeReadSimpELeGet + elapsedTime;
      assert.exists(returnEle);

      // update simple element with no aspect
      const startTime2 = new Date().getTime();
      const returnEle1 = imodeldb.elements.getElement(eleId);
      returnEle1.userLabel = returnEle1.userLabel + "updated";
      imodeldb.elements.updateElement(returnEle1);
      const endTime2 = new Date().getTime();
      const elapsedTime2 = (endTime2 - startTime2) / 1000.0;
      totalTimeUpdateSimpELeGet = totalTimeUpdateSimpELeGet + elapsedTime2;

      // delete simple element with no aspect
      const startTime3 = new Date().getTime();
      imodeldb.elements.deleteElement(eleId);
      const endTime3 = new Date().getTime();
      const elapsedTime3 = (endTime3 - startTime3) / 1000.0;
      totalTimeDeleteSimpELeGet = totalTimeDeleteSimpELeGet + elapsedTime3;

    }
    imodeldb.closeSnapshot();
    reporter.addEntry("ElementAspectPerformance", "SimpleElement", "Execution time(s)", totalTimeInsertSimpELeGet, { ElementCount: count1, Operation: "Insert" });
    reporter.addEntry("ElementAspectPerformance", "SimpleElement", "Execution time(s)", totalTimeUpdateSimpELeGet, { ElementCount: count1, Operation: "Update" });
    reporter.addEntry("ElementAspectPerformance", "SimpleElement", "Execution time(s)", totalTimeDeleteSimpELeGet, { ElementCount: count1, Operation: "Delete" });
    reporter.addEntry("ElementAspectPerformance", "SimpleElement", "Execution time(s)", totalTimeReadSimpELeGet, { ElementCount: count1, Operation: "Read" });
  });

  it("UniqueAspectElement-Insertion-Updation-Deletion-Read", async () => {
    const snapshotPath = path.join(KnownTestLocations.outputDir, "UniqueAspectELe.bim");
    assert.exists(imodeldbhub);
    const imodeldb = imodeldbhub.createSnapshot(snapshotPath);
    assert.exists(imodeldb);

    interface TestAspectProps extends ElementAspectProps { testUniqueAspectProperty: string; }
    class TestAspect extends ElementAspect implements ElementAspectProps { public testUniqueAspectProperty: string = ""; }

    const count1 = 10000;
    let eleId: Id64String;
    let aspectProps: TestAspectProps;
    let totalTimeInsert = 0;
    let totalTimeUpdate = 0;
    let totalTimeDelete = 0;
    let totalTimeRead = 0;

    const r: { modelId: Id64String, spatialCategoryId: Id64String } = await createNewModelAndCategory(requestContext, imodeldb);

    for (let m = 0; m < count1; ++m) {
      // insert element with unique aspect
      const startTime1 = new Date().getTime();
      eleId = imodeldb.elements.insertElement(IModelTestUtils.createPhysicalObject(imodeldb, r.modelId, r.spatialCategoryId));
      aspectProps = {
        classFullName: "DgnPlatformTest:TestUniqueAspectNoHandler",
        element: { id: eleId },
        testUniqueAspectProperty: "UniqueAspectInsertTest1",
      };

      imodeldb.elements.insertAspect(aspectProps);
      const endTime1 = new Date().getTime();
      const elapsedTime1 = (endTime1 - startTime1) / 1000.0;
      totalTimeInsert = totalTimeInsert + elapsedTime1;

      // read element with unique aspect
      const startTime4 = new Date().getTime();
      const returnEle1 = imodeldb.elements.getElement(eleId);
      const aspects4 = imodeldb.elements.getAspects(returnEle1.id, aspectProps.classFullName) as TestAspect[];
      const endTime4 = new Date().getTime();
      const elapsedTime4 = (endTime4 - startTime4) / 1000.0;
      assert.exists(returnEle1);
      totalTimeRead = totalTimeRead + elapsedTime4;
      assert.isTrue(aspects4.length === 1);

      // update element with unique aspect
      const startTime2 = new Date().getTime();
      const returnEle2 = imodeldb.elements.getElement(eleId);
      returnEle1.userLabel = returnEle1.userLabel + "updated";
      imodeldb.elements.updateElement(returnEle1);
      const aspects = imodeldb.elements.getAspects(returnEle2.id, aspectProps.classFullName) as TestAspect[];
      aspects[0].testUniqueAspectProperty = "UniqueAspectInsertTest1-Updated";
      imodeldb.elements.updateAspect(aspects[0]);
      const endTime2 = new Date().getTime();
      const elapsedTime2 = (endTime2 - startTime2) / 1000.0;
      const aspectsUpdated = imodeldb.elements.getAspects(eleId, aspectProps.classFullName) as TestAspect[];
      assert.equal(aspectsUpdated.length, 1);
      assert.equal(aspectsUpdated[0].testUniqueAspectProperty, "UniqueAspectInsertTest1-Updated");
      totalTimeUpdate = totalTimeUpdate + elapsedTime2;

      // delete element with unique aspect
      const startTime3 = new Date().getTime();
      imodeldb.elements.deleteElement(eleId);
      const endTime3 = new Date().getTime();
      const elapsedTime3 = (endTime3 - startTime3) / 1000.0;
      totalTimeDelete = totalTimeDelete + elapsedTime3;
    }
    imodeldb.closeSnapshot();
    reporter.addEntry("ElementAspectPerformance", "UniqueAspectElement", "Execution time(s)", totalTimeInsert, { ElementCount: count1, Operation: "Insert" });
    reporter.addEntry("ElementAspectPerformance", "UniqueAspectElement", "Execution time(s)", totalTimeUpdate, { ElementCount: count1, Operation: "Update" });
    reporter.addEntry("ElementAspectPerformance", "UniqueAspectElement", "Execution time(s)", totalTimeDelete, { ElementCount: count1, Operation: "Delete" });
    reporter.addEntry("ElementAspectPerformance", "UniqueAspectElement", "Execution time(s)", totalTimeRead, { ElementCount: count1, Operation: "Read" });
  });

  it("MultiAspectElement-Insertion-Updation-Deletion-Read", async () => {
    const snapshotPath = path.join(KnownTestLocations.outputDir, "MultiApectELe.bim");
    assert.exists(imodeldbhub);
    const imodeldb = imodeldbhub.createSnapshot(snapshotPath);
    assert.exists(imodeldb);

    const count1 = 10000;
    let eleId: Id64String;
    let totalTimeInsert = 0;
    let totalTimeUpdate = 0;
    let totalTimeDelete = 0;
    let totalTimeRead = 0;

    const r: { modelId: Id64String, spatialCategoryId: Id64String } = await createNewModelAndCategory(requestContext, imodeldb);

    for (let m = 0; m < count1; ++m) {
      // insert element with multi aspect
      const startTime1 = new Date().getTime();
      eleId = imodeldb.elements.insertElement(IModelTestUtils.createPhysicalObject(imodeldb, r.modelId, r.spatialCategoryId));
      assert.exists(eleId);
      const aspectProps = {
        classFullName: "DgnPlatformTest:TestMultiAspectNoHandler",
        element: { id: eleId },
        testMultiAspectProperty: "MultiAspectInsertTest1",
      };
      imodeldb.elements.insertAspect(aspectProps);
      const endTime1 = new Date().getTime();
      const elapsedTime1 = (endTime1 - startTime1) / 1000.0;
      totalTimeInsert = totalTimeInsert + elapsedTime1;

      // read element with multi aspect
      const startTime4 = new Date().getTime();
      const returnEle1 = imodeldb.elements.getElement(eleId);
      const aspects: ElementAspect[] = imodeldb.elements.getAspects(returnEle1.id, aspectProps.classFullName);
      const endTime4 = new Date().getTime();
      const elapsedTime4 = (endTime4 - startTime4) / 1000.0;
      assert.exists(returnEle1);
      totalTimeRead = totalTimeRead + elapsedTime4;
      assert.isAtLeast(aspects.length, 1);

      let found: boolean = false;
      let foundIndex: number = -1;
      for (const aspect of aspects) {
        foundIndex++;
        if ((aspect as any).testMultiAspectProperty === aspectProps.testMultiAspectProperty) {
          found = true;
          break;
        }
      }
      assert.isTrue(found);

      // update element with multi aspect
      const startTime2 = new Date().getTime();
      const returnEle2 = imodeldb.elements.getElement(eleId);
      returnEle2.userLabel = returnEle2.userLabel + "updated";
      imodeldb.elements.updateElement(returnEle2);
      const aspects1: ElementAspect[] = imodeldb.elements.getAspects(returnEle2.id, aspectProps.classFullName);
      (aspects1[foundIndex] as any).testMultiAspectProperty = "MultiAspectInsertTest1-Updated";
      imodeldb.elements.updateAspect(aspects1[foundIndex]);
      const endTime2 = new Date().getTime();
      const elapsedTime2 = (endTime2 - startTime2) / 1000.0;
      totalTimeUpdate = totalTimeUpdate + elapsedTime2;

      const aspectsUpdated: ElementAspect[] = imodeldb.elements.getAspects(eleId, aspectProps.classFullName);
      assert.equal(aspectsUpdated.length, aspects1.length);
      assert.equal((aspectsUpdated[foundIndex] as any).testMultiAspectProperty, "MultiAspectInsertTest1-Updated");

      // delete element with multi aspect
      const startTime3 = new Date().getTime();
      imodeldb.elements.deleteElement(eleId);
      const endTime3 = new Date().getTime();
      const elapsedTime3 = (endTime3 - startTime3) / 1000.0;
      totalTimeDelete = totalTimeDelete + elapsedTime3;
    }
    imodeldb.closeSnapshot();
    reporter.addEntry("ElementAspectPerformance", "MultiAspectElement", "Execution time(s)", totalTimeInsert, { ElementCount: count1, Operation: "Insert" });
    reporter.addEntry("ElementAspectPerformance", "MultiAspectElement", "Execution time(s)", totalTimeUpdate, { ElementCount: count1, Operation: "Update" });
    reporter.addEntry("ElementAspectPerformance", "MultiAspectElement", "Execution time(s)", totalTimeDelete, { ElementCount: count1, Operation: "Delete" });
    reporter.addEntry("ElementAspectPerformance", "MultiAspectElement", "Execution time(s)", totalTimeRead, { ElementCount: count1, Operation: "Read" });
  });
});
