/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import faker from "faker";
import fs from "fs";
import { expect } from "chai";
import { ClientRequestContext, Id64 } from "@bentley/bentleyjs-core";
import { IModelDb } from "@bentley/imodeljs-backend";
import { Ruleset } from "@bentley/presentation-common";
import { Presentation, RulesetEmbedder, DuplicateRulesetHandlingStrategy, PresentationManagerMode } from "@bentley/presentation-backend";
import { createDefaultNativePlatform, NativePlatformDefinition } from "@bentley/presentation-backend/lib/NativePlatform";
import { tweakRuleset } from "./Helpers";
import { initialize, terminate } from "../IntegrationTests";
import { createRandomRuleset } from "@bentley/presentation-common/lib/test/_helpers/random";

describe("RulesEmbedding", () => {
  let imodel: IModelDb;
  let embedder: RulesetEmbedder;
  let ruleset: Ruleset;
  let nativePlatform: NativePlatformDefinition;
  const testIModelName: string = "assets/datasets/RulesetEmbeddingTest.ibim";

  function expectRulesetsToBeDeepEqual(expected: Ruleset, actual: Ruleset): void {
    tweakRuleset<Ruleset>(expected, actual);
    expect(expected).to.deep.equal(actual);
  }

  function expectRulesetsToNotBeDeepEqual(expected: Ruleset, actual: Ruleset): void {
    tweakRuleset<Ruleset>(expected, actual);
    expect(expected).to.not.deep.equal(actual);
  }

  function createSnapshotFromSeed(testFileName: string, seedFileName: string): IModelDb {
    const seedDb: IModelDb = IModelDb.openSnapshot(seedFileName);
    const testDb: IModelDb = seedDb.createSnapshot(testFileName);
    seedDb.closeSnapshot();
    return testDb;
  }

  before(async () => {
    await initialize();
    const TNativePlatform = createDefaultNativePlatform({ // tslint:disable-line: variable-name naming-convention
      id: "",
      localeDirectories: [],
      taskAllocationsMap: {},
      mode: PresentationManagerMode.ReadWrite,
    });
    nativePlatform = new TNativePlatform();
    imodel = createSnapshotFromSeed(testIModelName, "assets/datasets/Properties_60InstancesWithUrl2.ibim");
    expect(imodel).is.not.null;
  });

  after(() => {
    imodel.closeSnapshot();
    nativePlatform.dispose();

    fs.unlink(testIModelName, (err: Error) => {
      if (err)
        expect(false);
    });
    terminate();
  });

  beforeEach(async () => {
    embedder = new RulesetEmbedder(imodel);
    ruleset = await createRandomRuleset();
  });

  afterEach(async () => {
    imodel.abandonChanges();
  });

  it("handles getting rulesets with nothing inserted", async () => {
    const rulesets: Ruleset[] = await embedder.getRulesets();
    expect(rulesets.length).equal(0);
  });

  it("inserts a ruleset to iModel and retrieves it", async () => {
    // Insert a ruleset
    const insertId = await embedder.insertRuleset(ruleset);
    expect(Id64.isValid(insertId)).true;

    // Obtain all rulesets
    const rulesets: Ruleset[] = await embedder.getRulesets();
    expect(rulesets.length).equals(1);

    expectRulesetsToBeDeepEqual(ruleset, rulesets[0]);
  });

  it("inserts multiple different rulesets to iModel", async () => {
    // Create another ruleset
    const otherRuleset = { ...(await createRandomRuleset()), id: `${ruleset.id}_different` };

    // Insert a ruleset
    const insertId1 = await embedder.insertRuleset(ruleset);
    const insertId2 = await embedder.insertRuleset(otherRuleset);
    expect(Id64.isValid(insertId1)).true;
    expect(Id64.isValid(insertId2)).true;

    // Obtain all rulesets
    const rulesets: Ruleset[] = await embedder.getRulesets();
    expect(rulesets.length).equals(2);

    const actualRuleset = rulesets.find((value: Ruleset, _index: number, _obj: Ruleset[]): boolean => value.id === ruleset.id);
    expect(actualRuleset).to.not.be.undefined;
    expectRulesetsToBeDeepEqual(ruleset, actualRuleset as Ruleset);

    const actualOtherRuleset = rulesets.find((value: Ruleset, _index: number, _obj: Ruleset[]): boolean => value.id === otherRuleset.id);
    expect(actualOtherRuleset).to.not.be.undefined;
    expectRulesetsToBeDeepEqual(otherRuleset, actualOtherRuleset as Ruleset);
  });

  it("locates rulesets", async () => {
    // Create a ruleset and insert it
    const rulesetToLocate = require("../../test-rulesets/Rulesets/default");
    const insertId = await embedder.insertRuleset(rulesetToLocate);
    expect(Id64.isValid(insertId)).true;

    // Try getting root node to confirm embedded ruleset is being located
    const rootNodes = await Presentation.getManager().getNodes(ClientRequestContext.current, { imodel, rulesetId: rulesetToLocate.id });
    expect(rootNodes.length).to.be.equal(1);
  });

  it("locates rulesets correctly if rules are updated", async () => {
    // Create a ruleset and insert it
    const rulesetToLocate = require("../../test-rulesets/Rulesets/default");
    const insertId = await embedder.insertRuleset(rulesetToLocate);
    expect(Id64.isValid(insertId)).true;

    // Try getting root node to confirm embedded ruleset is being located
    let rootNodes = await Presentation.getManager().getNodes(ClientRequestContext.current, { imodel, rulesetId: rulesetToLocate.id });
    expect(rootNodes.length).to.be.equal(1);

    const rulesetElement = imodel.elements.getElement(insertId);
    rulesetElement.setJsonProperty("id", faker.random.uuid());
    imodel.elements.updateElement(rulesetElement);

    rootNodes = await Presentation.getManager().getNodes(ClientRequestContext.current, { imodel, rulesetId: rulesetToLocate.id });
    expect(rootNodes.length).to.be.equal(1);
  });

  it("does not insert same ruleset to iModel multiple times", async () => {
    // Insert a ruleset
    const insertId1 = await embedder.insertRuleset(ruleset);
    const insertId2 = await embedder.insertRuleset(ruleset);
    expect(Id64.isValid(insertId1)).true;
    expect(insertId1).to.be.equal(insertId2);
    // Obtain all rulesets
    const rulesets: Ruleset[] = await embedder.getRulesets();
    expect(rulesets.length).equals(1);
  });

  it("skips inserting duplicate ruleset", async () => {
    const insertId1 = await embedder.insertRuleset(ruleset, DuplicateRulesetHandlingStrategy.Skip);
    expect(Id64.isValid(insertId1)).true;

    const rulesetChanged = require("../../test-rulesets/Rulesets/other");
    rulesetChanged.id = ruleset.id;
    expectRulesetsToNotBeDeepEqual(ruleset, rulesetChanged);
    expect(ruleset.id).to.be.equal(rulesetChanged.id);

    const insertId2 = await embedder.insertRuleset(rulesetChanged, DuplicateRulesetHandlingStrategy.Skip);
    expect(insertId1).to.be.equal(insertId2);

    const rulesets: Ruleset[] = await embedder.getRulesets();
    expect(rulesets.length).equals(1);

    expectRulesetsToBeDeepEqual(ruleset, rulesets[0]);
    expectRulesetsToNotBeDeepEqual(rulesetChanged, rulesets[0]);
  });

  it("replaces when inserting duplicate ruleset", async () => {
    const insertId1 = await embedder.insertRuleset(ruleset, DuplicateRulesetHandlingStrategy.Replace);
    expect(Id64.isValid(insertId1)).true;

    const rulesetChanged = require("../../test-rulesets/Rulesets/other");
    rulesetChanged.id = ruleset.id;
    expectRulesetsToNotBeDeepEqual(ruleset, rulesetChanged);
    expect(ruleset.id).to.be.equal(rulesetChanged.id);

    const insertId2 = await embedder.insertRuleset(rulesetChanged, DuplicateRulesetHandlingStrategy.Replace);
    expect(insertId1).to.be.equal(insertId2);

    const rulesets: Ruleset[] = await embedder.getRulesets();
    expect(rulesets.length).equals(1);

    expectRulesetsToBeDeepEqual(rulesetChanged, rulesets[0]);
    expectRulesetsToNotBeDeepEqual(ruleset, rulesets[0]);
  });
});
