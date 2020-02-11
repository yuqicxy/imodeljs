/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Rendering
 */

import { Vector3d, XYAndZ } from "@bentley/geometry-core";

/** @internal */
export class OctEncodedNormal {
  private static _scratchUInt16 = new Uint16Array(1);
  private static clamp(val: number, minVal: number, maxVal: number): number { return val < minVal ? minVal : (val > maxVal ? maxVal : val); }
  private static clampUint8(val: number): number { return this.roundUint16(0.5 + (this.clamp(val, -1, 1) * 0.5 + 0.5) * 255); }
  private static roundUint16(val: number): number { this._scratchUInt16[0] = val; return this._scratchUInt16[0]; }
  private static signNotZero(val: number): number { return val < 0.0 ? -1.0 : 1.0; }
  public static encode(vec: XYAndZ): number {
    const denom = Math.abs(vec.x) + Math.abs(vec.y) + Math.abs(vec.z);
    let rx = vec.x / denom;
    let ry = vec.y / denom;
    if (vec.z < 0) {
      const x = rx;
      const y = ry;
      rx = (1 - Math.abs(y)) * OctEncodedNormal.signNotZero(x);
      ry = (1 - Math.abs(x)) * OctEncodedNormal.signNotZero(y);
    }
    return this.clampUint8(ry) << 8 | this.clampUint8(rx);
  }

  public readonly value: number;
  public constructor(val: number) { this.value = OctEncodedNormal.roundUint16(val); }

  public static fromVector(val: XYAndZ) { return new OctEncodedNormal(this.encode(val)); }
  public decode(): Vector3d | undefined { return OctEncodedNormal.decodeValue(this.value); }
  public static decodeValue(val: number, result?: Vector3d) {
    let ex = val & 0xff;
    let ey = val >> 8;
    ex = ex / 255.0 * 2.0 - 1.0;
    ey = ey / 255.0 * 2.0 - 1.0;
    const ez = 1 - (Math.abs(ex) + Math.abs(ey));
    let n;
    if (result === undefined) {
      n = new Vector3d(ex, ey, ez);
    } else {
      n = result;
      n.x = ex;
      n.y = ey;
      n.z = ez;
    }

    if (n.z < 0) {
      const x = n.x;
      const y = n.y;
      n.x = (1 - Math.abs(y)) * OctEncodedNormal.signNotZero(x);
      n.y = (1 - Math.abs(x)) * OctEncodedNormal.signNotZero(y);
    }
    n.normalizeInPlace();
    return n;
  }
}

/** @internal */
export class OctEncodedNormalPair {
  constructor(public first: OctEncodedNormal, public second: OctEncodedNormal) { }
}
