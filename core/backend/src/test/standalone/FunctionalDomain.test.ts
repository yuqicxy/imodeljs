/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { DbResult, Guid, Id64, Id64String, Logger } from "@bentley/bentleyjs-core";
import { Code, CodeScopeSpec, CodeSpec, FunctionalElementProps, IModel } from "@bentley/imodeljs-common";
import { assert } from "chai";
import * as path from "path";
import { BackendRequestContext, BriefcaseManager, ECSqlStatement, FunctionalModel, FunctionalSchema, IModelDb, SqliteStatement } from "../../imodeljs-backend";
import { IModelTestUtils } from "../IModelTestUtils";

describe("Functional Domain", () => {
  const requestContext = new BackendRequestContext();

  it("should populate FunctionalModel", async () => {
    const iModelDb: IModelDb = IModelDb.createSnapshot(IModelTestUtils.prepareOutputFile("FunctionalDomain", "FunctionalTest.bim"), {
      rootSubject: { name: "FunctionalTest", description: "Test of the Functional domain schema." },
      client: "Functional",
      globalOrigin: { x: 0, y: 0 },
      projectExtents: { low: { x: -500, y: -500, z: -50 }, high: { x: 500, y: 500, z: 50 } },
      guid: Guid.createValue(),
    });

    // Import the Functional schema
    FunctionalSchema.registerSchema();
    await FunctionalSchema.importSchema(requestContext, iModelDb);

    let commits = 0;
    let committed = 0;
    const dropCommit = iModelDb.txns.onCommit.addListener(() => commits++);
    const dropCommitted = iModelDb.txns.onCommitted.addListener(() => committed++);
    iModelDb.saveChanges("Import Functional schema");

    assert.equal(commits, 1);
    assert.equal(committed, 1);
    dropCommit();
    dropCommitted();

    BriefcaseManager.createStandaloneChangeSet(iModelDb.briefcase); // importSchema below will fail if this is not called to flush local changes

    await iModelDb.importSchemas(requestContext, [path.join(__dirname, "../assets/TestFunctional.ecschema.xml")]);

    iModelDb.saveChanges("Import TestFunctional schema");
    assert.equal(commits, 1);
    assert.equal(committed, 1);

    const codeSpec = CodeSpec.create(iModelDb, "Test Functional Elements", CodeScopeSpec.Type.Model);
    iModelDb.codeSpecs.insert(codeSpec);
    assert.isTrue(Id64.isValidId64(codeSpec.id));

    const modelId: Id64String = FunctionalModel.insert(iModelDb, IModel.rootSubjectId, "Test Functional Model");
    assert.isTrue(Id64.isValidId64(modelId));

    const breakdownProps: FunctionalElementProps = {
      classFullName: "TestFunctional:Breakdown",
      model: modelId,
      code: new Code({ spec: codeSpec.id, scope: modelId, value: "Breakdown1" }),
    };
    const breakdownId: Id64String = iModelDb.elements.insertElement(breakdownProps);
    assert.isTrue(Id64.isValidId64(breakdownId));

    const componentProps: FunctionalElementProps = {
      classFullName: "TestFunctional:Component",
      model: modelId,
      code: new Code({ spec: codeSpec.id, scope: modelId, value: "Component1" }),
    };
    const componentId: Id64String = iModelDb.elements.insertElement(componentProps);
    assert.isTrue(Id64.isValidId64(componentId));

    iModelDb.saveChanges("Insert Functional elements");

    iModelDb.withPreparedStatement("SELECT ECInstanceId AS id FROM ECDbMeta.ECSchemaDef WHERE Name='TestFunctional' LIMIT 1", (schemaStatement: ECSqlStatement) => {
      while (DbResult.BE_SQLITE_ROW === schemaStatement.step()) {
        const schemaRow: any = schemaStatement.getRow();
        Logger.logInfo("FunctionalDomain.test", `${schemaRow.id}`);
        iModelDb.withPreparedStatement("SELECT ECInstanceId AS id FROM ECDbMeta.ECClassDef WHERE ECClassDef.Schema.Id=? AND Name='PlaceholderForSchemaHasBehavior' LIMIT 1", (classStatement: ECSqlStatement) => {
          classStatement.bindId(1, schemaRow.id);
          while (DbResult.BE_SQLITE_ROW === classStatement.step()) {
            const classRow: any = classStatement.getRow();
            Logger.logInfo("FunctionalDomain.test", `${classRow.id}`);
            iModelDb.withPreparedSqliteStatement("SELECT Id AS id, Instance AS xml FROM ec_CustomAttribute WHERE ClassId=? AND ContainerId=?", (customAttributeStatement: SqliteStatement) => {
              customAttributeStatement.bindValue(1, { id: classRow.id });
              customAttributeStatement.bindValue(2, { id: schemaRow.id });
              while (DbResult.BE_SQLITE_ROW === customAttributeStatement.step()) {
                const customAttributeRow: any = customAttributeStatement.getRow();
                Logger.logInfo("FunctionalDomain.test", `${customAttributeRow.id}, ${customAttributeRow.xml}`);
              }
            });
          }
        });
      }
    });

    iModelDb.closeSnapshot();
  });
});
