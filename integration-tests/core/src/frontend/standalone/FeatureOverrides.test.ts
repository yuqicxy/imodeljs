/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { expect, assert } from "chai";
import { FeatureOverrides, Target } from "@bentley/imodeljs-frontend/lib/webgl";
import { HiliteSet, IModelApp, ScreenViewport, IModelConnection, SpatialViewState, StandardViewId } from "@bentley/imodeljs-frontend";
import * as path from "path";
import { GeometryClass, Feature, FeatureTable, PackedFeatureTable } from "@bentley/imodeljs-common";
import { Id64 } from "@bentley/bentleyjs-core";

const iModelLocation = path.join(process.env.IMODELJS_CORE_DIRNAME!, "core/backend/lib/test/assets/test.bim");

function waitUntilTimeHasPassed() {
  const ot = Date.now();
  let nt = ot;
  while (nt <= ot) {
    nt = Date.now();
  }
}

describe("FeatureOverrides tests", () => {
  let imodel: IModelConnection;
  let spatialView: SpatialViewState;
  let vp: ScreenViewport;

  const viewDiv = document.createElement("div") as HTMLDivElement;
  assert(null !== viewDiv);
  viewDiv!.style.width = viewDiv!.style.height = "1000px";
  document.body.appendChild(viewDiv!);

  before(async () => {   // Create a ViewState to load into a Viewport
    IModelApp.startup();
    imodel = await IModelConnection.openSnapshot(iModelLocation);
    spatialView = await imodel.views.load("0x34") as SpatialViewState;
    spatialView.setStandardRotation(StandardViewId.RightIso);
  });

  after(async () => {
    if (imodel) await imodel.closeSnapshot();
    IModelApp.shutdown();
  });

  it("should create a uniform feature overrides object", () => {
    if (!IModelApp.hasRenderSystem) {
      return;
    }

    const vpView = spatialView.clone();
    vp = ScreenViewport.create(viewDiv!, vpView);

    vp.target.setHiliteSet(new HiliteSet(imodel));
    const ovr = FeatureOverrides.createFromTarget(vp.target as Target);
    const features = new FeatureTable(1);
    features.insertWithIndex(new Feature(Id64.fromString("0x1")), 0);

    const table = PackedFeatureTable.pack(features);
    ovr.initFromMap(table);

    waitUntilTimeHasPassed(); // must wait for time to pass in order for hilite to work

    // set something hilited; should be overridden
    expect(ovr.anyHilited).to.be.false;
    const hls = new HiliteSet(imodel); hls.setHilite("0x1", true);
    vp.target.setHiliteSet(hls);
    ovr.update(table);
    expect(ovr.anyHilited).to.be.true;
  });

  it("should create a non-uniform feature overrides object", () => {
    if (!IModelApp.hasRenderSystem)
      return;

    const vpView = spatialView.clone();
    vp = ScreenViewport.create(viewDiv!, vpView);

    vp.target.setHiliteSet(new HiliteSet(imodel));
    const ovr = FeatureOverrides.createFromTarget(vp.target as Target);
    const features = new FeatureTable(2);
    features.insertWithIndex(new Feature(Id64.fromString("0x1")), 0);
    features.insertWithIndex(new Feature(Id64.fromString("0x2")), 1);

    const table = PackedFeatureTable.pack(features);
    ovr.initFromMap(table);

    waitUntilTimeHasPassed(); // must wait for time to pass in order for hilite to work

    // set something hilited; should be overridden
    expect(ovr.anyHilited).to.be.false;
    const hls = new HiliteSet(imodel); hls.setHilite("0x1", true);
    vp.target.setHiliteSet(hls);
    ovr.update(table);
    expect(ovr.anyHilited).to.be.true;
  });
});

describe("FeatureTable tests", () => {
  it("should pack and unpack a FeatureTable", () => {
    const features: Feature[] = [
      new Feature("0x1", "0x1", GeometryClass.Primary),
      new Feature("0x2", "0x1", GeometryClass.Primary),
      new Feature("0x3", "0x1", GeometryClass.Construction),
      new Feature("0x4", "0xabcdabcdabcdabcd", GeometryClass.Primary),
      new Feature("0xabcdabcdabcdabce", "0x63", GeometryClass.Construction),
      new Feature("0xabcdabcdabcdabcc", "0xc8", GeometryClass.Primary),
      new Feature("0xabcdabcdabcdabc7", "0xabcdabcdabcdabd1", GeometryClass.Construction),
      new Feature("0x2", "0xabcdabcdabcdabcd", GeometryClass.Primary),
      new Feature("0x1", "0x1", GeometryClass.Construction),
    ];

    const table = new FeatureTable(100, Id64.fromString("0x1234"));
    for (const feature of features) {
      let testId = Id64.fromString(feature.elementId);
      expect(Id64.isValid(testId)).to.be.true;
      testId = Id64.fromString(feature.subCategoryId);
      expect(Id64.isValid(testId)).to.be.true;

      table.insert(feature);
    }

    expect(table.length).to.equal(features.length);

    const packed = PackedFeatureTable.pack(table);
    const unpacked = packed.unpack();

    expect(table.length).to.equal(unpacked.length);
    expect(table.maxFeatures).to.equal(unpacked.maxFeatures);
    expect(table.modelId.toString()).to.equal(unpacked.modelId.toString());
    expect(table.isUniform).to.equal(unpacked.isUniform);

    for (let i = 0; i < table.length; i++) {
      const lhs = table.getArray()[i];
      const rhs = unpacked.getArray()[i];

      expect(lhs.index).to.equal(rhs.index);
      expect(lhs.value.geometryClass).to.equal(rhs.value.geometryClass);
      expect(lhs.value.elementId).to.equal(rhs.value.elementId);
      expect(lhs.value.subCategoryId).to.equal(rhs.value.subCategoryId);
    }
  });
});
