/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import {
  Guid,
  Id64,
  Id64String,
} from "@bentley/bentleyjs-core";
import {
  Box,
  Point3d,
  Range3d,
  Vector3d,
  YawPitchRollAngles,
} from "@bentley/geometry-core";
import {
  Code,
  ColorDef,
  GeometricElement3dProps,
  GeometryStreamBuilder,
  IModel,
} from "@bentley/imodeljs-common";
import {
  BackendRequestContext,
  GenericSchema,
  IModelDb,
  PhysicalModel,
  PhysicalObject,
  PhysicalPartition,
  SpatialCategory,
  SubjectOwnsPartitionElements,
} from "../../imodeljs-backend";
import { IModelTestUtils } from "../IModelTestUtils";

let uniqueId = 0;

const defaultExtents = Range3d.fromJSON({
  low: { x: -500, y: -200, z: -50 },
  high: {x: 500, y: 200, z: 50 },
});

// Tile tree range is scaled+offset a bit.
function scaleSpatialRange(range: Range3d): Range3d {
  const loScale = 1.0001;
  const hiScale = 1.0002;
  const fLo = 0.5 * (1.0 + loScale);
  const fHi = 0.5 * (1.0 + hiScale);

  const result = new Range3d();
  range.high.interpolate(fLo, range.low, result.low);
  range.low.interpolate(fHi, range.high, result.high);

  return result;
}

// The tile tree range is equal to the scaled+skewed project extents translated to align with the origin of the model range.
function almostEqualRange(a: Range3d, b: Range3d): boolean {
  return a.diagonal().isAlmostEqual(b.diagonal());
}

function insertPhysicalModel(db: IModelDb): Id64String {
  GenericSchema.registerSchema();

  const partitionProps = {
    classFullName: PhysicalPartition.classFullName,
    model: IModel.repositoryModelId,
    parent: new SubjectOwnsPartitionElements(IModel.rootSubjectId),
    code: PhysicalPartition.createCode(db, IModel.rootSubjectId, "PhysicalPartition_" + (++uniqueId)),
  };

  const partitionId = db.elements.insertElement(partitionProps);
  expect(Id64.isValidId64(partitionId)).to.be.true;

  const model = db.models.createModel({
    classFullName: PhysicalModel.classFullName,
    modeledElement: { id: partitionId },
  });

  expect(model instanceof PhysicalModel).to.be.true;

  const modelId = db.models.insertModel(model);
  expect(Id64.isValidId64(modelId)).to.be.true;
  return modelId;
}

function createIModel(): IModelDb {
  const props = {
    rootSubject: { name: "TileTreeTest", description: "Test purgeTileTrees" },
    client: "TileTree",
    globaleOrigin: { x: 0, y: 0 },
    projectExtents: defaultExtents,
    guid: Guid.createValue(),
  };

  const name = "Test_" + (++uniqueId) + ".bim";
  return IModelDb.createSnapshot(IModelTestUtils.prepareOutputFile("TileTree", name), props);
}

function scaleProjectExtents(db: IModelDb, scale: number): Range3d {
  const range = db.projectExtents.clone();
  range.scaleAboutCenterInPlace(scale);
  db.updateProjectExtents(range);
  db.saveChanges();
  return scaleSpatialRange(range);
}

