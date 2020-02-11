/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Hierarchies
 */
import { using } from "@bentley/bentleyjs-core";
import { Ruleset, Omit, RegisteredRuleset } from "@bentley/presentation-common";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { Presentation } from "@bentley/presentation-frontend";
import { PresentationTreeDataProvider } from "@bentley/presentation-components";
import { PRESENTATION_TREE_NODE_KEY } from "@bentley/presentation-components/lib/tree/Utils"; // tslint:disable-line: no-direct-imports
import { TreeNodeItem } from "@bentley/ui-components";

/**
 * Structure that describes a Node with any indexed properties
 * except `children`.
 *
 * @public
 */
export interface MappedNode {
  /** Indexer for all properties in this data structure */
  [index: string]: any;
  /** Prohibited property */
  children?: never;
}

/**
 * Node in a hierarchy.
 * @public
 */
export interface HierarchyNode extends Omit<MappedNode, "children"> {
  /** Children of this node */
  children?: HierarchyNode[];
}

/**
 * A function that converts `TreeNodeItem` into a new custom object.
 * @public
 */
export type NodeMappingFunc = (node: TreeNodeItem) => MappedNode;

/**
 * Default [[NodeMappingFunc]] implementation that outputs the whole `TreeNodeItem` object.
 * @public
 */
export const defaultNodeMappingFunc: NodeMappingFunc = (node: TreeNodeItem) => {
  // Skip properties 'id', 'parentId' as they contain  internal stuff
  // that callers are most likely not interested in. Otherwise they can supply
  // a custom `NodeMappingFunc` that does return those properties as well.
  const { id, parentId, ...resultNode } = node;
  return resultNode;
};

/**
 * A class that constructs simple node hierarchy from specified
 * imodel and ruleset.
 *
 * @public
 */
export class HierarchyBuilder {
  private readonly _iModel: IModelConnection;
  private readonly _nodeMappingFunc: NodeMappingFunc;

  /**
   * Constructor
   * @param iModel The iModel to pull data from
   * @param nodeMappingFunc A function that maps node to something that the user of
   * this API is interested in. E.g. custom implementation may skip some unimportant
   * node properties to make resulting object smaller and easier to read.
   */
  constructor(iModel: IModelConnection, nodeMappingFunc: NodeMappingFunc = defaultNodeMappingFunc) {
    this._iModel = iModel;
    this._nodeMappingFunc = nodeMappingFunc;
  }

  private async createSubHierarchy(nodes: TreeNodeItem[], dataProvider: PresentationTreeDataProvider) {
    const hierarchy: HierarchyNode[] = [];
    for (const node of nodes) {
      // istanbul ignore next: for some reason coverage tool thinks the below statement is conditional and one of branches is not covered...
      const { [PRESENTATION_TREE_NODE_KEY]: key, ...nodeNoKey } = (node as TreeNodeItem & { [PRESENTATION_TREE_NODE_KEY]: any });
      const nodeIndex = hierarchy.push(this._nodeMappingFunc(nodeNoKey)) - 1;
      const childNodes = await dataProvider.getNodes(node);
      if (childNodes.length > 0)
        hierarchy[nodeIndex].children = await this.createSubHierarchy(childNodes, dataProvider);
    }
    return hierarchy;
  }

  private async doCreateHierarchy(rulesetId: string): Promise<HierarchyNode[]> {
    const dataProvider = new PresentationTreeDataProvider(this._iModel, rulesetId);
    const rootNodes = await dataProvider.getNodes();
    return this.createSubHierarchy(rootNodes, dataProvider);
  }

  /**
   * Create a hierarchy using the supplied presentation ruleset.
   * @param rulesetOrId Either a [[Ruleset]] object or a ruleset id.
   */
  public async createHierarchy(rulesetOrId: Ruleset | string): Promise<HierarchyNode[]> {
    if (typeof rulesetOrId === "string")
      return this.doCreateHierarchy(rulesetOrId);

    return using(await Presentation.presentation.rulesets().add(rulesetOrId), async (ruleset: RegisteredRuleset) => {
      return this.doCreateHierarchy(ruleset.id);
    });
  }
}
