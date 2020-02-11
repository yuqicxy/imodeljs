/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModels
 */
import { ClientRequestContext, DbResult, Guid, GuidString, Id64, Id64Set, Id64String, IModelStatus, Logger, LogLevel } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "@bentley/imodeljs-clients";
import { Code, CodeSpec, ElementAspectProps, ElementProps, ExternalSourceAspectProps, FontProps, IModel, IModelError, ModelProps, PrimitiveTypeCode, PropertyMetaData } from "@bentley/imodeljs-common";
import * as path from "path";
import { BackendLoggerCategory } from "./BackendLoggerCategory";
import { ECSqlStatement } from "./ECSqlStatement";
import { DefinitionPartition, Element, InformationPartitionElement, Subject } from "./Element";
import { ElementAspect, ElementMultiAspect, ElementUniqueAspect, ExternalSourceAspect } from "./ElementAspect";
import { IModelCloneContext } from "./IModelCloneContext";
import { IModelDb } from "./IModelDb";
import { IModelExporter, IModelExportHandler } from "./IModelExporter";
import { KnownLocations } from "./IModelHost";
import { IModelImporter } from "./IModelImporter";
import { IModelJsFs } from "./IModelJsFs";
import { DefinitionModel, Model } from "./Model";
import { ElementOwnsExternalSourceAspects } from "./NavigationRelationship";
import { ElementRefersToElements, Relationship, RelationshipProps } from "./Relationship";

const loggerCategory: string = BackendLoggerCategory.IModelTransformer;

/** Options provided to the [[IModelTransformer]] constructor.
 * @beta
 */
export interface IModelTransformOptions {
  /** The Id of the Element in the **target** iModel that represents the **source** repository as a whole and scopes its [ExternalSourceAspect]($backend) instances.
   * When the goal is to consolidate multiple source iModels into a single target iModel, this option must be specified.
   */
  targetScopeElementId?: Id64String;
}

/** Base class used to transform a source iModel into a different target iModel.
 * @see [iModel Transformation and Data Exchange]($docs/learning/backend/IModelTransformation.md), [IModelExporter]($backend), [IModelImporter]($backend)
 * @beta
 */
export class IModelTransformer extends IModelExportHandler {
  /** The IModelExporter that will export from the source iModel. */
  public readonly exporter: IModelExporter;
  /** The IModelImporter that will import into the target iModel. */
  public readonly importer: IModelImporter;
  /** The read-only source iModel. */
  public readonly sourceDb: IModelDb;
  /** The read/write target iModel. */
  public readonly targetDb: IModelDb;
  /** The IModelTransformContext for this IModelTransformer. */
  public readonly context: IModelCloneContext;
  /** The Id of the Element in the **target** iModel that represents the **source** repository as a whole and scopes its [ExternalSourceAspect]($backend) instances. */
  public readonly targetScopeElementId: Id64String = IModel.rootSubjectId;

  /** The set of Elements that were deferred during a prior transformation pass. */
  protected _deferredElementIds = new Set<Id64String>();

  /** Construct a new IModelTransformer
   * @param source Specifies the source IModelExporter or the source IModelDb that will be used to construct the source IModelExporter.
   * @param target Specifies the target IModelImporter or the target IModelDb that will be used to construct the target IModelImporter.
   * @param options The options that specify how the transformation should be done.
   */
  public constructor(source: IModelDb | IModelExporter, target: IModelDb | IModelImporter, options?: IModelTransformOptions) {
    super();
    // initialize IModelTransformOptions
    if (undefined !== options) {
      if (undefined !== options.targetScopeElementId) this.targetScopeElementId = options.targetScopeElementId;
    }
    // initialize exporter and sourceDb
    if (source instanceof IModelDb) {
      this.exporter = new IModelExporter(source);
    } else {
      this.exporter = source;
    }
    this.sourceDb = this.exporter.sourceDb;
    this.exporter.registerHandler(this);
    this.exporter.excludeElementAspectClass(ExternalSourceAspect.classFullName);
    this.exporter.excludeElementAspectClass("BisCore:TextAnnotationData"); // This ElementAspect is auto-created by the BisCore:TextAnnotation2d/3d element handlers
    // initialize importer and targetDb
    if (target instanceof IModelDb) {
      this.importer = new IModelImporter(target);
    } else {
      this.importer = target;
    }
    this.targetDb = this.importer.targetDb;
    // initialize the IModelCloneContext
    this.context = new IModelCloneContext(this.sourceDb, this.targetDb);
  }

