/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Core
 */

import { IDisposable } from "@bentley/bentleyjs-core";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import {
  RpcRequestsHandler, RequestPriority, DescriptorOverrides,
  HierarchyRequestOptions, Node, NodeKey, NodePathElement,
  ContentRequestOptions, Content, Descriptor, SelectionInfo,
  Paged, KeySet, InstanceKey, LabelRequestOptions, Ruleset, RulesetVariable, LabelDefinition,
} from "@bentley/presentation-common";
import { RulesetVariablesManager, RulesetVariablesManagerImpl } from "./RulesetVariablesManager";
import { RulesetManager, RulesetManagerImpl } from "./RulesetManager";
import { LocalizationHelper } from "./LocalizationHelper";

/**
 * Properties used to configure [[PresentationManager]]
 * @public
 */
export interface PresentationManagerProps {
  /**
   * Sets the active locale to use when localizing presentation-related
   * strings. It can later be changed through [[PresentationManager]].
   */
  activeLocale?: string;

  /**
   * ID used to identify client that requests data. Generally, clients should
   * store this ID in their local storage so the ID can be reused across
   * sessions - this allows reusing some caches.
   *
   * Defaults to a unique GUID as a client id.
   */
  clientId?: string;

  /** @internal */
  rpcRequestsHandler?: RpcRequestsHandler;
}

/**
 * Frontend Presentation manager which basically just forwards all calls to
 * the backend implementation.
 *
 * @public
 */
export class PresentationManager implements IDisposable {

  private _requestsHandler: RpcRequestsHandler;
  private _rulesets: RulesetManager;
  private _localizationHelper: LocalizationHelper;
  private _rulesetVars: Map<string, RulesetVariablesManager>;
  private _connections: Map<IModelConnection, Promise<void>>;

  /**
   * Get / set active locale used for localizing presentation data
   */
  public activeLocale: string | undefined;

  private constructor(props?: PresentationManagerProps) {
    if (props)
      this.activeLocale = props.activeLocale;

    this._requestsHandler = (props && props.rpcRequestsHandler)
      ? props.rpcRequestsHandler
      : new RpcRequestsHandler(props ? { clientId: props.clientId } : undefined);

    this._rulesetVars = new Map<string, RulesetVariablesManager>();

    this._rulesets = new RulesetManagerImpl();
    this._localizationHelper = new LocalizationHelper();
    this._connections = new Map<IModelConnection, Promise<void>>();
  }

  public dispose() {
    this._requestsHandler.dispose();
  }

  private async onConnection(imodelConnection: IModelConnection) {
    if (!this._connections.has(imodelConnection))
      this._connections.set(imodelConnection, this.onNewiModelConnection(imodelConnection));
    await this._connections.get(imodelConnection);
  }

  /** Function that is called when a new IModelConnection is used to retrieve data.
   *  @internal
   */
  public async onNewiModelConnection(_: IModelConnection) { }

  /**
   * Create a new PresentationManager instance
   * @param props Optional properties used to configure the manager
   */
  public static create(props?: PresentationManagerProps) {
    return new PresentationManager(props);
  }

  /** @internal */
  public get rpcRequestsHandler() { return this._requestsHandler; }

  /**
   * Get rulesets manager
   */
  public rulesets() { return this._rulesets; }

  /**
   * Get ruleset variables manager for specific ruleset
   * @param rulesetId Id of the ruleset to get the vars manager for
   */
  public vars(rulesetId: string) {
    if (!this._rulesetVars.has(rulesetId)) {
      const varsManager = new RulesetVariablesManagerImpl();
      this._rulesetVars.set(rulesetId, varsManager);
    }
    return this._rulesetVars.get(rulesetId)!;
  }

  private toIModelTokenOptions<TOptions extends { imodel: IModelConnection, locale?: string }>(options: TOptions) {
    // 1. put default `locale`
    // 2. put all `options` members (if `locale` is set, it'll override the default put at #1)
    // 3. put `imodel` of type `IModelToken` which overwrites the `imodel` from `options` put at #2
    return Object.assign({}, { locale: this.activeLocale }, options, {
      imodel: options.imodel.iModelToken,
    });
  }

