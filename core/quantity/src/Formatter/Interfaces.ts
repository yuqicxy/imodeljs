/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import {
  FormatType, ScientificType, ShowSignOption, DecimalPrecision, FractionalPrecision, FormatTraits,
} from "./FormatEnums";

import { UnitProps } from "../Interfaces";

/** This interface defines the properties required to format quantity values.
 * @alpha
 */
export interface FormatProps {
  readonly name: string;
  readonly roundFactor: number;
  readonly type: FormatType;
  readonly precision: DecimalPrecision | FractionalPrecision;
  readonly minWidth: number | undefined;
  readonly formatTraits: FormatTraits;
  readonly showSignOption: ShowSignOption;
  readonly decimalSeparator: string;
  readonly thousandSeparator: string;
  readonly uomSeparator: string;
  readonly scientificType?: ScientificType;
  readonly stationSeparator?: string;
  readonly stationOffsetSize?: number;
  readonly spacer?: string;
  readonly includeZero?: boolean;
  readonly units?: Array<[UnitProps, string | undefined]>;
}