  /** Dispose any native resources associated with this IModelTransformer. */
  public dispose(): void {
    Logger.logTrace(loggerCategory, "dispose()");
    this.context.dispose();
  }

  /** Create an ExternalSourceAspectProps in a standard way for an Element in an iModel --> iModel transformation.
   * @param sourceElement The new ExternalSourceAspectProps will be tracking this Element from the source iModel.
   * @param targetElementId The optional Id of the target Element that will own the ExternalSourceAspect.
   */
  private initElementProvenance(sourceElement: Element, targetElementId: Id64String): ExternalSourceAspectProps {
    const aspectProps: ExternalSourceAspectProps = {
      classFullName: ExternalSourceAspect.classFullName,
      element: { id: targetElementId, relClassName: ElementOwnsExternalSourceAspects.classFullName },
      scope: { id: this.targetScopeElementId },
      identifier: sourceElement.id,
      kind: ExternalSourceAspect.Kind.Element,
      version: sourceElement.iModel.elements.queryLastModifiedTime(sourceElement.id),
    };
    const sql = `SELECT ECInstanceId FROM ${ExternalSourceAspect.classFullName} aspect WHERE aspect.Element.Id=:elementId AND aspect.Scope.Id=:scopeId AND aspect.Kind=:kind LIMIT 1`;
    aspectProps.id = this.targetDb.withPreparedStatement(sql, (statement: ECSqlStatement): Id64String | undefined => {
      statement.bindId("elementId", targetElementId);
      statement.bindId("scopeId", this.targetScopeElementId);
      statement.bindString("kind", ExternalSourceAspect.Kind.Element);
      return (DbResult.BE_SQLITE_ROW === statement.step()) ? statement.getValue(0).getId() : undefined;
    });
    return aspectProps;
  }

  /** Create an ExternalSourceAspectProps in a standard way for a Relationship in an iModel --> iModel transformations.
   * The ExternalSourceAspect is meant to be owned by the Element in the target iModel that is the `sourceId` of transformed relationship.
   * The `identifier` property of the ExternalSourceAspect will be the ECInstanceId of the relationship in the source iModel.
   * The ECInstanceId of the relationship in the target iModel will be stored in the JsonProperties of the ExternalSourceAspect.
   */
  private initRelationshipProvenance(sourceRelationship: Relationship, targetRelInstanceId: Id64String): ExternalSourceAspectProps {
    const targetRelationship: Relationship = this.targetDb.relationships.getInstance(ElementRefersToElements.classFullName, targetRelInstanceId);
    const aspectProps: ExternalSourceAspectProps = {
      classFullName: ExternalSourceAspect.classFullName,
      element: { id: targetRelationship.sourceId, relClassName: ElementOwnsExternalSourceAspects.classFullName },
      scope: { id: this.targetScopeElementId },
      identifier: sourceRelationship.id,
      kind: ExternalSourceAspect.Kind.Relationship,
      jsonProperties: JSON.stringify({ targetRelInstanceId }),
    };
    const sql = `SELECT ECInstanceId FROM ${ExternalSourceAspect.classFullName} aspect` +
      ` WHERE aspect.Element.Id=:elementId AND aspect.Scope.Id=:scopeId AND aspect.Kind=:kind AND aspect.Identifier=:identifier LIMIT 1`;
    aspectProps.id = this.targetDb.withPreparedStatement(sql, (statement: ECSqlStatement): Id64String | undefined => {
      statement.bindId("elementId", targetRelationship.sourceId);
      statement.bindId("scopeId", this.targetScopeElementId);
      statement.bindString("kind", ExternalSourceAspect.Kind.Relationship);
      statement.bindString("identifier", sourceRelationship.id);
      return (DbResult.BE_SQLITE_ROW === statement.step()) ? statement.getValue(0).getId() : undefined;
    });
    return aspectProps;
  }