  private async addRulesetAndVariablesToOptions<TOptions extends { rulesetId?: string, rulesetOrId?: Ruleset | string, rulesetVariables?: RulesetVariable[] }>(options: TOptions) {
    const { rulesetId, rulesetOrId, rulesetVariables } = options;

    let foundRulesetOrId: Ruleset | string;
    if (typeof rulesetOrId === "object") {
      foundRulesetOrId = rulesetOrId;
    } else {
      const lookupId = rulesetOrId || rulesetId || "";
      const foundRuleset = await this._rulesets.get(lookupId);
      foundRulesetOrId = foundRuleset ? foundRuleset.toJSON() : lookupId;
    }

    const foundRulesetId = typeof foundRulesetOrId === "object" ? foundRulesetOrId.id : foundRulesetOrId;
    const variablesManager = this.vars(foundRulesetId);
    const variables = [...(rulesetVariables || []), ...await variablesManager.getAllVariables()];

    return { ...options, rulesetOrId: foundRulesetOrId, rulesetVariables: variables };
  }

  /**
   * Retrieves nodes.
   * @param requestOptions options for the request
   * @param parentKey    Key of the parent node.
   * @return A promise object that returns either a nodes response object with nodes and nodes count on success or an error string on error.
   */
  public async getNodesAndCount(requestOptions: Paged<HierarchyRequestOptions<IModelConnection>>, parentKey?: NodeKey) {
    await this.onConnection(requestOptions.imodel);

    const parentKeyJson = parentKey ? NodeKey.toJSON(parentKey) : undefined;
    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getNodesAndCount(this.toIModelTokenOptions(options), parentKeyJson);
    return { ...result, nodes: await this._localizationHelper.getLocalizedNodes(result.nodes.map(Node.fromJSON)) };
  }

  /**
   * Retrieves nodes
   * @param requestOptions options for the request
   * @param parentKey    Key of the parent node if requesting for child nodes
   * @return A promise object that returns either an array of nodes on success or an error string on error.
   */
  public async getNodes(requestOptions: Paged<HierarchyRequestOptions<IModelConnection>>, parentKey?: NodeKey): Promise<Node[]> {
    await this.onConnection(requestOptions.imodel);

    const parentKeyJson = parentKey ? NodeKey.toJSON(parentKey) : undefined;
    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getNodes(this.toIModelTokenOptions(options), parentKeyJson);
    return this._localizationHelper.getLocalizedNodes(result.map(Node.fromJSON));
  }

  /**
   * Retrieves nodes count.
   * @param requestOptions options for the request
   * @param parentKey Key of the parent node if requesting for child nodes count.
   * @return A promise object that returns the number of nodes.
   */
  public async getNodesCount(requestOptions: HierarchyRequestOptions<IModelConnection>, parentKey?: NodeKey): Promise<number> {
    await this.onConnection(requestOptions.imodel);

    const parentKeyJson = parentKey ? NodeKey.toJSON(parentKey) : undefined;
    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    return this._requestsHandler.getNodesCount(this.toIModelTokenOptions(options), parentKeyJson);
  }

  /**
   * Retrieves paths from root nodes to children nodes according to specified keys. Intersecting paths will be merged.
   * @param requestOptions options for the request
   * @param paths Paths from root node to some child node.
   * @param markedIndex Index of the path in `paths` that will be marked.
   * @return A promise object that returns either an array of paths on success or an error string on error.
   */
  public async getNodePaths(requestOptions: HierarchyRequestOptions<IModelConnection>, paths: InstanceKey[][], markedIndex: number): Promise<NodePathElement[]> {
    await this.onConnection(requestOptions.imodel);

    const pathsJson = paths.map((p) => p.map(InstanceKey.toJSON));
    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getNodePaths(this.toIModelTokenOptions(options), pathsJson, markedIndex);
    return result.map(NodePathElement.fromJSON);
  }

