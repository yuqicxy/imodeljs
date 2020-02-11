/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Guid, Id64, Id64String } from "@bentley/bentleyjs-core";
import { CategoryProps, Code, ElementProps, GeometricElement3dProps, IModel, InformationPartitionElementProps } from "@bentley/imodeljs-common";
import { assert } from "chai";
import { GenericSchema, Group, GroupInformationPartition, GroupModel, IModelDb, IModelJsFs, PhysicalModel, PhysicalObject, PhysicalPartition, SpatialCategory, SubjectOwnsPartitionElements } from "../../imodeljs-backend";
import { IModelTestUtils } from "../IModelTestUtils";

describe("Generic Domain", () => {

  it("should create elements from the Generic domain", async () => {
    GenericSchema.registerSchema();
    assert.isTrue(IModelJsFs.existsSync(GenericSchema.schemaFilePath));
    assert.equal(GenericSchema.schemaName, "Generic");
    assert.isTrue(PhysicalObject.classFullName.startsWith(GenericSchema.schemaName));

    const iModelDb: IModelDb = IModelDb.createSnapshot(IModelTestUtils.prepareOutputFile("GenericDomain", "GenericTest.bim"), {
      rootSubject: { name: "GenericTest", description: "Test of the Generic domain schema." },
      client: "Generic",
      globalOrigin: { x: 0, y: 0 },
      projectExtents: { low: { x: -500, y: -500, z: -50 }, high: { x: 500, y: 500, z: 50 } },
      guid: Guid.createValue(),
    });

    // Insert a SpatialCategory
    const spatialCategoryProps: CategoryProps = {
      classFullName: SpatialCategory.classFullName,
      model: IModel.dictionaryId,
      code: SpatialCategory.createCode(iModelDb, IModel.dictionaryId, "Test Spatial Category"),
      isPrivate: false,
    };
    const spatialCategoryId: Id64String = iModelDb.elements.insertElement(spatialCategoryProps);
    assert.isTrue(Id64.isValidId64(spatialCategoryId));

    // Create and populate a PhysicalModel
    const physicalPartitionProps: InformationPartitionElementProps = {
      classFullName: PhysicalPartition.classFullName,
      model: IModel.repositoryModelId,
      parent: new SubjectOwnsPartitionElements(IModel.rootSubjectId),
      code: PhysicalPartition.createCode(iModelDb, IModel.rootSubjectId, "Test Physical Model"),
    };
    const physicalPartitionId: Id64String = iModelDb.elements.insertElement(physicalPartitionProps);
    assert.isTrue(Id64.isValidId64(physicalPartitionId));
    const physicalModel: PhysicalModel = iModelDb.models.createModel({
      classFullName: PhysicalModel.classFullName,
      modeledElement: { id: physicalPartitionId },
    }) as PhysicalModel;
    const physicalModelId: Id64String = iModelDb.models.insertModel(physicalModel);
    assert.isTrue(Id64.isValidId64(physicalModelId));

    for (let i = 0; i < 3; i++) {
      const physicalObjectProps: GeometricElement3dProps = {
        classFullName: PhysicalObject.classFullName,
        model: physicalModelId,
        category: spatialCategoryId,
        code: Code.createEmpty(),
        userLabel: `${PhysicalObject.className}${i}`,
      };
      const physicalObjectId: Id64String = iModelDb.elements.insertElement(physicalObjectProps);
      assert.isTrue(Id64.isValidId64(physicalObjectId));
    }

    // Create and populate a Generic:GroupModel
    const groupPartitionProps: InformationPartitionElementProps = {
      classFullName: GroupInformationPartition.classFullName,
      model: IModel.repositoryModelId,
      parent: new SubjectOwnsPartitionElements(IModel.rootSubjectId),
      code: GroupInformationPartition.createCode(iModelDb, IModel.rootSubjectId, "Test Group Model"),
    };
    const groupPartitionId: Id64String = iModelDb.elements.insertElement(groupPartitionProps);
    assert.isTrue(Id64.isValidId64(groupPartitionId));
    const groupModel: GroupModel = iModelDb.models.createModel({
      classFullName: GroupModel.classFullName,
      modeledElement: { id: groupPartitionId },
    }) as GroupModel;
    const groupModelId: Id64String = iModelDb.models.insertModel(groupModel);
    assert.isTrue(Id64.isValidId64(groupModelId));

    for (let i = 0; i < 3; i++) {
      const groupProps: ElementProps = {
        classFullName: Group.classFullName,
        model: groupModelId,
        code: Code.createEmpty(),
        userLabel: `${Group.className}${i}`,
      };
      const groupId: Id64String = iModelDb.elements.insertElement(groupProps);
      assert.isTrue(Id64.isValidId64(groupId));
    }

    iModelDb.saveChanges("Insert Generic elements");
    iModelDb.closeSnapshot();
  });
});
