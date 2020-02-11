/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
// tslint:disable:no-direct-imports
import { expect } from "chai";
import * as faker from "faker";
import { initialize, terminate } from "../IntegrationTests";
import { createRandomId } from "@bentley/presentation-common/lib/test/_helpers/random";
import { Id64 } from "@bentley/bentleyjs-core";
import { Ruleset } from "@bentley/presentation-common";
import { Presentation, RulesetVariablesManager } from "@bentley/presentation-frontend";

describe("Ruleset Variables", async () => {

  let variables: RulesetVariablesManager;
  const ruleset: Ruleset = require("../../test-rulesets/RulesetVariables/default");

  before(async () => {
    await initialize();
  });

  after(() => {
    terminate();
  });

  beforeEach(() => {
    variables = Presentation.presentation.vars(ruleset.id);
  });

  /* note: at this moment backend variable values can't be accessed from frontend
  it("get variable value added through ruleset", async () => {
    await using(await Presentation.presentation.rulesets().add(ruleset), async () => {
      const actualValue = await variables.getString(ruleset.vars![0].vars![0].id);
      expect(actualValue).to.be.equal(ruleset.vars![0].vars![0].defaultValue);
    });
  });
  */

  it("adds and modifies string variable", async () => {
    const value = faker.random.word();
    const variableId = faker.random.word();
    await variables.setString(variableId, value);
    const actualValue = await variables.getString(variableId);
    expect(actualValue).to.equal(value);
  });

  it("adds and modifies boolean variable", async () => {
    let value = faker.random.boolean();
    const variableId = faker.random.word();
    await variables.setBool(variableId, value);
    let actualValue = await variables.getBool(variableId);
    expect(actualValue).to.equal(value);

    value = !value;
    await variables.setBool(variableId, value);
    actualValue = await variables.getBool(variableId);
    expect(actualValue).to.equal(value);
  });

  it("adds and modifies integer variable", async () => {
    let value = faker.random.number();
    const variableId = faker.random.word();
    await variables.setInt(variableId, value);
    let actualValue = await variables.getInt(variableId);
    expect(actualValue).to.equal(value);

    value = faker.random.number();
    await variables.setInt(variableId, value);
    actualValue = await variables.getInt(variableId);
    expect(actualValue).to.equal(value);
  });

  it("adds and modifies int[] variable", async () => {
    let valueArray = [faker.random.number(), faker.random.number(), faker.random.number()];
    const variableId = faker.random.word();
    await variables.setInts(variableId, valueArray);
    let actualValueArray = await variables.getInts(variableId);
    expect(actualValueArray).to.deep.equal(valueArray);

    valueArray = [faker.random.number(), faker.random.number(), faker.random.number(), faker.random.number()];
    await variables.setInts(variableId, valueArray);
    actualValueArray = await variables.getInts(variableId);
    expect(actualValueArray).to.deep.equal(valueArray);
  });

  it("adds and modifies Id64 variable", async () => {
    let value = createRandomId();
    const variableId = faker.random.word();
    await variables.setId64(variableId, value);
    let actualValue = await variables.getId64(variableId);
    expect(actualValue).to.deep.equal(value);

    value = createRandomId();
    await variables.setId64(variableId, value);
    actualValue = await variables.getId64(variableId);
    expect(actualValue).to.deep.equal(value);
  });

  it("adds and modifies Id64[] variable", async () => {
    let valueArray = [
      createRandomId(),
      createRandomId(),
      createRandomId(),
    ];
    const variableId = faker.random.word();
    await variables.setId64s(variableId, valueArray);
    let actualValueArray = await variables.getId64s(variableId);
    expect(actualValueArray).to.deep.equal(valueArray);

    valueArray = [
      createRandomId(),
      createRandomId(),
      createRandomId(),
      createRandomId(),
    ];
    await variables.setId64s(variableId, valueArray);
    actualValueArray = await variables.getId64s(variableId);
    expect(actualValueArray).to.deep.equal(valueArray);
  });

  it("accessing int[] variable with different types", async () => {
    const valueArray = [faker.random.number(), faker.random.number(), faker.random.number(), faker.random.number()];
    const variableId = faker.random.word();
    await variables.setInts(variableId, valueArray);

    const boolValue = await variables.getBool(variableId);
    expect(boolValue).to.be.false;

    const id64ArrayValue = await variables.getId64s(variableId);
    expect(id64ArrayValue.length).to.equal(valueArray.length);
    for (const value of valueArray) {
      const id = Id64.fromLocalAndBriefcaseIds(value, 0);
      expect(id64ArrayValue.find((x) => x === (id))).to.not.be.equal(undefined);
    }

    const id64Value = await variables.getId64(variableId);
    expect(Id64.isValid(id64Value)).to.be.false;

    const intValue = await variables.getInt(variableId);
    expect(intValue).to.equal(0);

    const stringValue = await variables.getString(variableId);
    expect(stringValue).to.equal("");
  });

  it("accessing int variable with different types", async () => {
    const value = faker.random.number();
    const variableId = faker.random.word();
    await variables.setInt(variableId, value);

    const boolValue = await variables.getBool(variableId);
    expect(boolValue).to.eq(value !== 0);

    const id64ArrayValue = await variables.getId64s(variableId);
    expect(id64ArrayValue.length).to.equal(0);

    const id64Value = await variables.getId64(variableId);
    expect(id64Value).to.deep.eq(Id64.fromLocalAndBriefcaseIds(value, 0));

    const intArrayValue = await variables.getInts(variableId);
    expect(intArrayValue.length).to.equal(0);

    const stringValue = await variables.getString(variableId);
    expect(stringValue).to.equal("");
  });

  it("accessing bool variable with different types", async () => {
    const value = faker.random.boolean();
    const variableId = faker.random.word();
    await variables.setBool(variableId, value);

    const id64ArrayValue = await variables.getId64s(variableId);
    expect(id64ArrayValue.length).to.equal(0);

    const id64Value = await variables.getId64(variableId);
    expect(id64Value).to.deep.eq(Id64.fromLocalAndBriefcaseIds(value ? 1 : 0, 0));

    const intArrayValue = await variables.getInts(variableId);
    expect(intArrayValue.length).to.equal(0);

    const intValue = await variables.getInt(variableId);
    expect(intValue).to.equal(value ? 1 : 0);

    const stringValue = await variables.getString(variableId);
    expect(stringValue).to.equal("");
  });

  it("accessing string variable with different types", async () => {
    const value = faker.random.word();
    const variableId = faker.random.word();
    await variables.setString(variableId, value);

    const id64ArrayValue = await variables.getId64s(variableId);
    expect(id64ArrayValue.length).to.equal(0);

    const id64Value = await variables.getId64(variableId);
    expect(Id64.isValid(id64Value)).to.be.false;

    const intArrayValue = await variables.getInts(variableId);
    expect(intArrayValue.length).to.equal(0);

    const intValue = await variables.getInt(variableId);
    expect(intValue).to.equal(0);

    const boolValue = await variables.getBool(variableId);
    expect(boolValue).to.equal(false);
  });

  it("accessing Id64 variable with different types", async () => {
    const value = createRandomId();
    const variableId = faker.random.word();
    await variables.setId64(variableId, value);

    const id64ArrayValue = await variables.getId64s(variableId);
    expect(id64ArrayValue.length).to.equal(0);

    const intArrayValue = await variables.getInts(variableId);
    expect(intArrayValue.length).to.equal(0);

    const stringValue = await variables.getString(variableId);
    expect(stringValue).to.equal("");

    const boolValue = await variables.getBool(variableId);
    expect(boolValue).to.eq(Id64.isValid(value));
  });

  it("accessing Id64[] variable with different types", async () => {
    const valueArray = [
      createRandomId(),
      createRandomId(),
      createRandomId(),
      createRandomId(),
    ];
    const variableId = faker.random.word();
    await variables.setId64s(variableId, valueArray);

    const boolValue = await variables.getBool(variableId);
    expect(boolValue).to.be.false;

    const intArrayValue = await variables.getInts(variableId);
    expect(intArrayValue.length).to.equal(valueArray.length);

    const id64Value = await variables.getId64(variableId);
    expect(Id64.isValid(id64Value)).to.be.false;

    const intValue = await variables.getInt(variableId);
    expect(intValue).to.equal(0);

    const stringValue = await variables.getString(variableId);
    expect(stringValue).to.equal("");
  });

});
