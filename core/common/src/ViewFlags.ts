/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module DisplayStyles
 */

import { JsonUtils } from "@bentley/bentleyjs-core";

/** @internal */
export const enum AntiAliasPref { Detect = 0, On = 1, Off = 2 } // tslint:disable-line:no-const-enum

/** Enumerates the available rendering modes. The rendering mode chiefly controls whether and how surfaces and their edges are drawn.
 * Generally speaking,
 *  - Wireframe draws only edges.
 *  - SmoothShade draws only surfaces.
 *  - HiddenLine and SolidFill draw both surfaces and edges.
 *  - Lighting is only applied in SmoothShade mode.
 *
 * The [[FillFlags]] associated with planar regions controls whether and how the region's interior area is displayed in Wireframe mode.
 * [[ViewFlags]] has options for enabling display of visible and/or hidden edges in SmoothShade mode.
 * [[HiddenLine.Settings]] allow aspects of edge and surface symbology to be overridden within a view.
 * @public
 */
export enum RenderMode {
  /** Render only edges, no surfaces, with exceptions for planar regions with [[FillFlags]] set up to render the surface in wireframe mode. */
  Wireframe = 0,
  /** Render only surfaces, no edges, with lighting. */
  SmoothShade = 6,
  /** Render edges and surfaces. Surfaces are drawn using the view's background color instead of the element's fill color. */
  HiddenLine = 3,
  /** Render edges and surfaces. */
  SolidFill = 4,
}

/** JSON representation of [[ViewFlags]]
 * @public
 */
export interface ViewFlagProps {
  /** If true, don't show construction class. */
  noConstruct?: boolean;
  /** If true, don't show dimension class. */
  noDim?: boolean;
  /** If true, don't show patterns. */
  noPattern?: boolean;
  /** If true, don't line weights. */
  noWeight?: boolean;
  /** If true, don't line styles. */
  noStyle?: boolean;
  /** If true, don't use transparency. */
  noTransp?: boolean;
  /** If true, don't show filled regions. */
  noFill?: boolean;
  /** If true, show grids. */
  grid?: boolean;
  /** If true, show AuxCoordSystem. */
  acs?: boolean;
  /** If true, don't show textures. */
  noTexture?: boolean;
  /** If true, don't show materials. */
  noMaterial?: boolean;
  /** If true, don't use camera lights.
   * @note Currently the renderer only supports solar lighting. For backwards-compatibility reasons, solar lights will be displayed if any combination of [[noCameraLights]], [[noSourceLights]], or [[noSolarLight]] is set to `false`.
   */
  noCameraLights?: boolean;
  /** If true, don't use source lights.
   * @note Currently the renderer only supports solar lighting. For backwards-compatibility reasons, solar lights will be displayed if any combination of [[noCameraLights]], [[noSourceLights]], or [[noSolarLight]] is set to `false`.
   */
  noSourceLights?: boolean;
  /** If true, don't use solar lights.
   * @note Currently the renderer only supports solar lighting. For backwards-compatibility reasons, solar lights will be displayed if any combination of [[noCameraLights]], [[noSourceLights]], or [[noSolarLight]] is set to `false`.
   */
  noSolarLight?: boolean;
  /** If true, show visible edges. */
  visEdges?: boolean;
  /** If true, show hidden edges. */
  hidEdges?: boolean;
  /** If true, show shadows. */
  shadows?: boolean;
  /** If true, use clipping volume. */
  clipVol?: boolean;
  /** If true, use hidden line material colors. */
  hlMatColors?: boolean;
  /** If true, show view with monochrome settings. */
  monochrome?: boolean;
  /** @internal unused */
  edgeMask?: number;
  /** [[RenderMode]] */
  renderMode?: number;
  /** Display background map. */
  backgroundMap?: boolean;
  /** If true, show ambient occlusion. */
  ambientOcclusion?: boolean;
  /** Controls whether surface discard is always applied regardless of other ViewFlags.
   * Surface shaders contain complicated logic to ensure that the edges of a surface always draw in front of the surface, and that planar surfaces sketched coincident with
   * non-planar surfaces always draw in front of those non-planar surfaces.
   * When this view flag is set to false (the default), then for 3d views if the render mode is wireframe (only edges are displayed) or smooth shader with visible edges turned off (only surfaces are displayed),
   * that logic does not execute, potentially improving performance for no degradation in visual quality. In some scenarios - such as wireframe views containing many planar regions with interior fill, or smooth views containing many coincident planar and non-planar surfaces - enabling this view flag improves display quality by forcing that logic to execute.
   */
  forceSurfaceDiscard?: boolean;
}