  /** Iterate all matching ExternalSourceAspects in the target iModel and call a function for each one. */
  private forEachExternalSourceAspect(fn: (sourceElementId: Id64String, targetElementId: Id64String) => void): void {
    const sql = `SELECT aspect.Identifier,aspect.Element.Id FROM ${ExternalSourceAspect.classFullName} aspect WHERE aspect.Scope.Id=:scopeId AND aspect.Kind=:kind`;
    this.targetDb.withPreparedStatement(sql, (statement: ECSqlStatement): void => {
      statement.bindId("scopeId", this.targetScopeElementId);
      statement.bindString("kind", ExternalSourceAspect.Kind.Element);
      while (DbResult.BE_SQLITE_ROW === statement.step()) {
        const sourceElementId: Id64String = statement.getValue(0).getString(); // ExternalSourceAspect.Identifier is of type string
        const targetElementId: Id64String = statement.getValue(1).getId();
        fn(sourceElementId, targetElementId);
      }
    });
  }

  /** Initialize the source to target Element mapping from ExternalSourceAspects in the target iModel.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public initFromExternalSourceAspects(): void {
    this.forEachExternalSourceAspect((sourceElementId: Id64String, targetElementId: Id64String) => {
      this.context.remapElement(sourceElementId, targetElementId);
    });
  }

  /** Detect Element deletes using ExternalSourceAspects in the target iModel and a *brute force* comparison against Elements in the source iModel.
   * @see processChanges
   * @note This method is called from [[processAll]] and is not needed by [[processChanges]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public detectElementDeletes(): void {
    const targetElementsToDelete: Id64String[] = [];
    this.forEachExternalSourceAspect((sourceElementId: Id64String, targetElementId: Id64String) => {
      if (undefined === this.sourceDb.elements.tryGetElementProps(sourceElementId)) {
        // if the sourceElement is not found, then it must have been deleted, so propagate the delete to the target iModel
        targetElementsToDelete.push(targetElementId);
      }
    });
    targetElementsToDelete.forEach((targetElementId: Id64String) => {
      this.importer.deleteElement(targetElementId);
    });
  }

  /** Format an Element for the Logger. */
  private formatElementForLogger(elementProps: ElementProps): string {
    const namePiece: string = elementProps.code.value ? `${elementProps.code.value} ` : elementProps.userLabel ? `${elementProps.userLabel} ` : "";
    return `${elementProps.classFullName} ${namePiece}[${elementProps.id!}]`;
  }

  /** Mark the specified Element so its processing can be deferred. */
  protected skipElement(sourceElement: Element): void {
    this._deferredElementIds.add(sourceElement.id);
    Logger.logInfo(loggerCategory, `Deferred ${this.formatElementForLogger(sourceElement)}`);
  }

  /** Transform the specified sourceElement into ElementProps for the target iModel.
   * @param sourceElement The Element from the source iModel to transform.
   * @returns ElementProps for the target iModel.
   * @note A subclass can override this method to provide custom transform behavior.
   */
  protected onTransformElement(sourceElement: Element): ElementProps {
    return this.context.cloneElement(sourceElement);
  }

  /** Returns true if a change within sourceElement is detected.
   * @param sourceElement The Element from the source iModel
   * @param targetElementId The Element from the target iModel to compare against.
   * @note A subclass can override this method to provide custom change detection behavior.
   */
  protected hasElementChanged(sourceElement: Element, targetElementId: Id64String): boolean {
    const aspects: ElementAspect[] = this.targetDb.elements.getAspects(targetElementId, ExternalSourceAspect.classFullName);
    for (const aspect of aspects) {
      const sourceAspect = aspect as ExternalSourceAspect;
      if ((sourceAspect.identifier === sourceElement.id) && (sourceAspect.scope.id === this.targetScopeElementId) && (sourceAspect.kind === ExternalSourceAspect.Kind.Element)) {
        const lastModifiedTime: string = sourceElement.iModel.elements.queryLastModifiedTime(sourceElement.id);
        return (lastModifiedTime !== sourceAspect.version);
      }
    }
    return true;
  }

  /** Determine if any predecessors have not been imported yet.
   * @param sourceElement The Element from the source iModel
   */
  private findMissingPredecessors(sourceElement: Element): Id64Set {
    const predecessorIds: Id64Set = sourceElement.getPredecessorIds();
    predecessorIds.forEach((elementId: Id64String) => {
      const targetElementId: Id64String = this.context.findTargetElementId(elementId);
      if (Id64.isValidId64(targetElementId)) {
        predecessorIds.delete(elementId);
      }
    });
    return predecessorIds;
  }

