/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module PresentationRules
 */

import { ChildNodeSpecification } from "./ChildNodeSpecification";
import { RuleBase } from "../Rule";
import { CustomizationRule } from "../customization/CustomizationRule";
import { SubCondition } from "./SubCondition";
import { RootNodeRule } from "./RootNodeRule";
import { ChildNodeRule } from "./ChildNodeRule";

/**
 * Base class for all [[NavigationRule]] implementations. Not
 * meant to be used directly, see `NavigationRule`.
 *
 * @public
 */
export interface NavigationRuleBase extends RuleBase {
  /**
   * Specifications that define what content the rule returns.
   */
  specifications?: ChildNodeSpecification[];

  /**
   * Customization rules that are applied for the content returned by
   * this rule.
   */
  customizationRules?: CustomizationRule[];

  /**
   * Specifies child node rules which are only used when specific condition
   * is satisfied.
   */
  subConditions?: SubCondition[];

  /**
   * Stop processing rules that have lower priority. Used in cases when recursion
   * suppression is needed.
   *
   * **Note:** If this flag is set, [[specifications]] and [[subConditions]] are not processed.
   */
  stopFurtherProcessing?: boolean;
}

/**
 * Navigation rules define the hierarchy that's created for navigation controls.
 * @public
 */
export type NavigationRule = RootNodeRule | ChildNodeRule;
