/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { Schema } from "./Schema";
import { SchemaItem } from "./SchemaItem";
import { Unit } from "./Unit";
import { UnitSystem } from "./UnitSystem";
import { DelayedPromiseWithProps } from "./../DelayedPromise";
import { SchemaItemType } from "./../ECObjects";
import { InvertedUnitProps } from "./../Deserialization/JsonProps";
import { ECObjectsError, ECObjectsStatus } from "./../Exception";
import { LazyLoadedUnit, LazyLoadedUnitSystem } from "./../Interfaces";
import { SchemaItemKey } from "./../SchemaKey";
import { XmlSerializationUtils } from "../Deserialization/XmlSerializationUtils";

/**
 * An InvertedUnit is a specific type of Unit that describes the inverse of a single Unit whose dimensional derivation is unit-less.
 * @beta
 */
export class InvertedUnit extends SchemaItem {
  public readonly schemaItemType!: SchemaItemType.InvertedUnit; // tslint:disable-line
  protected _invertsUnit?: LazyLoadedUnit; // required
  protected _unitSystem?: LazyLoadedUnitSystem; // required

  constructor(schema: Schema, name: string) {
    super(schema, name);
    this.schemaItemType = SchemaItemType.InvertedUnit;
  }

  get invertsUnit(): LazyLoadedUnit | undefined { return this._invertsUnit; }
  get unitSystem(): LazyLoadedUnitSystem | undefined { return this._unitSystem; }

  public toJson(standalone: boolean, includeSchemaVersion: boolean) {
    const schemaJson = super.toJson(standalone, includeSchemaVersion);
    schemaJson.invertsUnit = this.invertsUnit!.name;
    schemaJson.unitSystem = this.unitSystem!.name;
    return schemaJson;
  }

  /** @internal */
  public async toXml(schemaXml: Document): Promise<Element> {
    const itemElement = await super.toXml(schemaXml);

    const unitSystem = await this.unitSystem;
    if (undefined !== unitSystem) {
      const unitSystemName = XmlSerializationUtils.createXmlTypedName(this.schema, unitSystem.schema, unitSystem.name);
      itemElement.setAttribute("unitSystem", unitSystemName);
    }

    const invertsUnit = await this.invertsUnit;
    if (undefined !== invertsUnit) {
      const invertsUnitName = XmlSerializationUtils.createXmlTypedName(this.schema, invertsUnit.schema, invertsUnit.name);
      itemElement.setAttribute("invertsUnit", invertsUnitName);
    }

    return itemElement;
  }

  public deserializeSync(invertedUnitProps: InvertedUnitProps) {
    super.deserializeSync(invertedUnitProps);
    const unitSchemaItemKey = this.schema.getSchemaItemKey(invertedUnitProps.invertsUnit);
    this._invertsUnit = new DelayedPromiseWithProps<SchemaItemKey, Unit>(unitSchemaItemKey,
      async () => {
        const invertsUnit = await this.schema.lookupItem<Unit>(unitSchemaItemKey);
        if (undefined === invertsUnit)
          throw new ECObjectsError(ECObjectsStatus.InvalidECJson, `Unable to locate the invertsUnit ${invertedUnitProps.invertsUnit}.`);
        return invertsUnit;
      });

    const unitSystemSchemaItemKey = this.schema.getSchemaItemKey(invertedUnitProps.unitSystem);
    if (!unitSystemSchemaItemKey)
      throw new ECObjectsError(ECObjectsStatus.InvalidECJson, `Unable to locate the unitSystem ${invertedUnitProps.unitSystem}.`);
    this._unitSystem = new DelayedPromiseWithProps<SchemaItemKey, UnitSystem>(unitSystemSchemaItemKey,
      async () => {
        const unitSystem = await this.schema.lookupItem<UnitSystem>(unitSystemSchemaItemKey);
        if (undefined === unitSystem)
          throw new ECObjectsError(ECObjectsStatus.InvalidECJson, `Unable to locate the unitSystem ${invertedUnitProps.unitSystem}.`);
        return unitSystem;
      });
  }

  public async deserialize(invertedUnitProps: InvertedUnitProps) {
    this.deserializeSync(invertedUnitProps);
  }
}
