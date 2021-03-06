/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Tiles
 */

import * as React from "react";
import { Tile, TileProps } from "./Tile";

/** @alpha */
// tslint:disable-next-line:variable-name
export const FeaturedTile: React.FunctionComponent<TileProps> = (props: TileProps) => {
  return <Tile {...props} featured={true} />;
};
