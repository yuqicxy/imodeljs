/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Rendering
 */

import { QParams3d, FeatureIndex } from "@bentley/imodeljs-common";
import { Mesh } from "./mesh/MeshPrimitives";

/** @internal */
export class PointCloudArgs {
  public points: Uint16Array;
  public pointParams: QParams3d;
  public colors: Uint8Array;
  public features: FeatureIndex = new FeatureIndex();

  public constructor(points: Uint16Array, pointParams: QParams3d, colors: Uint8Array, features: Mesh.Features) {
    this.points = points;
    this.colors = colors;
    this.pointParams = pointParams;
    features.toFeatureIndex(this.features);
  }
}
