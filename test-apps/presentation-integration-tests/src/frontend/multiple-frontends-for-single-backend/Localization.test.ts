/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import { initialize, terminate } from "../../IntegrationTests";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { PresentationManager } from "@bentley/presentation-frontend";

describe("Multiple frontends for one backend", async () => {

  describe("Localization", () => {

    let imodel: IModelConnection;
    let frontends: PresentationManager[];

    before(async () => {
      await initialize();

      const testIModelName: string = "assets/datasets/Properties_60InstancesWithUrl2.ibim";
      imodel = await IModelConnection.openSnapshot(testIModelName);
      expect(imodel).is.not.null;

      frontends = ["en", "test"].map((locale) => PresentationManager.create({ activeLocale: locale }));
    });

    after(async () => {
      await imodel.closeSnapshot();
      frontends.forEach((f) => f.dispose());
      terminate();
    });

    it("Handles multiple simultaneous requests from different frontends with different locales", async () => {
      for (let i = 0; i < 100; ++i) {
        const nodes = {
          en: await frontends[0].getNodes({ imodel, rulesetId: "Localization" }),
          test: await frontends[1].getNodes({ imodel, rulesetId: "Localization" }),
        };

        expect(nodes.en[0].label).to.eq("test value");
        expect(nodes.en[0].description).to.eq("test nested value");

        expect(nodes.test[0].label).to.eq("_test_ string");
        expect(nodes.test[0].description).to.eq("_test_ nested string");
      }
    });

  });

});