  /**
   * Retrieves paths from root nodes to nodes containing filter text in their label.
   * @param requestOptions options for the request
   * @param filterText Text to filter nodes against.
   * @return A promise object that returns either an array of paths on success or an error string on error.
   */
  public async getFilteredNodePaths(requestOptions: HierarchyRequestOptions<IModelConnection>, filterText: string): Promise<NodePathElement[]> {
    await this.onConnection(requestOptions.imodel);

    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getFilteredNodePaths(this.toIModelTokenOptions(options), filterText);
    return result.map(NodePathElement.fromJSON);
  }

  /**
   * Loads the whole hierarchy.
   * @param requestOptions options for the request. If `requestOptions.priority` is not set, it defaults to `RequestPriority.Preload`.
   * @return A promise object that resolves as soon as the load request is queued (not when loading finishes)
   * @beta
   */
  public async loadHierarchy(requestOptions: HierarchyRequestOptions<IModelConnection>): Promise<void> {
    await this.onConnection(requestOptions.imodel);

    if (!requestOptions.priority)
      requestOptions.priority = RequestPriority.Preload;
    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    return this._requestsHandler.loadHierarchy(this.toIModelTokenOptions(options));
  }

  /**
   * Retrieves the content descriptor which can be used to get content.
   * @param requestOptions options for the request
   * @param displayType  The preferred display type of the return content.
   * @param keys         Keys of ECInstances to get the content for.
   * @param selection    Optional selection info in case the content is being requested due to selection change.
   * @return A promise object that returns either a descriptor on success or an error string on error.
   */
  public async getContentDescriptor(requestOptions: ContentRequestOptions<IModelConnection>, displayType: string, keys: KeySet, selection: SelectionInfo | undefined): Promise<Descriptor | undefined> {
    await this.onConnection(requestOptions.imodel);

    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getContentDescriptor(this.toIModelTokenOptions(options), displayType, keys.toJSON(), selection);
    return Descriptor.fromJSON(result);
  }

  /**
   * Retrieves the content set size based on the supplied content descriptor override.
   * @param requestOptions          options for the request
   * @param descriptorOrOverrides   Content descriptor or its overrides specifying how the content should be customized
   * @param keys                    Keys of ECInstances to get the content for.
   * @return A promise object that returns either a number on success or an error string on error.
   * Even if concrete implementation returns content in pages, this function returns the total
   * number of records in the content set.
   */
  public async getContentSetSize(requestOptions: ContentRequestOptions<IModelConnection>, descriptorOrOverrides: Descriptor | DescriptorOverrides, keys: KeySet): Promise<number> {
    await this.onConnection(requestOptions.imodel);

    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    return this._requestsHandler.getContentSetSize(this.toIModelTokenOptions(options), this.createDescriptorParam(descriptorOrOverrides), keys.toJSON());
  }

  /**
   * Retrieves the content based on the supplied content descriptor override.
   * @param requestOptions          options for the request
   * @param descriptorOrOverrides   Content descriptor or its overrides specifying how the content should be customized
   * @param keys                    Keys of ECInstances to get the content for.
   * @return A promise object that returns either content on success or an error string on error.
   */
  public async getContent(requestOptions: Paged<ContentRequestOptions<IModelConnection>>, descriptorOrOverrides: Descriptor | DescriptorOverrides, keys: KeySet): Promise<Content | undefined> {
    await this.onConnection(requestOptions.imodel);

    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getContent(this.toIModelTokenOptions(options), this.createDescriptorParam(descriptorOrOverrides), keys.toJSON());
    return this._localizationHelper.getLocalizedContent(Content.fromJSON(result));
  }

  /**
   * Retrieves the content and content set size based on the supplied content descriptor override.
   * @param requestOptions          Options for the request.
   * @param descriptorOrOverrides   Content descriptor or its overrides specifying how the content should be customized
   * @param keys                    Keys of ECInstances to get the content for.
   * @returns A promise object that returns either content and content set size on success or an error string on error.
   */
  public async getContentAndSize(requestOptions: Paged<ContentRequestOptions<IModelConnection>>, descriptorOrOverrides: Descriptor | DescriptorOverrides, keys: KeySet) {
    await this.onConnection(requestOptions.imodel);

    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    const result = await this._requestsHandler.getContentAndSize(this.toIModelTokenOptions(options), this.createDescriptorParam(descriptorOrOverrides), keys.toJSON());
    return { ...result, content: await this._localizationHelper.getLocalizedContent(Content.fromJSON(result.content)) };
  }

