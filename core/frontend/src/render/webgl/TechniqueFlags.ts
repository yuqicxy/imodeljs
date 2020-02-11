/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { Target } from "./Target";
import { RenderPass } from "./RenderFlags";
import { ClippingType } from "../System";
import { RenderMode } from "@bentley/imodeljs-common";

// tslint:disable:no-const-enum

/** Specifies how a TechniqueFlags handles feature table/overrides.
 * @internal
 */
export const enum FeatureMode {
  None,       // no features
  Pick,       // feature table only
  Overrides,  // feature table with symbology overrides
}

/** Meta data for what type of clip volume is being stored (mask or planes).
 * @internal
 */
export class ClipDef {
  public type: ClippingType;
  public numberOfPlanes: number;

  public constructor(type: ClippingType = ClippingType.None, numberOfPlanes: number = 0) { this.type = type; this.numberOfPlanes = numberOfPlanes; }
  public static forMask() { return new ClipDef(ClippingType.Mask); }
  public static forPlanes(numPlanes: number) { return new ClipDef(ClippingType.Planes, numPlanes); }
}

/** @internal */
export const enum IsInstanced { No, Yes }

/** @internal */
export const enum IsAnimated { No, Yes }

/** @internal */
export const enum IsClassified { No, Yes }

/** @internal */
export const enum IsEdgeTestNeeded { No, Yes }

/** @internal */
export const enum IsShadowable { No, Yes }

/** @internal */
export const enum HasMaterialAtlas { No, Yes }

/** Flags used to control which shader program is used by a rendering Technique.
 * @internal
 */
export class TechniqueFlags {
  public clip: ClipDef = new ClipDef();
  public featureMode = FeatureMode.None;
  public isTranslucent: boolean;
  public isEdgeTestNeeded: IsEdgeTestNeeded = IsEdgeTestNeeded.No;
  public isAnimated: IsAnimated = IsAnimated.No;
  public isInstanced: IsInstanced = IsInstanced.No;
  public isClassified: IsClassified = IsClassified.No;
  public isShadowable: IsShadowable = IsShadowable.No;
  public hasMaterialAtlas: HasMaterialAtlas = HasMaterialAtlas.No;
  public usesLogZ = false;
  private _isHilite = false;

  public constructor(translucent: boolean = false) {
    this.isTranslucent = translucent;
  }

  public get hasClip(): boolean { return this.clip.type !== ClippingType.None; }

  public init(target: Target, pass: RenderPass, instanced: IsInstanced, animated: IsAnimated = IsAnimated.No, classified = IsClassified.No, shadowable = IsShadowable.No, hasMaterialAtlas = HasMaterialAtlas.No): void {
    if (RenderPass.Hilite === pass || RenderPass.HiliteClassification === pass || RenderPass.HilitePlanarClassification === pass) {
      const isClassified = (classified === IsClassified.Yes && RenderPass.HilitePlanarClassification === pass) ? IsClassified.Yes : IsClassified.No;
      this.initForHilite(target.clipDef, instanced, isClassified, target.wantLogZ);
    } else {
      this._isHilite = false;
      this.isTranslucent = RenderPass.Translucent === pass;
      this.clip = target.clipDef;
      this.isAnimated = animated;
      this.isInstanced = instanced;
      this.isClassified = classified;
      this.isShadowable = shadowable;
      this.hasMaterialAtlas = hasMaterialAtlas;
      this.usesLogZ = target.wantLogZ;
      this.featureMode = target.uniforms.batch.featureMode;

      // Determine if we should use the shaders which support discarding surfaces in favor of their edges (and discarding non-planar surfaces in favor of coincident planar surfaces).
      // These are only useful if the geometry defines feature Ids.
      // In 3d, if we're only displaying surfaces or edges, not both, don't bother, unless forceSurfaceDiscard is true.
      this.isEdgeTestNeeded = this.hasFeatures ? (this.isClassified ? IsEdgeTestNeeded.No : IsEdgeTestNeeded.Yes) : IsEdgeTestNeeded.No;
      if (!target.currentViewFlags.forceSurfaceDiscard && target.is3d && !target.isReadPixelsInProgress && this.isEdgeTestNeeded) {
        switch (target.currentViewFlags.renderMode) {
          case RenderMode.Wireframe:
            // We're only displaying edges (ignoring filled planar regions)
            this.isEdgeTestNeeded = IsEdgeTestNeeded.No;
            break;
          case RenderMode.SmoothShade:
            if (!target.currentViewFlags.visibleEdges && !target.wantAmbientOcclusion && pass !== RenderPass.PlanarClassification) {
              // We're only displaying surfaces (ignoring filled planar regions). NB: Filled text with outline is handled by gl.polygonOffset().
              this.isEdgeTestNeeded = IsEdgeTestNeeded.No;
            }
            break;
          default:
            // SolidFill and HiddenLine always display edges and surfaces.
            break;
        }
      }
    }
  }

  public reset(mode: FeatureMode, instanced: IsInstanced = IsInstanced.No, shadowable: IsShadowable) {
    this._isHilite = false;
    this.featureMode = mode;
    this.isTranslucent = false;
    this.isEdgeTestNeeded = IsEdgeTestNeeded.No;
    this.isAnimated = IsAnimated.No;
    this.isClassified = IsClassified.No;
    this.isInstanced = instanced;
    this.isShadowable = shadowable;
    this.hasMaterialAtlas = HasMaterialAtlas.No;
    this.usesLogZ = false;
    this.clip.type = ClippingType.None;
    this.clip.numberOfPlanes = 0;
  }

  public get hasFeatures() { return FeatureMode.None !== this.featureMode; }

  public setAnimated(animated: boolean) { this.isAnimated = animated ? IsAnimated.Yes : IsAnimated.No; }
  public setInstanced(instanced: boolean) { this.isInstanced = instanced ? IsInstanced.Yes : IsInstanced.No; }
  public setClassified(classified: boolean) {
    this.isClassified = classified ? IsClassified.Yes : IsClassified.No;
  }
  public setHasMaterialAtlas(has: boolean) { this.hasMaterialAtlas = has ? HasMaterialAtlas.Yes : HasMaterialAtlas.No; }

  public get isHilite() { return this._isHilite; }
  public initForHilite(clip: ClipDef, instanced: IsInstanced, classified: IsClassified, logZ: boolean) {
    this.featureMode = classified ? FeatureMode.None : FeatureMode.Overrides;
    this._isHilite = true;
    this.isTranslucent = false;
    this.isEdgeTestNeeded = IsEdgeTestNeeded.No;
    this.isAnimated = IsAnimated.No;
    this.isInstanced = instanced;
    this.isClassified = classified;
    this.hasMaterialAtlas = HasMaterialAtlas.No;
    this.usesLogZ = false;
    this.clip = clip;
    this.usesLogZ = logZ;
  }

  public buildDescription(): string {
    const parts = [this.isTranslucent ? "Translucent" : "Opaque"];
    if (this.isInstanced) parts.push("instanced");
    if (this.isEdgeTestNeeded) parts.push("edgeTestNeeded");
    if (this.isAnimated) parts.push("animated");
    if (this.isHilite) parts.push("hilite");
    if (this.isClassified) parts.push("classified");
    if (this.hasClip) parts.push("clip");
    if (this.isShadowable) parts.push("shadowable");
    if (this.hasFeatures) parts.push(FeatureMode.Pick === this.featureMode ? "pick" : "overrides");
    if (this.hasMaterialAtlas) parts.push("materialAtlas");
    if (this.usesLogZ) parts.push("logZ");
    return parts.join("; ");
  }

  public static readonly defaults = new TechniqueFlags();
}
