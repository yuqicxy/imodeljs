/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Core
 */

import { Id64String } from "@bentley/bentleyjs-core";

/**
 * Possible variable value types
 * @beta
 */
export enum VariableValueTypes {
  /** Integer value */
  Int = "int",

  /** Array of integer values */
  IntArray = "int[]",

  /** Boolean value */
  Bool = "bool",

  /** String value */
  String = "string",

  /** Id64String value */
  Id64 = "id64",

  /** Array of Id64String values */
  Id64Array = "id64[]",
}

/**
 * Union of all supported variable value types
 * @beta
 */
export type VariableValue = boolean | string | number | number[] | Id64String[];
/** @internal */
export type VariableValueJSON = boolean | string | string[] | number | number[];

/**
 * Data structure for representing ruleset variable.
 * @beta
 */
export interface RulesetVariable {
  id: string;
  type: VariableValueTypes;
  value: VariableValue;
}

/**
 * @internal
 * @deprecated Will be dropped in 2.0.0
 */
export interface RulesetVariablesState { [rulesetId: string]: Array<[string, VariableValueTypes, VariableValue]>; }

/**
 * @internal
 * @deprecated Will be dropped in 2.0.0
 */
export namespace RulesetVariablesState {
  export const STATE_ID = "ruleset variables";
}