describe("purgeTileTrees", () => {
  it("should update after purge when project extents change", async () => {
    const db = createIModel();
    const modelId = insertPhysicalModel(db);

    // NB: The model needs to contain at least one element with a range - otherwise tile tree will have null range.
    const geomBuilder = new GeometryStreamBuilder();
    geomBuilder.appendGeometry(Box.createDgnBox(Point3d.createZero(), Vector3d.unitX(), Vector3d.unitY(), new Point3d(0, 0, 2), 2, 2, 2, 2, true)!);
    const category = SpatialCategory.insert(db, IModel.dictionaryId, "kittycat", { color: ColorDef.white, transp: 0, invisible: false });
    const elemProps: GeometricElement3dProps = {
      classFullName: PhysicalObject.classFullName,
      model: modelId,
      category,
      code: Code.createEmpty(),
      userLabel: "blah",
      geom: geomBuilder.geometryStream,
      placement: {
        origin: Point3d.create(1, 1, 1),
        angles: YawPitchRollAngles.createDegrees(0, 0, 0),
      },
    };
    db.elements.insertElement(elemProps);

    // The "_1-" holds the flag saying to use the project extents as the range of the tile tree.
    const treeId = "5_1-" + modelId;
    const context = new BackendRequestContext();
    let tree = await db.tiles.requestTileTreeProps(context, treeId);
    expect(tree).not.to.be.undefined;
    expect(tree.id).to.equal(treeId);

    const skewedDefaultExtents = scaleSpatialRange(defaultExtents);
    let range = Range3d.fromJSON(tree.rootTile.range);
    expect(range.isNull).to.be.false;
    expect(almostEqualRange(range, skewedDefaultExtents)).to.be.true;
    expect(tree.contentRange).not.to.be.undefined;
    expect(tree.rootTile.contentRange).to.be.undefined;
    expect(tree.rootTile.isLeaf).to.be.false;

    // Change the project extents - nothing should change - we haven't yet purged our model's tile tree.
    let newExtents = scaleProjectExtents(db, 2.0);

    tree = await db.tiles.requestTileTreeProps(context, treeId);
    expect(tree).not.to.be.undefined;
    expect(tree.id).to.equal(treeId);

    range = Range3d.fromJSON(tree.rootTile.range);
    expect(range.isNull).to.be.false;
    expect(almostEqualRange(range, skewedDefaultExtents)).to.be.true;
    expect(almostEqualRange(range, newExtents)).to.be.false;
    expect(tree.contentRange).not.to.be.undefined;
    expect(tree.rootTile.contentRange).to.be.undefined;
    expect(tree.rootTile.isLeaf).to.be.false;

    // Purge tile trees for a specific (non-existent) model - still nothing should change for our model.
    db.nativeDb.purgeTileTrees(["0x123abc"]);

    tree = await db.tiles.requestTileTreeProps(context, treeId);
    expect(tree).not.to.be.undefined;
    expect(tree.id).to.equal(treeId);

    range = Range3d.fromJSON(tree.rootTile.range);
    expect(range.isNull).to.be.false;
    expect(almostEqualRange(range, skewedDefaultExtents)).to.be.true;
    expect(almostEqualRange(range, newExtents)).to.be.false;
    expect(tree.contentRange).not.to.be.undefined;
    expect(tree.rootTile.contentRange).to.be.undefined;
    expect(tree.rootTile.isLeaf).to.be.false;

    // Purge tile trees for our model - now we should get updated tile tree props.
    db.nativeDb.purgeTileTrees([modelId]);

    tree = await db.tiles.requestTileTreeProps(context, treeId);
    expect(tree).not.to.be.undefined;
    expect(tree.id).to.equal(treeId);

    range = Range3d.fromJSON(tree.rootTile.range);
    expect(range.isNull).to.be.false;
    expect(almostEqualRange(range, skewedDefaultExtents)).to.be.false;
    expect(almostEqualRange(range, newExtents)).to.be.true;
    expect(tree.contentRange).not.to.be.undefined;
    expect(tree.rootTile.contentRange).to.be.undefined;
    expect(tree.rootTile.isLeaf).to.be.false;

    // Change extents again and purge tile trees for all loaded models (by passing `undefined` for model Ids).
    newExtents = scaleProjectExtents(db, 0.75);
    db.nativeDb.purgeTileTrees(undefined);

    tree = await db.tiles.requestTileTreeProps(context, treeId);
    expect(tree).not.to.be.undefined;
    expect(tree.id).to.equal(treeId);

    range = Range3d.fromJSON(tree.rootTile.range);
    expect(range.isNull).to.be.false;
    expect(almostEqualRange(range, skewedDefaultExtents)).to.be.false;
    expect(almostEqualRange(range, newExtents)).to.be.true;
    expect(tree.contentRange).not.to.be.undefined;
    expect(tree.rootTile.contentRange).to.be.undefined;
    expect(tree.rootTile.isLeaf).to.be.false;
  });
});