  /** Cause the specified Element and its child Elements (if applicable) to be exported from the source iModel and imported into the target iModel.
   * @param sourceElementId Identifies the Element from the source iModel to import.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processElement(sourceElementId: Id64String): void {
    if (sourceElementId === IModel.rootSubjectId) {
      throw new IModelError(IModelStatus.BadRequest, "The root Subject should not be directly imported", Logger.logError, loggerCategory);
    }
    this.exporter.exportElement(sourceElementId);
  }

  /** Import child elements into the target IModelDb
   * @param sourceElementId Import the child elements of this element in the source IModelDb.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processChildElements(sourceElementId: Id64String): void {
    this.exporter.exportChildElements(sourceElementId);
  }

  /** Override of [IModelExportHandler.shouldExportElement]($backend) that is called to determine if an element should be exported from the source iModel.
   * @note Reaching this point means that the element has passed the standard exclusion checks in IModelExporter.
   */
  protected shouldExportElement(_sourceElement: Element): boolean { return true; }

  /** Override of [IModelExportHandler.onExportElement]($backend) that imports an element into the target iModel when it is exported from the source iModel.
   * This override calls [[onTransformElement]] and then [IModelImporter.importElement]($backend) to update the target iModel.
   */
  protected onExportElement(sourceElement: Element): void {
    let targetElementId: Id64String | undefined = this.context.findTargetElementId(sourceElement.id);
    const targetElementProps: ElementProps = this.onTransformElement(sourceElement);
    if (!Id64.isValidId64(targetElementId)) {
      targetElementId = this.targetDb.elements.queryElementIdByCode(new Code(targetElementProps.code));
      if (undefined !== targetElementId) {
        this.context.remapElement(sourceElement.id, targetElementId); // record that the targeElement was found by Code
      }
    }
    if (undefined !== targetElementId) {
      // compare LastMod of sourceElement to ExternalSourceAspect of targetElement to see there are changes to import
      if (!this.hasElementChanged(sourceElement, targetElementId)) {
        return;
      }
    } else {
      const missingPredecessorIds: Id64Set = this.findMissingPredecessors(sourceElement);
      if (missingPredecessorIds.size > 0) {
        this.skipElement(sourceElement);
        if (Logger.isEnabled(loggerCategory, LogLevel.Trace)) {
          for (const missingPredecessorId of missingPredecessorIds) {
            const missingPredecessorElement: Element = this.sourceDb.elements.getElement(missingPredecessorId);
            Logger.logTrace(loggerCategory, `Remapping not found for predecessor ${this.formatElementForLogger(missingPredecessorElement)}`);
          }
        }
        return;
      }
    }
    targetElementProps.id = targetElementId; // targetElementId will be valid (indicating update) or undefined (indicating insert)
    this.importer.importElement(targetElementProps);
    this.context.remapElement(sourceElement.id, targetElementProps.id!); // targetElementProps.id assigned by importElement
    // record provenance in ExternalSourceAspect
    const aspectProps: ExternalSourceAspectProps = this.initElementProvenance(sourceElement, targetElementProps.id!);
    if (aspectProps.id === undefined) {
      this.targetDb.elements.insertAspect(aspectProps);
    } else {
      this.targetDb.elements.updateAspect(aspectProps);
    }
  }

  /** Override of [IModelExportHandler.onDeleteElement]($backend) that is called when [IModelExporter]($backend) detects that an Element has been deleted from the source iModel.
   * This override propagates the delete to the target iModel via [IModelImporter.deleteElement]($backend).
   */
  protected onDeleteElement(sourceElementId: Id64String): void {
    const targetElementId: Id64String = this.context.findTargetElementId(sourceElementId);
    if (Id64.isValidId64(targetElementId)) {
      this.importer.deleteElement(targetElementId);
    }
  }

  /** Override of [IModelExportHandler.onExportModel]($backend) that is called when a Model should be exported from the source iModel.
   * This override calls [[onTransformModel]] and then [IModelImporter.importModel]($backend) to update the target iModel.
   */
  protected onExportModel(sourceModel: Model): void {
    if (IModel.repositoryModelId === sourceModel.id) {
      return; // The RepositoryModel should not be directly imported
    }
    const targetModeledElementId: Id64String = this.context.findTargetElementId(sourceModel.id);
    const targetModelProps: ModelProps = this.onTransformModel(sourceModel, targetModeledElementId);
    this.importer.importModel(targetModelProps);
  }

  /** Override of [IModelExportHandler.onDeleteModel]($backend) that is called when [IModelExporter]($backend) detects that a [Model]($backend) has been deleted from the source iModel. */
  protected onDeleteModel(_sourceModelId: Id64String): void {
    // WIP: currently ignored
  }

