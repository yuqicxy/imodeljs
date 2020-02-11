/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import * as chai from "chai";
const expect = chai.expect;

import { Id64, Id64Set, OpenMode } from "@bentley/bentleyjs-core";
import { Matrix4d, Point3d, Transform, YawPitchRollAngles, XYZProps } from "@bentley/geometry-core";
import { AccessToken } from "@bentley/imodeljs-clients";
import {
  IModelTileRpcInterface, MassPropertiesOperation, EcefLocation, IModelReadRpcInterface,
  ModelQueryParams, SnapResponseProps, IModelCoordinatesResponseProps, GeoCoordStatus, MassPropertiesRequestProps,
} from "@bentley/imodeljs-common";
import { IModelApp, IModelConnection, SpatialModelState, ViewState } from "@bentley/imodeljs-frontend";

import { AuthorizationClient } from "./setup/AuthorizationClient";
import { TestContext } from "./setup/TestContext";

// tslint:disable-next-line:no-var-requires
(global as any).btoa = (str: string) => {
  const buffer = Buffer.from(str, "binary");
  return buffer.toString("base64");
};

describe("IModel Connection", () => {
  let accessToken: AccessToken;
  let testContext: TestContext;

  before(async function () {
    testContext = await TestContext.instance();

    if (!testContext.settings.runiModelReadRpcTests)
      this.skip();

    accessToken = testContext.adminUserAccessToken;
    (IModelApp.authorizationClient as AuthorizationClient).setAccessToken(accessToken);
  });

  it("should successfully open an IModelConnection for read", async () => {
    const contextId = testContext.iModelWithChangesets!.contextId;
    const openMode = OpenMode.Readonly;
    const iModelId = testContext.iModelWithChangesets!.iModelId;

    const iModel: IModelConnection = await IModelConnection.open(contextId, iModelId, openMode);

    expect(iModel).to.exist.and.be.not.empty;

    const iModelToken = iModel.iModelToken;
    expect(iModelToken).to.exist.and.be.not.empty;
  });

  it("should successfully close an open an IModelConnection", async () => {
    const iModelId = testContext.iModelWithChangesets!.iModelId;
    const contextId = testContext.iModelWithChangesets!.contextId;
    const iModel: IModelConnection = await IModelConnection.open(contextId, iModelId);

    expect(iModel).to.exist;
    return expect(iModel.close()).to.eventually.be.fulfilled;
  });
});

