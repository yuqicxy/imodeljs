/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module PresentationRules
 */

import { RuleTypes, RuleBase, ConditionContainer } from "../Rule";

/**
 * Rule that allows overriding default icon and dynamically define an icon
 * for a particular node based on the context.
 *
 * @public
 */
export interface ImageIdOverride extends RuleBase, ConditionContainer {
  /** Used for serializing to JSON. */
  ruleType: RuleTypes.ImageIdOverride;

  /**
   * Defines a condition for the rule, which needs to be met in order to execute it. Condition
   * is an [ECExpression]($docs/learning/presentation/ECExpressions.md), which can use
   * a [limited set of symbols]($docs/learning/p[resentation/Customization/ECExpressions.md#rule-condition).
   */
  condition?: string;

  /**
   * Defines an image ID that should be used for nodes that meet rule condition. This is
   * an [ECExpression]($docs/learning/presentation/Customization/ECExpressions.md), so ID can be
   * defined/formatted dynamically based on the context - for example ECInstance property value.
   *
   * @minLength 1
   */
  imageIdExpression: string;
}
