/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Rendering
 */

/** Metadata about a thumbnail. Often this is redundant with information in the image itself, but is held
 * outside of the image so it can be obtained without having to decode the image data.
 * @alpha
 */
export interface ThumbnailFormatProps {
  /** X size of the image, in pixels. */
  width: number;
  /** Y size of image, in pixels. */
  height: number;
  /** Format of the image */
  format: "jpeg" | "png";
}

/** Properties of a thumbnail in an iModel.
 * @alpha
 */
export interface ThumbnailProps extends ThumbnailFormatProps {
  /** Image data */
  image: Uint8Array;
}
