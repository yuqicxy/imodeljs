/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import * as faker from "faker";
import { createRandomECClassInfoJSON, createRandomECInstanceKeyJSON, createRandomLabelDefinitionJSON, createRandomLabelDefinition } from "../_helpers/random";
import { Item, ItemJSON } from "../../content/Item";
import { NestedContentValueJSON } from "../../content/Value";

describe("Item", () => {

  describe("constructor", () => {

    it("creates valid item with label", () => {
      const item = new Item([], faker.random.word(), faker.random.uuid(),
        undefined, { key: faker.random.word() }, { key: faker.random.word() }, []);
      expect(item).to.matchSnapshot();
    });

    it("creates valid item with label definition", () => {
      const item = new Item([], createRandomLabelDefinition(), faker.random.uuid(),
        undefined, { key: faker.random.word() }, { key: faker.random.word() }, []);
      expect(item).to.matchSnapshot();
    });

  });

  describe("fromJSON", () => {

    let testItemJSON!: ItemJSON;
    beforeEach(() => {
      testItemJSON = {
        primaryKeys: [],
        labelDefinition: createRandomLabelDefinitionJSON(),
        imageId: faker.random.uuid(),
        classInfo: createRandomECClassInfoJSON(),
        values: {
          key1: faker.random.number(),
          key2: faker.random.words(),
        },
        displayValues: {
          key1: faker.random.words(),
          key2: faker.random.words(),
        },
        mergedFieldNames: ["key1"],
      };
    });

    it("creates valid Item from valid JSON", () => {
      const item = Item.fromJSON(testItemJSON);
      expect(item).to.matchSnapshot();
    });

    it("creates valid Item from valid serialized JSON", () => {
      const item = Item.fromJSON(JSON.stringify(testItemJSON));
      expect(item).to.matchSnapshot();
    });

    it("creates valid Item from valid JSON without classInfo", () => {
      const item = Item.fromJSON({ ...testItemJSON, classInfo: undefined });
      expect(item).to.matchSnapshot();
    });

    it("creates valid Item with null values", () => {
      const item = Item.fromJSON({
        ...testItemJSON,
        values: { key1: null },
        displayValues: { key1: null },
      });
      expect(item).to.matchSnapshot();
    });

    it("creates valid Item with nested content values", () => {
      const nestedContentValueJSON: NestedContentValueJSON = {
        primaryKeys: [createRandomECInstanceKeyJSON()],
        values: { nested: null },
        displayValues: { nested: "" },
        mergedFieldNames: [faker.random.word()],
      };
      const item = Item.fromJSON({
        ...testItemJSON,
        displayValues: { key1: null },
        values: {
          key1: [nestedContentValueJSON],
        },
      });
      expect(item).to.matchSnapshot();
    });

    it("returns undefined for undefined JSON", () => {
      const item = Item.fromJSON(undefined);
      expect(item).to.be.undefined;
    });

  });

  describe("isFieldMerged", () => {

    it("returns false for unmerged field", () => {
      const item = new Item([], faker.random.word(), faker.random.uuid(),
        undefined, { key: faker.random.word() }, { key: faker.random.word() }, []);
      expect(item.isFieldMerged("key")).to.be.false;
    });

    it("returns true for merged field", () => {
      const item = new Item([], faker.random.word(), faker.random.uuid(),
        undefined, { key: faker.random.word() }, { key: faker.random.word() }, ["key"]);
      expect(item.isFieldMerged("key")).to.be.true;
    });

  });

});
