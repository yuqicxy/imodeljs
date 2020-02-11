/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import { initialize, terminate } from "../../IntegrationTests";
import { resetBackend } from "./Helpers";
import { using } from "@bentley/bentleyjs-core";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { Ruleset, RootNodeRule, CustomNodeSpecification, RegisteredRuleset } from "@bentley/presentation-common";
import { PresentationManager } from "@bentley/presentation-frontend";

describe("Multiple backends for one frontend", async () => {

  describe("Rulesets", () => {

    let imodel: IModelConnection;
    let ruleset: Ruleset;
    let frontend: PresentationManager;

    before(async () => {
      await initialize();
      const testIModelName: string = "assets/datasets/Properties_60InstancesWithUrl2.ibim";
      imodel = await IModelConnection.openSnapshot(testIModelName);
      expect(imodel).is.not.null;
      ruleset = require("../../../test-rulesets/Rulesets/default");
      frontend = PresentationManager.create();
    });

    after(async () => {
      await imodel.closeSnapshot();
      frontend.dispose();
      terminate();
    });

    it("Can use the same frontend-registered ruleset after backend is reset", async () => {
      const props = { imodel, rulesetId: ruleset.id };
      const spec = ((ruleset.rules![0] as RootNodeRule).specifications![0] as CustomNodeSpecification);

      await using<RegisteredRuleset, Promise<void>>(await frontend.rulesets().add(ruleset), async () => {
        const rootNodes1 = await frontend.getNodes(props);
        expect(rootNodes1.length).to.be.equal(1);
        expect(rootNodes1[0].label).to.be.equal(spec.label);

        resetBackend();

        const rootNodes2 = await frontend.getNodes(props);
        expect(rootNodes2.length).to.be.equal(1);
        expect(rootNodes2[0].label).to.be.equal(spec.label);
        expect(rootNodes2).to.deep.eq(rootNodes1);
      });
    });

  });

});
