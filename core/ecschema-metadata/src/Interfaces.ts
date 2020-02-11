/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { DelayedPromise } from "./DelayedPromise";
import { ECClass, StructClass } from "./Metadata/Class";
import { Constant } from "./Metadata/Constant";
import { CustomAttributeClass } from "./Metadata/CustomAttributeClass";
import { EntityClass } from "./Metadata/EntityClass";
import { Enumeration, AnyEnumerator } from "./Metadata/Enumeration";
import { InvertedUnit } from "./Metadata/InvertedUnit";
import { KindOfQuantity } from "./Metadata/KindOfQuantity";
import { Mixin } from "./Metadata/Mixin";
import { Phenomenon } from "./Metadata/Phenomenon";
import { PropertyCategory } from "./Metadata/PropertyCategory";
import { RelationshipClass, RelationshipConstraint } from "./Metadata/RelationshipClass";
import { Schema } from "./Metadata/Schema";
import { SchemaItem } from "./Metadata/SchemaItem";
import { Unit } from "./Metadata/Unit";
import { UnitSystem } from "./Metadata/UnitSystem";
import { Format } from "./Metadata/Format";
import { SchemaKey, SchemaItemKey } from "./SchemaKey";
import { AnyProperty } from "./Metadata/Property";
import { CustomAttributeContainerProps, CustomAttribute } from "./Metadata/CustomAttribute";
import { OverrideFormat } from "./Metadata/OverrideFormat";

/** @beta */
export type LazyLoadedSchema = Readonly<SchemaKey> & DelayedPromise<Schema> & Promise<Schema>;

/** @beta */
export type LazyLoadedSchemaItem<T extends SchemaItem> = Readonly<SchemaItemKey> & DelayedPromise<T> & Promise<T>;
/** @beta */
export type LazyLoadedECClass = LazyLoadedSchemaItem<ECClass>;
/** @beta */
export type LazyLoadedEntityClass = LazyLoadedSchemaItem<EntityClass>;
/** @beta */
export type LazyLoadedMixin = LazyLoadedSchemaItem<Mixin>;
/** @beta */
export type LazyLoadedStructClass = LazyLoadedSchemaItem<StructClass>;
/** @beta */
export type LazyLoadedCustomAttributeClass = LazyLoadedSchemaItem<CustomAttributeClass>;
/** @beta */
export type LazyLoadedRelationshipClass = LazyLoadedSchemaItem<RelationshipClass>;
/** @beta */
export type LazyLoadedEnumeration = LazyLoadedSchemaItem<Enumeration>;
/** @beta */
export type LazyLoadedKindOfQuantity = LazyLoadedSchemaItem<KindOfQuantity>;
/** @beta */
export type LazyLoadedPropertyCategory = LazyLoadedSchemaItem<PropertyCategory>;
/** @beta */
export type LazyLoadedRelationshipConstraintClass = LazyLoadedSchemaItem<EntityClass | Mixin | RelationshipClass>;
/** @beta */
export type LazyLoadedUnit = LazyLoadedSchemaItem<Unit>;
/** @beta */
export type LazyLoadedInvertedUnit = LazyLoadedSchemaItem<InvertedUnit>;
/** @beta */
export type LazyLoadedConstant = LazyLoadedSchemaItem<Constant>;
/** @beta */
export type LazyLoadedPhenomenon = LazyLoadedSchemaItem<Phenomenon>;
/** @beta */
export type LazyLoadedUnitSystem = LazyLoadedSchemaItem<UnitSystem>;
/** @beta */
export type LazyLoadedFormat = LazyLoadedSchemaItem<Format>;

/** @beta */
export type AnyClass = EntityClass | Mixin | StructClass | CustomAttributeClass | RelationshipClass;
/** @beta */
export type AnySchemaItem = AnyClass | Enumeration | KindOfQuantity | PropertyCategory | Unit | InvertedUnit | Constant | Phenomenon | UnitSystem | Format;
/** @beta */
export type AnyECType = Schema | SchemaItem | AnyProperty | RelationshipConstraint | CustomAttributeContainerProps | CustomAttribute | OverrideFormat | AnyEnumerator;
