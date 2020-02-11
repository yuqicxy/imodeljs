/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { assert } from "chai";
import { Id64String, Id64, DbResult } from "@bentley/bentleyjs-core";
import { SpatialCategory, IModelDb } from "../../imodeljs-backend";
import { IModelTestUtils } from "../IModelTestUtils";
import { GeometricElementProps, Code, SubCategoryAppearance, ColorDef, IModel, GeometryStreamProps } from "@bentley/imodeljs-common";
import { Point3d, Arc3d, Point2d } from "@bentley/geometry-core";
import { IModelJson as GeomJson } from "@bentley/geometry-core/lib/serialization/IModelJsonSchema";
import { IModelJsFs } from "../../IModelJsFs";
import { BackendRequestContext } from "../../BackendRequestContext";
import { ECSqlStatement } from "../../ECSqlStatement";

interface IPrimitiveBase {
  i?: number;
  l?: number;
  d?: number;
  b?: boolean;
  dt?: string;
  s?: string;
  bin?: Uint8Array;
  p2d?: Point2d;
  p3d?: Point3d;
  g?: Uint8Array;
}

interface IPrimitive extends IPrimitiveBase {
  st?: ComplexStruct;
}

interface IPrimitiveArrayBase {
  array_i?: number[];
  array_l?: number[];
  array_d?: number[];
  array_b?: boolean[];
  array_dt?: string[];
  array_s?: string[];
  array_bin?: Uint8Array[];
  array_p2d?: Point2d[];
  array_p3d?: Point3d[];
  array_g?: Uint8Array[];
  array_st?: ComplexStruct[];
}

interface IPrimitiveArray extends IPrimitiveArrayBase {
  array_st?: ComplexStruct[];
}

interface ComplexStruct extends IPrimitiveArrayBase, IPrimitiveBase {
}

interface TestElement extends IPrimitive, IPrimitiveArray, GeometricElementProps {
}

function verifyPrimitiveBase(actualValue: IPrimitiveBase, expectedValue: IPrimitiveBase) {
  if (expectedValue.i) assert.equal(actualValue.i, expectedValue.i, "'integer' type property did not roundtrip as expected");
  if (expectedValue.l) assert.equal(actualValue.l, expectedValue.l, "'long' type property did not roundtrip as expected");
  if (expectedValue.d) assert.equal(actualValue.d, expectedValue.d, "'double' type property did not roundtrip as expected");
  if (expectedValue.b) assert.equal(actualValue.b, expectedValue.b, "'boolean' type property did not roundtrip as expected");
  if (expectedValue.dt) assert.equal(actualValue.dt, expectedValue.dt, "'dateTime' type property did not roundtrip as expected");
  if (expectedValue.s) assert.equal(actualValue.s, expectedValue.s, "'string' type property did not roundtrip as expected");
  if (expectedValue.p2d) {
    assert.equal(actualValue.p2d!.x, expectedValue.p2d!.x, "'Point2d.x' type property did not roundtrip as expected");
    assert.equal(actualValue.p2d!.y, expectedValue.p2d!.y, "'Point2d.y' type property did not roundtrip as expected");
  }
  if (expectedValue.p3d) {
    assert.equal(actualValue.p3d!.x, expectedValue.p3d!.x, "'Point3d.x' type property did not roundtrip as expected");
    assert.equal(actualValue.p3d!.y, expectedValue.p3d!.y, "'Point3d.y' type property did not roundtrip as expected");
    assert.equal(actualValue.p3d!.z, expectedValue.p3d!.z, "'Point3d.z' type property did not roundtrip as expected");
  }
  if (expectedValue.bin) assert.isTrue(blobEqual(actualValue.bin, expectedValue.bin), "'binary' type property did not roundtrip as expected");
}