/** Flags for controlling how graphics appear within a View.
 * @public
 */
export class ViewFlags {
  /** The [[RenderMode]] of the view. */
  public renderMode: RenderMode = RenderMode.Wireframe;
  /** Shows or hides dimensions. */
  public dimensions: boolean = true;
  /** Shows or hides pattern geometry. */
  public patterns: boolean = true;
  /** Controls whether non-zero line weights are used or display using weight 0. */
  public weights: boolean = true;
  /** Controls whether custom line styles are used (e.g. control whether elements with custom line styles draw normally, or as solid lines). */
  public styles: boolean = true;
  /** Controls whether element transparency is used (e.g. control whether elements with transparency draw normally, or as opaque). */
  public transparency: boolean = true;
  /** Controls whether the fills on filled elements are displayed. */
  public fill: boolean = true;
  /** Controls whether to display texture maps for material assignments. When off only material color is used for display. */
  public textures: boolean = true;
  /** Controls whether materials are used (e.g. control whether geometry with materials draw normally, or as if it has no material). */
  public materials: boolean = true;
  /** Shows or hides the ACS triad. */
  public acsTriad: boolean = false;
  /** Shows or hides the grid. The grid settings are a design file setting. */
  public grid: boolean = false;
  /** Shows or hides visible edges in the shaded render mode. */
  public visibleEdges: boolean = false;
  /** Shows or hides hidden edges in the shaded render mode. */
  public hiddenEdges: boolean = false;
  /** Controls whether the source lights in spatial models are used
   * @note Currently the renderer only supports solar lighting. For backwards-compatibility reasons, solar lights will be displayed if any combination of [[noCameraLights]], [[noSourceLights]], or [[noSolarLight]] is set to `false`.
   * @see [[lighting]] for a more convenient way to toggle lighting on and off.
   */
  public sourceLights: boolean = false;
  /** Controls whether camera (ambient, portrait, flashbulb) lights are used.
   * @note Currently the renderer only supports solar lighting. For backwards-compatibility reasons, solar lights will be displayed if any combination of [[noCameraLights]], [[noSourceLights]], or [[noSolarLight]] is set to `false`.
   * @see [[lighting]] for a more convenient way to toggle lighting on and off.
   */
  public cameraLights: boolean = false;
  /** Controls whether sunlight used
   * @note Currently the renderer only supports solar lighting. For backwards-compatibility reasons, solar lights will be displayed if any combination of [[noCameraLights]], [[noSourceLights]], or [[noSolarLight]] is set to `false`.
   * @see [[lighting]] for a more convenient way to toggle lighting on and off.
   */
  public solarLight: boolean = false;
  /** Shows or hides shadows. */
  public shadows: boolean = false;
  /** Controls whether the clip volume is applied. */
  public clipVolume: boolean = true;
  /** Shows or hides construction class geometry. */
  public constructions: boolean = false;
  /** Draw all graphics in a single color */
  public monochrome: boolean = false;
  /** @internal unused Ignore geometry maps */
  public noGeometryMap: boolean = false;
  /** Display background map */
  public backgroundMap: boolean = false;
  /** Use material colors for hidden lines */
  public hLineMaterialColors: boolean = false;
  /** @internal 0=none, 1=generate mask, 2=use mask */
  public edgeMask: number = 0;
  /** Controls whether ambient occlusion is used. */
  public ambientOcclusion: boolean = false;
  /** Controls whether surface discard is always applied regardless of other ViewFlags.
   * Surface shaders contain complicated logic to ensure that the edges of a surface always draw in front of the surface, and that planar surfaces sketched coincident with
   * non-planar surfaces always draw in front of those non-planar surfaces.
   * When this view flag is set to false (the default), then for 3d views if the render mode is wireframe (only edges are displayed) or smooth shader with visible edges turned off (only surfaces are displayed),
   * that logic does not execute, potentially improving performance for no degradation in visual quality. In some scenarios - such as wireframe views containing many planar regions with interior fill, or smooth views containing many coincident planar and non-planar surfaces - enabling this view flag improves display quality by forcing that logic to execute.
   */
  public forceSurfaceDiscard: boolean = false;

