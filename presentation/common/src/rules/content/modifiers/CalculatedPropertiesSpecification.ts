/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module PresentationRules
 */

/**
 * Sub-specification to include additional calculated properties into the content.
 * @public
 */
export interface CalculatedPropertiesSpecification {
  /** Label of the calculated property. May be [localized]($docs/learning/presentation/Localization.md). */
  label: string;

  /**
   * [ECExpression]($docs/learning/presentation/ECExpressions.md) used to calculate the value. The
   * following symbol sets are available:
   * - [ECInstance ECExpression context]($docs/learning/presentation/ECExpressions.md#ecinstance)
   * - [Ruleset variables]($docs/learning/presentation/ECExpressions.md#ruleset-variables-user-settings)
   */
  value: string;

  /**
   * Priority of the property. Determines the position of this property in UI
   * components - higher priority means the property should be more visible.
   * Defaults to `1000`.
   *
   * @type integer
   */
  priority?: number;
}