  /** Cause the model container, contents, and sub-models to be exported from the source iModel and imported into the target iModel.
   * @param sourceModeledElementId Import this [Model]($backend) from the source IModelDb.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processModel(sourceModeledElementId: Id64String): void {
    this.exporter.exportModel(sourceModeledElementId);
  }

  /** Cause the model contents to be exported from the source iModel and imported into the target iModel.
   * @param sourceModelId Import the contents of this model from the source IModelDb.
   * @param targetModelId Import into this model in the target IModelDb. The target model must exist prior to this call.
   * @param elementClassFullName Optional classFullName of an element subclass to limit import query against the source model.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processModelContents(sourceModelId: Id64String, targetModelId: Id64String, elementClassFullName: string = Element.classFullName): void {
    this.targetDb.models.getModel(targetModelId); // throws if Model does not exist
    this.context.remapElement(sourceModelId, targetModelId); // set remapping in case importModelContents is called directly
    this.exporter.exportModelContents(sourceModelId, elementClassFullName);
  }

  /** Cause all sub-models that recursively descend from the specified Subject to be exported from the source iModel and imported into the target iModel. */
  private processSubjectSubModels(sourceSubjectId: Id64String): void {
    // import DefinitionModels first
    const childDefinitionPartitionSql = `SELECT ECInstanceId FROM ${DefinitionPartition.classFullName} WHERE Parent.Id=:subjectId`;
    this.sourceDb.withPreparedStatement(childDefinitionPartitionSql, (statement: ECSqlStatement) => {
      statement.bindId("subjectId", sourceSubjectId);
      while (DbResult.BE_SQLITE_ROW === statement.step()) {
        this.processModel(statement.getValue(0).getId());
      }
    });
    // import other partitions next
    const childPartitionSql = `SELECT ECInstanceId FROM ${InformationPartitionElement.classFullName} WHERE Parent.Id=:subjectId`;
    this.sourceDb.withPreparedStatement(childPartitionSql, (statement: ECSqlStatement) => {
      statement.bindId("subjectId", sourceSubjectId);
      while (DbResult.BE_SQLITE_ROW === statement.step()) {
        const modelId: Id64String = statement.getValue(0).getId();
        const model: Model = this.sourceDb.models.getModel(modelId);
        if (!(model instanceof DefinitionModel)) {
          this.processModel(modelId);
        }
      }
    });
    // recurse into child Subjects
    const childSubjectSql = `SELECT ECInstanceId FROM ${Subject.classFullName} WHERE Parent.Id=:subjectId`;
    this.sourceDb.withPreparedStatement(childSubjectSql, (statement: ECSqlStatement) => {
      statement.bindId("subjectId", sourceSubjectId);
      while (DbResult.BE_SQLITE_ROW === statement.step()) {
        this.processSubjectSubModels(statement.getValue(0).getId());
      }
    });
  }

  /** Transform the specified sourceModel into ModelProps for the target iModel.
   * @param sourceModel The Model from the source iModel to be transformed.
   * @param targetModeledElementId The transformed Model will *break down* or *detail* this Element in the target iModel.
   * @returns ModelProps for the target iModel.
   * @note A subclass can override this method to provide custom transform behavior.
   */
  protected onTransformModel(sourceModel: Model, targetModeledElementId: Id64String): ModelProps {
    const targetModelProps: ModelProps = sourceModel.toJSON();
    targetModelProps.modeledElement.id = targetModeledElementId;
    targetModelProps.id = targetModeledElementId;
    targetModelProps.parentModel = this.context.findTargetElementId(targetModelProps.parentModel!);
    return targetModelProps;
  }