  /** Controls whether or not lighting is applied.
   * @note Has no effect unless `renderMode` is set to [[RenderMode.SmoothShade]].
   */
  public get lighting(): boolean { return this.solarLight || this.sourceLights || this.cameraLights; }
  public set lighting(enable: boolean) { this.solarLight = this.sourceLights = this.cameraLights = enable; }

  public clone(out?: ViewFlags): ViewFlags { return ViewFlags.createFrom(this, out); }
  public static createFrom(other?: ViewFlags, out?: ViewFlags): ViewFlags {
    const val = undefined !== out ? out : new ViewFlags();
    if (other) {
      val.renderMode = other.renderMode;
      val.dimensions = other.dimensions;
      val.patterns = other.patterns;
      val.weights = other.weights;
      val.styles = other.styles;
      val.transparency = other.transparency;
      val.fill = other.fill;
      val.textures = other.textures;
      val.materials = other.materials;
      val.acsTriad = other.acsTriad;
      val.grid = other.grid;
      val.visibleEdges = other.visibleEdges;
      val.hiddenEdges = other.hiddenEdges;
      val.sourceLights = other.sourceLights;
      val.cameraLights = other.cameraLights;
      val.solarLight = other.solarLight;
      val.shadows = other.shadows;
      val.clipVolume = other.clipVolume;
      val.constructions = other.constructions;
      val.monochrome = other.monochrome;
      val.noGeometryMap = other.noGeometryMap;
      val.hLineMaterialColors = other.hLineMaterialColors;
      val.backgroundMap = other.backgroundMap;
      val.edgeMask = other.edgeMask;
      val.ambientOcclusion = other.ambientOcclusion;
      val.forceSurfaceDiscard = other.forceSurfaceDiscard;
    }
    return val;
  }

  /** @internal */
  public hiddenEdgesVisible(): boolean {
    switch (this.renderMode) {
      case RenderMode.SolidFill:
      case RenderMode.HiddenLine:
        return this.hiddenEdges;
      case RenderMode.SmoothShade:
        return this.visibleEdges && this.hiddenEdges;
    }
    return true;
  }
  /** @internal */
  public edgesRequired(): boolean {
    switch (this.renderMode) {
      case RenderMode.SolidFill:
      case RenderMode.HiddenLine:
      case RenderMode.Wireframe:
        return true;
      case RenderMode.SmoothShade:
        return this.visibleEdges;
    }
  }

