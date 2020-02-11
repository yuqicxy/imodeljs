/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Symbology
 */

/** The type of a font.
 * @public
 */
export enum FontType { TrueType = 1, Rsc = 2, Shx = 3 }

/** The properties of a Font. This includes a iModel local id, the font type, and the font name.
 * @public
 */
export interface FontProps { id: number; type: FontType; name: string; }

/** The properties of a FontMap
 * @public
 */
export interface FontMapProps { fonts: FontProps[]; }

/** A FontMap holds the table of known fonts available in an iModel.
 * A font is referenced by an "id" that is local to the iModel. This table maps those local ids to a FontProps.
 * @public
 */
export class FontMap {
  public readonly fonts = new Map<number, FontProps>();
  constructor(props?: FontMapProps) {
    if (undefined !== props)
      this.addFonts(props.fonts);
  }
  public addFonts(fonts: FontProps[]) {
    fonts.forEach((font) => this.fonts.set(font.id, font));
  }
  public toJSON(): FontMapProps {
    const fonts: FontProps[] = [];
    this.fonts.forEach((font) => fonts.push(font));
    return { fonts };
  }
  /** look up a font by name or number and return its FontProps */
  public getFont(arg: string | number): FontProps | undefined {
    if (typeof arg === "number") return this.fonts.get(arg);
    for (const font of this.fonts.values())
      if (font.name === arg) return font;
    return undefined;
  }
}
