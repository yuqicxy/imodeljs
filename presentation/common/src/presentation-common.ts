/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/**
 * @module Core
 *
 * @docs-group-description Core
 * Common types used all across Presentation packages.
 */
export {
  ClassId, InstanceId, InstanceKey,
  ClassInfo, EnumerationChoice, EnumerationInfo, KindOfQuantityInfo,
  PropertyInfo, RelatedClassInfo, RelationshipPath,
} from "./EC";
export { PresentationError, PresentationStatus } from "./Error";
export { KeySet, Keys, Key, DEFAULT_KEYS_BATCH_SIZE } from "./KeySet";
export { PersistentKeysContainer } from "./PersistentKeysContainer";
export { RulesetVariablesState, RulesetVariable, VariableValueTypes, VariableValue } from "./RulesetVariables";
export { RegisteredRuleset, RulesetManagerState } from "./RegisteredRuleset";
export { RulesetsFactory } from "./RulesetsFactory";
export { LoggingNamespaces } from "./Logging";
export {
  Omit, Subtract, ValuesDictionary,
  getInstancesCount, LOCALES_DIRECTORY,
} from "./Utils";
export { AsyncTasksTracker } from "./AsyncTasks";
export {
  RequestOptions, HierarchyRequestOptions, ContentRequestOptions,
  LabelRequestOptions, SelectionScopeRequestOptions,
  PageOptions, Paged, RequestOptionsWithRuleset, RequestPriority,
} from "./PresentationManagerOptions";
export { LabelDefinition, LabelRawValue, LabelCompositeValue } from "./LabelDefinition";

/**
 * @module RPC
 *
 * @docs-group-description RPC
 * Types used for RPC communication between frontend and backend. Generally should
 * only be used internally by presentation packages.
 */
export {
  PresentationRpcInterface, PresentationRpcRequestOptions,
  LabelRpcRequestOptions, ClientStateSyncRequestOptions, ContentRpcRequestOptions,
  HierarchyRpcRequestOptions, SelectionScopeRpcRequestOptions,
  PresentationRpcResponse,
} from "./PresentationRpcInterface";
export { RpcRequestsHandler, RpcRequestsHandlerProps } from "./RpcRequestsHandler";

/**
 * @module UnifiedSelection
 *
 * @docs-group-description UnifiedSelection
 * Types related to [unified selection]($docs/learning/presentation/Unified-Selection/index.md).
 */
export { SelectionScope } from "./selection/SelectionScope";

/**
 * @module Content
 *
 * @docs-group-description Content
 * Types related to presentation [content]($docs/learning/presentation/Content/index.md).
 */
export { CategoryDescription } from "./content/Category";
export { Content } from "./content/Content";
export {
  Descriptor, DescriptorSource, DescriptorOverrides,
  SelectClassInfo, SelectionInfo, SortDirection, ContentFlags,
} from "./content/Descriptor";
export { DefaultContentDisplayTypes } from "./content/DisplayTypes";
export { EditorDescription } from "./content/Editor";
export { Field, PropertiesField, NestedContentField } from "./content/Fields";
export { Item } from "./content/Item";
export { Property } from "./content/Property";
export {
  PropertyValueFormat, TypeDescription, PrimitiveTypeDescription,
  ArrayTypeDescription, StructTypeDescription, StructFieldMemberDescription,
  BaseTypeDescription,
} from "./content/TypeDescription";
export {
  Value, ValuesArray, ValuesMap,
  DisplayValue, DisplayValuesArray, DisplayValuesMap,
  NestedContentValue,
} from "./content/Value";

/**
 * @module Hierarchies
 *
 * @docs-group-description Hierarchies
 * Types related to presentation [hierarchies]($docs/learning/presentation/Hierarchies/index.md).
 */
export { NodeKey, NodeKeyPath, StandardNodeTypes } from "./hierarchy/Key";
export {
  BaseNodeKey, ECInstanceNodeKey, ECInstancesNodeKey, GroupingNodeKey,
  ECClassGroupingNodeKey, ECPropertyGroupingNodeKey, LabelGroupingNodeKey,
} from "./hierarchy/Key";
export { Node } from "./hierarchy/Node";
export { NodePathElement, NodePathFilteringData } from "./hierarchy/NodePathElement";

/**
 * @module PresentationRules
 *
 * @docs-group-description PresentationRules
 * Types for defining the presentation ruleset.
 */
