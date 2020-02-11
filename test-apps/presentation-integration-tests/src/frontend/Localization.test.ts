/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import { initialize, terminate } from "../IntegrationTests";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { Presentation } from "@bentley/presentation-frontend";

describe("Localization", async () => {

  let imodel: IModelConnection;

  before(async () => {
    await initialize();
    const testIModelName: string = "assets/datasets/Properties_60InstancesWithUrl2.ibim";
    imodel = await IModelConnection.openSnapshot(testIModelName);
    expect(imodel).is.not.null;
  });

  after(async () => {
    await imodel.closeSnapshot();
    terminate();
  });

  it("localizes using app/test supplied localized strings", async () => {
    const nodes = await Presentation.presentation.getNodes({ imodel, rulesetId: "LocalizationTest" });
    expect(nodes.length).to.eq(1);
    expect(nodes[0].label).to.eq("test value");
    expect(nodes[0].description).to.eq("test nested value");
  });

});
