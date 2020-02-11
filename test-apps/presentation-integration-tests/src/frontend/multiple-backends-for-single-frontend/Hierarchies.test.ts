/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import { initialize, terminate } from "../../IntegrationTests";
import { resetBackend } from "./Helpers";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { PresentationManager } from "@bentley/presentation-frontend";

describe("Multiple backends for one frontend", async () => {

  describe("Hierarchies", () => {

    let imodel: IModelConnection;
    let frontend: PresentationManager;

    before(async () => {
      await initialize();
      const testIModelName: string = "assets/datasets/Properties_60InstancesWithUrl2.ibim";
      imodel = await IModelConnection.openSnapshot(testIModelName);
      expect(imodel).is.not.null;
      frontend = PresentationManager.create();
    });

    after(async () => {
      await imodel.closeSnapshot();
      frontend.dispose();
      terminate();
    });

    it("Gets child nodes after backend is reset", async () => {
      const props = { imodel, rulesetId: "SimpleHierarchy" };

      const rootNodes = await frontend.getNodes(props);
      expect(rootNodes.length).to.eq(1);
      expect(rootNodes[0].key.type).to.eq("root");

      resetBackend();

      const childNodes = await frontend.getNodes(props, rootNodes[0].key);
      expect(childNodes.length).to.eq(1);
      expect(childNodes[0].key.type).to.eq("child");
    });

  });

});