export { NavigationRule, NavigationRuleBase } from "./rules/hierarchy/NavigationRule";
export { RootNodeRule } from "./rules/hierarchy/RootNodeRule";
export { ChildNodeRule } from "./rules/hierarchy/ChildNodeRule";
export {
  ChildNodeSpecification, ChildNodeSpecificationTypes,
  ChildNodeSpecificationBase, DefaultGroupingPropertiesContainer,
} from "./rules/hierarchy/ChildNodeSpecification";
export { AllInstanceNodesSpecification } from "./rules/hierarchy/AllInstanceNodesSpecification";
export { AllRelatedInstanceNodesSpecification } from "./rules/hierarchy/AllRelatedInstanceNodesSpecification";
export { RelatedInstanceNodesSpecification } from "./rules/hierarchy/RelatedInstanceNodesSpecification";
export { InstanceNodesOfSpecificClassesSpecification } from "./rules/hierarchy/InstanceNodesOfSpecificClassesSpecification";
export {
  CustomQueryInstanceNodesSpecification, QuerySpecification, QuerySpecificationBase,
  QuerySpecificationTypes, StringQuerySpecification, ECPropertyValueQuerySpecification,
} from "./rules/hierarchy/CustomQueryInstanceNodesSpecification";
export { CustomNodeSpecification } from "./rules/hierarchy/CustomNodeSpecification";
export { SubCondition } from "./rules/hierarchy/SubCondition";

export { CustomizationRule } from "./rules/customization/CustomizationRule";
export { CheckBoxRule } from "./rules/customization/CheckBoxRule";
export { ImageIdOverride } from "./rules/customization/ImageIdOverride";
export {
  InstanceLabelOverride, InstanceLabelOverrideValueSpecificationType, InstanceLabelOverrideValueSpecificationBase,
  InstanceLabelOverrideValueSpecification, InstanceLabelOverridePropertyValueSpecification,
  InstanceLabelOverrideBriefcaseIdSpecification, InstanceLabelOverrideClassLabelSpecification,
  InstanceLabelOverrideClassNameSpecification, InstanceLabelOverrideLocalIdSpecification,
  InstanceLabelOverrideCompositeValueSpecification,
} from "./rules/customization/InstanceLabelOverride";
export { LabelOverride } from "./rules/customization/LabelOverride";
export { SortingRule, PropertySortingRule, DisabledSortingRule, SortingRuleBase } from "./rules/customization/SortingRule";
export { StyleOverride } from "./rules/customization/StyleOverride";
export {
  GroupingRule, GroupingSpecification, GroupingSpecificationTypes,
  SameLabelInstanceGroup, SameLabelInstanceGroupApplicationStage, ClassGroup,
  PropertyGroup, PropertyGroupingValue, PropertyRangeGroupSpecification,
  GroupingSpecificationBase,
} from "./rules/customization/GroupingRule";
export { ExtendedDataRule } from "./rules/customization/ExtendedDataRule";
export { NodeArtifactsRule } from "./rules/hierarchy/NodeArtifactsRule";

export { ContentRule } from "./rules/content/ContentRule";
export { ContentSpecification, ContentSpecificationTypes, ContentSpecificationBase } from "./rules/content/ContentSpecification";
export { ContentInstancesOfSpecificClassesSpecification } from "./rules/content/ContentInstancesOfSpecificClassesSpecification";
export { ContentRelatedInstancesSpecification } from "./rules/content/ContentRelatedInstancesSpecification";
export { SelectedNodeInstancesSpecification } from "./rules/content/SelectedNodeInstancesSpecification";

export { ContentModifier, ContentModifiersList } from "./rules/content/modifiers/ContentModifier";
export { PropertyOverrides, PropertySpecification } from "./rules/content/PropertySpecification";
export {
  RelatedPropertiesSpecification, RelationshipMeaning,
  RelatedPropertiesSpecialValues,
} from "./rules/content/modifiers/RelatedPropertiesSpecification";
export { CalculatedPropertiesSpecification } from "./rules/content/modifiers/CalculatedPropertiesSpecification";
export { PropertiesDisplaySpecification } from "./rules/content/modifiers/PropertiesDisplaySpecification";
export {
  PropertyEditorParameters, PropertyEditorParametersBase,
  PropertyEditorsSpecification, PropertyEditorParameterTypes,
  PropertyEditorJsonParameters, PropertyEditorMultilineParameters,
  PropertyEditorRangeParameters, PropertyEditorSliderParameters,
} from "./rules/content/modifiers/PropertyEditorsSpecification";

export { Ruleset, SupplementationInfo } from "./rules/Ruleset";
export { Rule, RuleTypes, RuleBase, ConditionContainer } from "./rules/Rule";
export { VariablesGroup, Variable, VariableValueType } from "./rules/Variables";
export { RelatedInstanceSpecification } from "./rules/RelatedInstanceSpecification";
export { RelationshipDirection } from "./rules/RelationshipDirection";
export { SingleSchemaClassSpecification, MultiSchemaClassesSpecification } from "./rules/ClassSpecifications";
export { SchemasSpecification } from "./rules/SchemasSpecification";

// Set the version number so it can be found at runtime. BUILD_SEMVER is replaced at build time by the webpack DefinePlugin.
declare var BUILD_SEMVER: string;
/* istanbul ignore next */
if ((typeof (BUILD_SEMVER) !== "undefined") && (typeof window !== "undefined") && window) {
  if (!(window as any).iModelJsVersions)
    (window as any).iModelJsVersions = new Map<string, string>();
  (window as any).iModelJsVersions.set("presentation-common", BUILD_SEMVER);
}
