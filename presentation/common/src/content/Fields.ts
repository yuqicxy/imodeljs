/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Content
 */

import { ClassInfo, ClassInfoJSON, RelatedClassInfo, RelationshipPath, RelationshipPathJSON } from "../EC";
import { CategoryDescription } from "./Category";
import { EditorDescription } from "./Editor";
import { Property, PropertyJSON } from "./Property";
import { TypeDescription } from "./TypeDescription";

/**
 * Data structure for a [[Field]] serialized to JSON.
 * @internal
 */
export interface BaseFieldJSON {
  category: CategoryDescription;
  name: string;
  label: string;
  type: TypeDescription;
  isReadonly: boolean;
  priority: number;
  editor?: EditorDescription;
}

/**
 * Data structure for a [[PropertiesField]] serialized to JSON.
 * @internal
 */
export interface PropertiesFieldJSON extends BaseFieldJSON {
  properties: PropertyJSON[];
}

/**
 * Data structure for a [[NestedContentField]] serialized to JSON.
 * @internal
 */
export interface NestedContentFieldJSON extends BaseFieldJSON {
  contentClassInfo: ClassInfoJSON;
  pathToPrimaryClass: RelationshipPathJSON;
  autoExpand?: boolean;
  nestedFields: FieldJSON[];
}

/** @internal */
export type FieldJSON = BaseFieldJSON | PropertiesFieldJSON | NestedContentFieldJSON;

/**
 * Is supplied field a properties field.
 * @internal
 */
const isPropertiesField = (field: FieldJSON | Field): field is PropertiesFieldJSON | PropertiesField => {
  return (field as any).properties;
};

/**
 * Is supplied field a nested content field.
 * @internal
 */
const isNestedContentField = (field: FieldJSON | Field): field is NestedContentFieldJSON | NestedContentField => {
  return (field as any).nestedFields;
};

/**
 * Describes a single content field. A field is usually represented as a grid column
 * or a property pane row.
 *
 * @public
 */
export class Field {
  /** Category information */
  public category: CategoryDescription;
  /** Unique name */
  public name: string;
  /** Display label */
  public label: string;
  /** Description of this field's values data type */
  public type: TypeDescription;
  /** Are values in this field read-only */
  public isReadonly: boolean;
  /** Priority of the field. Higher priority fields should appear first in the UI */
  public priority: number;
  /** Property editor used to edit values of this field */
  public editor?: EditorDescription;
  /** Parent field */
  private _parent?: NestedContentField;

  /**
   * Creates an instance of Field.
   * @param category Category information
   * @param name Unique name
   * @param label Display label
   * @param type Description of this field's values data type
   * @param isReadonly Are values in this field read-only
   * @param priority Priority of the field
   * @param editor Property editor used to edit values of this field
   */
  public constructor(category: CategoryDescription, name: string, label: string, type: TypeDescription,
    isReadonly: boolean, priority: number, editor?: EditorDescription) {
    this.category = category;
    this.name = name;
    this.label = label;
    this.type = type;
    this.isReadonly = isReadonly;
    this.priority = priority;
    this.editor = editor;
  }

  /**
   * Is this a [[PropertiesField]]
   */
  public isPropertiesField(): this is PropertiesField { return isPropertiesField(this); }

  /**
   * Is this a [[NestedContentField]]
   */
  public isNestedContentField(): this is NestedContentField { return isNestedContentField(this); }

  /**
   * Get parent
   */
  public get parent(): NestedContentField | undefined { return this._parent; }

  /** @internal */
  public toJSON(): FieldJSON {
    return {
      category: this.category,
      name: this.name,
      label: this.label,
      type: this.type,
      isReadonly: this.isReadonly,
      priority: this.priority,
      editor: this.editor,
    };
  }

  /**
   * Deserialize Field from JSON
   * @param json JSON or JSON serialized to string to deserialize from
   * @returns Deserialized field or undefined if deserialization failed
   *
   * @internal
   */
  public static fromJSON(json: FieldJSON | string | undefined): Field | undefined {
    if (!json)
      return undefined;
    if (typeof json === "string")
      return JSON.parse(json, Field.reviver);
    if (isPropertiesField(json))
      return PropertiesField.fromJSON(json);
    if (isNestedContentField(json))
      return NestedContentField.fromJSON(json);
    const field = Object.create(Field.prototype);
    return Object.assign(field, json);
  }

  /**
   * Reviver function that can be used as a second argument for
   * `JSON.parse` method when parsing Field objects.
   *
   * @internal
   */
  public static reviver(key: string, value: any): any {
    return key === "" ? Field.fromJSON(value) : value;
  }

  /** @internal */
  public resetParentship(): void {
    this._parent = undefined;
  }

  /** @internal */
  public rebuildParentship(parentField?: NestedContentField): void {
    this._parent = parentField;
  }
}

/**
 * Describes a content field that's based on one or more similar
 * EC properties.
 *
 * @public
 */
export class PropertiesField extends Field {
  /** A list of properties this field is created from */
  public properties: Property[];