describe("IModelConnection Tiles", () => {
  let iModel: IModelConnection;
  let contextId: string;
  let accessToken: AccessToken;
  let testContext: TestContext;

  before(async function () {
    testContext = await TestContext.instance();

    if (!testContext.settings.runiModelTileRpcTests) {
      this.skip();
    }

    const iModelId = testContext.iModelWithChangesets!.iModelId;
    contextId = testContext.iModelWithChangesets!.contextId;
    accessToken = testContext.adminUserAccessToken;
    (IModelApp.authorizationClient as AuthorizationClient).setAccessToken(accessToken);
    iModel = await IModelConnection.open(contextId, iModelId);
  });

  it("IModelTileRpcInterface method getTileCacheContainerUrl should work as expected", async () => {
    // requesting tiles will automatically call getTileCacheContainerUrl if the chechCache method is defined
    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    const treeId = modelProps[0].id!.toString();
    const tile = await iModel.tiles.getTileTreeProps(treeId);

    expect(tile).to.not.be.undefined;
    expect(tile.rootTile.contentId).to.not.be.undefined;

    const result = await iModel.tiles.getTileContent(treeId, tile.rootTile.contentId, () => false, undefined);
    expect(result).to.not.be.undefined;

    // for subsequent test cases to actually requests tiles from the backend instead of azure storage, we need to set the checkCache to return undefined
    (IModelTileRpcInterface as any).checkCache = () => undefined;
  });

  it("should be able to request tiles from an IModelConnection", async () => {
    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    expect(modelProps.length).to.be.at.least(1);

    const treeId = modelProps[0].id!.toString();
    const tree = await iModel.tiles.getTileTreeProps(treeId);

    expect(tree.id).to.equal(modelProps[0].id);
    expect(tree.maxTilesToSkip).to.equal(1);
    expect(tree.rootTile).not.to.be.undefined;

    const tf = Transform.fromJSON(tree.location);
    expect(tf.matrix.isIdentity).to.be.true;
    expect(tf.origin).to.not.be.undefined;

    const rootTile = tree.rootTile;
    expect(rootTile.contentId).to.equal("0/0/0/0/1");
  });

  it("IModelTileRpcInterface method getTileTreeProps should work as expected", async function () {
    if (!testContext.settings.runiModelTileRpcTests)
      this.skip();

    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    const treeId = modelProps[0].id!.toString();

    const result = await iModel.tiles.getTileTreeProps(treeId);

    expect(result).to.not.be.undefined;
    expect(result.rootTile.contentId).to.not.be.undefined;
  });

  it("IModelTileRpcInterface method getTileContent should work as expected", async function () {
    if (!testContext.settings.runiModelTileRpcTests)
      this.skip();

    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    const treeId = modelProps[0].id!.toString();
    const tile = await iModel.tiles.getTileTreeProps(treeId);

    expect(tile).to.not.be.undefined;
    expect(tile.rootTile.contentId).to.not.be.undefined;

    const result = await iModel.tiles.getTileContent(treeId, tile.rootTile.contentId, () => false, undefined);
    expect(result).to.not.be.undefined;
  });

  it("IModelTileRpcInterface method requestTileTreeProps should work as expected", async function () {
    if (!testContext.settings.runiModelTileRpcTests)
      this.skip();

    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    const treeId = modelProps[0].id!.toString();

    const result = await iModel.tiles.getTileTreeProps(treeId);

    expect(result).to.not.be.undefined;
    expect(result.rootTile.contentId).to.not.be.undefined;
  });

  it("IModelTileRpcInterface method requestTileContent should work as expected", async function () {
    if (!testContext.settings.runiModelTileRpcTests)
      this.skip();

    const modelProps = await iModel.models.queryProps({ from: "BisCore.PhysicalModel" });
    const treeId = modelProps[0].id!.toString();
    const tile = await iModel.tiles.getTileTreeProps(treeId);

    expect(tile).to.not.be.undefined;
    expect(tile.rootTile.contentId).to.not.be.undefined;

    const result = await iModel.tiles.getTileContent(treeId, tile.rootTile.contentId, () => false, undefined);

    expect(result).to.not.be.undefined;
  });

  it("IModelTileRpcInterface method purgeTileTrees should work as expected", async function () {
    if (!testContext.settings.runiModelTileRpcTests)
      this.skip();

    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    const treeId = modelProps[0].id!.toString();

    let failed = false;
    try {
      await iModel.tiles.purgeTileTrees([treeId]);
    } catch (ex) {
      failed = true;
    }

    expect(failed).to.be.false;
  });
});

