/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import * as moq from "typemoq";
import * as faker from "faker";
import "@bentley/presentation-common/lib/test/_helpers/Promises";
import { ClientRequestContext } from "@bentley/bentleyjs-core";
import { IModelHost, IModelDb, IModelJsNative } from "@bentley/imodeljs-backend";
import { PresentationError, VariableValueTypes } from "@bentley/presentation-common";
import "./IModelHostSetup";
import { NativePlatformDefinition, createDefaultNativePlatform } from "../NativePlatform";
import { PresentationManagerMode } from "../PresentationManager";

describe("default NativePlatform", () => {

  let nativePlatform: NativePlatformDefinition;
  const addonMock = moq.Mock.ofType<IModelJsNative.ECPresentationManager>();

  beforeEach(() => {
    IModelHost.shutdown();
    try {
      IModelHost.startup();
    } catch (e) {
      let isLoaded = false;
      try {
        IModelHost.platform;
        isLoaded = true;
      } catch (_e) { }
      if (!isLoaded)
        throw e; // re-throw if startup() failed to set up NativePlatform
    }
    addonMock.reset();
    // tslint:disable-next-line:variable-name naming-convention
    const TNativePlatform = createDefaultNativePlatform({
      id: faker.random.uuid(),
      localeDirectories: [],
      taskAllocationsMap: {},
      mode: PresentationManagerMode.ReadOnly,
    });
    nativePlatform = new TNativePlatform();
    // we're replacing the native addon with our mock - make sure the original
    // one gets terminated
    (nativePlatform as any)._nativeAddon.dispose();
    (nativePlatform as any)._nativeAddon = addonMock.object;
  });

  afterEach(() => {
    nativePlatform.dispose();
  });

  it("calls addon's dispose", async () => {
    addonMock.setup((x) => x.dispose()).verifiable();
    nativePlatform.dispose();
    addonMock.verifyAll();
  });

  it("calls addon's forceLoadSchemas", async () => {
    addonMock
      .setup((x) => x.forceLoadSchemas(moq.It.isAny(), moq.It.isAny()))
      .callback((_db, cb) => { cb(IModelJsNative.ECPresentationStatus.Success); })
      .verifiable();
    await nativePlatform.forceLoadSchemas(ClientRequestContext.current, undefined);
    addonMock.verifyAll();

    addonMock.reset();
    addonMock
      .setup((x) => x.forceLoadSchemas(moq.It.isAny(), moq.It.isAny()))
      .callback((_db, cb) => { cb(IModelJsNative.ECPresentationStatus.Error); })
      .verifiable();
    expect(nativePlatform.forceLoadSchemas(ClientRequestContext.current, undefined)).to.be.rejected;
    addonMock.verifyAll();
  });

  it("calls addon's handleRequest", async () => {
    addonMock
      .setup((x) => x.handleRequest(moq.It.isAny(), "", moq.It.isAny()))
      .callback((_db, _options, cb) => { cb({ result: "0" }); })
      .verifiable();
    expect(await nativePlatform.handleRequest(ClientRequestContext.current, undefined, "")).to.equal("0");
    addonMock.verifyAll();
  });

  it("throws on invalid handleRequest response", async () => {
    addonMock
      .setup((x) => x.handleRequest(moq.It.isAny(), "", moq.It.isAny()))
      .callback((_db, _options, cb) => { cb(undefined as any); });
    await expect(nativePlatform.handleRequest(ClientRequestContext.current, undefined, "")).to.be.rejectedWith(PresentationError);
  });

  it("throws on handleRequest cancelation response", async () => {
    addonMock
      .setup((x) => x.handleRequest(moq.It.isAny(), "", moq.It.isAny()))
      .callback((_db, _options, cb) => { cb({ error: { status: IModelJsNative.ECPresentationStatus.Canceled, message: "test" } }); });
    await expect(nativePlatform.handleRequest(ClientRequestContext.current, undefined, "")).to.be.rejectedWith(PresentationError, "test");
  });

  it("throws on handleRequest error response", async () => {
    addonMock
      .setup((x) => x.handleRequest(moq.It.isAny(), "", moq.It.isAny()))
      .callback((_db, _options, cb) => { cb({ error: { status: IModelJsNative.ECPresentationStatus.Error, message: "test" } }); });
    await expect(nativePlatform.handleRequest(ClientRequestContext.current, undefined, "")).to.be.rejectedWith(PresentationError, "test");
  });

  it("throws on handleRequest success response without result", async () => {
    addonMock
      .setup((x) => x.handleRequest(moq.It.isAny(), "", moq.It.isAny()))
      .callback((_db, _options, cb) => { cb({ result: undefined }); });
    await expect(nativePlatform.handleRequest(ClientRequestContext.current, undefined, "")).to.be.rejectedWith(PresentationError);
  });

  it("calls addon's setupRulesetDirectories", async () => {
    addonMock
      .setup((x) => x.setupRulesetDirectories(moq.It.isAny()))
      .returns(() => ({}))
      .verifiable();
    nativePlatform.setupRulesetDirectories([]);
    addonMock.verifyAll();
  });

  it("calls addon's setupSupplementalRulesetDirectories", async () => {
    addonMock
      .setup((x) => x.setupSupplementalRulesetDirectories(moq.It.isAny()))
      .returns(() => ({}))
      .verifiable();
    nativePlatform.setupSupplementalRulesetDirectories([]);
    addonMock.verifyAll();
  });

  it("throws on invalid void response", async () => {
    addonMock
      .setup((x) => x.setupRulesetDirectories(moq.It.isAny()))
      .returns(() => (undefined as any));
    expect(() => nativePlatform.setupRulesetDirectories([])).to.throw(PresentationError);
  });

  it("throws on void error response", async () => {
    addonMock
      .setup((x) => x.setupRulesetDirectories(moq.It.isAny()))
      .returns(() => ({ error: { status: IModelJsNative.ECPresentationStatus.InvalidArgument, message: "test" } }));
    expect(() => nativePlatform.setupRulesetDirectories([])).to.throw(PresentationError, "test");
  });

  it("calls addon's getRulesets", async () => {
    const ruleset = { id: "", rules: [] };
    const hash = faker.random.uuid();
    const serializedResult = JSON.stringify([{ ruleset, hash }]);
    addonMock.setup((x) => x.getRulesets(ruleset.id)).returns(() => ({ result: serializedResult })).verifiable();
    const result = nativePlatform.getRulesets(ruleset.id);
    expect(result).to.eq(serializedResult);
    addonMock.verifyAll();
  });

  it("calls addon's addRuleset", async () => {
    const ruleset = { id: "", rules: [] };
    const hash = faker.random.uuid();
    const serializedRuleset = JSON.stringify(ruleset);
    addonMock.setup((x) => x.addRuleset(serializedRuleset)).returns(() => ({ result: hash })).verifiable();
    const result = nativePlatform.addRuleset(serializedRuleset);
    addonMock.verifyAll();
    expect(result).to.eq(hash);
  });

  it("calls addon's removeRuleset", async () => {
    addonMock.setup((x) => x.removeRuleset("test id", "test hash")).returns(() => ({ result: true })).verifiable();
    const result = nativePlatform.removeRuleset("test id", "test hash");
    addonMock.verifyAll();
    expect(result).to.be.true;
  });

  it("calls addon's clearRulesets", async () => {
    addonMock.setup((x) => x.clearRulesets()).returns(() => ({})).verifiable();
    nativePlatform.clearRulesets();
    addonMock.verifyAll();
  });

  it("calls addon's setRulesetVariableValue", async () => {
    const rulesetId = faker.random.word();
    const variableId = faker.random.word();
    const value = faker.random.word();
    addonMock.setup((x) => x.setRulesetVariableValue(rulesetId, variableId, VariableValueTypes.String, value))
      .returns(() => ({}))
      .verifiable();
    nativePlatform.setRulesetVariableValue(rulesetId, variableId, VariableValueTypes.String, value);
    addonMock.verifyAll();
  });

  it("calls addon's getRulesetVariableValue", async () => {
    const rulesetId = faker.random.word();
    const variableId = faker.random.word();
    const value = faker.random.word();
    addonMock.setup((x) => x.getRulesetVariableValue(rulesetId, variableId, VariableValueTypes.String))
      .returns(() => ({ result: value }))
      .verifiable();
    const result = nativePlatform.getRulesetVariableValue(rulesetId, variableId, VariableValueTypes.String);
    addonMock.verifyAll();
    expect(result).to.equal(value);
  });

  it("returns imodel addon from IModelDb", () => {
    const mock = moq.Mock.ofType<IModelDb>();
    mock.setup((x) => x.nativeDb).returns(() => ({} as any)).verifiable(moq.Times.atLeastOnce());
    expect(nativePlatform.getImodelAddon(mock.object)).be.instanceOf(Object);
    mock.verifyAll();
  });

  it("throws when fails to find imodel using IModelDb", () => {
    const mock = moq.Mock.ofType<IModelDb>();
    mock.setup((x) => x.nativeDb).returns(() => (undefined as any)).verifiable(moq.Times.atLeastOnce());
    expect(() => nativePlatform.getImodelAddon(mock.object)).to.throw(PresentationError);
    mock.verifyAll();
  });

});