  /**
   * Creates an instance of PropertiesField.
   * @param category Category information
   * @param name Unique name
   * @param label Display label
   * @param type Description of this field's values data type
   * @param isReadonly Are values in this field read-only
   * @param priority Priority of the field
   * @param properties A list of properties this field is created from
   * @param editor Property editor used to edit values of this field
   */
  public constructor(category: CategoryDescription, name: string, label: string, description: TypeDescription,
    isReadonly: boolean, priority: number, properties: Property[], editor?: EditorDescription) {
    super(category, name, label, description, isReadonly, priority, editor);
    this.properties = properties;
  }

  /** @internal */
  public toJSON(): PropertiesFieldJSON {
    return {
      ...super.toJSON(),
      properties: this.properties.map((p) => Property.toJSON(p)),
    };
  }

  /**
   * Deserialize PropertiesField from JSON
   * @param json JSON or JSON serialized to string to deserialize from
   * @returns Deserialized properties field or undefined if deserialization failed
   *
   * @internal
   */
  public static fromJSON(json: PropertiesFieldJSON | string | undefined): PropertiesField | undefined {
    if (!json)
      return undefined;
    if (typeof json === "string")
      return JSON.parse(json, Field.reviver);
    const field = Object.create(PropertiesField.prototype);
    return Object.assign(field, json, {
      properties: json.properties.map((p) => Property.fromJSON(p)),
    } as Partial<PropertiesField>);
  }
}

/**
 * Describes a content field that contains [Nested content]($docs/learning/presentation/Content/Terminology#nested-content).
 *
 * @public
 */
export class NestedContentField extends Field {
  /** Information about an ECClass whose properties are nested inside this field */
  public contentClassInfo: ClassInfo;
  /** Relationship path to [Primary class]($docs/learning/presentation/Content/Terminology#primary-class) */
  public pathToPrimaryClass: RelationshipPath;
  /** Contained nested fields */
  public nestedFields: Field[];
  /** Flag specifying whether field should be expanded */
  public autoExpand?: boolean;

  /**
   * Creates an instance of NestedContentField.
   * @param category Category information
   * @param name Unique name
   * @param label Display label
   * @param type Description of this field's values data type
   * @param isReadonly Are values in this field read-only
   * @param priority Priority of the field
   * @param contentClassInfo Information about an ECClass whose properties are nested inside this field
   * @param pathToPrimaryClass Relationship path to [Primary class]($docs/learning/presentation/Content/Terminology#primary-class)
   * @param nestedFields Contained nested fields
   * @param autoExpand Flag specifying whether field should be expanded
   * @param editor Property editor used to edit values of this field
   */
  public constructor(category: CategoryDescription, name: string, label: string, description: TypeDescription,
    isReadonly: boolean, priority: number, contentClassInfo: ClassInfo, pathToPrimaryClass: RelationshipPath,
    nestedFields: Field[], editor?: EditorDescription, autoExpand?: boolean) {
    super(category, name, label, description, isReadonly, priority, editor);
    this.contentClassInfo = contentClassInfo;
    this.pathToPrimaryClass = pathToPrimaryClass;
    this.nestedFields = nestedFields;
    this.autoExpand = autoExpand;
  }

  /**
   * Get field by its name
   * @param name Name of the field to find
   * @param recurse Recurse into nested fields
   */
  public getFieldByName(name: string, recurse?: boolean): Field | undefined {
    return getFieldByName(this.nestedFields, name, recurse);
  }

  /** @internal */
  public toJSON(): NestedContentFieldJSON {
    return {
      ...super.toJSON(),
      contentClassInfo: this.contentClassInfo,
      pathToPrimaryClass: this.pathToPrimaryClass,
      nestedFields: this.nestedFields.map((field: Field) => field.toJSON()),
      autoExpand: this.autoExpand,
    };
  }

  /**
   * Deserialize NestedContentField from JSON
   * @param json JSON or JSON serialized to string to deserialize from
   * @returns Deserialized nested content field or undefined if deserialization failed
   *
   * @internal
   */
  public static fromJSON(json: NestedContentFieldJSON | string | undefined): NestedContentField | undefined {
    if (!json)
      return undefined;
    if (typeof json === "string")
      return JSON.parse(json, Field.reviver);
    const field = Object.create(NestedContentField.prototype);
    return Object.assign(field, json, {
      nestedFields: json.nestedFields.map((nestedFieldJson: FieldJSON) => Field.fromJSON(nestedFieldJson)).filter((nestedField) => (undefined !== nestedField)),
      contentClassInfo: ClassInfo.fromJSON(json.contentClassInfo),
      pathToPrimaryClass: json.pathToPrimaryClass.map((p) => RelatedClassInfo.fromJSON(p)),
      autoExpand: json.autoExpand,
    } as Partial<NestedContentField>);
  }

  /** @internal */
  public resetParentship(): void {
    super.resetParentship();
    for (const nestedField of this.nestedFields)
      nestedField.resetParentship();
  }

  /** @internal */
  public rebuildParentship(parentField?: NestedContentField): void {
    super.rebuildParentship(parentField);
    for (const nestedField of this.nestedFields)
      nestedField.rebuildParentship(this);
  }
}

/** @internal */
export const getFieldByName = (fields: Field[], name: string, recurse?: boolean): Field | undefined => {
  for (const field of fields) {
    if (field.name === name)
      return field;

    if (recurse && field.isNestedContentField()) {
      const nested = getFieldByName(field.nestedFields, name, recurse);
      if (nested)
        return nested;
    }
  }
  return undefined;
};