  public toJSON(): ViewFlagProps {
    const out: ViewFlagProps = {};
    if (!this.constructions) out.noConstruct = true;
    if (!this.dimensions) out.noDim = true;
    if (!this.patterns) out.noPattern = true;
    if (!this.weights) out.noWeight = true;
    if (!this.styles) out.noStyle = true;
    if (!this.transparency) out.noTransp = true;
    if (!this.fill) out.noFill = true;
    if (this.grid) out.grid = true;
    if (this.acsTriad) out.acs = true;
    if (!this.textures) out.noTexture = true;
    if (!this.materials) out.noMaterial = true;
    if (!this.cameraLights) out.noCameraLights = true;
    if (!this.sourceLights) out.noSourceLights = true;
    if (!this.solarLight) out.noSolarLight = true;
    if (this.visibleEdges) out.visEdges = true;
    if (this.hiddenEdges) out.hidEdges = true;
    if (this.shadows) out.shadows = true;
    if (this.clipVolume) out.clipVol = true;
    if (this.hLineMaterialColors) out.hlMatColors = true;
    if (this.monochrome) out.monochrome = true;
    if (this.backgroundMap) out.backgroundMap = true;
    if (this.edgeMask !== 0) out.edgeMask = this.edgeMask;
    if (this.ambientOcclusion) out.ambientOcclusion = true;
    if (this.forceSurfaceDiscard) out.forceSurfaceDiscard = true;

    out.renderMode = this.renderMode;
    return out;
  }

  public static fromJSON(json?: ViewFlagProps): ViewFlags {
    const val = new ViewFlags();
    if (!json)
      return val;

    val.constructions = !JsonUtils.asBool(json.noConstruct);
    val.dimensions = !JsonUtils.asBool(json.noDim);
    val.patterns = !JsonUtils.asBool(json.noPattern);
    val.weights = !JsonUtils.asBool(json.noWeight);
    val.styles = !JsonUtils.asBool(json.noStyle);
    val.transparency = !JsonUtils.asBool(json.noTransp);
    val.fill = !JsonUtils.asBool(json.noFill);
    val.grid = JsonUtils.asBool(json.grid);
    val.acsTriad = JsonUtils.asBool(json.acs);
    val.textures = !JsonUtils.asBool(json.noTexture);
    val.materials = !JsonUtils.asBool(json.noMaterial);
    val.cameraLights = !JsonUtils.asBool(json.noCameraLights);
    val.sourceLights = !JsonUtils.asBool(json.noSourceLights);
    val.solarLight = !JsonUtils.asBool(json.noSolarLight);
    val.visibleEdges = JsonUtils.asBool(json.visEdges);
    val.hiddenEdges = JsonUtils.asBool(json.hidEdges);
    val.shadows = JsonUtils.asBool(json.shadows);
    val.clipVolume = JsonUtils.asBool(json.clipVol);
    val.monochrome = JsonUtils.asBool(json.monochrome);
    val.edgeMask = JsonUtils.asInt(json.edgeMask);
    val.hLineMaterialColors = JsonUtils.asBool(json.hlMatColors);
    val.backgroundMap = JsonUtils.asBool(json.backgroundMap);
    val.ambientOcclusion = JsonUtils.asBool(json.ambientOcclusion);
    val.forceSurfaceDiscard = JsonUtils.asBool(json.forceSurfaceDiscard);

    const renderModeValue = JsonUtils.asInt(json.renderMode);
    if (renderModeValue < RenderMode.HiddenLine)
      val.renderMode = RenderMode.Wireframe;
    else if (renderModeValue > RenderMode.SolidFill)
      val.renderMode = RenderMode.SmoothShade;
    else
      val.renderMode = renderModeValue;

    return val;
  }

  public equals(other: ViewFlags): boolean {
    return this.renderMode === other.renderMode
      && this.dimensions === other.dimensions
      && this.patterns === other.patterns
      && this.weights === other.weights
      && this.styles === other.styles
      && this.transparency === other.transparency
      && this.fill === other.fill
      && this.textures === other.textures
      && this.materials === other.materials
      && this.acsTriad === other.acsTriad
      && this.grid === other.grid
      && this.visibleEdges === other.visibleEdges
      && this.hiddenEdges === other.hiddenEdges
      && this.sourceLights === other.sourceLights
      && this.cameraLights === other.cameraLights
      && this.solarLight === other.solarLight
      && this.shadows === other.shadows
      && this.clipVolume === other.clipVolume
      && this.constructions === other.constructions
      && this.monochrome === other.monochrome
      && this.noGeometryMap === other.noGeometryMap
      && this.hLineMaterialColors === other.hLineMaterialColors
      && this.backgroundMap === other.backgroundMap
      && this.edgeMask === other.edgeMask
      && this.ambientOcclusion === other.ambientOcclusion
      && this.forceSurfaceDiscard === other.forceSurfaceDiscard;
  }
}