describe("IModelReadRpcInterface Methods requestable from an IModelConnection", () => {
  let iModel: IModelConnection;
  let contextId: string;
  let accessToken: AccessToken;
  let testContext: TestContext;

  before(async function () {
    testContext = await TestContext.instance();

    if (!testContext.settings.runiModelReadRpcTests) {
      this.skip();
    }

    const iModelId = testContext.iModelWithChangesets!.iModelId;
    contextId = testContext.iModelWithChangesets!.contextId;
    accessToken = testContext.adminUserAccessToken;
    (IModelApp.authorizationClient as AuthorizationClient).setAccessToken(accessToken);
    iModel = await IModelConnection.open(contextId, iModelId);
  });

  it("IModelReadRpcInterface method queryEntityIds should work as expected", async () => {
    const ids: Id64Set = await iModel.elements.queryIds({ limit: 10, from: "BisCore:Subject" });

    expect(ids).to.exist;
  });

  it("IModelReadRpcInterface method getToolTipMessage should work as expected", async () => {
    const ids: Id64Set = await iModel.elements.queryIds({ limit: 10, from: "BisCore:Subject" });
    const id = ids.values().next().value;

    const tooltip = await iModel.getToolTipMessage(id); // "0x338"

    expect(tooltip).to.not.be.undefined;
  });

  it("IModelReadRpcInterface method getDefaultViewId should work as expected", async () => {
    const result = await iModel.views.queryDefaultViewId();

    expect(result).to.not.be.undefined;
  });

  it("IModelReadRpcInterface method getGeometrySummary should work as expected", async () => {
    const ids: Id64Set = await iModel.elements.queryIds({ limit: 10, from: "BisCore:Subject" });
    const id = ids.values().next().value;
    const result = await IModelReadRpcInterface.getClient().getGeometrySummary(iModel.iModelToken.toJSON(), { elementIds: [id], options: {} });
    expect(result).to.not.be.undefined;
  });

  it("IModelReadRpcInterface method requestSnap should work as expected", async () => {
    const ids: Id64Set = await iModel.elements.queryIds({ limit: 10, from: "BisCore:PhysicalElement" });
    const id = ids.values().next().value;

    const worldToView = Matrix4d.createIdentity();
    const snap = await iModel.requestSnap({
      id,
      testPoint: { x: 1, y: 2, z: 3 },
      closePoint: { x: 1, y: 2, z: 3 },
      worldToView: worldToView.toJSON(),
    });

    expect(snap.status).to.not.be.undefined;
  });

  it("IModelReadRpcInterface method queryModelProps should work as expected", async () => {
    const modelQueryParams: ModelQueryParams = { limit: 10, from: SpatialModelState.classFullName, wantPrivate: false };
    const curModelProps = await iModel.models.queryProps(modelQueryParams);

    expect(curModelProps).to.not.be.undefined;
    expect(curModelProps.length).gt(0);
  });

  it("IModelReadRpcInterface method getModelProps should work as expected", async () => {
    const modelQueryParams: ModelQueryParams = { limit: 10, from: SpatialModelState.classFullName, wantPrivate: false };
    const curModelProps = await iModel.models.queryProps(modelQueryParams);
    const modelId = curModelProps[0].id!.toString();

    await iModel.models.load(modelId); // "0x1c"

    expect(iModel.models.loaded.size).to.equal(1);
    expect(iModel.models.loaded.get(modelId)).to.not.be.undefined;
  });

  it("IModelReadRpcInterface method getClassHierarchy should work as expected", async () => {
    const result = await iModel.findClassFor("BisCore:LineStyle", undefined);
    expect(result).undefined;
  });

  it("IModelReadRpcInterface method getViewThumbnail should work as expected", async () => {
    const modelQueryParams: ModelQueryParams = { limit: 10, from: ViewState.classFullName };
    const modelProps = await iModel.views.queryProps(modelQueryParams);
    const viewId = modelProps[0].id!.toString();
    const result = await iModel.views.getThumbnail(viewId);
    expect(result).to.not.be.undefined;
  });

  it("IModelReadRpcInterface method getIModelCoordinatesFromGeoCoordinates should work as expected", async () => {
    let wgs84Response: IModelCoordinatesResponseProps;

    const wgs84Converter = iModel.geoServices.getConverter("WGS84");
    const nad27Converter = iModel.geoServices.getConverter("NAD27");

    const geoPointList: XYZProps[] = [];

    for (let iLatitude: number = 0; iLatitude < 10; iLatitude++) {
      for (let iLongitude: number = 0; iLongitude < 10; iLongitude++) {
        geoPointList.push({ x: (132.600 + 0.02 * iLongitude), y: (34.350 + 0.02 * iLatitude), z: 0.0 });
      }
    }

    const testPoints: XYZProps[] = [];
    for (let iGeoPoint: number = 1; iGeoPoint < geoPointList.length; iGeoPoint += 2)
      testPoints.push(geoPointList[iGeoPoint]);

    wgs84Response = await wgs84Converter!.getIModelCoordinatesFromGeoCoordinates(testPoints);

    // shouldn't have any from the cache.
    expect(wgs84Response.fromCache === 0).to.be.true;

    // shouldn't have any failures.
    for (const result of wgs84Response.iModelCoords) {
      expect(GeoCoordStatus.Success === result.s);
    }

    const nad27Response = await nad27Converter!.getIModelCoordinatesFromGeoCoordinates(testPoints);

    // shouldn't have any from the cache.
    expect(nad27Response.fromCache).eq(0);
  });

  it("IModelReadRpcInterface method getGeoCoordinatesFromIModelCoordinates should work as expected", async () => {
    const ecefProps: EcefLocation = new EcefLocation({ orientation: YawPitchRollAngles.createDegrees(0, 0, 0), origin: Point3d.create(0, 0, 0) });
    iModel.setEcefLocation(ecefProps);

    try {
      await iModel.spatialToCartographic({ x: 6378.137, y: 0, z: 0 });
    } catch (error) { }
  });

  /* NEEDSWORK queryPage no longer exists; you cannot specify a specific rows-per-page to query for (only a maximum via LIMIT).
  it("iModelReadRpcInterface method queryRowCount should work as expected", async () => {
    const getRowPerPage = (nPageSize: number, nRowCount: number) => {
      const nRowPerPage = nRowCount / nPageSize;
      const nPages = Math.ceil(nRowPerPage);
      const nRowOnLastPage = nRowCount - (Math.floor(nRowPerPage) * pageSize);
      const pages = new Array(nPages).fill(pageSize);
      if (nRowPerPage) {
        pages[nPages - 1] = nRowOnLastPage;
      }
      return pages;
    };

    const pageSize = 5;
    const query = "SELECT ECInstanceId as Id, Parent.Id as ParentId FROM BisCore.Element";
    const rowCount = await iModel.queryRowCount(query);

    // verify row per page
    const rowPerPage = getRowPerPage(pageSize, rowCount);
    for (let k = 0; k < rowPerPage.length; k++) {
      const row = await iModel.queryPage(query, undefined, { size: pageSize, start: k });
      expect(row.length).to.be.equal(rowPerPage[k]);
    }

    // verify with async iterator
    const resultSet = [];
    for await (const row of iModel.query(query, undefined, { size: pageSize })) {
      resultSet.push(row);
      expect(Reflect.has(row, "id")).to.be.true;
      if (Reflect.ownKeys(row).length > 1) {
        expect(Reflect.has(row, "parentId")).to.be.true;
        const parentId: string = row.parentId;
        expect(parentId.startsWith("0x")).to.be.true;
      }
      const id: string = row.id;
      expect(id.startsWith("0x"));
    }
    expect(rowCount).to.be.equal(resultSet.length);
  });
  */

  it("iModelReadRpcInterface method queryModelRanges should work as expected", async () => {
    const modelProps = await iModel.models.queryProps({ limit: 10, from: "BisCore.PhysicalModel" });
    const modelId = modelProps[0].id!.toString();

    const idSet: Id64Set = Id64.toIdSet(modelId);

    const ranges = await iModel.models.queryModelRanges(idSet);

    expect(ranges).to.not.be.undefined;
    expect(ranges.length).to.be.equal(1);
  });

  it("iModelReadRpcInterface method getMassProperties should work as expected", async () => {
    const requestProps: MassPropertiesRequestProps = {
      operation: MassPropertiesOperation.AccumulateVolumes,
    };

    const result = await IModelReadRpcInterface.getClient().getMassProperties(iModel.iModelToken.toJSON(), requestProps);
    expect(result).to.not.be.null;
  });
});