function verifyPrimitiveArrayBase(actualValue: IPrimitiveArrayBase, expectedValue: IPrimitiveArrayBase) {
  if (expectedValue.array_bin) {
    assert.equal(actualValue.array_bin!.length, expectedValue.array_bin.length, "'binary[].length' array length missmatch");
    expectedValue.array_bin.forEach((value, index) => {
      assert.isTrue(blobEqual(actualValue.array_bin![index], value), "'binary[]' type property did not roundtrip as expected");
    });
  }
  if (expectedValue.array_i) {
    assert.equal(actualValue.array_i!.length, expectedValue.array_i!.length, "'integer[].length' array length missmatch");
    expectedValue.array_i!.forEach((value, index) => {
      assert.equal(actualValue.array_i![index], value, "'integer[]' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_l) {
    assert.equal(actualValue.array_l!.length, expectedValue.array_l!.length, "'long[].length' array length missmatch");
    expectedValue.array_l!.forEach((value, index) => {
      assert.equal(actualValue.array_l![index], value, "'long[]' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_d) {
    assert.equal(actualValue.array_d!.length, expectedValue.array_d!.length, "'double[].length' array length missmatch");
    expectedValue.array_d!.forEach((value, index) => {
      assert.equal(actualValue.array_d![index], value, "'double[]' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_b) {
    assert.equal(actualValue.array_b!.length, expectedValue.array_b!.length, "'boolean[].length' array length missmatch");
    expectedValue.array_b!.forEach((value, index) => {
      assert.equal(actualValue.array_b![index], value, "'boolean[]' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_dt) {
    assert.equal(actualValue.array_dt!.length, expectedValue.array_dt!.length, "'dateTime[].length' array length missmatch");
    expectedValue.array_dt!.forEach((value, index) => {
      assert.equal(actualValue.array_dt![index], value, "'dateTime[]' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_s) {
    assert.equal(actualValue.array_s!.length, expectedValue.array_s!.length, "'string[].length' array length missmatch");
    expectedValue.array_s!.forEach((value, index) => {
      assert.equal(actualValue.array_s![index], value, "'string[]' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_p2d) {
    assert.equal(actualValue.array_p2d!.length, expectedValue.array_p2d!.length, "'point2d[].length' array length missmatch");
    expectedValue.array_p2d!.forEach((value, index) => {
      assert.equal(actualValue.array_p2d![index].x, value.x, "'point2d[].x' type property did not roundtrip as expected");
      assert.equal(actualValue.array_p2d![index].y, value.y, "'point2d[].y' type property did not roundtrip as expected");
    });
  }

  if (expectedValue.array_p3d) {
    assert.equal(actualValue.array_p3d!.length, expectedValue.array_p3d!.length, "'point3d[].length' array length missmatch");
    expectedValue.array_p3d!.forEach((value, index) => {
      assert.equal(actualValue.array_p3d![index].x, value.x, "'point3d[].x' type property did not roundtrip as expected");
      assert.equal(actualValue.array_p3d![index].y, value.y, "'point3d[].y' type property did not roundtrip as expected");
      assert.equal(actualValue.array_p3d![index].z, value.z, "'point3d[].z' type property did not roundtrip as expected");
    });
  }
}

function verifyPrimitive(actualValue: IPrimitive, expectedValue: IPrimitive) {
  verifyPrimitiveBase(actualValue, expectedValue);
  if (expectedValue.st) {
    verifyPrimitive(actualValue.st!, expectedValue.st!);
    verifyPrimitiveArray(actualValue.st!, expectedValue.st!);
  }
}

function verifyPrimitiveArray(actualValue: IPrimitiveArray, expectedValue: IPrimitiveArray) {
  verifyPrimitiveArrayBase(actualValue, expectedValue);
  if (expectedValue.array_st) {
    assert.equal(actualValue.array_st!.length, expectedValue.array_st!.length, "'struct[].length' array length missmatch");
    actualValue.array_st!.forEach((lhs: ComplexStruct, i: number) => {
      verifyPrimitiveBase(lhs, expectedValue.array_st![i]);
      verifyPrimitiveArrayBase(lhs, expectedValue.array_st![i]);
    });
  }
}

function verifyTestElement(actualValue: TestElement, expectedValue: TestElement) {
  verifyPrimitive(actualValue, expectedValue);
  verifyPrimitiveArray(actualValue, expectedValue);
}

function initElemProps(className: string, _iModelName: IModelDb, modId: Id64String, catId: Id64String, autoHandledProp: any): GeometricElementProps {
  // add Geometry
  const geomArray: Arc3d[] = [
    Arc3d.createXY(Point3d.create(0, 0), 5),
    Arc3d.createXY(Point3d.create(5, 5), 2),
    Arc3d.createXY(Point3d.create(-5, -5), 20),
  ];
  const geometryStream: GeometryStreamProps = [];
  for (const geom of geomArray) {
    const arcData = GeomJson.Writer.toIModelJson(geom);
    geometryStream.push(arcData);
  }
  // Create props
  const elementProps: GeometricElementProps = {
    classFullName: "ElementRoundTripTest:" + className,
    model: modId,
    category: catId,
    code: Code.createEmpty(),
    geom: geometryStream,
  };

  if (autoHandledProp)
    Object.assign(elementProps, autoHandledProp);

  return elementProps;
}
function blobEqual(lhs: any, rhs: any) {
  if (!(lhs instanceof Uint8Array) || !(rhs instanceof Uint8Array))
    throw new Error("expecting uint8array");

  if (lhs.byteLength !== rhs.byteLength)
    return false;

  for (let i = 0; i < lhs.byteLength; i++) {
    if (lhs[i] !== rhs[i])
      return false;
  }
  return true;
}

describe("Element roundtrip test for all type of properties", () => {
  const testSchema = `<?xml version="1.0" encoding="UTF-8"?>
    <ECSchema schemaName="ElementRoundTripTest" alias="ts" version="01.00.00" xmlns="http://www.bentley.com/schemas/Bentley.ECXML.3.2">
      <ECSchemaReference name="BisCore" version="01.00.04" alias="bis"/>
      <ECSchemaReference name="CoreCustomAttributes" version="01.00.03" alias="CoreCA"/>
      <ECEntityClass typeName="TestElement" modifier="None">
        <BaseClass>bis:PhysicalElement</BaseClass>
        <BaseClass>IPrimitive</BaseClass>
        <BaseClass>IPrimitiveArray</BaseClass>
      </ECEntityClass>
      <ECEntityClass typeName="IPrimitive" modifier="Abstract">
        <ECCustomAttributes>
          <IsMixin xmlns="CoreCustomAttributes.01.00.03">
            <AppliesToEntityClass>bis:PhysicalElement</AppliesToEntityClass>
          </IsMixin>
        </ECCustomAttributes>
        <ECProperty propertyName="i" typeName="int"/>
        <ECProperty propertyName="l" typeName="long"/>
        <ECProperty propertyName="d" typeName="double"/>
        <ECProperty propertyName="b" typeName="boolean"/>
        <ECProperty propertyName="dt" typeName="dateTime"/>
        <ECProperty propertyName="s" typeName="string"/>
        <ECProperty propertyName="bin" typeName="binary"/>
        <ECProperty propertyName="p2d" typeName="point2d"/>
        <ECProperty propertyName="p3d" typeName="point3d"/>
        <ECProperty propertyName="g" typeName="Bentley.Geometry.Common.IGeometry"/>
        <ECStructProperty propertyName="st" typeName="ComplexStruct"/>
      </ECEntityClass>
      <ECEntityClass typeName="IPrimitiveArray" modifier="Abstract">
        <ECCustomAttributes>
          <IsMixin xmlns="CoreCustomAttributes.01.00.03">
            <AppliesToEntityClass>bis:PhysicalElement</AppliesToEntityClass>
          </IsMixin>
        </ECCustomAttributes>
        <ECArrayProperty propertyName="array_i" typeName="int"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_l" typeName="long"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_d" typeName="double"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_b" typeName="boolean"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_dt" typeName="dateTime"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_s" typeName="string"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_bin" typeName="binary"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_p2d" typeName="point2d"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_p3d" typeName="point3d"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_g" typeName="Bentley.Geometry.Common.IGeometry"  minOccurs="0" maxOccurs="unbounded"/>
        <ECStructArrayProperty propertyName="array_st" typeName="ComplexStruct"  minOccurs="0" maxOccurs="unbounded"/>
      </ECEntityClass>
      <ECStructClass typeName="ComplexStruct" modifier="None">
        <ECProperty propertyName="i" typeName="int"/>
        <ECProperty propertyName="l" typeName="long"/>
        <ECProperty propertyName="d" typeName="double"/>
        <ECProperty propertyName="b" typeName="boolean"/>
        <ECProperty propertyName="dt" typeName="dateTime"/>
        <ECProperty propertyName="s" typeName="string"/>
        <ECProperty propertyName="bin" typeName="binary"/>
        <ECProperty propertyName="p2d" typeName="point2d"/>
        <ECProperty propertyName="p3d" typeName="point3d"/>
        <ECProperty propertyName="g" typeName="Bentley.Geometry.Common.IGeometry"/>
        <ECArrayProperty propertyName="array_i" typeName="int"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_l" typeName="long"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_d" typeName="double"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_b" typeName="boolean"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_dt" typeName="dateTime"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_s" typeName="string"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_bin" typeName="binary"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_p2d" typeName="point2d"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_p3d" typeName="point3d"  minOccurs="0" maxOccurs="unbounded"/>
        <ECArrayProperty propertyName="array_g" typeName="Bentley.Geometry.Common.IGeometry"  minOccurs="0" maxOccurs="unbounded"/>
      </ECStructClass>
    </ECSchema>`;

  const schemaFileName = "ElementRoundTripTest.01.00.00.xml";
  const iModelFileName = "ElementRoundTripTest.bim";
  const categoryName = "RoundTripCategory";
  const subDirName = "ElementRoundTrip";
  const iModelPath = IModelTestUtils.prepareOutputFile(subDirName, iModelFileName);

  before(async () => {
    // write schema to disk as we do not have api to import xml directly
    const testSchemaPath = IModelTestUtils.prepareOutputFile(subDirName, schemaFileName);
    IModelJsFs.writeFileSync(testSchemaPath, testSchema);

    const imodel = IModelDb.createSnapshot(iModelPath, { rootSubject: { name: "RoundTripTest" } });
    await imodel.importSchemas(new BackendRequestContext(), [testSchemaPath]);
    imodel.setAsMaster();
    IModelTestUtils.createAndInsertPhysicalPartitionAndModel(imodel, Code.createEmpty(), true);
    let spatialCategoryId = SpatialCategory.queryCategoryIdByName(imodel, IModel.dictionaryId, categoryName);
    if (undefined === spatialCategoryId)
      spatialCategoryId = SpatialCategory.insert(imodel, IModel.dictionaryId, categoryName,
        new SubCategoryAppearance({ color: new ColorDef("rgb(255,0,0)") }));

    imodel.saveChanges();
    imodel.closeSnapshot();
  });

  it("Roundtrip all type of properties via ElementApi, ConcurrentQuery and ECSqlStatement via insert and update", async () => {
    const testFileName = IModelTestUtils.prepareOutputFile(subDirName, "roundtrip_correct_data.bim");
    const imodel = IModelTestUtils.createSnapshotFromSeed(testFileName, iModelPath);
    const spatialCategoryId = SpatialCategory.queryCategoryIdByName(imodel, IModel.dictionaryId, categoryName);
    const [, newModelId] = IModelTestUtils.createAndInsertPhysicalPartitionAndModel(imodel, Code.createEmpty(), true);

    const primInst1: IPrimitiveBase = {
      i: 101,
      l: 12334343434,
      d: 1023.34,
      b: true,
      dt: "2017-01-01T00:00:00.000",
      s: "Test string Inst1",
      bin: new Uint8Array([1, 2, 3]),
      p2d: new Point2d(1.034, 2.034),
      p3d: new Point3d(-1.0, 2.3, 3.0001),
    };

    const primInst2: IPrimitiveBase = {
      i: 4322,
      l: 98283333,
      d: -2343.342,
      b: false,
      dt: "2010-01-01T11:11:11.000",
      s: "Test string Inst2",
      bin: new Uint8Array([11, 21, 31, 34, 53, 21, 14, 14, 55, 22]),
      p2d: new Point2d(1111.11, 2222.22),
      p3d: new Point3d(-111.11, -222.22, -333.33),
    };

    const primArrInst1: IPrimitiveArrayBase = {
      array_i: [101, 202, -345],
      array_l: [12334343434, 3434343434, 12],
      array_d: [1023.34, 3023.34, -3432.033],
      array_b: [true, false, true, false],
      array_dt: ["2017-01-01T00:00:00.000", "2018-01-01T00:00:00.000"],
      array_s: ["Test string 1", "Test string 2", "Test string 3"],
      array_bin: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 2, 3, 3, 4, 55, 6, 65])],
      array_p2d: [new Point2d(1, 2), new Point2d(2, 4)],
      array_p3d: [new Point3d(1, 2, 3), new Point3d(4, 5, 6)],
    };

    const primArrInst2: IPrimitiveArrayBase = {
      array_i: [0, 1, 2, 3, 4, 5, 6666],
      array_l: [-23422, -343343434, -12333434, 23423423],
      array_d: [-21023.34, -33023.34, -34432.033],
      array_b: [false, true],
      array_dt: ["2017-01-01T00:00:00.000", "2018-01-01T00:00:00.000", "2011-01-01T00:00:00.000"],
      array_s: ["Test string 1 - inst2", "Test string 2 - inst2", "Test string 3 - inst2"],
      array_bin: [new Uint8Array([1, 2, 3, 3, 4]), new Uint8Array([0, 0, 0, 0]), new Uint8Array([1, 2, 3, 4])],
      array_p2d: [new Point2d(-123, 244.23232), new Point2d(232, 324.2323), new Point2d(322, 2324.23322)],
      array_p3d: [new Point3d(133, 2333, 333), new Point3d(4123, 5123, 6123)],
    };

    // create element with auto handled properties
    const expectedValue = initElemProps("TestElement", imodel, newModelId, spatialCategoryId!, {
      ...primInst1,
      ...primArrInst1,
      st: { ...primArrInst2, ...primInst1 },
      array_st: [{ ...primInst1, ...primArrInst2 }, { ...primInst2, ...primArrInst1 }],
    }) as TestElement;

    // insert a element
    const geomElement = imodel.elements.createElement(expectedValue);
    const id = imodel.elements.insertElement(geomElement);
    assert.isTrue(Id64.isValidId64(id), "insert worked");
    imodel.saveChanges();

    // verify inserted element properties
    const actualValue = imodel.elements.getElementProps<TestElement>(id);
    verifyTestElement(actualValue, expectedValue);

    // verify via concurrent query
    let rowCount = 0;
    for await (const row of imodel.query("SELECT * FROM ts.TestElement")) {
      verifyTestElement(row as TestElement, expectedValue);
      rowCount++;
    }
    assert.equal(rowCount, 1);

    // verify via ecsql statement
    await imodel.withPreparedStatement("SELECT * FROM ts.TestElement", async (stmt: ECSqlStatement) => {
      assert.equal(stmt.step(), DbResult.BE_SQLITE_ROW);
      const stmtRow = stmt.getRow() as TestElement;
      verifyTestElement(stmtRow, expectedValue);
    });

    // update the element autohandled properties
    Object.assign(actualValue, {
      ...primInst2,
      ...primArrInst2,
      st: { ...primArrInst1, ...primInst2 },
      array_st: [{ ...primInst2, ...primArrInst2 }, { ...primInst1, ...primArrInst1 }],
    });

    // update element
    imodel.elements.updateElement(actualValue);
    imodel.saveChanges();

    // verify updated values
    const updatedValue = imodel.elements.getElementProps<TestElement>(id);
    verifyTestElement(updatedValue, actualValue);

    // verify via concurrent query
    rowCount = 0;
    for await (const row of imodel.query("SELECT * FROM ts.TestElement")) {
      verifyTestElement(row as TestElement, actualValue);
      rowCount++;
    }
    assert.equal(rowCount, 1);

    // verify via ecsql statement
    await imodel.withPreparedStatement("SELECT * FROM ts.TestElement", async (stmt: ECSqlStatement) => {
      assert.equal(stmt.step(), DbResult.BE_SQLITE_ROW);
      const stmtRow = stmt.getRow() as TestElement;
      verifyTestElement(stmtRow, actualValue);
    });

    imodel.closeSnapshot();
  });
});