/** @alpha */
export namespace ViewFlag {
  /** @alpha */
  export const enum PresenceFlag { // tslint:disable-line:no-const-enum
    kRenderMode,
    kText,
    kDimensions,
    kPatterns,
    kWeights,
    kStyles,
    kTransparency,
    kUnused,
    kFill,
    kTextures,
    kMaterials,
    kVisibleEdges,
    kHiddenEdges,
    kLighting,
    kShadows,
    kClipVolume,
    kConstructions,
    kMonochrome,
    kGeometryMap,
    kHlineMaterialColors,
    kEdgeMask,
    kBackgroundMap,
    kForceSurfaceDiscard,
  }

  /** Overrides a subset of ViewFlags.
   * @alpha
   */
  export class Overrides {
    private _present = 0;
    private readonly _values = new ViewFlags();

    public setPresent(flag: PresenceFlag) { this._present |= (1 << flag); }
    public clearPresent(flag: PresenceFlag) { this._present &= ~(1 << flag); }
    public isPresent(flag: PresenceFlag): boolean { return 0 !== (this._present & (1 << flag)); }

    /** Construct a ViewFlagsOverrides which overrides all flags to match the specified ViewFlags, or overrides nothing if no ViewFlags are supplied. */
    constructor(flags?: ViewFlags) {
      if (undefined !== flags)
        this.overrideAll(flags);
    }

    public overrideAll(flags?: ViewFlags) {
      ViewFlags.createFrom(flags, this._values);
      this._present = 0xffffffff;
    }

    public clone(out?: Overrides) {
      const result = undefined !== out ? out : new Overrides();
      result.copyFrom(this);
      return result;
    }
    public copyFrom(other: Overrides): void {
      other._values.clone(this._values);
      this._present = other._present;
    }

    public setShowDimensions(val: boolean) { this._values.dimensions = val; this.setPresent(PresenceFlag.kDimensions); }
    public setShowPatterns(val: boolean) { this._values.patterns = val; this.setPresent(PresenceFlag.kPatterns); }
    public setShowWeights(val: boolean) { this._values.weights = val; this.setPresent(PresenceFlag.kWeights); }
    public setShowStyles(val: boolean) { this._values.styles = val; this.setPresent(PresenceFlag.kStyles); }
    public setShowTransparency(val: boolean) { this._values.transparency = val; this.setPresent(PresenceFlag.kTransparency); }
    public setShowFill(val: boolean) { this._values.fill = val; this.setPresent(PresenceFlag.kFill); }
    public setShowTextures(val: boolean) { this._values.textures = val; this.setPresent(PresenceFlag.kTextures); }
    public setShowMaterials(val: boolean) { this._values.materials = val; this.setPresent(PresenceFlag.kMaterials); }
    public setApplyLighting(val: boolean) { this._values.lighting = val; this.setPresent(PresenceFlag.kLighting); }
    public setShowVisibleEdges(val: boolean) { this._values.visibleEdges = val; this.setPresent(PresenceFlag.kVisibleEdges); }
    public setShowHiddenEdges(val: boolean) { this._values.hiddenEdges = val; this.setPresent(PresenceFlag.kHiddenEdges); }
    public setShowShadows(val: boolean) { this._values.shadows = val; this.setPresent(PresenceFlag.kShadows); }
    public setShowClipVolume(val: boolean) { this._values.clipVolume = val; this.setPresent(PresenceFlag.kClipVolume); }
    public setShowConstructions(val: boolean) { this._values.constructions = val; this.setPresent(PresenceFlag.kConstructions); }
    public setMonochrome(val: boolean) { this._values.monochrome = val; this.setPresent(PresenceFlag.kMonochrome); }
    public setIgnoreGeometryMap(val: boolean) { this._values.noGeometryMap = val; this.setPresent(PresenceFlag.kGeometryMap); }
    public setShowBackgroundMap(val: boolean) { this._values.backgroundMap = val; this.setPresent(PresenceFlag.kBackgroundMap); }
    public setUseHlineMaterialColors(val: boolean) { this._values.hLineMaterialColors = val; this.setPresent(PresenceFlag.kHlineMaterialColors); }
    public setForceSurfaceDiscard(val: boolean) { this._values.forceSurfaceDiscard = val; this.setPresent(PresenceFlag.kForceSurfaceDiscard); }
    public setEdgeMask(val: number) { this._values.edgeMask = val; this.setPresent(PresenceFlag.kEdgeMask); }
    public setRenderMode(val: RenderMode) { this._values.renderMode = val; this.setPresent(PresenceFlag.kRenderMode); }

