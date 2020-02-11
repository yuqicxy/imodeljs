/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import * as moq from "typemoq";
import * as faker from "faker";
import * as path from "path";
import * as hash from "object-hash";
import * as sinon from "sinon";
const deepEqual = require("deep-equal"); // tslint:disable-line:no-var-requires
import {
  createRandomNodePathElementJSON, createRandomECInstanceNodeKey,
  createRandomECInstanceNodeKeyJSON,
  createRandomECClassInfoJSON, createRandomRelationshipPathJSON,
  createRandomECInstanceKeyJSON, createRandomECInstanceKey,
  createRandomDescriptor, createRandomCategory, createRandomId, createRandomDescriptorJSON, createRandomRelatedClassInfoJSON, createRandomRuleset, createRandomLabelDefinition, createRandomLabelDefinitionJSON,
} from "@bentley/presentation-common/lib/test/_helpers/random";
import "@bentley/presentation-common/lib/test/_helpers/Promises";
import "./IModelHostSetup";
import { using, ClientRequestContext, Id64, Id64String, DbResult } from "@bentley/bentleyjs-core";
import { EntityMetaData, ElementProps, ModelProps } from "@bentley/imodeljs-common";
import { IModelHost, IModelDb, DrawingGraphic, Element, ECSqlStatement, ECSqlValue } from "@bentley/imodeljs-backend";
import {
  PageOptions, SelectionInfo, KeySet, PresentationError,
  HierarchyRequestOptions, Paged, ContentRequestOptions, ContentFlags,
  PrimitiveTypeDescription, ArrayTypeDescription, StructTypeDescription,
  KindOfQuantityInfo, DefaultContentDisplayTypes, LabelRequestOptions, InstanceKey,
  Ruleset, VariableValueTypes, RequestPriority, LOCALES_DIRECTORY, LabelDefinition,
} from "@bentley/presentation-common";
import { PropertyInfoJSON } from "@bentley/presentation-common/lib/EC";
import { NodeKeyJSON, ECInstanceNodeKeyJSON, NodeKey } from "@bentley/presentation-common/lib/hierarchy/Key";
import { NodeJSON } from "@bentley/presentation-common/lib/hierarchy/Node";
import { PropertyJSON } from "@bentley/presentation-common/lib/content/Property";
import { ContentJSON } from "@bentley/presentation-common/lib/content/Content";
import { ItemJSON } from "@bentley/presentation-common/lib/content/Item";
import { PropertiesFieldJSON, NestedContentFieldJSON, FieldJSON } from "@bentley/presentation-common/lib/content/Fields";
import { DescriptorJSON, SelectClassInfoJSON } from "@bentley/presentation-common/lib/content/Descriptor";
import { NativePlatformDefinition, NativePlatformRequestTypes } from "../NativePlatform";
import { PresentationManager, PresentationManagerMode } from "../PresentationManager";
import { RulesetManagerImpl } from "../RulesetManager";
import { RulesetVariablesManagerImpl } from "../RulesetVariablesManager";

