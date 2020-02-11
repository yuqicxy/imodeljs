/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module PresentationRules
 */

import { ChildNodeSpecification } from "./ChildNodeSpecification";
import { ConditionContainer } from "../Rule";

/**
 * Defines child node specifications which should only be handled when a condition
 * is satisfied.
 *
 * @public
 */
export interface SubCondition extends ConditionContainer {
  /**
   * Defines a condition for the rule, which needs to be met in order to execute it. Condition
   * is an [ECExpression]($docs/learning/presentation/ECExpressions.md), which can use
   * a [limited set of symbols]($docs/learning/presentation/Hierarchies/ECExpressions.md#rule-condition).
   */
  condition?: string;

  /** Nested sub-conditions */
  subConditions?: SubCondition[];

  /** Child node specifications which are used if condition is satisfied */
  specifications?: ChildNodeSpecification[];
}
