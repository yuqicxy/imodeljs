/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module PresentationRules
 */

import { ContentSpecificationBase, ContentSpecificationTypes } from "./ContentSpecification";
import { RelationshipDirection } from "../RelationshipDirection";
import { MultiSchemaClassesSpecification } from "../ClassSpecifications";

/**
 * Creates content for ECInstance(s) related to current selection.
 *
 * **Note:** Use [[ContentRule.condition]] to apply specification on correct selection.
 *
 * @public
 */
export interface ContentRelatedInstancesSpecification extends ContentSpecificationBase {
  /** Used for serializing to JSON. */
  specType: ContentSpecificationTypes.ContentRelatedInstances;

  /**
   * List of ECRelationship specifications to follow when looking for related instances.
   * Optional if [[relatedClasses]] is specified.
   */
  relationships?: MultiSchemaClassesSpecification | MultiSchemaClassesSpecification[];

  /**
   * List of related instance ECClass specifications. Optional if [[relationships]] is specified.
   */
  relatedClasses?: MultiSchemaClassesSpecification | MultiSchemaClassesSpecification[];

  /**
   * Direction that will be followed in the relationship select criteria.
   * Defaults to [[RelationshipDirection.Both]].
   */
  requiredDirection?: RelationshipDirection;

  /**
   * Skips defined level of related items and shows next level related items. Defaults to `0`.
   *
   * **Note:** Can't be used together with [[isRecursive]].
   *
   * @type integer
   * @minimum 0
   */
  skipRelatedLevel?: number;

  /**
   * Walks the specified relationships recursively to find related instances.
   *
   * **Note:** Can't be used together with [[skipRelatedLevel]].
   *
   * **Warning:** Using this specification has significant negative performance impact.
   */
  isRecursive?: boolean;

  /**
   * Condition for filtering instances of defined related classes.
   *
   * **See:** [ECExpressions available in instance filter]($docs/learning/presentation/Content/ECExpressions.md#instance-filter)
   */
  instanceFilter?: string;
}