  /** Import elements that were deferred in a prior pass.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processDeferredElements(numRetries: number = 3): void {
    Logger.logTrace(loggerCategory, `processDeferredElements(), numDeferred=${this._deferredElementIds.size}`);
    const copyOfDeferredElementIds: Id64Set = this._deferredElementIds;
    this._deferredElementIds = new Set<Id64String>();
    copyOfDeferredElementIds.forEach((elementId: Id64String) => this.processElement(elementId));
    if (this._deferredElementIds.size > 0) {
      if (--numRetries > 0) {
        Logger.logTrace(loggerCategory, "Retrying processDeferredElements()");
        this.processDeferredElements(numRetries);
      } else {
        throw new IModelError(IModelStatus.BadRequest, "Not all deferred elements could be processed", Logger.logError, loggerCategory);
      }
    }
  }

  /** Imports all relationships that subclass from the specified base class.
   * @param baseRelClassFullName The specified base relationship class.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processRelationships(baseRelClassFullName: string): void {
    this.exporter.exportRelationships(baseRelClassFullName);
  }

  /** Override of [IModelExportHandler.shouldExportRelationship]($backend) that is called to determine if a [Relationship]($backend) should be exported.
   * @note Reaching this point means that the relationship has passed the standard exclusion checks in [IModelExporter]($backend).
   */
  protected shouldExportRelationship(_sourceRelationship: Relationship): boolean { return true; }

  /** Override of [IModelExportHandler.onExportRelationship]($backend) that imports a relationship into the target iModel when it is exported from the source iModel.
   * This override calls [[onTransformRelationship]] and then [IModelImporter.importRelationship]($backend) to update the target iModel.
   */
  protected onExportRelationship(sourceRelationship: Relationship): void {
    const targetRelationshipProps: RelationshipProps = this.onTransformRelationship(sourceRelationship);
    const targetRelationshipInstanceId: Id64String = this.importer.importRelationship(targetRelationshipProps);
    const aspectProps: ExternalSourceAspectProps = this.initRelationshipProvenance(sourceRelationship, targetRelationshipInstanceId);
    if (undefined === aspectProps.id) {
      this.targetDb.elements.insertAspect(aspectProps);
    }
  }

  /** Override of [IModelExportHandler.onDeleteRelationship]($backend) that is called when [IModelExporter]($backend) detects that a [Relationship]($backend) has been deleted from the source iModel.
   * This override propagates the delete to the target iModel via [IModelImporter.deleteRelationship]($backend).
   */
  protected onDeleteRelationship(sourceRelInstanceId: Id64String): void {
    const sql = `SELECT ECInstanceId,JsonProperties FROM ${ExternalSourceAspect.classFullName} aspect` +
      ` WHERE aspect.Scope.Id=:scopeId AND aspect.Kind=:kind AND aspect.Identifier=:identifier LIMIT 1`;
    this.targetDb.withPreparedStatement(sql, (statement: ECSqlStatement): void => {
      statement.bindId("scopeId", this.targetScopeElementId);
      statement.bindString("kind", ExternalSourceAspect.Kind.Relationship);
      statement.bindString("identifier", sourceRelInstanceId);
      if (DbResult.BE_SQLITE_ROW === statement.step()) {
        const json: any = JSON.parse(statement.getValue(1).getString());
        if (undefined !== json.targetRelInstanceId) {
          const targetRelationship: Relationship = this.targetDb.relationships.getInstance(ElementRefersToElements.classFullName, json.targetRelInstanceId);
          this.importer.deleteRelationship(targetRelationship);
          this.targetDb.elements.deleteAspect(statement.getValue(0).getId());
        }
      }
    });
  }

  /** Detect Relationship deletes using ExternalSourceAspects in the target iModel and a *brute force* comparison against relationships in the source iModel.
   * @see processChanges
   * @note This method is called from [[processAll]] and is not needed by [[processChanges]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public detectRelationshipDeletes(): void {
    const aspectDeleteIds: Id64String[] = [];
    const sql = `SELECT ECInstanceId,Identifier,JsonProperties FROM ${ExternalSourceAspect.classFullName} aspect WHERE aspect.Scope.Id=:scopeId AND aspect.Kind=:kind`;
    this.targetDb.withPreparedStatement(sql, (statement: ECSqlStatement): void => {
      statement.bindId("scopeId", this.targetScopeElementId);
      statement.bindString("kind", ExternalSourceAspect.Kind.Relationship);
      while (DbResult.BE_SQLITE_ROW === statement.step()) {
        const sourceRelInstanceId: Id64String = Id64.fromJSON(statement.getValue(1).getString());
        if (undefined === this.sourceDb.relationships.tryGetInstanceProps(ElementRefersToElements.classFullName, sourceRelInstanceId)) {
          const json: any = JSON.parse(statement.getValue(2).getString());
          if (undefined !== json.targetRelInstanceId) {
            const targetRelationship: Relationship = this.targetDb.relationships.getInstance(ElementRefersToElements.classFullName, json.targetRelInstanceId);
            this.importer.deleteRelationship(targetRelationship);
          }
          aspectDeleteIds.push(statement.getValue(0).getId());
        }
      }
    });
    this.targetDb.elements.deleteAspect(aspectDeleteIds);
  }

  /** Transform the specified sourceRelationship into RelationshipProps for the target iModel.
   * @param sourceRelationship The Relationship from the source iModel to be transformed.
   * @returns RelationshipProps for the target iModel.
   * @note A subclass can override this method to provide custom transform behavior.
   */
  protected onTransformRelationship(sourceRelationship: Relationship): RelationshipProps {
    const targetRelationshipProps: RelationshipProps = sourceRelationship.toJSON();
    targetRelationshipProps.sourceId = this.context.findTargetElementId(sourceRelationship.sourceId);
    targetRelationshipProps.targetId = this.context.findTargetElementId(sourceRelationship.targetId);
    sourceRelationship.forEachProperty((propertyName: string, propertyMetaData: PropertyMetaData) => {
      if ((PrimitiveTypeCode.Long === propertyMetaData.primitiveType) && ("Id" === propertyMetaData.extendedType)) {
        (targetRelationshipProps as any)[propertyName] = this.context.findTargetElementId(sourceRelationship.asAny[propertyName]);
      }
    }, true);
    return targetRelationshipProps;
  }

