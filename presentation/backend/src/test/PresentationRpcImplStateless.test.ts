/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import * as sinon from "sinon";
import * as faker from "faker";
import * as moq from "@bentley/presentation-common/lib/test/_helpers/Mocks";
import {
  createRandomECInstanceKey,
  createRandomECInstanceNodeKey, createRandomECInstanceNode, createRandomNodePathElement,
  createRandomDescriptor, createRandomId, createRandomSelectionScope, createRandomContent, createRandomLabelDefinitionJSON,
} from "@bentley/presentation-common/lib/test/_helpers/random";
import { ClientRequestContext, Logger } from "@bentley/bentleyjs-core";
import { IModelToken } from "@bentley/imodeljs-common";
import { IModelDb } from "@bentley/imodeljs-backend";
import {
  PresentationRpcRequestOptions, ContentRequestOptions, HierarchyRequestOptions,
  SelectionScopeRequestOptions,
  HierarchyRpcRequestOptions,
  Node, PageOptions, KeySet, InstanceKey, NodeKey,
  Paged, Omit, PresentationStatus, DescriptorOverrides, NodePathElement, PresentationError,
  SelectionScope, Content, Descriptor,
} from "@bentley/presentation-common";
import { RulesetVariablesManager } from "../RulesetVariablesManager";
import { PresentationManager } from "../PresentationManager";
import { PresentationRpcImplStateless } from "../PresentationRpcImplStateless";
import { Presentation } from "../Presentation";
import { RulesetManager } from "../RulesetManager";
import "./IModelHostSetup";
import { ResolvablePromise } from "@bentley/presentation-common/lib/test/_helpers/Promises";

