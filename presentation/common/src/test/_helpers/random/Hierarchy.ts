/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as faker from "faker";
import { ECInstanceNodeKey, ECInstancesNodeKey, StandardNodeTypes, Node, NodePathElement } from "../../../presentation-common";
import {
  ECInstanceNodeKeyJSON, ECInstancesNodeKeyJSON, ECClassGroupingNodeKey, ECPropertyGroupingNodeKey,
  LabelGroupingNodeKey, GroupingNodeKey, BaseNodeKey,
} from "../../../hierarchy/Key";
import { NodeJSON } from "../../../hierarchy/Node";
import { NodePathElementJSON } from "../../../hierarchy/NodePathElement";
import { nullable, createRandomHexColor, createRandomRgbColor } from "./Misc";
import { createRandomECInstanceKey, createRandomECInstanceKeyJSON } from "./EC";
import { createRandomLabelDefinitionJSON, createRandomLabelDefinition } from "./LabelDefinition";

export const createRandomBaseNodeKey = (): BaseNodeKey => {
  return {
    type: faker.random.word(),
    pathFromRoot: [faker.random.uuid(), faker.random.uuid()],
  };
};

/** @deprecated */
export const createRandomECInstanceNodeKey = (): ECInstanceNodeKey => {
  return {
    type: StandardNodeTypes.ECInstanceNode,
    pathFromRoot: [faker.random.uuid(), faker.random.uuid()],
    instanceKey: createRandomECInstanceKey(),
  };
};

/** @deprecated */
export const createRandomECInstanceNodeKeyJSON = (): ECInstanceNodeKeyJSON => {
  return {
    type: StandardNodeTypes.ECInstanceNode,
    pathFromRoot: [faker.random.uuid(), faker.random.uuid()],
    instanceKey: createRandomECInstanceKeyJSON(),
  };
};

export const createRandomECInstancesNodeKey = (): ECInstancesNodeKey => {
  const instanceKeys = [createRandomECInstanceKey(), createRandomECInstanceKey()];
  return {
    type: StandardNodeTypes.ECInstancesNode,
    pathFromRoot: [faker.random.uuid(), faker.random.uuid()],
    instanceKeys,
    instanceKey: instanceKeys[0],
  };
};

export const createRandomECInstancesNodeKeyJSON = (): ECInstancesNodeKeyJSON => {
  return {
    type: StandardNodeTypes.ECInstancesNode,
    pathFromRoot: [faker.random.uuid(), faker.random.uuid()],
    instanceKeys: [createRandomECInstanceKeyJSON(), createRandomECInstanceKeyJSON()],
  };
};

export const createRandomECClassGroupingNodeKey = (groupedInstancesCount?: number): ECClassGroupingNodeKey => ({
  type: StandardNodeTypes.ECClassGroupingNode,
  pathFromRoot: [faker.random.uuid()],
  className: faker.random.word(),
  groupedInstancesCount: groupedInstancesCount || faker.random.number(),
});

export const createRandomECPropertyGroupingNodeKey = (groupedInstancesCount?: number): ECPropertyGroupingNodeKey => ({
  type: StandardNodeTypes.ECPropertyGroupingNode,
  pathFromRoot: [faker.random.uuid()],
  className: faker.random.word(),
  propertyName: faker.random.word(),
  groupingValue: faker.random.number(),
  groupedInstancesCount: groupedInstancesCount || faker.random.number(),
});

export const createRandomLabelGroupingNodeKey = (groupedInstancesCount?: number): LabelGroupingNodeKey => ({
  type: StandardNodeTypes.DisplayLabelGroupingNode,
  pathFromRoot: [faker.random.uuid()],
  label: faker.random.words(),
  groupedInstancesCount: groupedInstancesCount || faker.random.number(),
});

export const createRandomGroupingNodeKey = (groupedInstancesCount?: number): GroupingNodeKey => {
  const type = faker.random.arrayElement([
    StandardNodeTypes.DisplayLabelGroupingNode,
    StandardNodeTypes.ECClassGroupingNode,
    StandardNodeTypes.ECPropertyGroupingNode,
  ]);
  switch (type) {
    case StandardNodeTypes.DisplayLabelGroupingNode: return createRandomLabelGroupingNodeKey(groupedInstancesCount);
    case StandardNodeTypes.ECClassGroupingNode: return createRandomECClassGroupingNodeKey(groupedInstancesCount);
    case StandardNodeTypes.ECPropertyGroupingNode: return createRandomECPropertyGroupingNodeKey(groupedInstancesCount);
  }
  throw Error();
};

export const createRandomECInstanceNode = (): Node => {
  const labelDefinition = createRandomLabelDefinition();
  return {
    key: createRandomECInstanceNodeKey(),
    label: labelDefinition.displayValue,
    labelDefinition,
    description: nullable<string>(faker.lorem.sentence),
    imageId: nullable<string>(faker.random.word),
    foreColor: nullable<string>(createRandomHexColor),
    backColor: nullable<string>(createRandomRgbColor),
    hasChildren: faker.random.boolean(),
    isSelectionDisabled: faker.random.boolean(),
    isEditable: faker.random.boolean(),
    isChecked: faker.random.boolean(),
    isExpanded: faker.random.boolean(),
    isCheckboxVisible: faker.random.boolean(),
    isCheckboxEnabled: faker.random.boolean(),
  };
};

export const createRandomECInstanceNodeJSON = (): NodeJSON => {
  return {
    key: createRandomECInstanceNodeKeyJSON(),
    label: faker.random.words(),
    labelDefinition: createRandomLabelDefinitionJSON(),
    description: nullable<string>(faker.lorem.sentence),
    foreColor: nullable<string>(createRandomHexColor),
    backColor: nullable<string>(createRandomRgbColor),
    hasChildren: faker.random.boolean(),
    isSelectionDisabled: faker.random.boolean(),
    isEditable: faker.random.boolean(),
    isChecked: faker.random.boolean(),
    isExpanded: faker.random.boolean(),
    isCheckboxVisible: faker.random.boolean(),
    isCheckboxEnabled: faker.random.boolean(),
  };
};

export const createRandomNodePathElement = (depth: number = 1): NodePathElement => {
  const el: NodePathElement = {
    node: createRandomECInstanceNode(),
    index: faker.random.number(999),
    children: [],
  };
  if (faker.random.boolean()) {
    el.isMarked = faker.random.boolean();
  }
  if (faker.random.boolean()) {
    el.filteringData = {
      matchesCount: faker.random.number(),
      childMatchesCount: faker.random.number(),
    }
  }
  if (depth > 1) {
    let childrenCount = faker.random.number({ min: 1, max: 5 });
    while (childrenCount--)
      el.children.push(createRandomNodePathElement(depth - 1));
  }
  return el;
};

export const createRandomNodePathElementJSON = (depth: number = 1): NodePathElementJSON => {
  const el: NodePathElementJSON = {
    node: createRandomECInstanceNodeJSON(),
    index: faker.random.number(999),
    children: [],
  };
  if (faker.random.boolean()) {
    el.isMarked = faker.random.boolean();
  }
  if (faker.random.boolean()) {
    el.filteringData = {
      occurances: faker.random.number(),
      childrenOccurances: faker.random.number(),
    }
  }
  if (depth > 1) {
    let childrenCount = faker.random.number({ min: 1, max: 5 });
    while (childrenCount--)
      el.children.push(createRandomNodePathElementJSON(depth - 1));
  }
  return el;
};