  /** Override of [IModelExportHandler.shouldExportElementAspect]($backend) that is called to determine if an ElementAspect should be exported from the source iModel.
   * @note Reaching this point means that the ElementAspect has passed the standard exclusion checks in [IModelExporter]($backend).
   */
  protected shouldExportElementAspect(_sourceAspect: ElementAspect): boolean { return true; }

  /** Override of [IModelExportHandler.onExportElementUniqueAspect]($backend) that imports an ElementUniqueAspect into the target iModel when it is exported from the source iModel.
   * This override calls [[onTransformElementAspect]] and then [IModelImporter.importElementUniqueAspect]($backend) to update the target iModel.
   */
  protected onExportElementUniqueAspect(sourceAspect: ElementUniqueAspect): void {
    const targetElementId: Id64String = this.context.findTargetElementId(sourceAspect.element.id);
    const targetAspectProps: ElementAspectProps = this.onTransformElementAspect(sourceAspect, targetElementId);
    this.importer.importElementUniqueAspect(targetAspectProps);
  }

  /** Override of [IModelExportHandler.onExportElementMultiAspects]($backend) that imports ElementMultiAspects into the target iModel when they are exported from the source iModel.
   * This override calls [[onTransformElementAspect]] for each ElementMultiAspect and then [IModelImporter.importElementMultiAspects]($backend) to update the target iModel.
   * @note ElementMultiAspects are handled as a group to make it easier to differentiate between insert, update, and delete.
   */
  protected onExportElementMultiAspects(sourceAspects: ElementMultiAspect[]): void {
    const targetElementId: Id64String = this.context.findTargetElementId(sourceAspects[0].element.id);
    // Transform source ElementMultiAspects into target ElementAspectProps
    const targetAspectPropsArray: ElementAspectProps[] = sourceAspects.map((sourceAspect: ElementMultiAspect) => {
      return this.onTransformElementAspect(sourceAspect, targetElementId);
    });
    this.importer.importElementMultiAspects(targetAspectPropsArray);
  }

  /** Transform the specified sourceElementAspect into ElementAspectProps for the target iModel.
   * @param sourceElementAspect The ElementAspect from the source iModel to be transformed.
   * @param targetElementId The ElementId of the target Element that will own the ElementAspects after transformation.
   * @returns ElementAspectProps for the target iModel.
   * @note A subclass can override this method to provide custom transform behavior.
   */
  protected onTransformElementAspect(sourceElementAspect: ElementAspect, targetElementId: Id64String): ElementAspectProps {
    const targetElementAspectProps: ElementAspectProps = sourceElementAspect.toJSON();
    targetElementAspectProps.id = undefined;
    targetElementAspectProps.element.id = targetElementId;
    sourceElementAspect.forEachProperty((propertyName: string, propertyMetaData: PropertyMetaData) => {
      if ((PrimitiveTypeCode.Long === propertyMetaData.primitiveType) && ("Id" === propertyMetaData.extendedType)) {
        (targetElementAspectProps as any)[propertyName] = this.context.findTargetElementId(sourceElementAspect.asAny[propertyName]);
      }
    }, true);
    return targetElementAspectProps;
  }