describe("PresentationManager", () => {

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
  });

  const setupIModelForElementKey = (imodelMock: moq.IMock<IModelDb>, key: InstanceKey) => {
    imodelMock.setup((x) => x.withPreparedStatement(moq.It.isAnyString(), moq.It.isAny())).callback((_q, cb) => {
      const valueMock = moq.Mock.ofType<ECSqlValue>();
      valueMock.setup((x) => x.getClassNameForClassId()).returns(() => key.className);
      const stmtMock = moq.Mock.ofType<ECSqlStatement>();
      stmtMock.setup((x) => x.step()).returns(() => DbResult.BE_SQLITE_ROW);
      stmtMock.setup((x) => x.getValue(0)).returns(() => valueMock.object);
      cb(stmtMock.object);
    });
  };

  const setupIModelForNoResultStatement = (imodelMock: moq.IMock<IModelDb>) => {
    imodelMock.setup((x) => x.withPreparedStatement(moq.It.isAnyString(), moq.It.isAny())).callback((_q, cb) => {
      const stmtMock = moq.Mock.ofType<ECSqlStatement>();
      stmtMock.setup((x) => x.step()).returns(() => DbResult.BE_SQLITE_DONE);
      cb(stmtMock.object);
    });
  };

  describe("constructor", () => {

    describe("uses default native library implementation if not overridden", () => {

      it("creates without props", () => {
        const constructorSpy = sinon.spy(IModelHost.platform, "ECPresentationManager");
        using(new PresentationManager(), (manager) => {
          expect((manager.getNativePlatform() as any)._nativeAddon).instanceOf(IModelHost.platform.ECPresentationManager);
          expect(constructorSpy).to.be.calledOnceWithExactly(
            "",
            [LOCALES_DIRECTORY],
            { [RequestPriority.Preload]: 1, [RequestPriority.Max]: 1 },
            IModelHost.platform.ECPresentationManagerMode.ReadWrite,
          );
        });
      });

      it("creates with props", () => {
        const constructorSpy = sinon.spy(IModelHost.platform, "ECPresentationManager");
        const testLocale = faker.random.locale();
        const testTaskAllocations = { [999]: 111 };
        const props = {
          id: faker.random.uuid(),
          localeDirectories: [testLocale, testLocale],
          taskAllocationsMap: testTaskAllocations,
          mode: PresentationManagerMode.ReadOnly,
        };
        using(new PresentationManager(props), (manager) => {
          expect((manager.getNativePlatform() as any)._nativeAddon).instanceOf(IModelHost.platform.ECPresentationManager);
          expect(constructorSpy).to.be.calledOnceWithExactly(
            props.id,
            [LOCALES_DIRECTORY, testLocale],
            testTaskAllocations,
            IModelHost.platform.ECPresentationManagerMode.ReadOnly,
          );
        });
      });

    });

    it("uses addon implementation supplied through props", () => {
      const nativePlatformMock = moq.Mock.ofType<NativePlatformDefinition>();
      using(new PresentationManager({ addon: nativePlatformMock.object }), (manager) => {
        expect(manager.getNativePlatform()).eq(nativePlatformMock.object);
      });
    });

    describe("addon setup based on props", () => {

      const addon = moq.Mock.ofType<NativePlatformDefinition>();
      beforeEach(() => {
        addon.reset();
      });

      it("sets up ruleset directories if supplied", () => {
        const dirs = ["test1", "test2"];
        addon.setup((x) => x.setupRulesetDirectories(dirs)).verifiable();
        using(new PresentationManager({ addon: addon.object, rulesetDirectories: dirs }), (pm: PresentationManager) => { pm; });
        addon.verifyAll();
      });

      it("sets up supplemental ruleset directories if supplied", () => {
        const dirs = ["test1", "test2", "test2"];
        const addonDirs = [path.join(__dirname, "../assets/supplemental-presentation-rules"), "test1", "test2"];
        addon
          .setup((x) => x.setupSupplementalRulesetDirectories(addonDirs))
          .verifiable();
        using(new PresentationManager({ addon: addon.object, supplementalRulesetDirectories: dirs }), (pm: PresentationManager) => { pm; });
        addon.verifyAll();
      });

      it("sets up active locale if supplied", () => {
        const locale = faker.random.locale();
        using(new PresentationManager({ addon: addon.object, activeLocale: locale }), (manager) => {
          expect(manager.activeLocale).to.eq(locale);
        });
      });

      it("subscribes for `IModelDb.onOpened` event if `enableSchemasPreload` is set", () => {
        using(new PresentationManager({ addon: addon.object, enableSchemasPreload: false }), (_) => {
          expect(IModelDb.onOpened.numberOfListeners).to.eq(0);
        });
        using(new PresentationManager({ addon: addon.object, enableSchemasPreload: true }), (_) => {
          expect(IModelDb.onOpened.numberOfListeners).to.eq(1);
        });
      });

    });

  });

  describe("props", () => {

    it("returns empty object if initialized without props", () => {
      using(new PresentationManager(undefined), (newManager) => {
        expect(newManager.props).to.deep.eq({});
      });
    });

    it("returns initialization props", () => {
      const props = { activeLocale: faker.random.locale() };
      using(new PresentationManager(props), (newManager) => {
        expect(newManager.props).to.equal(props);
      });
    });

  });

  describe("activeLocale", () => {

    const addonMock = moq.Mock.ofType<NativePlatformDefinition>();
    beforeEach(() => {
      addonMock.reset();
    });

    it("uses manager's activeLocale when not specified in request options", async () => {
      const imodelMock = moq.Mock.ofType<IModelDb>();
      const rulesetId = faker.random.word();
      const locale = faker.random.locale().toLowerCase();
      await using(new PresentationManager({ addon: addonMock.object, activeLocale: locale }), async (manager) => {
        addonMock
          .setup(async (x) => x.handleRequest(ClientRequestContext.current, moq.It.isAny(), moq.It.is((serializedRequest: string): boolean => {
            const request = JSON.parse(serializedRequest);
            return request.params.locale === locale;
          })))
          .returns(async () => "{}")
          .verifiable(moq.Times.once());
        await manager.getNodesCount(ClientRequestContext.current, { imodel: imodelMock.object, rulesetId });
        addonMock.verifyAll();
      });
    });

    it("ignores manager's activeLocale when locale is specified in request options", async () => {
      const imodelMock = moq.Mock.ofType<IModelDb>();
      const rulesetId = faker.random.word();
      const locale = faker.random.locale().toLowerCase();
      await using(new PresentationManager({ addon: addonMock.object, activeLocale: faker.random.locale().toLowerCase() }), async (manager) => {
        expect(manager.activeLocale).to.not.eq(locale);
        addonMock
          .setup(async (x) => x.handleRequest(ClientRequestContext.current, moq.It.isAny(), moq.It.is((serializedRequest: string): boolean => {
            const request = JSON.parse(serializedRequest);
            return request.params.locale === locale;
          })))
          .returns(async () => "{}")
          .verifiable(moq.Times.once());
        await manager.getNodesCount(ClientRequestContext.current, { imodel: imodelMock.object, rulesetId, locale });
        addonMock.verifyAll();
      });
    });

  });

  describe("vars", () => {

    const addon = moq.Mock.ofType<NativePlatformDefinition>();
    const manager: PresentationManager = new PresentationManager({ addon: addon.object });

    it("returns variables manager", () => {
      const vars = manager.vars(faker.random.word());
      expect(vars).to.be.instanceOf(RulesetVariablesManagerImpl);
    });

  });

  describe("rulesets", () => {

    const addon = moq.Mock.ofType<NativePlatformDefinition>();
    const manager: PresentationManager = new PresentationManager({ addon: addon.object });

    it("returns rulesets manager", () => {
      expect(manager.rulesets()).to.be.instanceOf(RulesetManagerImpl);
    });

  });

  describe("dispose", () => {

    it("calls native platform dispose when manager is disposed", () => {
      const nativePlatformMock = moq.Mock.ofType<NativePlatformDefinition>();
      const manager = new PresentationManager({ addon: nativePlatformMock.object });
      manager.dispose();
      manager.dispose();
      // note: verify native platform's `dispose` called only once
      nativePlatformMock.verify((x) => x.dispose(), moq.Times.once());
    });

    it("unsubscribes from `IModelDb.onOpened` event if `enableSchemasPreload` is set", () => {
      const nativePlatformMock = moq.Mock.ofType<NativePlatformDefinition>();
      const manager = new PresentationManager({ addon: nativePlatformMock.object, enableSchemasPreload: true });
      expect(IModelDb.onOpened.numberOfListeners).to.eq(1);
      manager.dispose();
      expect(IModelDb.onOpened.numberOfListeners).to.eq(0);
    });

    it("throws when attempting to use native platform after disposal", () => {
      const nativePlatformMock = moq.Mock.ofType<NativePlatformDefinition>();
      const manager = new PresentationManager({ addon: nativePlatformMock.object });
      manager.dispose();
      expect(() => manager.getNativePlatform()).to.throw(PresentationError);
    });

  });

  describe("handling options", () => {

    const addonMock = moq.Mock.ofType<NativePlatformDefinition>();
    const imodelMock = moq.Mock.ofType<IModelDb>();
    let manager: PresentationManager;

    beforeEach(() => {
      addonMock.reset();
      manager = new PresentationManager({ addon: addonMock.object });
    });

    it("adds ruleset variables from options", async () => {
      const rulesetId = faker.random.word();
      const variable = { id: faker.random.word(), type: VariableValueTypes.String, value: faker.random.word() };
      const rulesetVariables = [variable];
      addonMock
        .setup((x) => x.handleRequest(ClientRequestContext.current, moq.It.isAny(), moq.It.isAny()))
        .returns(async () => "{}")
        .verifiable(moq.Times.once());
      addonMock
        .setup((x) => x.setRulesetVariableValue(rulesetId, variable.id, variable.type, variable.value))
        .verifiable(moq.Times.once());
      await manager.getNodesCount(ClientRequestContext.current, { imodel: imodelMock.object, rulesetId, rulesetVariables });
      addonMock.verifyAll();
    });

    it("throws if ruleset or ruleset id is not provided", async () => {
      await expect(manager.getNodesCount(ClientRequestContext.current, { imodel: imodelMock.object })).to.be.rejectedWith(PresentationError);
    });

  });

  describe("preloading schemas", () => {

    it("calls addon's `forceLoadSchemas` on `IModelDb.onOpened` events", () => {
      const imodelMock = moq.Mock.ofType<IModelDb>();
      const nativePlatformMock = moq.Mock.ofType<NativePlatformDefinition>();
      nativePlatformMock.setup((x) => x.getImodelAddon(imodelMock.object)).verifiable(moq.Times.atLeastOnce());
      using(new PresentationManager({ addon: nativePlatformMock.object, enableSchemasPreload: true }), (_) => {
        const context = new ClientRequestContext();
        IModelDb.onOpened.raiseEvent(context, imodelMock.object);
        nativePlatformMock.verify((x) => x.forceLoadSchemas(context, moq.It.isAny()), moq.Times.once());
      });
    });

  });

  describe("addon results conversion to Presentation objects", () => {

    let testData: any;
    const nativePlatformMock = moq.Mock.ofType<NativePlatformDefinition>();
    const imodelMock = moq.Mock.ofType<IModelDb>();
    let manager: PresentationManager;
    beforeEach(async () => {
      testData = {
        rulesetOrId: await createRandomRuleset(),
        pageOptions: { start: faker.random.number(), size: faker.random.number() } as PageOptions,
        displayType: faker.random.word(),
        selectionInfo: {
          providerName: faker.random.word(),
          level: faker.random.number(),
        } as SelectionInfo,
      };
      nativePlatformMock.reset();
      nativePlatformMock.setup((x) => x.getImodelAddon(imodelMock.object)).verifiable(moq.Times.atLeastOnce());
      manager = new PresentationManager({ addon: nativePlatformMock.object });
    });
    afterEach(() => {
      manager.dispose();
      nativePlatformMock.verifyAll();
    });

    const getRulesetId = (rulesetOrId: Ruleset | string) => {
      if (typeof rulesetOrId === "object")
        return `${rulesetOrId.id}-${hash.MD5(rulesetOrId)}`;
      return rulesetOrId;
    };
    const setup = (addonResponse: any) => {
      // nativePlatformMock the handleRequest function
      nativePlatformMock.setup(async (x) => x.handleRequest(ClientRequestContext.current, moq.It.isAny(), moq.It.isAnyString()))
        .returns(async () => JSON.stringify(addonResponse));
    };
    const verifyMockRequest = (expectedParams: any) => {
      // verify the addon was called with correct params
      nativePlatformMock.verify(async (x) => x.handleRequest(ClientRequestContext.current, moq.It.isAny(), moq.It.is((serializedParam: string): boolean => {
        const param = JSON.parse(serializedParam);
        expectedParams = JSON.parse(JSON.stringify(expectedParams));
        return deepEqual(param, expectedParams);
      })), moq.Times.once());
    };
    const verifyWithSnapshot = (result: any, expectedParams: any, recreateSnapshot: boolean = false) => {
      // verify the addon was called with correct params
      verifyMockRequest(expectedParams);
      // verify the manager correctly used addonResponse to create its result
      expect(result).to.matchSnapshot(recreateSnapshot);
    };
    const verifyWithExpectedResult = (actualResult: any, expectedResult: any, expectedParams: any) => {
      // verify the addon was called with correct params
      verifyMockRequest(expectedParams);
      // verify the manager correctly used addonResponse to create its result
      expect(actualResult).to.deep.eq(expectedResult);
    };

    it("returns root nodes", async () => {
      // what the addon receives
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetRootNodes,
        params: {
          paging: testData.pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse: NodeJSON[] = [{
        key: {
          type: "type1",
          pathFromRoot: ["p1", "p2", "p3"],
        } as NodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test1"),
        description: "description1",
        imageId: "img_1",
        foreColor: "foreColor1",
        backColor: "backColor1",
        fontStyle: "fontStyle1",
        hasChildren: true,
        isSelectionDisabled: true,
        isEditable: true,
        isChecked: true,
        isCheckboxVisible: true,
        isCheckboxEnabled: true,
        isExpanded: true,
      }, {
        key: {
          type: "ECInstanceNode",
          pathFromRoot: ["p1"],
          instanceKey: createRandomECInstanceKeyJSON(),
        } as ECInstanceNodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test2"),
        description: "description2",
        imageId: "",
        foreColor: "",
        backColor: "",
        fontStyle: "",
        hasChildren: false,
        isSelectionDisabled: false,
        isEditable: false,
        isChecked: false,
        isCheckboxVisible: false,
        isCheckboxEnabled: false,
        isExpanded: false,
      }, {
        key: {
          type: "some node",
          pathFromRoot: ["p1", "p3"],
        } as NodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test2"),
      }];
      setup(addonResponse);

      // test
      const options: Paged<HierarchyRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: testData.pageOptions,
      };
      const result = await manager.getNodes(ClientRequestContext.current, options);
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns root nodes count", async () => {
      // what the addon receives
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetRootNodesCount,
        params: {
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse = 456;
      setup(addonResponse);

      // test
      const options: HierarchyRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getNodesCount(ClientRequestContext.current, options);
      verifyWithExpectedResult(result, addonResponse, expectedParams);
    });

    it("returns root nodes and root nodes count when requesting first page", async () => {
      // what the addon receives
      const pageOptions = { start: 0, size: 2 };
      const expectedGetRootNodesParams = {
        requestId: NativePlatformRequestTypes.GetRootNodes,
        params: {
          paging: pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };
      const expectedGetRootNodesCountParams = {
        requestId: NativePlatformRequestTypes.GetRootNodesCount,
        params: {
          rulesetId: getRulesetId(testData.rulesetOrId),
          paging: pageOptions,
        },
      };

      // what the addon returns
      const addonGetRootNodesResponse: NodeJSON[] = [{
        key: {
          type: "type1",
          pathFromRoot: ["p1", "p2", "p3"],
        } as NodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test1"),
        description: "description1",
        imageId: "img_1",
        foreColor: "foreColor1",
        backColor: "backColor1",
        fontStyle: "fontStyle1",
        hasChildren: true,
        isSelectionDisabled: true,
        isEditable: true,
        isChecked: true,
        isCheckboxVisible: true,
        isCheckboxEnabled: true,
        isExpanded: true,
      }, {
        key: {
          type: "ECInstanceNode",
          pathFromRoot: ["p1"],
          instanceKey: createRandomECInstanceKeyJSON(),
        } as ECInstanceNodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test2"),
        description: "description2",
        imageId: "",
        foreColor: "",
        backColor: "",
        fontStyle: "",
        hasChildren: false,
        isSelectionDisabled: false,
        isEditable: false,
        isChecked: false,
        isCheckboxVisible: false,
        isCheckboxEnabled: false,
        isExpanded: false,
      }, {
        key: {
          type: "some node",
          pathFromRoot: ["p1", "p3"],
        } as NodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test2"),
      }];
      const addonGetRootNodesCountResponse = 456;

      setup(addonGetRootNodesCountResponse);
      setup(addonGetRootNodesResponse);

      const options: Paged<HierarchyRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: pageOptions,
      };
      const result = await manager.getNodesAndCount(ClientRequestContext.current, options);

      verifyWithSnapshot(result.nodes, expectedGetRootNodesParams);
      verifyWithExpectedResult(result.count, addonGetRootNodesCountResponse, expectedGetRootNodesCountParams);
    });

    it("returns child nodes", async () => {
      // what the addon receives
      const parentNodeKeyJSON = createRandomECInstanceNodeKeyJSON();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetChildren,
        params: {
          nodeKey: parentNodeKeyJSON,
          paging: testData.pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse: NodeJSON[] = [{
        key: {
          type: "ECInstanceNode",
          pathFromRoot: ["p1"],
          instanceKey: createRandomECInstanceKeyJSON(),
        } as ECInstanceNodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test2"),
      }, {
        key: {
          type: "type 2",
          pathFromRoot: ["p1", "p3"],
        } as NodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test3"),
      }];
      setup(addonResponse);

      // test
      const options: Paged<HierarchyRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: testData.pageOptions,
      };
      const result = await manager.getNodes(ClientRequestContext.current, options, NodeKey.fromJSON(parentNodeKeyJSON));
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns child nodes count", async () => {
      // what the addon receives
      const parentNodeKeyJSON = createRandomECInstanceNodeKeyJSON();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetChildrenCount,
        params: {
          nodeKey: parentNodeKeyJSON,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse = 789;
      setup(addonResponse);

      // test
      const options: HierarchyRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getNodesCount(ClientRequestContext.current, options, NodeKey.fromJSON(parentNodeKeyJSON));
      verifyWithExpectedResult(result, addonResponse, expectedParams);
    });

    it("returns child nodes and child node count when requesting first page", async () => {
      // what the addon receives
      const pageOptions = { start: 0, size: 2 };
      const parentNodeKeyJSON = createRandomECInstanceNodeKeyJSON();
      const expectedGetChildNodesParams = {
        requestId: NativePlatformRequestTypes.GetChildren,
        params: {
          nodeKey: parentNodeKeyJSON,
          rulesetId: getRulesetId(testData.rulesetOrId),
          paging: pageOptions,
        },
      };
      const expectedGetChildNodeCountParams = {
        requestId: NativePlatformRequestTypes.GetChildrenCount,
        params: {
          nodeKey: parentNodeKeyJSON,
          rulesetId: getRulesetId(testData.rulesetOrId),
          paging: pageOptions,
        },
      };

      // what the addon returns
      const addonGetChildNodesResponse: NodeJSON[] = [{
        key: {
          type: "ECInstanceNode",
          pathFromRoot: ["p1"],
          instanceKey: createRandomECInstanceKeyJSON(),
        } as ECInstanceNodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test2"),
      }, {
        key: {
          type: "type 2",
          pathFromRoot: ["p1", "p3"],
        } as NodeKeyJSON,
        labelDefinition: LabelDefinition.fromLabelString("test3"),
      }];
      const addonGetChildNodeCountResponse = 789;

      setup(addonGetChildNodeCountResponse);
      setup(addonGetChildNodesResponse);

      // test
      const options: Paged<HierarchyRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: pageOptions,
      };
      const result = await manager.getNodesAndCount(ClientRequestContext.current, options, NodeKey.fromJSON(parentNodeKeyJSON));

      verifyWithSnapshot(result.nodes, expectedGetChildNodesParams);
      verifyWithExpectedResult(result.count, addonGetChildNodeCountResponse, expectedGetChildNodeCountParams);
    });

    it("returns filtered node paths", async () => {
      // what the addon receives
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetFilteredNodePaths,
        params: {
          filterText: "filter",
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what addon returns
      const addonResponse = [createRandomNodePathElementJSON(0)];
      setup(addonResponse);

      // test
      const options: HierarchyRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getFilteredNodePaths(ClientRequestContext.current, options, "filter");
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns node paths", async () => {
      // what the addon receives
      const keyJsonArray = [[createRandomECInstanceKeyJSON(), createRandomECInstanceKeyJSON()]];
      const keyArray = [keyJsonArray[0].map((json) => InstanceKey.fromJSON(json))];
      const markedIndex = faker.random.number();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetNodePaths,
        params: {
          paths: keyJsonArray,
          markedIndex,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what addon returns
      const addonResponse = [createRandomNodePathElementJSON(0)];
      setup(addonResponse);

      // test
      const options: HierarchyRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getNodePaths(ClientRequestContext.current, options, keyArray, markedIndex);
      verifyWithSnapshot(result, expectedParams);
    });

    it("requests hierarchy load", async () => {
      // what the addon receives
      const expectedParams = {
        requestId: NativePlatformRequestTypes.LoadHierarchy,
        params: {
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what addon returns
      setup("");

      // test
      const options: HierarchyRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      await manager.loadHierarchy(ClientRequestContext.current, options);

      // verify the addon was called with correct params
      verifyMockRequest(expectedParams);
    });

    it("returns content descriptor", async () => {
      // what the addon receives
      const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContentDescriptor,
        params: {
          displayType: testData.displayType,
          keys: keys.toJSON(),
          selection: testData.selectionInfo,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse: DescriptorJSON = {
        connectionId: faker.random.uuid(),
        inputKeysHash: faker.random.uuid(),
        contentOptions: faker.random.objectElement(),
        displayType: testData.displayType,
        selectClasses: [{
          selectClassInfo: createRandomECClassInfoJSON(),
          isSelectPolymorphic: true,
          pathToPrimaryClass: createRandomRelationshipPathJSON(1),
          relatedPropertyPaths: [createRandomRelationshipPathJSON(1)],
          navigationPropertyClasses: [createRandomRelatedClassInfoJSON()],
          relatedInstanceClasses: [createRandomRelatedClassInfoJSON()],
        }],
        fields: [{
          name: "Primitive property field with editor",
          category: createRandomCategory(),
          label: faker.random.words(),
          type: {
            typeName: "string",
            valueFormat: "Primitive",
          } as PrimitiveTypeDescription,
          isReadonly: faker.random.boolean(),
          priority: faker.random.number(),
          editor: {
            name: faker.random.word(),
            params: {
              some_param: faker.random.number(),
            },
          },
          properties: [{
            property: {
              classInfo: createRandomECClassInfoJSON(),
              name: faker.random.word(),
              type: "string",
              enumerationInfo: {
                choices: [{
                  label: faker.random.words(),
                  value: faker.random.uuid(),
                }, {
                  label: faker.random.words(),
                  value: faker.random.uuid(),
                }],
                isStrict: faker.random.boolean(),
              },
            } as PropertyInfoJSON,
            relatedClassPath: [],
          } as PropertyJSON],
        } as PropertiesFieldJSON, {
          name: "Complex array of structs property field",
          category: createRandomCategory(),
          label: faker.random.words(),
          type: {
            typeName: "string[]",
            valueFormat: "Array",
            memberType: {
              typeName: "SomeClass",
              valueFormat: "Struct",
              members: [{
                name: faker.random.word(),
                label: faker.random.words(),
                type: {
                  typeName: "string",
                  valueFormat: "Primitive",
                },
              }, {
                name: faker.random.word(),
                label: faker.random.words(),
                type: {
                  typeName: "string[]",
                  valueFormat: "Array",
                  memberType: {
                    typeName: "string",
                    valueFormat: "Primitive",
                  },
                } as ArrayTypeDescription,
              }],
            } as StructTypeDescription,
          } as ArrayTypeDescription,
          isReadonly: faker.random.boolean(),
          priority: faker.random.number(),
          properties: [{
            property: {
              classInfo: createRandomECClassInfoJSON(),
              name: faker.random.word(),
              type: "double",
              kindOfQuantity: {
                name: faker.random.word(),
                label: faker.random.words(),
                persistenceUnit: faker.random.word(),
                currentFormatId: faker.random.uuid(),
              } as KindOfQuantityInfo,
            } as PropertyInfoJSON,
            relatedClassPath: [],
          } as PropertyJSON],
        } as PropertiesFieldJSON, {
          name: "Nested content field",
          category: createRandomCategory(),
          label: faker.random.words(),
          type: {
            typeName: faker.random.word(),
            valueFormat: "Struct",
            members: [{
              name: faker.random.word(),
              label: faker.random.words(),
              type: {
                typeName: "string",
                valueFormat: "Primitive",
              },
            }],
          } as StructTypeDescription,
          contentClassInfo: createRandomECClassInfoJSON(),
          pathToPrimaryClass: createRandomRelationshipPathJSON(1),
          nestedFields: [{
            name: "Simple property field",
            category: createRandomCategory(),
            label: faker.random.words(),
            type: {
              typeName: "string",
              valueFormat: "Primitive",
            },
            isReadonly: faker.random.boolean(),
            priority: faker.random.number(),
          } as FieldJSON],
          isReadonly: faker.random.boolean(),
          priority: faker.random.number(),
          autoExpand: faker.random.boolean(),
        } as NestedContentFieldJSON],
        contentFlags: 0,
      };
      setup(addonResponse);

      // test
      const options: ContentRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getContentDescriptor(ClientRequestContext.current, options, testData.displayType,
        keys, testData.selectionInfo);
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns content set size", async () => {
      // what the addon receives
      const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
      const descriptor = createRandomDescriptor();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContentSetSize,
        params: {
          keys: keys.toJSON(),
          descriptorOverrides: descriptor.createDescriptorOverrides(),
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse = faker.random.number();
      setup(addonResponse);

      // test
      const options: ContentRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getContentSetSize(ClientRequestContext.current, options, descriptor, keys);
      verifyWithExpectedResult(result, addonResponse, expectedParams);
    });

    it("returns content set size when descriptor overrides are passed instead of descriptor", async () => {
      // what the addon receives
      const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
      const descriptor = createRandomDescriptor();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContentSetSize,
        params: {
          keys: keys.toJSON(),
          descriptorOverrides: {
            displayType: descriptor.displayType,
            hiddenFieldNames: [],
            contentFlags: 0,
          },
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const addonResponse = faker.random.number();
      setup(addonResponse);

      // test
      const options: ContentRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      const result = await manager.getContentSetSize(ClientRequestContext.current, options, descriptor.createDescriptorOverrides(), keys);
      verifyWithExpectedResult(result, addonResponse, expectedParams);
    });

    it("returns content", async () => {
      // what the addon receives
      const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
      const descriptor = createRandomDescriptor();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContent,
        params: {
          keys: keys.toJSON(),
          descriptorOverrides: descriptor.createDescriptorOverrides(),
          paging: testData.pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const fieldName = faker.random.word();
      const addonResponse = {
        descriptor: {
          displayType: descriptor.displayType,
          selectClasses: [{
            selectClassInfo: createRandomECClassInfoJSON(),
            isSelectPolymorphic: true,
            pathToPrimaryClass: [],
            relatedPropertyPaths: [],
            navigationPropertyClasses: [],
            relatedInstanceClasses: [],
          } as SelectClassInfoJSON],
          fields: [{
            name: fieldName,
            category: createRandomCategory(),
            label: faker.random.words(),
            type: {
              typeName: "string",
              valueFormat: "Primitive",
            } as PrimitiveTypeDescription,
            isReadonly: faker.random.boolean(),
            priority: faker.random.number(),
            properties: [{
              property: {
                classInfo: createRandomECClassInfoJSON(),
                name: faker.random.word(),
                type: "string",
              } as PropertyInfoJSON,
              relatedClassPath: [],
            } as PropertyJSON],
          } as PropertiesFieldJSON],
          contentFlags: 0,
        } as DescriptorJSON,
        contentSet: [{
          primaryKeys: [createRandomECInstanceKeyJSON()],
          classInfo: createRandomECClassInfoJSON(),
          labelDefinition: createRandomLabelDefinitionJSON(),
          imageId: faker.random.uuid(),
          values: {
            [fieldName]: faker.random.words(),
          },
          displayValues: {
            [fieldName]: faker.random.words(),
          },
          mergedFieldNames: [],
        } as ItemJSON],
      } as ContentJSON;
      setup(addonResponse);

      // test
      const options: Paged<ContentRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: testData.pageOptions,
      };
      const result = await manager.getContent(ClientRequestContext.current, options, descriptor, keys);
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns content for BisCore:Element instances when concrete key is found", async () => {
      // what the addon receives
      const baseClassKey = { className: "BisCore:Element", id: createRandomId() };
      const concreteClassKey = { className: faker.random.word(), id: baseClassKey.id };
      setupIModelForElementKey(imodelMock, concreteClassKey);
      const descriptor = createRandomDescriptor();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContent,
        params: {
          keys: new KeySet([concreteClassKey]).toJSON(),
          descriptorOverrides: descriptor.createDescriptorOverrides(),
          paging: testData.pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const fieldName = faker.random.word();
      const addonResponse = {
        descriptor: {
          displayType: descriptor.displayType,
          selectClasses: [{
            selectClassInfo: createRandomECClassInfoJSON(),
            isSelectPolymorphic: true,
            pathToPrimaryClass: [],
            relatedPropertyPaths: [],
            navigationPropertyClasses: [],
            relatedInstanceClasses: [],
          } as SelectClassInfoJSON],
          fields: [{
            name: fieldName,
            category: createRandomCategory(),
            label: faker.random.words(),
            type: {
              typeName: "string",
              valueFormat: "Primitive",
            } as PrimitiveTypeDescription,
            isReadonly: faker.random.boolean(),
            priority: faker.random.number(),
            properties: [{
              property: {
                classInfo: createRandomECClassInfoJSON(),
                name: faker.random.word(),
                type: "string",
              } as PropertyInfoJSON,
              relatedClassPath: [],
            } as PropertyJSON],
          } as PropertiesFieldJSON],
          contentFlags: 0,
        } as DescriptorJSON,
        contentSet: [{
          primaryKeys: [createRandomECInstanceKeyJSON()],
          classInfo: createRandomECClassInfoJSON(),
          labelDefinition: createRandomLabelDefinitionJSON(),
          imageId: faker.random.uuid(),
          values: {
            [fieldName]: faker.random.words(),
          },
          displayValues: {
            [fieldName]: faker.random.words(),
          },
          mergedFieldNames: [],
        } as ItemJSON],
      } as ContentJSON;
      setup(addonResponse);

      // test
      const options: Paged<ContentRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: testData.pageOptions,
      };
      const result = await manager.getContent(ClientRequestContext.current, options, descriptor, new KeySet([baseClassKey]));
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns content for BisCore:Element instances when concrete key is not found", async () => {
      // what the addon receives
      const baseClassKey = { className: "BisCore:Element", id: createRandomId() };
      setupIModelForNoResultStatement(imodelMock);
      const descriptor = createRandomDescriptor();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContent,
        params: {
          keys: new KeySet([baseClassKey]).toJSON(),
          descriptorOverrides: descriptor.createDescriptorOverrides(),
          paging: testData.pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const fieldName = faker.random.word();
      const addonResponse = {
        descriptor: {
          displayType: descriptor.displayType,
          selectClasses: [{
            selectClassInfo: createRandomECClassInfoJSON(),
            isSelectPolymorphic: true,
            pathToPrimaryClass: [],
            relatedPropertyPaths: [],
            navigationPropertyClasses: [],
            relatedInstanceClasses: [],
          } as SelectClassInfoJSON],
          fields: [{
            name: fieldName,
            category: createRandomCategory(),
            label: faker.random.words(),
            type: {
              typeName: "string",
              valueFormat: "Primitive",
            } as PrimitiveTypeDescription,
            isReadonly: faker.random.boolean(),
            priority: faker.random.number(),
            properties: [{
              property: {
                classInfo: createRandomECClassInfoJSON(),
                name: faker.random.word(),
                type: "string",
              } as PropertyInfoJSON,
              relatedClassPath: [],
            } as PropertyJSON],
          } as PropertiesFieldJSON],
          contentFlags: 0,
        } as DescriptorJSON,
        contentSet: [{
          primaryKeys: [createRandomECInstanceKeyJSON()],
          classInfo: createRandomECClassInfoJSON(),
          labelDefinition: createRandomLabelDefinitionJSON(),
          imageId: faker.random.uuid(),
          values: {
            [fieldName]: faker.random.words(),
          },
          displayValues: {
            [fieldName]: faker.random.words(),
          },
          mergedFieldNames: [],
        } as ItemJSON],
      } as ContentJSON;
      setup(addonResponse);

      // test
      const options: Paged<ContentRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: testData.pageOptions,
      };
      const result = await manager.getContent(ClientRequestContext.current, options, descriptor, new KeySet([baseClassKey]));
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns content when descriptor overrides are passed instead of descriptor", async () => {
      // what the addon receives
      const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
      const descriptor = createRandomDescriptor();
      const expectedParams = {
        requestId: NativePlatformRequestTypes.GetContent,
        params: {
          keys: keys.toJSON(),
          descriptorOverrides: {
            displayType: descriptor.displayType,
            hiddenFieldNames: [],
            contentFlags: 0,
          },
          paging: testData.pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };

      // what the addon returns
      const fieldName = faker.random.word();
      const addonResponse = {
        descriptor: {
          displayType: descriptor.displayType,
          selectClasses: [{
            selectClassInfo: createRandomECClassInfoJSON(),
            isSelectPolymorphic: true,
            pathToPrimaryClass: [],
            relatedPropertyPaths: [],
            navigationPropertyClasses: [],
            relatedInstanceClasses: [],
          } as SelectClassInfoJSON],
          fields: [{
            name: fieldName,
            category: createRandomCategory(),
            label: faker.random.words(),
            type: {
              typeName: "string",
              valueFormat: "Primitive",
            } as PrimitiveTypeDescription,
            isReadonly: faker.random.boolean(),
            priority: faker.random.number(),
            properties: [{
              property: {
                classInfo: createRandomECClassInfoJSON(),
                name: faker.random.word(),
                type: "string",
              } as PropertyInfoJSON,
              relatedClassPath: [],
            } as PropertyJSON],
          } as PropertiesFieldJSON],
          contentFlags: 0,
        } as DescriptorJSON,
        contentSet: [{
          primaryKeys: [createRandomECInstanceKeyJSON()],
          classInfo: createRandomECClassInfoJSON(),
          labelDefinition: createRandomLabelDefinitionJSON(),
          imageId: faker.random.uuid(),
          values: {
            [fieldName]: faker.random.words(),
          },
          displayValues: {
            [fieldName]: faker.random.words(),
          },
          mergedFieldNames: [],
        } as ItemJSON],
      } as ContentJSON;
      setup(addonResponse);

      // test
      const options: Paged<ContentRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: testData.pageOptions,
      };
      const result = await manager.getContent(ClientRequestContext.current, options, descriptor.createDescriptorOverrides(), keys);
      verifyWithSnapshot(result, expectedParams);
    });

    it("returns content and content set size when requesting first page", async () => {
      // what the addon receives
      const pageOptions = { start: 0, size: 2 };
      const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
      const descriptor = createRandomDescriptor();
      const expectedGetContentParams = {
        requestId: NativePlatformRequestTypes.GetContent,
        params: {
          keys: keys.toJSON(),
          descriptorOverrides: descriptor.createDescriptorOverrides(),
          paging: pageOptions,
          rulesetId: getRulesetId(testData.rulesetOrId),
        },
      };
      const expectedGetContentSetSizeParams = {
        requestId: NativePlatformRequestTypes.GetContentSetSize,
        params: {
          keys: keys.toJSON(),
          descriptorOverrides: descriptor.createDescriptorOverrides(),
          rulesetId: getRulesetId(testData.rulesetOrId),
          paging: pageOptions,
        },
      };

      // what the addon returns
      const fieldName = faker.random.word();
      const addonGetContentResponse = {
        descriptor: {
          displayType: descriptor.displayType,
          selectClasses: [{
            selectClassInfo: createRandomECClassInfoJSON(),
            isSelectPolymorphic: true,
            pathToPrimaryClass: [],
            relatedPropertyPaths: [],
            navigationPropertyClasses: [],
            relatedInstanceClasses: [],
          } as SelectClassInfoJSON],
          fields: [{
            name: fieldName,
            category: createRandomCategory(),
            label: faker.random.words(),
            type: {
              typeName: "string",
              valueFormat: "Primitive",
            } as PrimitiveTypeDescription,
            isReadonly: faker.random.boolean(),
            priority: faker.random.number(),
            properties: [{
              property: {
                classInfo: createRandomECClassInfoJSON(),
                name: faker.random.word(),
                type: "string",
              } as PropertyInfoJSON,
              relatedClassPath: [],
            } as PropertyJSON],
          } as PropertiesFieldJSON],
          contentFlags: 0,
        } as DescriptorJSON,
        contentSet: [{
          primaryKeys: [createRandomECInstanceKeyJSON()],
          classInfo: createRandomECClassInfoJSON(),
          labelDefinition: createRandomLabelDefinitionJSON(),
          imageId: faker.random.uuid(),
          values: {
            [fieldName]: faker.random.words(),
          },
          displayValues: {
            [fieldName]: faker.random.words(),
          },
          mergedFieldNames: [],
        } as ItemJSON],
      } as ContentJSON;
      const addonGetContentSetSizeResponse = faker.random.number();

      setup(addonGetContentSetSizeResponse);
      setup(addonGetContentResponse);

      // test
      const options: Paged<ContentRequestOptions<IModelDb>> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
        paging: pageOptions,
      };
      const result = await manager.getContentAndSize(ClientRequestContext.current, options, descriptor, keys);

      verifyWithSnapshot(result.content, expectedGetContentParams);
      verifyWithExpectedResult(result.size, addonGetContentSetSizeResponse, expectedGetContentSetSizeParams);
    });

    describe("getDistinctValues", () => {

      it("returns distinct values", async () => {
        // what the addon receives
        const keys = new KeySet([createRandomECInstanceNodeKey(), createRandomECInstanceKey()]);
        const descriptor = createRandomDescriptor();
        const fieldName = faker.random.word();
        const maximumValueCount = faker.random.number();
        const expectedParams = {
          requestId: NativePlatformRequestTypes.GetDistinctValues,
          params: {
            descriptorOverrides: descriptor.createDescriptorOverrides(),
            keys: keys.toJSON(),
            fieldName,
            maximumValueCount,
            rulesetId: getRulesetId(testData.rulesetOrId),
          },
        };

        // what the addon returns
        const addonResponse = [faker.random.word(), faker.random.word(), faker.random.word()];
        setup(addonResponse);

        // test
        const options: ContentRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
          rulesetOrId: testData.rulesetOrId,
        };
        const result = await manager.getDistinctValues(ClientRequestContext.current, options, descriptor,
          keys, fieldName, maximumValueCount);
        verifyWithExpectedResult(result, addonResponse, expectedParams);
      });

      it("passes 0 for maximumValueCount by default", async () => {
        // what the addon receives
        const descriptor = createRandomDescriptor();
        const expectedParams = {
          requestId: NativePlatformRequestTypes.GetDistinctValues,
          params: {
            descriptorOverrides: descriptor.createDescriptorOverrides(),
            keys: { instanceKeys: [], nodeKeys: [] },
            fieldName: "",
            maximumValueCount: 0,
            rulesetId: getRulesetId(testData.rulesetOrId),
          },
        };

        // what the addon returns
        const addonResponse: string[] = [];
        setup(addonResponse);

        // test
        const options: ContentRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
          rulesetOrId: testData.rulesetOrId,
        };
        const result = await manager.getDistinctValues(ClientRequestContext.current, options, descriptor, new KeySet(), "");
        verifyWithExpectedResult(result, addonResponse, expectedParams);
      });

    });

    describe("getDisplayLabel", () => {

      it("returns label from native addon", async () => {
        // what the addon receives
        const key = createRandomECInstanceKey();
        const expectedParams = {
          requestId: NativePlatformRequestTypes.GetDisplayLabel,
          params: {
            key,
          },
        };

        // what the addon returns
        const addonResponse = createRandomLabelDefinitionJSON();
        setup(addonResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabel(ClientRequestContext.current, options, key);
        verifyWithExpectedResult(result, addonResponse.displayValue, expectedParams);
      });

    });

    describe("getDisplayLabelDefinition", () => {

      it("returns label from native addon", async () => {
        // what the addon receives
        const key = createRandomECInstanceKey();
        const expectedParams = {
          requestId: NativePlatformRequestTypes.GetDisplayLabel,
          params: {
            key,
          },
        };

        // what the addon returns
        const addonResponse = createRandomLabelDefinitionJSON();
        setup(addonResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabelDefinition(ClientRequestContext.current, options, key);
        verifyWithExpectedResult(result, addonResponse, expectedParams);
      });

    });

    describe("getDisplayLabels", () => {

      it("returns labels from list content", async () => {
        // what the addon receives
        const keys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
        const labelsDefinitions = [createRandomLabelDefinitionJSON(), createRandomLabelDefinitionJSON()];
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet(keys).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        const addonContentResponse = {
          descriptor: {
            connectionId: faker.random.uuid(),
            inputKeysHash: faker.random.uuid(),
            contentOptions: {},
            displayType: DefaultContentDisplayTypes.List,
            selectClasses: [{
              selectClassInfo: createRandomECClassInfoJSON(),
              isSelectPolymorphic: true,
              pathToPrimaryClass: [],
              relatedPropertyPaths: [],
              navigationPropertyClasses: [],
              relatedInstanceClasses: [],
            } as SelectClassInfoJSON],
            fields: [],
            contentFlags: 0,
          } as DescriptorJSON,
          // note: return in wrong order to verify the resulting labels are still in the right order
          contentSet: [1, 0].map((index): ItemJSON => ({
            primaryKeys: [keys[index]],
            classInfo: createRandomECClassInfoJSON(),
            labelDefinition: labelsDefinitions[index],
            label: labelsDefinitions[index].displayValue,
            imageId: faker.random.uuid(),
            values: {},
            displayValues: {},
            mergedFieldNames: [],
          })),
        } as ContentJSON;
        setup(addonContentResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabels(ClientRequestContext.current, options, keys);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq(labelsDefinitions.map((r) => r.displayValue));
      });

      it("returns labels for BisCore:Element instances", async () => {
        // what the addon receives
        const baseClassKey = { className: "BisCore:Element", id: createRandomId() };
        const concreteClassKey = { className: faker.random.word(), id: baseClassKey.id };
        setupIModelForElementKey(imodelMock, concreteClassKey);
        const labelDefinition = createRandomLabelDefinitionJSON();
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet([concreteClassKey]).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        const addonContentResponse = {
          descriptor: {
            connectionId: faker.random.uuid(),
            inputKeysHash: faker.random.uuid(),
            contentOptions: {},
            displayType: DefaultContentDisplayTypes.List,
            selectClasses: [{
              selectClassInfo: createRandomECClassInfoJSON(),
              isSelectPolymorphic: true,
              pathToPrimaryClass: [],
              relatedPropertyPaths: [],
              navigationPropertyClasses: [],
              relatedInstanceClasses: [],
            } as SelectClassInfoJSON],
            fields: [],
            contentFlags: 0,
          } as DescriptorJSON,
          // note: return in wrong order to verify the resulting labels are still in the right order
          contentSet: [{
            primaryKeys: [concreteClassKey],
            classInfo: createRandomECClassInfoJSON(),
            labelDefinition,
            label: labelDefinition.displayValue,
            imageId: faker.random.uuid(),
            values: {},
            displayValues: {},
            mergedFieldNames: [],
          }],
        } as ContentJSON;
        setup(addonContentResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabels(ClientRequestContext.current, options, [baseClassKey]);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq([labelDefinition.displayValue]);
      });

      it("returns empty labels if content doesn't contain item with request key", async () => {
        const keys = [createRandomECInstanceKey()];
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet(keys).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        const addonContentResponse = {
          descriptor: createRandomDescriptorJSON(),
          contentSet: [{
            primaryKeys: [createRandomECInstanceKeyJSON()], // different than input key
            classInfo: createRandomECClassInfoJSON(),
            labelDefinition: createRandomLabelDefinitionJSON(),
            imageId: faker.random.uuid(),
            values: {},
            displayValues: {},
            mergedFieldNames: [],
          }],
        } as ContentJSON;
        setup(addonContentResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabels(ClientRequestContext.current, options, keys);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq([""]);
      });

      it("returns empty labels if content is undefined", async () => {
        const keys = [createRandomECInstanceKey()];
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet(keys).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        setup(null);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabels(ClientRequestContext.current, options, keys);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq([""]);
      });

    });

    describe("getDisplayLabelsDefinitions", () => {

      it("returns labels from list content", async () => {
        // what the addon receives
        const keys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
        const labels = [createRandomLabelDefinitionJSON(), createRandomLabelDefinitionJSON()];
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet(keys).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        const addonContentResponse = {
          descriptor: {
            connectionId: faker.random.uuid(),
            inputKeysHash: faker.random.uuid(),
            contentOptions: {},
            displayType: DefaultContentDisplayTypes.List,
            selectClasses: [{
              selectClassInfo: createRandomECClassInfoJSON(),
              isSelectPolymorphic: true,
              pathToPrimaryClass: [],
              relatedPropertyPaths: [],
              navigationPropertyClasses: [],
              relatedInstanceClasses: [],
            } as SelectClassInfoJSON],
            fields: [],
            contentFlags: 0,
          } as DescriptorJSON,
          // note: return in wrong order to verify the resulting labels are still in the right order
          contentSet: [1, 0].map((index): ItemJSON => ({
            primaryKeys: [keys[index]],
            classInfo: createRandomECClassInfoJSON(),
            labelDefinition: labels[index],
            imageId: faker.random.uuid(),
            values: {},
            displayValues: {},
            mergedFieldNames: [],
          })),
        } as ContentJSON;
        setup(addonContentResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabelsDefinitions(ClientRequestContext.current, options, keys);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq(labels);
      });

      it("returns labels for BisCore:Element instances", async () => {
        // what the addon receives
        const baseClassKey = { className: "BisCore:Element", id: createRandomId() };
        const concreteClassKey = { className: faker.random.word(), id: baseClassKey.id };
        setupIModelForElementKey(imodelMock, concreteClassKey);
        const labelDefinition = createRandomLabelDefinitionJSON();
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet([concreteClassKey]).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        const addonContentResponse = {
          descriptor: {
            connectionId: faker.random.uuid(),
            inputKeysHash: faker.random.uuid(),
            contentOptions: {},
            displayType: DefaultContentDisplayTypes.List,
            selectClasses: [{
              selectClassInfo: createRandomECClassInfoJSON(),
              isSelectPolymorphic: true,
              pathToPrimaryClass: [],
              relatedPropertyPaths: [],
              navigationPropertyClasses: [],
              relatedInstanceClasses: [],
            } as SelectClassInfoJSON],
            fields: [],
            contentFlags: 0,
          } as DescriptorJSON,
          // note: return in wrong order to verify the resulting labels are still in the right order
          contentSet: [{
            primaryKeys: [concreteClassKey],
            classInfo: createRandomECClassInfoJSON(),
            labelDefinition,
            imageId: faker.random.uuid(),
            values: {},
            displayValues: {},
            mergedFieldNames: [],
          }],
        } as ContentJSON;
        setup(addonContentResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabelsDefinitions(ClientRequestContext.current, options, [baseClassKey]);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq([labelDefinition]);
      });

      it("returns empty labels if content doesn't contain item with request key", async () => {
        const keys = [createRandomECInstanceKey()];
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet(keys).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        const addonContentResponse = {
          descriptor: createRandomDescriptorJSON(),
          contentSet: [{
            primaryKeys: [createRandomECInstanceKeyJSON()], // different than input key
            classInfo: createRandomECClassInfoJSON(),
            labelDefinition: createRandomLabelDefinitionJSON(),
            imageId: faker.random.uuid(),
            values: {},
            displayValues: {},
            mergedFieldNames: [],
          }],
        } as ContentJSON;
        setup(addonContentResponse);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabelsDefinitions(ClientRequestContext.current, options, keys);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq([{ displayValue: "", rawValue: "", typeName: "" }]);
      });

      it("returns empty labels if content is undefined", async () => {
        const keys = [createRandomECInstanceKey()];
        const expectedContentParams = {
          requestId: NativePlatformRequestTypes.GetContent,
          params: {
            keys: new KeySet(keys).toJSON(),
            descriptorOverrides: {
              displayType: DefaultContentDisplayTypes.List,
              contentFlags: ContentFlags.ShowLabels | ContentFlags.NoFields,
              hiddenFieldNames: [],
            },
            rulesetId: "RulesDrivenECPresentationManager_RulesetId_DisplayLabel",
          },
        };

        // what the addon returns
        setup(null);

        // test
        const options: LabelRequestOptions<IModelDb> = {
          imodel: imodelMock.object,
        };
        const result = await manager.getDisplayLabelsDefinitions(ClientRequestContext.current, options, keys);
        verifyMockRequest(expectedContentParams);
        expect(result).to.deep.eq([{ displayValue: "", rawValue: "", typeName: "" }]);
      });

    });

    it("throws on invalid addon response", async () => {
      nativePlatformMock.setup(async (x) => x.handleRequest(ClientRequestContext.current, moq.It.isAny(), moq.It.isAnyString())).returns(() => (undefined as any));
      const options: HierarchyRequestOptions<IModelDb> = {
        imodel: imodelMock.object,
        rulesetOrId: testData.rulesetOrId,
      };
      return expect(manager.getNodesCount(ClientRequestContext.current, options)).to.eventually.be.rejectedWith(Error);
    });

  });

  describe("WIP Selection Scopes", () => {

    // the below tests are temporary

    const imodelMock = moq.Mock.ofType<IModelDb>();
    const addonMock = moq.Mock.ofType<NativePlatformDefinition>();
    let manager: PresentationManager;

    beforeEach(() => {
      imodelMock.reset();
      addonMock.reset();
      manager = new PresentationManager({ addon: addonMock.object });
    });

    describe("getSelectionScopes", () => {

      it("returns expected selection scopes", async () => {
        const result = await manager.getSelectionScopes(ClientRequestContext.current, { imodel: imodelMock.object });
        expect(result.map((s) => s.id)).to.deep.eq(["element", "assembly", "top-assembly" /*, "category", "model"*/]);
      });

    });

    describe("computeSelection", () => {

      const elementsMock = moq.Mock.ofType<IModelDb.Elements>();
      const modelsMock = moq.Mock.ofType<IModelDb.Models>();

      const createRandomModelProps = (): ModelProps => {
        const id = createRandomId();
        const props: ModelProps = {
          classFullName: faker.random.words(),
          modeledElement: { relClassName: faker.random.word(), id },
          id,
        };
        return props;
      };

      const createRandomTopmostElementProps = (): ElementProps => {
        const props: ElementProps = {
          classFullName: faker.random.words(),
          code: {
            scope: faker.random.word(),
            spec: faker.random.word(),
          },
          model: createRandomId(),
          id: createRandomId(),
        };
        return props;
      };

      const createRandomElementProps = (parentId?: Id64String): ElementProps => {
        if (!parentId)
          parentId = createRandomId();
        return {
          ...createRandomTopmostElementProps(),
          parent: { relClassName: faker.random.word(), id: parentId },
        };
      };

      const createTransientElementId = () => Id64.fromLocalAndBriefcaseIds(faker.random.number(), 0xffffff);

      beforeEach(() => {
        elementsMock.reset();
        modelsMock.reset();
        imodelMock.setup((x) => x.elements).returns(() => elementsMock.object);
        imodelMock.setup((x) => x.models).returns(() => modelsMock.object);
        imodelMock.setup((x) => x.getMetaData(moq.It.isAnyString())).returns((className: string) => new EntityMetaData({
          baseClasses: [],
          properties: {},
          ecclass: className,
        }));
      });

      it("throws on invalid scopeId", async () => {
        await expect(manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [], "invalid")).to.eventually.be.rejected;
      });

      describe("scope: 'element'", () => {

        it("returns element keys", async () => {
          const keys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
          keys.forEach((key) => setupIModelForElementKey(imodelMock, key));

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, keys.map((k) => k.id), "element");
          expect(result.size).to.eq(2);
          keys.forEach((key) => expect(result.has(key)));
        });

        it("skips non-existing element ids", async () => {
          const keys = [createRandomECInstanceKey()];
          setupIModelForNoResultStatement(imodelMock);

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, keys.map((k) => k.id), "element");
          expect(result.size).to.eq(0);
        });

        it("skips transient element ids", async () => {
          const keys = [createRandomECInstanceKey(), { className: "any:class", id: createTransientElementId() }];
          setupIModelForElementKey(imodelMock, keys[0]);

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, keys.map((k) => k.id), "element");
          expect(result.size).to.eq(1);
          expect(result.has(keys[0])).to.be.true;
        });

      });

      describe("scope: 'assembly'", () => {

        it("returns parent keys", async () => {
          const parentKeys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
          parentKeys.forEach((key) => setupIModelForElementKey(imodelMock, key));
          const elementProps = parentKeys.map((pk) => createRandomElementProps(pk.id));
          elementProps.forEach((p) => {
            elementsMock.setup((x) => x.getElementProps(p.id!)).returns(() => p);
          });
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, elementProps.map((p) => p.id!), "assembly");
          expect(result.size).to.eq(2);
          parentKeys.forEach((key) => expect(result.has(key)).to.be.true);
        });

        it("does not duplicate keys", async () => {
          const parentKey = createRandomECInstanceKey();
          setupIModelForElementKey(imodelMock, parentKey);
          const elementProps = [createRandomElementProps(parentKey.id), createRandomElementProps(parentKey.id)];
          elementProps.forEach((p) => {
            elementsMock.setup((x) => x.getElementProps(p.id!)).returns(() => p);
          });
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, elementProps.map((p) => p.id!), "assembly");
          expect(result.size).to.eq(1);
          expect(result.has(parentKey)).to.be.true;
        });

        it("returns element key if it has no parent", async () => {
          const key = createRandomECInstanceKey();
          setupIModelForElementKey(imodelMock, key);
          const elementProps = createRandomTopmostElementProps();
          elementsMock.setup((x) => x.getElementProps(key.id)).returns(() => elementProps);
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [key.id], "assembly");
          expect(result.size).to.eq(1);
          expect(result.has(key)).to.be.true;
        });

        it("skips non-existing element ids", async () => {
          const key = createRandomECInstanceKey();
          setupIModelForNoResultStatement(imodelMock);
          const elementProps = createRandomTopmostElementProps();
          elementsMock.setup((x) => x.getElementProps(key.id)).returns(() => elementProps);
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [key.id], "assembly");
          expect(result.size).to.eq(0);
        });

        it("skips transient element ids", async () => {
          const parentKeys = [createRandomECInstanceKey()];
          setupIModelForElementKey(imodelMock, parentKeys[0]);
          const elementProps = [createRandomElementProps(parentKeys[0].id)];
          elementsMock.setup((x) => x.getElementProps(elementProps[0].id!)).returns(() => elementProps[0]);
          const ids = [elementProps[0].id!, createTransientElementId()];
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, ids, "assembly");
          expect(result.size).to.eq(1);
          parentKeys.forEach((key) => expect(result.has(key)).to.be.true);
        });

      });

      describe("scope: 'top-assembly'", () => {

        it("returns topmost parent key", async () => {
          const grandparent = createRandomTopmostElementProps();
          const grandparentKey = createRandomECInstanceKey();
          setupIModelForElementKey(imodelMock, grandparentKey);
          elementsMock.setup((x) => x.getElementProps(grandparentKey.id)).returns(() => grandparent);
          const parent = createRandomElementProps(grandparentKey.id);
          const parentKey = createRandomECInstanceKey();
          elementsMock.setup((x) => x.getElementProps(parentKey.id)).returns(() => parent);
          const element = createRandomElementProps(parentKey.id);
          elementsMock.setup((x) => x.getElementProps(element.id!)).returns(() => element);

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [element.id!], "top-assembly");
          expect(result.size).to.eq(1);
          expect(result.has(grandparentKey)).to.be.true;
        });

        it("returns element key if it has no parent", async () => {
          const key = createRandomECInstanceKey();
          setupIModelForElementKey(imodelMock, key);
          const elementProps = createRandomTopmostElementProps();
          elementsMock.setup((x) => x.getElementProps(key.id)).returns(() => elementProps);
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [key.id], "top-assembly");
          expect(result.size).to.eq(1);
          expect(result.has(key)).to.be.true;
        });

        it("skips non-existing element ids", async () => {
          const key = createRandomECInstanceKey();
          setupIModelForNoResultStatement(imodelMock);
          const elementProps = createRandomTopmostElementProps();
          elementsMock.setup((x) => x.getElementProps(key.id)).returns(() => elementProps);
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [key.id], "top-assembly");
          expect(result.size).to.eq(0);
        });

        it("skips transient element ids", async () => {
          const parent = createRandomTopmostElementProps();
          const parentKey = createRandomECInstanceKey();
          setupIModelForElementKey(imodelMock, parentKey);
          elementsMock.setup((x) => x.getElementProps(parentKey.id)).returns(() => parent);
          const elementProps = createRandomElementProps(parentKey.id);
          elementsMock.setup((x) => x.getElementProps(elementProps.id!)).returns(() => elementProps);
          const ids = [elementProps.id!, createTransientElementId()];
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, ids, "top-assembly");
          expect(result.size).to.eq(1);
          expect(result.has(parentKey)).to.be.true;
        });

      });

      describe("scope: 'category'", () => {

        it("returns category key", async () => {
          const category = createRandomElementProps();
          const elementId = createRandomId();
          const element = new DrawingGraphic({
            id: elementId,
            classFullName: faker.random.word(),
            model: createRandomId(),
            category: category.id!,
            code: { scope: faker.random.word(), spec: faker.random.word() },
          }, imodelMock.object);
          elementsMock.setup((x) => x.getElement(elementId)).returns(() => element);
          elementsMock.setup((x) => x.getElementProps(category.id!)).returns(() => category);

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [elementId], "category");
          expect(result.size).to.eq(1);
          expect(result.has({ className: category.classFullName, id: element.category! })).to.be.true;
        });

        it("skips non-geometric elementProps", async () => {
          const elementId = createRandomId();
          const element = moq.Mock.ofType<Element>();
          elementsMock.setup((x) => x.getElement(elementId)).returns(() => element.object);

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [elementId], "category");
          expect(result.isEmpty).to.be.true;
        });

        it("skips transient element ids", async () => {
          const category = createRandomElementProps();
          const elementId = createRandomId();
          const element = new DrawingGraphic({
            id: elementId,
            classFullName: faker.random.word(),
            model: createRandomId(),
            category: category.id!,
            code: { scope: faker.random.word(), spec: faker.random.word() },
          }, imodelMock.object);
          elementsMock.setup((x) => x.getElement(elementId)).returns(() => element);
          elementsMock.setup((x) => x.getElementProps(category.id!)).returns(() => category);

          const ids = [elementId, createTransientElementId()];
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, ids, "category");
          expect(result.size).to.eq(1);
          expect(result.has({ className: category.classFullName, id: element.category! })).to.be.true;
        });

      });

      describe("scope: 'model'", () => {

        it("returns model key", async () => {
          const model = createRandomModelProps();
          const elementId = createRandomId();
          const element = new DrawingGraphic({
            id: elementId,
            classFullName: faker.random.word(),
            model: model.id!,
            category: createRandomId(),
            code: { scope: faker.random.word(), spec: faker.random.word() },
          }, imodelMock.object);
          elementsMock.setup((x) => x.getElementProps(elementId)).returns(() => element);
          modelsMock.setup((x) => x.getModelProps(model.id!)).returns(() => model);

          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [elementId], "model");
          expect(result.size).to.eq(1);
          expect(result.has({ className: model.classFullName, id: model.id! })).to.be.true;
        });

        it("skips transient element ids", async () => {
          const model = createRandomModelProps();
          const elementId = createRandomId();
          const element = new DrawingGraphic({
            id: elementId,
            classFullName: faker.random.word(),
            model: model.id!,
            category: createRandomId(),
            code: { scope: faker.random.word(), spec: faker.random.word() },
          }, imodelMock.object);
          elementsMock.setup((x) => x.getElementProps(elementId)).returns(() => element);
          modelsMock.setup((x) => x.getModelProps(model.id!)).returns(() => model);

          const ids = [elementId, createTransientElementId()];
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, ids, "model");
          expect(result.size).to.eq(1);
          expect(result.has({ className: model.classFullName, id: model.id! })).to.be.true;
        });

      });

      describe("scope: 'functional'", () => {

        async function* createQueryResult(graphicalElementKey: InstanceKey, functionalElementKey?: InstanceKey) {
          yield {
            className: graphicalElementKey.className,
            elId: graphicalElementKey.id,
            funcElClassName: functionalElementKey ? functionalElementKey.className : undefined,
            funcElId: functionalElementKey ? functionalElementKey.id : undefined,
          };
        }

        it("returns element key if it doesn't have an associated functional element", async () => {
          const elementClass = faker.random.word();
          const elementId = createRandomId();
          imodelMock.setup((x) => x.query(moq.It.isAnyString(), [elementId]))
            .returns(() => createQueryResult({ className: elementClass, id: elementId }));
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [elementId], "functional");
          expect(result.size).to.eq(1);
          expect(result.has({ className: elementClass, id: elementId })).to.be.true;
        });

        it("returns functional element key if element has an associated functional element", async () => {
          const functionalElementClass = faker.random.word();
          const functionalElementId = createRandomId();
          const elementClass = faker.random.word();
          const elementId = createRandomId();
          imodelMock.setup((x) => x.query(moq.It.isAnyString(), [elementId]))
            .returns(() => createQueryResult({ className: elementClass, id: elementId }, { className: functionalElementClass, id: functionalElementId }));
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, [elementId], "functional");
          expect(result.size).to.eq(1);
          expect(result.has({ className: functionalElementClass, id: functionalElementId })).to.be.true;
        });

        it("skips transient element ids", async () => {
          const elementClass = faker.random.word();
          const elementId = createRandomId();
          imodelMock.setup((x) => x.query(moq.It.isAnyString(), [elementId]))
            .returns(() => createQueryResult({ className: elementClass, id: elementId }));
          const ids = [elementId, createTransientElementId()];
          const result = await manager.computeSelection(ClientRequestContext.current, { imodel: imodelMock.object }, ids, "functional");
          expect(result.size).to.eq(1);
          expect(result.has({ className: elementClass, id: elementId })).to.be.true;
        });

      });

    });

  });

});