    public anyOverridden() { return 0 !== this._present; }

    public clear() { this._present = 0; }
    public clearClipVolume() { this.clearPresent(PresenceFlag.kClipVolume); }

    /** If ViewFlags.clipVolume is overridden, return the override value; else return undefined.
     * @internal
     */
    public get clipVolumeOverride(): boolean | undefined {
      return this.isPresent(PresenceFlag.kClipVolume) ? this._values.clipVolume : undefined;
    }

    /** Apply these overrides to the supplied ViewFlags */
    public apply(base: ViewFlags): ViewFlags {
      if (!this.anyOverridden())
        return base;

      if (this.isPresent(PresenceFlag.kDimensions)) base.dimensions = this._values.dimensions;
      if (this.isPresent(PresenceFlag.kPatterns)) base.patterns = this._values.patterns;
      if (this.isPresent(PresenceFlag.kWeights)) base.weights = this._values.weights;
      if (this.isPresent(PresenceFlag.kStyles)) base.styles = this._values.styles;
      if (this.isPresent(PresenceFlag.kTransparency)) base.transparency = this._values.transparency;
      if (this.isPresent(PresenceFlag.kFill)) base.fill = this._values.fill;
      if (this.isPresent(PresenceFlag.kTextures)) base.textures = this._values.textures;
      if (this.isPresent(PresenceFlag.kMaterials)) base.materials = this._values.materials;
      if (this.isPresent(PresenceFlag.kLighting)) base.lighting = this._values.lighting;
      if (this.isPresent(PresenceFlag.kVisibleEdges)) base.visibleEdges = this._values.visibleEdges;
      if (this.isPresent(PresenceFlag.kHiddenEdges)) base.hiddenEdges = this._values.hiddenEdges;
      if (this.isPresent(PresenceFlag.kShadows)) base.shadows = this._values.shadows;
      if (this.isPresent(PresenceFlag.kClipVolume)) base.clipVolume = this._values.clipVolume;
      if (this.isPresent(PresenceFlag.kConstructions)) base.constructions = this._values.constructions;
      if (this.isPresent(PresenceFlag.kMonochrome)) base.monochrome = this._values.monochrome;
      if (this.isPresent(PresenceFlag.kGeometryMap)) base.noGeometryMap = this._values.noGeometryMap;
      if (this.isPresent(PresenceFlag.kBackgroundMap)) base.backgroundMap = this._values.backgroundMap;
      if (this.isPresent(PresenceFlag.kHlineMaterialColors)) base.hLineMaterialColors = this._values.hLineMaterialColors;
      if (this.isPresent(PresenceFlag.kForceSurfaceDiscard)) base.forceSurfaceDiscard = this._values.forceSurfaceDiscard;
      if (this.isPresent(PresenceFlag.kEdgeMask)) base.edgeMask = this._values.edgeMask;
      if (this.isPresent(PresenceFlag.kRenderMode)) base.renderMode = this._values.renderMode;
      return base;
    }
  }
}