  /** Cause all schemas to be exported from the source iModel and imported into the target iModel. */
  public async processSchemas(requestContext: ClientRequestContext | AuthorizedClientRequestContext): Promise<void> {
    requestContext.enter();
    const schemasDir: string = path.join(KnownLocations.tmpdir, Guid.createValue());
    IModelJsFs.mkdirSync(schemasDir);
    try {
      this.sourceDb.nativeDb.exportSchemas(schemasDir);
      const schemaFiles: string[] = IModelJsFs.readdirSync(schemasDir);
      await this.targetDb.importSchemas(requestContext, schemaFiles.map((fileName) => path.join(schemasDir, fileName)));
    } finally {
      requestContext.enter();
      IModelJsFs.removeSync(schemasDir);
    }
  }

  /** Cause all fonts to be exported from the source iModel and imported into the target iModel.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processFonts(): void {
    this.exporter.exportFonts();
  }

  /** Override of [IModelExportHandler.onExportFont]($backend) that imports a font into the target iModel when it is exported from the source iModel. */
  protected onExportFont(font: FontProps, _isUpdate: boolean | undefined): void {
    this.context.importFont(font.id);
  }

  /** Cause all CodeSpecs to be exported from the source iModel and imported into the target iModel.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processCodeSpecs(): void {
    this.exporter.exportCodeSpecs();
  }

  /** Cause a single CodeSpec to be exported from the source iModel and imported into the target iModel.
   * @note This method is called from [[processChanges]] and [[processAll]], so it only needs to be called directly when processing a subset of an iModel.
   */
  public processCodeSpec(codeSpecName: string): void {
    this.exporter.exportCodeSpecByName(codeSpecName);
  }

  /** Override of [IModelExportHandler.shouldExportCodeSpec]($backend) that is called to determine if a CodeSpec should be exported from the source iModel.
   * @note Reaching this point means that the CodeSpec has passed the standard exclusion checks in [IModelExporter]($backend).
   */
  protected shouldExportCodeSpec(_sourceCodeSpec: CodeSpec): boolean { return true; }

  /** Override of [IModelExportHandler.onExportCodeSpec]($backend) that imports a CodeSpec into the target iModel when it is exported from the source iModel. */
  protected onExportCodeSpec(sourceCodeSpec: CodeSpec): void {
    this.context.importCodeSpec(sourceCodeSpec.id);
  }

  /** Recursively import all Elements and sub-Models that descend from the specified Subject */
  public processSubject(sourceSubjectId: Id64String, targetSubjectId: Id64String): void {
    this.sourceDb.elements.getElement<Subject>(sourceSubjectId); // throws if sourceSubjectId is not a Subject
    this.targetDb.elements.getElement<Subject>(targetSubjectId); // throws if targetSubjectId is not a Subject
    this.context.remapElement(sourceSubjectId, targetSubjectId);
    this.processChildElements(sourceSubjectId);
    this.processSubjectSubModels(sourceSubjectId);
    this.processDeferredElements();
  }

  /** Export everything from the source iModel and import the transformed entities into the target iModel. */
  public processAll(): void {
    this.initFromExternalSourceAspects();
    this.exporter.exportCodeSpecs();
    this.exporter.exportFonts();
    // The RepositoryModel and root Subject of the target iModel should not be transformed.
    this.exporter.exportChildElements(IModel.rootSubjectId); // start below the root Subject
    this.exporter.exportSubModels(IModel.repositoryModelId); // start below the RepositoryModel
    this.exporter.exportRelationships(ElementRefersToElements.classFullName);
    this.processDeferredElements();
    this.detectElementDeletes();
    this.detectRelationshipDeletes();
  }

  /** Export changes from the source iModel and import the transformed entities into the target iModel.
   * Inserts, updates, and deletes are determined by inspecting the changeset(s).
   * @param requestContext The request context
   * @param startChangeSetId Include changes from this changeset up through and including the current changeset.
   * If this parameter is not provided, then just the current changeset will be exported.
   */
  public async processChanges(requestContext: AuthorizedClientRequestContext, startChangeSetId?: GuidString): Promise<void> {
    requestContext.enter();
    this.initFromExternalSourceAspects();
    await this.exporter.exportChanges(requestContext, startChangeSetId);
    requestContext.enter();
    this.processDeferredElements();
  }
}