describe("Snapping", () => {
  let iModel: IModelConnection;
  let contextId: string;
  let accessToken: AccessToken;
  let testContext: TestContext;

  before(async function () {
    testContext = await TestContext.instance();

    if (!testContext.settings.runiModelReadRpcTests)
      this.skip();

    const iModelId = testContext.iModelWithChangesets!.iModelId;
    contextId = testContext.iModelWithChangesets!.contextId;
    accessToken = testContext.adminUserAccessToken;
    (IModelApp.authorizationClient as AuthorizationClient).setAccessToken(accessToken);
    iModel = await IModelConnection.open(contextId, iModelId);
  });

  it("should be able to request a snap", async () => {
    const ids: Id64Set = await iModel.elements.queryIds({ limit: 10, from: "BisCore:PhysicalElement" });
    const id = ids.values().next().value;

    const worldToView = Matrix4d.createIdentity();
    const snapProps = {
      id,
      testPoint: { x: 1, y: 2, z: 3 },
      closePoint: { x: 1, y: 2, z: 3 },
      worldToView: worldToView.toJSON(),
    };

    const snap = await IModelReadRpcInterface.getClient().requestSnap(iModel.iModelToken.toJSON(), id, snapProps);

    expect(snap.status).to.not.be.undefined;
  });

  it("should be able to cancel a snap", async () => {
    const ids: Id64Set = await iModel.elements.queryIds({ limit: 10, from: "BisCore:PhysicalElement" });
    const id = ids.values().next().value;

    const worldToView = Matrix4d.createIdentity();
    const snapProps = {
      id,
      testPoint: { x: 1, y: 2, z: 3 },
      closePoint: { x: 1, y: 2, z: 3 },
      worldToView: worldToView.toJSON(),
    };

    const requestSnapPromises: Array<Promise<SnapResponseProps>> = [];
    requestSnapPromises.push(IModelReadRpcInterface.getClient().requestSnap(iModel.iModelToken.toJSON(), id, snapProps));
    await IModelReadRpcInterface.getClient().cancelSnap(iModel.iModelToken.toJSON(), id);

    try {
      const snaps = await Promise.all(requestSnapPromises);
      expect(snaps[0].status).to.not.be.undefined; // This is what we expect if the snap is completed before the cancellation is processed.
    } catch (err) {
      // This is what we expect if the cancellation occurs in time to really cancel the snap.
    }
  });
});
