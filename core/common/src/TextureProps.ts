/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Entities
 */

import { DefinitionElementProps } from "./ElementProps";
import { ImageSourceFormat } from "./Image";

/** @beta */
export enum TextureFlags { None }

/** Properties that define a Texture
 * @beta
 */
export interface TextureProps extends DefinitionElementProps {
  /** Format of the image data. */
  format: ImageSourceFormat;
  /** The image data stored in a Base64-encoded string according to the specified format. */
  data: string;
  /** The width of the image. */
  width: number;
  /** The height of the image. */
  height: number;
  /** Optional flags.  Currently unused; should always be TextureFlags.None.
   * @beta
   */
  flags: TextureFlags;
  /** An optional description of the texture. */
  description?: string;
}
