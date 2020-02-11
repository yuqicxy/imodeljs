/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModels
 */

import { XYZProps } from "@bentley/geometry-core";

/** @public */
export enum GeoCoordStatus {
  Success = 0,
  NoGCSDefined = 100,
  OutOfUsefulRange = 1,
  OutOfMathematicalDomain = 2,
  NoDatumConverter = 25,
  VerticalDatumConvertError = 26,
  CSMapError = 4096,
  Pending = -41556,
}

/** Information required to request conversion of an array of Geographic coordinates (Longitude/Latitude) to iModel coordinates
 * @beta
 */
export interface IModelCoordinatesRequestProps {
  sourceDatum: string;
  geoCoords: XYZProps[];
}

/** Information returned from a request to convert an array of Geographic coordinates (Longitude/Latitude) to iModel coordinates
 * @beta
 */
export interface PointWithStatus {
  p: XYZProps;
  s: GeoCoordStatus;
}

/** @beta */
export interface IModelCoordinatesResponseProps {
  iModelCoords: PointWithStatus[];
  fromCache: number;    // the number that were read from the cache rather than calculated.
}

/** Information required to request conversion of an array of iModel coordinates to Geographic Coordinates (longitude and latitude)
 * @beta
 */
export interface GeoCoordinatesRequestProps {
  targetDatum: string;
  iModelCoords: XYZProps[];
}

/** Information returned from a request to convert an array of iModel coordinates to Geographic Coordinates (longitude and latitude)
 * @beta
 */
export interface GeoCoordinatesResponseProps {
  geoCoords: PointWithStatus[];
  fromCache: number;    // the number that were read from the cache rather than calculated.
}
