/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { ClassRegistry, Schema, Schemas, IModelDb, SpatialCategory, IModelHost } from "@bentley/imodeljs-backend";
import { IModelError, IModelStatus, SubCategoryAppearance, ColorByName } from "@bentley/imodeljs-common";
import * as path from "path";
import * as _schemaNames from "../common/RobotWorldSchema";

// __PUBLISH_EXTRACT_START__ ClassRegistry.registerModule

// Import all modules that define classes in this schema.
import * as robots from "./RobotElement";
import * as obstacles from "./BarrierElement";
import { ClientRequestContext } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "@bentley/imodeljs-clients";
// ... other modules ...

/** An example of defining a class that represents a schema.
 * Important: The name of the TypeScript class must match the name of the ECSchema that it represents.
 * Normally, you would use a tool to generate a TypeScript schema class like this from an ECSchema
 * definition. You would then edit the generated TypeScript class to add methods.
 */
export class RobotWorld extends Schema {
  public static get schemaName(): string { return "RobotWorld"; }
  /** An app must call this to register the RobotWorld schema prior to using it. */
  public static registerSchema() {

    // Make sure that this Schema is registered.
    // An app may call this more than once. Make sure that's harmless.
    if (this !== Schemas.getRegisteredSchema(RobotWorld.name)) {
      Schemas.registerSchema(this);
      ClassRegistry.registerModule(robots, this);
      ClassRegistry.registerModule(obstacles, this);
    }
  }
  // __PUBLISH_EXTRACT_END__

  // __PUBLISH_EXTRACT_START__ IModelDb.importSchema

  // Import the RobotWorld schema into the specified iModel.
  // Also do some one-time bootstrapping of supporting definitions such as Categories.
  public static async importSchema(requestContext: ClientRequestContext | AuthorizedClientRequestContext, iModelDb: IModelDb): Promise<void> {
    requestContext.enter();
    if (iModelDb.containsClass(_schemaNames.Class.Robot))
      return Promise.resolve();

    if (iModelDb.isReadonly)
      throw new IModelError(IModelStatus.ReadOnly, "importSchema failed because IModelDb is read-only");

    // Must import the schema. The schema must be installed alongside the app in its
    // assets directory. Note that, for portability, make sure the case of
    // the filename is correct!
    await iModelDb.importSchema(requestContext, path.join(IModelHost.appAssetsDir!, "RobotWorld.ecschema.xml"));
    requestContext.enter();

    // This is the right time to create definitions, such as Categories, that will
    // be used with the classes in this schema.
    RobotWorld.bootStrapDefinitions(iModelDb);

    return Promise.resolve();
  }
  // __PUBLISH_EXTRACT_END__

  public static bootStrapDefinitions(iModelDb: IModelDb) {
    // Insert some pre-defined categories
    if (true) {
      SpatialCategory.insert(iModelDb, IModelDb.dictionaryId, _schemaNames.Class.Robot, new SubCategoryAppearance({ color: ColorByName.silver }));
    }
    if (true) {
      SpatialCategory.insert(iModelDb, IModelDb.dictionaryId, _schemaNames.Class.Barrier, new SubCategoryAppearance({ color: ColorByName.brown }));
    }
  }

  // Look up the category to use for instances of the specified class
  public static getCategory(iModelDb: IModelDb, className: _schemaNames.Class): SpatialCategory {
    const categoryId = SpatialCategory.queryCategoryIdByName(iModelDb, IModelDb.dictionaryId, className);
    if (categoryId === undefined)
      throw new IModelError(IModelStatus.NotFound, "Category not found");
    return iModelDb.elements.getElement(categoryId) as SpatialCategory;
  }
}

/** Export the schema names so that they appear to be enums nested in the RobotWorldSchema class/ns */
export namespace RobotWorld {
  /** The full names of the classes in the RobotWorld schema */
  export const Class = _schemaNames.Class;

  /** The names of the Categories in the RobotWorld schema */
  export const Category = _schemaNames.Category;

  /** The names of the CodeSpecs in the RobotWorld schema */
  export const CodeSpec = _schemaNames.CodeSpec;
}
