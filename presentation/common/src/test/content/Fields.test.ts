/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import * as faker from "faker";
import {
  createRandomECClassInfo, createRandomECClassInfoJSON,
  createRandomRelationshipPath, createRandomRelationshipPathJSON,
  createRandomCategory, createRandomPrimitiveTypeDescription,
  createRandomPrimitiveField, createRandomPrimitiveFieldJSON, createRandomNestedFieldJSON, createRandomNestedContentField,
} from "../_helpers/random";
import { PropertiesFieldJSON } from "../../content/Fields";
import { Field, PropertiesField, NestedContentField, PropertyValueFormat, StructTypeDescription, Property } from "../../presentation-common";

const generateTestData = () => {
  const testData: any = {};
  testData.baseFieldJSON = createRandomPrimitiveFieldJSON();
  testData.propertiesFieldJSON = {
    ...testData.baseFieldJSON,
    properties: [{
      property: {
        classInfo: createRandomECClassInfoJSON(),
        name: faker.random.word(),
        type: faker.database.type(),
      },
      relatedClassPath: createRandomRelationshipPathJSON(1),
    }],
  } as PropertiesFieldJSON;
  testData.nestedContentFieldJSON = createRandomNestedFieldJSON();
  return testData;
};

describe("Field", () => {

  describe("fromJSON", () => {

    let testData!: any;
    beforeEach(() => {
      testData = generateTestData();
    });

    it("creates valid Field from valid JSON", () => {
      const item = Field.fromJSON(testData.baseFieldJSON);
      expect(item).to.matchSnapshot();
    });

    it("creates valid PropertiesField from valid JSON", () => {
      const item = Field.fromJSON(testData.propertiesFieldJSON);
      expect(item).to.matchSnapshot();
    });

    it("creates valid NestedContentField from valid JSON", () => {
      const item = Field.fromJSON(testData.nestedContentFieldJSON);
      expect(item).to.matchSnapshot();
    });

    it("creates valid Field from valid serialized JSON", () => {
      const item = Field.fromJSON(JSON.stringify(testData.baseFieldJSON));
      expect(item).to.matchSnapshot();
    });

    it("returns undefined for undefined JSON", () => {
      const item = Field.fromJSON(undefined);
      expect(item).to.be.undefined;
    });

  });

  describe("isPropertiesField", () => {

    it("returns false for non-properties field", () => {
      const field = createRandomPrimitiveField();
      expect(!field.isPropertiesField());
    });

    it("returns true for properties field", () => {
      const property: Property = {
        property: {
          classInfo: createRandomECClassInfo(),
          name: faker.random.word(),
          type: faker.database.type(),
        },
        relatedClassPath: [],
      };
      const field = new PropertiesField(createRandomCategory(), faker.random.word(), faker.random.words(),
        createRandomPrimitiveTypeDescription(), faker.random.boolean(), faker.random.number(), [property]);
      expect(field.isPropertiesField());
    });

  });

  describe("isNestedContentField", () => {

    it("returns false for non-nested content field", () => {
      const field = createRandomPrimitiveField();
      expect(!field.isNestedContentField());
    });

    it("returns true for nested content field", () => {
      const field = new NestedContentField(createRandomCategory(), faker.random.word(), faker.random.words(),
        createRandomPrimitiveTypeDescription(), faker.random.boolean(), faker.random.number(), createRandomECClassInfo(),
        [], [], undefined, faker.random.boolean());
      expect(field.isNestedContentField());
    });

  });

});

describe("PropertiesField", () => {

  describe("fromJSON", () => {

    let testData!: any;
    beforeEach(() => {
      testData = generateTestData();
    });

    it("creates valid PropertiesField from valid JSON", () => {
      const item = PropertiesField.fromJSON(testData.propertiesFieldJSON);
      expect(item).to.matchSnapshot();
    });

    it("creates valid PropertiesField from valid serialized JSON", () => {
      const item = PropertiesField.fromJSON(JSON.stringify(testData.propertiesFieldJSON));
      expect(item).to.matchSnapshot();
    });

    it("returns undefined for undefined JSON", () => {
      const item = PropertiesField.fromJSON(undefined);
      expect(item).to.be.undefined;
    });

  });

});

describe("NestedContentField", () => {

  describe("getFieldByName", () => {

    it("returns undefined when there are no nested fields", () => {
      const field = createRandomNestedContentField([]);
      expect(field.getFieldByName("test")).to.be.undefined;
    });

    it("returns undefined when field is not found", () => {
      const field = createRandomNestedContentField();
      const name = field.nestedFields[0].name + "_does_not_exist";
      expect(field.getFieldByName(name, true)).to.be.undefined;
    });

    it("returns a field", () => {
      const field = createRandomNestedContentField();
      const nestedField = field.nestedFields[0];
      expect(field.getFieldByName(nestedField.name)).to.eq(nestedField);
    });

  });

  describe("fromJSON", () => {

    let testData!: any;
    beforeEach(() => {
      testData = generateTestData();
    });

    it("creates valid NestedContentField from valid JSON", () => {
      const item = NestedContentField.fromJSON(testData.nestedContentFieldJSON);
      expect(item).to.matchSnapshot();
    });

    it("creates valid NestedContentField from valid serialized JSON", () => {
      const item = NestedContentField.fromJSON(JSON.stringify(testData.nestedContentFieldJSON));
      expect(item).to.matchSnapshot();
    });

    it("creates valid NestedContentField from valid serialized JSON", () => {
      testData.nestedContentFieldJSON.nestedFields = [createRandomPrimitiveFieldJSON(), undefined as any];
      const field = NestedContentField.fromJSON(testData.nestedContentFieldJSON);
      expect(field!.nestedFields.length).to.eq(1);
    });

    it("returns undefined for undefined JSON", () => {
      const item = NestedContentField.fromJSON(undefined);
      expect(item).to.be.undefined;
    });

  });

  describe("rebuildParentship / resetParentship", () => {

    it("creates and resets parentship of self and nested fields", () => {
      const descr: StructTypeDescription = {
        valueFormat: PropertyValueFormat.Struct,
        typeName: faker.random.word(),
        members: [{
          type: createRandomPrimitiveTypeDescription(),
          label: faker.random.words(),
          name: faker.random.word(),
        }],
      };
      const field1 = createRandomPrimitiveField();
      const field2 = new NestedContentField(createRandomCategory(), faker.random.word(),
        faker.random.words(), descr, faker.random.boolean(), faker.random.number(),
        createRandomECClassInfo(), createRandomRelationshipPath(), [field1], undefined, faker.random.boolean());
      const field3 = new NestedContentField(createRandomCategory(), faker.random.word(),
        faker.random.words(), descr, faker.random.boolean(), faker.random.number(),
        createRandomECClassInfo(), createRandomRelationshipPath(), [field2], undefined, faker.random.boolean());

      field2.rebuildParentship(field3);
      expect(field3.parent).to.be.undefined;
      expect(field2.parent).to.eq(field3);
      expect(field1.parent).to.eq(field2);

      field3.resetParentship();
      expect(field3.parent).to.be.undefined;
      expect(field2.parent).to.be.undefined;
      expect(field1.parent).to.be.undefined;
    });

  });

});