describe("PresentationRpcImplStateless", () => {

  afterEach(() => {
    Presentation.terminate();
  });

  it("uses default PresentationManager implementation if not overridden", () => {
    Presentation.initialize();
    const impl = new PresentationRpcImplStateless();
    expect(impl.getManager()).is.instanceof(PresentationManager);
  });

  it("uses default requestWaitTime from the Presentation implementation if it is not overriden", () => {
    Presentation.initialize();
    const impl = new PresentationRpcImplStateless();
    expect(impl.requestTimeout).to.equal(90000);
  });

  it("uses custom requestTimeout from the Presentation implementation if it is passed through Presentation.initialize", () => {
    const randomRequestTimeout = faker.random.number({ min: 0, max: 90000 });
    Presentation.initialize({ requestTimeout: randomRequestTimeout });
    const impl = new PresentationRpcImplStateless();
    expect(impl.requestTimeout).to.not.throw;
    expect(impl.requestTimeout).to.equal(randomRequestTimeout);
  });

  describe("calls forwarding", () => {

    let testData: any;
    let defaultRpcParams: PresentationRpcRequestOptions;
    let impl: PresentationRpcImplStateless;
    const presentationManagerMock = moq.Mock.ofType<PresentationManager>();
    const rulesetsMock = moq.Mock.ofType<RulesetManager>();
    const variablesMock = moq.Mock.ofType<RulesetVariablesManager>();

    beforeEach(() => {
      rulesetsMock.reset();
      variablesMock.reset();
      presentationManagerMock.reset();
      presentationManagerMock.setup((x) => x.vars(moq.It.isAnyString())).returns(() => variablesMock.object);
      presentationManagerMock.setup((x) => x.rulesets()).returns(() => rulesetsMock.object);
      Presentation.initialize({
        requestTimeout: 10,
        clientManagerFactory: () => presentationManagerMock.object,
      });
      testData = {
        imodelToken: new IModelToken(),
        imodelMock: moq.Mock.ofType<IModelDb>(),
        rulesetId: faker.random.word(),
        pageOptions: { start: 123, size: 456 } as PageOptions,
        displayType: "sample display type",
        keys: new KeySet([createRandomECInstanceKey(), createRandomECInstanceKey(), createRandomECInstanceKey()]),
      };
      defaultRpcParams = { clientId: faker.random.uuid() };
      testData.imodelMock.setup((x: IModelDb) => x.iModelToken).returns(() => testData.imodelToken);
      IModelDb.find = () => testData.imodelMock.object;
      impl = new PresentationRpcImplStateless();
      const requestContext = new ClientRequestContext();
      requestContext.enter();
    });

    it("returns invalid argument status code when using invalid imodel token", async () => {
      IModelDb.find = () => undefined as any;
      const options: Paged<HierarchyRpcRequestOptions> = {
        ...defaultRpcParams,
        rulesetId: testData.rulesetId,
      };

      const response = await impl.getNodes(testData.imodelToken, options);
      expect(response.statusCode).to.equal(PresentationStatus.InvalidArgument);
    });

    describe("getNodesAndCount", () => {

      it("calls manager for root nodes", async () => {
        const getRootNodesResult: Node[] = [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()];
        const getRootNodesCountResult = 999;
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };

        presentationManagerMock.setup((x) => x.getNodesAndCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, undefined))
          .returns(async () => ({ nodes: getRootNodesResult, count: getRootNodesCountResult }))
          .verifiable();
        const actualResult = await impl.getNodesAndCount(testData.imodelToken, { ...defaultRpcParams, ...options });

        presentationManagerMock.verifyAll();
        expect(actualResult.result!.nodes).to.deep.eq(getRootNodesResult.map(Node.toJSON));
        expect(actualResult.result!.count).to.eq(getRootNodesCountResult);
      });

      it("calls manager for child nodes", async () => {
        const getChildNodeResult: Node[] = [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()];
        const getChildNodesCountResult = 999;
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };

        presentationManagerMock.setup((x) => x.getNodesAndCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(async () => ({ nodes: getChildNodeResult, count: getChildNodesCountResult }))
          .verifiable();
        const actualResult = await impl.getNodesAndCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));

        presentationManagerMock.verifyAll();
        expect(actualResult.result!.nodes).to.deep.eq(getChildNodeResult.map(Node.toJSON));
        expect(actualResult.result!.count).to.eq(getChildNodesCountResult);
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        const result = new ResolvablePromise<{ nodes: Node[], count: number }>();
        presentationManagerMock.setup((x) => x.getNodesAndCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodesAndCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.equal(PresentationStatus.BackendTimeout);
        await result.resolve({ nodes: [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()], count: 999 });
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        const result = new ResolvablePromise<{ nodes: Node[], count: number }>();
        presentationManagerMock.setup((x) => x.getNodesAndCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(async () => result)
          .verifiable();
        const actualResultPromise = impl.getNodesAndCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));
        presentationManagerMock.verifyAll();

        const getChildNodeResult: Node[] = [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()];
        const getChildNodesCountResult = 999;
        await result.resolve({ nodes: getChildNodeResult, count: getChildNodesCountResult });

        const actualResult = await actualResultPromise;
        expect(actualResult.result!.nodes).to.deep.eq(getChildNodeResult.map(Node.toJSON));
        expect(actualResult.result!.count).to.eq(getChildNodesCountResult);
      });

      it("should return error result if manager throws", async () => {
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };

        presentationManagerMock.setup((x) => x.getNodesAndCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(async () => {
            throw new PresentationError(PresentationStatus.Error, "test error");
          })
          .verifiable();
        const actualResult = await impl.getNodesAndCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));

        presentationManagerMock.verifyAll();
        expect(actualResult.statusCode).to.eq(PresentationStatus.Error);
        expect(actualResult.errorMessage).to.eq("test error");
      });

      it("should return error result if manager throws and `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };

        presentationManagerMock.setup((x) => x.getNodesAndCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(async () => {
            throw new PresentationError(PresentationStatus.Error, "test error");
          })
          .verifiable();
        const actualResult = await impl.getNodesAndCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));

        presentationManagerMock.verifyAll();
        expect(actualResult.statusCode).to.eq(PresentationStatus.Error);
        expect(actualResult.errorMessage).to.eq("test error");
      });

    });

    describe("getNodes", () => {

      it("calls manager for root nodes", async () => {
        const result: Node[] = [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()];
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup((x) => x.getNodes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, undefined))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodes(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result.map(Node.toJSON));
      });
      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const result: Node[] = [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()];
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup((x) => x.getNodes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, undefined))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodes(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result.map(Node.toJSON));
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        const result = new ResolvablePromise<Node[]>();
        presentationManagerMock.setup((x) => x.getNodes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, undefined))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodes(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.equal(PresentationStatus.BackendTimeout);
        await result.resolve([createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()]);
      });

      it("calls manager for child nodes", async () => {
        const result: Node[] = [createRandomECInstanceNode(), createRandomECInstanceNode(), createRandomECInstanceNode()];
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Paged<Omit<HierarchyRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup((x) => x.getNodes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(() => Promise.resolve(result))
          .verifiable();
        const actualResult = await impl.getNodes(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result.map(Node.toJSON));
      });

    });

    describe("getNodesCount", () => {

      it("calls manager for root nodes count", async () => {
        const result = 999;
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getNodesCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, undefined))
          .returns(() => Promise.resolve(result))
          .verifiable();
        const actualResult = await impl.getNodesCount(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.eq(result);
      });

      it("calls manager for child nodes count", async () => {
        const result = 999;
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getNodesCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(() => Promise.resolve(result))
          .verifiable();
        const actualResult = await impl.getNodesCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.eq(result);
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const result = 999;
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getNodesCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(() => Promise.resolve(result))
          .verifiable();
        const actualResult = await impl.getNodesCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.eq(result);
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const parentNodeKey = createRandomECInstanceNodeKey();
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<number>();
        presentationManagerMock.setup((x) => x.getNodesCount(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, parentNodeKey))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodesCount(testData.imodelToken, { ...defaultRpcParams, ...options }, NodeKey.toJSON(parentNodeKey));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.equal(PresentationStatus.BackendTimeout);
        await result.resolve(999);
      });
    });

    describe("getFilteredNodePaths", () => {

      it("calls manager", async () => {
        const result = [createRandomNodePathElement(0), createRandomNodePathElement(0)];
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getFilteredNodePaths(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, "filter"))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getFilteredNodePaths(testData.imodelToken, { ...defaultRpcParams, ...options }, "filter");
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.equal(result.map(NodePathElement.toJSON));
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const result = [createRandomNodePathElement(0), createRandomNodePathElement(0)];
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getFilteredNodePaths(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, "filter"))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getFilteredNodePaths(testData.imodelToken, { ...defaultRpcParams, ...options }, "filter");
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.equal(result.map(NodePathElement.toJSON));
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<NodePathElement[]>();
        presentationManagerMock.setup((x) => x.getFilteredNodePaths(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, "filter"))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getFilteredNodePaths(testData.imodelToken, { ...defaultRpcParams, ...options }, "filter");
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.equal(PresentationStatus.BackendTimeout);
        await result.resolve([createRandomNodePathElement(0), createRandomNodePathElement(0)]);
      });

    });

    describe("getNodePaths", () => {

      it("calls manager", async () => {
        const result = [createRandomNodePathElement(0), createRandomNodePathElement(0)];
        const keyArray: InstanceKey[][] = [[createRandomECInstanceKey(), createRandomECInstanceKey()]];
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getNodePaths(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, keyArray, 1))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodePaths(testData.imodelToken, { ...defaultRpcParams, ...options }, keyArray.map((a) => a.map(InstanceKey.toJSON)), 1);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.equal(result.map(NodePathElement.toJSON));
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const result = [createRandomNodePathElement(0), createRandomNodePathElement(0)];
        const keyArray: InstanceKey[][] = [[createRandomECInstanceKey(), createRandomECInstanceKey()]];
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getNodePaths(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, keyArray, 1))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodePaths(testData.imodelToken, { ...defaultRpcParams, ...options }, keyArray.map((a) => a.map(InstanceKey.toJSON)), 1);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.equal(result.map(NodePathElement.toJSON));
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const keyArray: InstanceKey[][] = [[createRandomECInstanceKey(), createRandomECInstanceKey()]];
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<NodePathElement[]>();
        presentationManagerMock.setup((x) => x.getNodePaths(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, keyArray, 1))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getNodePaths(testData.imodelToken, { ...defaultRpcParams, ...options }, keyArray.map((a) => a.map(InstanceKey.toJSON)), 1);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve([createRandomNodePathElement(0), createRandomNodePathElement(0)]);
      });

    });

    describe("loadHierarchy", () => {

      it("calls manager", async () => {
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.loadHierarchy(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }))
          .returns(async () => undefined)
          .verifiable();
        const actualResult = await impl.loadHierarchy(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.statusCode).to.equal(PresentationStatus.Success);
      });

      it("does not await for load to complete", async () => {
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<void>();
        presentationManagerMock.setup((x) => x.loadHierarchy(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.loadHierarchy(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.statusCode).to.equal(PresentationStatus.Success);
        await result.resolve();
      });

      it("logs warning if load throws", async () => {
        const loggerSpy = sinon.spy(Logger, "logWarning");
        const options: Omit<HierarchyRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.loadHierarchy(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }))
          .returns(async () => {
            throw new PresentationError(PresentationStatus.Error, "test error");
          })
          .verifiable();
        const actualResult = await impl.loadHierarchy(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.statusCode).to.equal(PresentationStatus.Success);
        expect(loggerSpy).to.be.calledOnce;
      });

    });

    describe("getContentDescriptor", () => {

      it("calls manager", async () => {
        const keys = new KeySet();
        const descriptor = createRandomDescriptor();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getContentDescriptor(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, testData.displayType, moq.isKeySet(keys), undefined))
          .returns(async () => descriptor)
          .verifiable();
        const actualResult = await impl.getContentDescriptor(testData.imodelToken, { ...defaultRpcParams, ...options },
          testData.displayType, keys.toJSON(), undefined);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(descriptor.toJSON());
      });

      it("handles undefined descriptor response", async () => {
        const keys = new KeySet();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getContentDescriptor(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, testData.displayType, moq.isKeySet(keys), undefined))
          .returns(async () => undefined)
          .verifiable();
        const actualResult = await impl.getContentDescriptor(testData.imodelToken, { ...defaultRpcParams, ...options },
          testData.displayType, keys.toJSON(), undefined);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const keys = new KeySet();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getContentDescriptor(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, testData.displayType, moq.isKeySet(keys), undefined))
          .returns(async () => undefined)
          .verifiable();
        const actualResult = await impl.getContentDescriptor(testData.imodelToken, { ...defaultRpcParams, ...options },
          testData.displayType, keys.toJSON(), undefined);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const keys = new KeySet();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<Descriptor>();
        presentationManagerMock.setup((x) => x.getContentDescriptor(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, testData.displayType, moq.isKeySet(keys), undefined))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getContentDescriptor(testData.imodelToken, { ...defaultRpcParams, ...options },
          testData.displayType, keys.toJSON(), undefined);
        presentationManagerMock.verifyAll();
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        expect(actualResult.result).to.be.undefined;
        await result.resolve(createRandomDescriptor());
      });

    });

    describe("getContentAndContentSize", () => {

      it("calls manager", async () => {
        const contentSize = 789;
        const keys = new KeySet();
        const content = createRandomContent();
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup(async (x) => x.getContentAndSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, content.descriptor, moq.isKeySet(keys)))
          .returns(async () => ({ content, size: contentSize }))
          .verifiable();
        const actualResult = await impl.getContentAndSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          content.descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result!.content).to.deep.eq(content.toJSON());
        expect(actualResult.result!.size).to.deep.eq(contentSize);
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const contentSize = 789;
        const keys = new KeySet();
        const content = createRandomContent();
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup(async (x) => x.getContentAndSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, content.descriptor, moq.isKeySet(keys)))
          .returns(async () => ({ content, size: contentSize }))
          .verifiable();
        const actualResult = await impl.getContentAndSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          content.descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result!.content).to.deep.eq(content.toJSON());
        expect(actualResult.result!.size).to.deep.eq(contentSize);
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const contentSize = 789;
        const keys = new KeySet();
        const content = createRandomContent();
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        const result = new ResolvablePromise<{ content: Content, size: number }>();
        presentationManagerMock.setup(async (x) => x.getContentAndSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, content.descriptor, moq.isKeySet(keys)))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getContentAndSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          content.descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve({ content, size: contentSize });
      });

      it("handles case when manager returns no content", async () => {
        const keys = new KeySet();
        const descriptorOverrides: DescriptorOverrides = {
          displayType: "",
          contentFlags: 0,
          hiddenFieldNames: [],
        };
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock
          .setup(async (x) => x.getContentAndSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptorOverrides, moq.isKeySet(keys)))
          .returns(async () => ({ content: undefined, size: 0 }))
          .verifiable();
        const actualResult = await impl.getContentAndSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          descriptorOverrides, keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result!.content).to.be.undefined;
        expect(actualResult.result!.size).to.eq(0);
      });

    });

    describe("getContentSetSize", () => {

      it("calls manager", async () => {
        const keys = new KeySet();
        const result = 789;
        const descriptor = createRandomDescriptor();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock
          .setup(async (x) => x.getContentSetSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptor, moq.isKeySet(keys)))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getContentSetSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const keys = new KeySet();
        const result = 789;
        const descriptor = createRandomDescriptor();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock
          .setup(async (x) => x.getContentSetSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptor, moq.isKeySet(keys)))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getContentSetSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const keys = new KeySet();
        const descriptor = createRandomDescriptor();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<number>();
        presentationManagerMock
          .setup((x) => x.getContentSetSize(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptor, moq.isKeySet(keys)))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getContentSetSize(testData.imodelToken, { ...defaultRpcParams, ...options },
          descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve(789);
      });
    });

    describe("getContent", () => {

      it("calls manager", async () => {
        const keys = new KeySet();
        const content = createRandomContent();
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup(async (x) => x.getContent(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, content.descriptor, moq.isKeySet(keys)))
          .returns(async () => content)
          .verifiable();
        const actualResult = await impl.getContent(testData.imodelToken, { ...defaultRpcParams, ...options },
          content.descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(content.toJSON());
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const keys = new KeySet();
        const content = createRandomContent();
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup(async (x) => x.getContent(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, content.descriptor, moq.isKeySet(keys)))
          .returns(async () => content)
          .verifiable();
        const actualResult = await impl.getContent(testData.imodelToken, { ...defaultRpcParams, ...options },
          content.descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(content.toJSON());
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const keys = new KeySet();
        const content = createRandomContent();
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        const result = new ResolvablePromise<Content>();
        presentationManagerMock.setup(async (x) => x.getContent(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, content.descriptor, moq.isKeySet(keys)))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getContent(testData.imodelToken, { ...defaultRpcParams, ...options },
          content.descriptor.toJSON(), keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve(createRandomContent());
      });

      it("handles case when manager returns no content", async () => {
        const keys = new KeySet();
        const descriptorOverrides: DescriptorOverrides = {
          displayType: "",
          contentFlags: 0,
          hiddenFieldNames: [],
        };
        const options: Paged<Omit<ContentRequestOptions<IModelToken>, "imodel">> = {
          rulesetId: testData.rulesetId,
          paging: testData.pageOptions,
        };
        presentationManagerMock.setup(async (x) => x.getContent(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptorOverrides, moq.isKeySet(keys)))
          .returns(async () => undefined)
          .verifiable();
        const actualResult = await impl.getContent(testData.imodelToken, { ...defaultRpcParams, ...options },
          descriptorOverrides, keys.toJSON());
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
      });

    });

    describe("getDistinctValues", () => {

      it("calls manager", async () => {
        const distinctValues = [faker.random.word(), faker.random.word()];
        const keys = new KeySet();
        const descriptor = createRandomDescriptor();
        const fieldName = faker.random.word();
        const maximumValueCount = faker.random.number();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getDistinctValues(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptor, moq.isKeySet(keys), fieldName, maximumValueCount))
          .returns(async () => distinctValues)
          .verifiable();
        const actualResult = await impl.getDistinctValues(testData.imodelToken, { ...defaultRpcParams, ...options }, descriptor.toJSON(),
          keys.toJSON(), fieldName, maximumValueCount);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(distinctValues);
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const distinctValues = [faker.random.word(), faker.random.word()];
        const keys = new KeySet();
        const descriptor = createRandomDescriptor();
        const fieldName = faker.random.word();
        const maximumValueCount = faker.random.number();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        presentationManagerMock.setup((x) => x.getDistinctValues(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptor, moq.isKeySet(keys), fieldName, maximumValueCount))
          .returns(async () => distinctValues)
          .verifiable();
        const actualResult = await impl.getDistinctValues(testData.imodelToken, { ...defaultRpcParams, ...options }, descriptor.toJSON(),
          keys.toJSON(), fieldName, maximumValueCount);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(distinctValues);
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const keys = new KeySet();
        const descriptor = createRandomDescriptor();
        const fieldName = faker.random.word();
        const maximumValueCount = faker.random.number();
        const options: Omit<ContentRequestOptions<IModelToken>, "imodel"> = {
          rulesetId: testData.rulesetId,
        };
        const result = new ResolvablePromise<string[]>();
        presentationManagerMock.setup((x) => x.getDistinctValues(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, descriptor, moq.isKeySet(keys), fieldName, maximumValueCount))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getDistinctValues(testData.imodelToken, { ...defaultRpcParams, ...options }, descriptor.toJSON(),
          keys.toJSON(), fieldName, maximumValueCount);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve([]);
      });

    });

    describe("getDisplayLabel", () => {

      it("calls manager", async () => {
        const result = faker.random.word();
        const key = createRandomECInstanceKey();
        presentationManagerMock.setup(async (x) => x.getDisplayLabel(ClientRequestContext.current, { imodel: testData.imodelMock.object }, key))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getDisplayLabel(testData.imodelToken, { ...defaultRpcParams }, InstanceKey.toJSON(key));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.eq(result);
      });

    });

    describe("getDisplayLabels", () => {

      it("calls manager", async () => {
        const result = [faker.random.word(), faker.random.word()];
        const keys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
        presentationManagerMock.setup(async (x) => x.getDisplayLabels(ClientRequestContext.current, { imodel: testData.imodelMock.object }, keys))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getDisplayLabels(testData.imodelToken, { ...defaultRpcParams }, keys.map(InstanceKey.toJSON));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

    });

    describe("getDisplayLabelDefinition", () => {

      it("calls manager", async () => {
        const result = createRandomLabelDefinitionJSON();
        const key = createRandomECInstanceKey();
        presentationManagerMock.setup(async (x) => x.getDisplayLabelDefinition(ClientRequestContext.current, { imodel: testData.imodelMock.object }, key))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getDisplayLabelDefinition(testData.imodelToken, { ...defaultRpcParams }, InstanceKey.toJSON(key));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

    });

    describe("getDisplayLabelsDefinitions", () => {

      it("calls manager", async () => {
        const result = [createRandomLabelDefinitionJSON(), createRandomLabelDefinitionJSON()];
        const keys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
        presentationManagerMock.setup(async (x) => x.getDisplayLabelsDefinitions(ClientRequestContext.current, { imodel: testData.imodelMock.object }, keys))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getDisplayLabelsDefinitions(testData.imodelToken, { ...defaultRpcParams }, keys.map(InstanceKey.toJSON));
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

    });

    describe("getSelectionScopes", () => {

      it("calls manager", async () => {
        const options: SelectionScopeRequestOptions<IModelToken> = {
          imodel: testData.imodelToken,
        };
        const result = [createRandomSelectionScope()];
        presentationManagerMock.setup(async (x) => x.getSelectionScopes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getSelectionScopes(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const options: SelectionScopeRequestOptions<IModelToken> = {
          imodel: testData.imodelToken,
        };
        const result = [createRandomSelectionScope()];
        presentationManagerMock.setup(async (x) => x.getSelectionScopes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getSelectionScopes(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result);
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const options: SelectionScopeRequestOptions<IModelToken> = {
          imodel: testData.imodelToken,
        };
        const result = new ResolvablePromise<SelectionScope[]>();
        presentationManagerMock.setup((x) => x.getSelectionScopes(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.getSelectionScopes(testData.imodelToken, { ...defaultRpcParams, ...options });
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve([]);
      });

    });

    describe("computeSelection", () => {

      it("calls manager", async () => {
        const options: SelectionScopeRequestOptions<IModelToken> = {
          imodel: testData.imodelToken,
        };
        const scope = createRandomSelectionScope();
        const ids = [createRandomId()];
        const result = new KeySet();
        presentationManagerMock.setup(async (x) => x.computeSelection(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, ids, scope.id))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.computeSelection(testData.imodelToken, { ...defaultRpcParams, ...options }, ids, scope.id);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result.toJSON());
      });

      it("should return result if `PresentationStatus.BackendTimeout` is set to 0", async () => {
        Presentation.terminate();
        Presentation.initialize({
          requestTimeout: 0,
          clientManagerFactory: () => presentationManagerMock.object,
        });
        const options: SelectionScopeRequestOptions<IModelToken> = {
          imodel: testData.imodelToken,
        };
        const scope = createRandomSelectionScope();
        const ids = [createRandomId()];
        const result = new KeySet();
        presentationManagerMock.setup(async (x) => x.computeSelection(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, ids, scope.id))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.computeSelection(testData.imodelToken, { ...defaultRpcParams, ...options }, ids, scope.id);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.deep.eq(result.toJSON());
      });

      it("should return `PresentationStatus.BackendTimeout` without any result if manager request takes more than requestTimeout", async () => {
        const options: SelectionScopeRequestOptions<IModelToken> = {
          imodel: testData.imodelToken,
        };
        const scope = createRandomSelectionScope();
        const ids = [createRandomId()];
        const result = new ResolvablePromise<KeySet>();
        presentationManagerMock.setup((x) => x.computeSelection(ClientRequestContext.current, { ...options, imodel: testData.imodelMock.object }, ids, scope.id))
          .returns(async () => result)
          .verifiable();
        const actualResult = await impl.computeSelection(testData.imodelToken, { ...defaultRpcParams, ...options }, ids, scope.id);
        presentationManagerMock.verifyAll();
        expect(actualResult.result).to.be.undefined;
        expect(actualResult.statusCode).to.eq(PresentationStatus.BackendTimeout);
        await result.resolve(new KeySet());
      });

    });

    describe("syncClientState", () => {

      it("should return `PresentationStatus.Error`", async () => {
        const actualResult = await impl.syncClientState(testData.imodelToken, { ...defaultRpcParams, clientId: "a", clientStateId: "b", state: {} });
        expect(actualResult.statusCode).to.equal(PresentationStatus.Error);
      });

    });

  });

});