  private createDescriptorParam(descriptorOrOverrides: Descriptor | DescriptorOverrides) {
    if (descriptorOrOverrides instanceof Descriptor)
      return descriptorOrOverrides.createStrippedDescriptor().toJSON();
    return descriptorOrOverrides;
  }

  /**
   * Retrieves distinct values of specific field from the content based on the supplied content descriptor override.
   * @param requestOptions options for the request
   * @param descriptor           Content descriptor which specifies how the content should be returned.
   * @param keys                 Keys of ECInstances to get the content for.
   * @param fieldName            Name of the field from which to take values.
   * @param maximumValueCount    Maximum numbers of values that can be returned. Unlimited if 0.
   * @return A promise object that returns either distinct values on success or an error string on error.
   */
  public async getDistinctValues(requestOptions: ContentRequestOptions<IModelConnection>, descriptor: Descriptor, keys: KeySet, fieldName: string, maximumValueCount: number = 0): Promise<string[]> {
    await this.onConnection(requestOptions.imodel);
    const options = await this.addRulesetAndVariablesToOptions(requestOptions);
    return this._requestsHandler.getDistinctValues(this.toIModelTokenOptions(options),
      descriptor.createStrippedDescriptor().toJSON(), keys.toJSON(), fieldName, maximumValueCount);
  }

  /**
   * Retrieves display label of specific item
   * @param requestOptions options for the request
   * @param key Key of instance to get label for
   * @deprecated use 'getDisplayLabelDefinition' instead
   */
  public async getDisplayLabel(requestOptions: LabelRequestOptions<IModelConnection>, key: InstanceKey): Promise<string> {
    await this.onConnection(requestOptions.imodel);
    return this._requestsHandler.getDisplayLabel(this.toIModelTokenOptions(requestOptions), InstanceKey.toJSON(key));
  }
  /**
   * Retrieves display label of specific items
   * @param requestOptions options for the request
   * @param keys Keys of instances to get labels for
   * @deprecated use 'getDisplayLabelsDefinitions' instead
   */
  public async getDisplayLabels(requestOptions: LabelRequestOptions<IModelConnection>, keys: InstanceKey[]): Promise<string[]> {
    await this.onConnection(requestOptions.imodel);
    return this._requestsHandler.getDisplayLabels(this.toIModelTokenOptions(requestOptions), keys.map(InstanceKey.toJSON));
  }

  /**
   * Retrieves display label definition of specific item
   * @param requestOptions options for the request
   * @param key Key of instance to get label for
   */
  public async getDisplayLabelDefinition(requestOptions: LabelRequestOptions<IModelConnection>, key: InstanceKey): Promise<LabelDefinition> {
    await this.onConnection(requestOptions.imodel);
    const result = await this._requestsHandler.getDisplayLabelDefinition(this.toIModelTokenOptions(requestOptions), InstanceKey.toJSON(key));
    return this._localizationHelper.getLocalizedLabelDefinition(LabelDefinition.fromJSON(result));
  }
  /**
   * Retrieves display label definition of specific items
   * @param requestOptions options for the request
   * @param keys Keys of instances to get labels for
   */
  public async getDisplayLabelsDefinitions(requestOptions: LabelRequestOptions<IModelConnection>, keys: InstanceKey[]): Promise<LabelDefinition[]> {
    await this.onConnection(requestOptions.imodel);
    const result = await this._requestsHandler.getDisplayLabelsDefinitions(this.toIModelTokenOptions(requestOptions), keys.map(InstanceKey.toJSON));
    return this._localizationHelper.getLocalizedLabelDefinitions(result.map(LabelDefinition.fromJSON));
  }

}
