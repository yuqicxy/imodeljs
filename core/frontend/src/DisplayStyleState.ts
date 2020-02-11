/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Views
 */
import {
  ViewFlags,
  ColorDef,
  DisplayStyleProps,
  RenderTexture,
  SubCategoryOverride,
  SkyBoxProps,
  SkyBoxImageType,
  SkyCubeProps,
  EnvironmentProps,
  GroundPlane,
  DisplayStyleSettings,
  DisplayStyle3dSettings,
  BackgroundMapProps,
  BackgroundMapSettings,
  AnalysisStyle,
  ContextRealityModelProps,
  Cartographic,
} from "@bentley/imodeljs-common";
import { ElementState } from "./EntityState";
import { IModelConnection } from "./IModelConnection";
import { JsonUtils, Id64, Id64String, assert } from "@bentley/bentleyjs-core";
import { RenderSystem, TextureImage, AnimationBranchStates } from "./render/System";
import { BackgroundMapTileTreeReference } from "./tile/WebMapTileTree";
import { BackgroundTerrainTileTreeReference } from "./tile/BackgroundTerrainTileTree";
import { TileTreeReference } from "./tile/TileTree";
import { Plane3dByOriginAndUnitNormal, Vector3d, Point3d } from "@bentley/geometry-core";
import { ContextRealityModelState } from "./ContextRealityModelState";
import { RenderScheduleState } from "./RenderScheduleState";
import { Viewport, ScreenViewport } from "./Viewport";
import { calculateSolarDirection } from "./SolarCalculate";
import { IModelApp } from "./IModelApp";

type BackgroundMapOrTerrainTileTreeReference = BackgroundMapTileTreeReference | BackgroundTerrainTileTreeReference;

/** A DisplayStyle defines the parameters for 'styling' the contents of a [[ViewState]]
 * @note If the DisplayStyle is associated with a [[ViewState]] which is being rendered inside a [[Viewport]], modifying
 * the DisplayStyle directly will generally not result in immediately visible changes on the screen.
 * [[ViewState]] provides APIs which forward to the DisplayStyle API and also ensure the screen is updated promptly.
 * @public
 */
export abstract class DisplayStyleState extends ElementState implements DisplayStyleProps {
  /** @internal */
  public static get className() { return "DisplayStyle"; }
  private _backgroundMap: BackgroundMapOrTerrainTileTreeReference;
  private readonly _backgroundDrapeMap: BackgroundMapTileTreeReference;       // We currently drape terrain models with the active map.  At some point the setting should perhaps move to that model itself and be removed from the display style.
  private readonly _contextRealityModels: ContextRealityModelState[] = [];
  private _analysisStyle?: AnalysisStyle;
  private _scheduleScript?: RenderScheduleState.Script;

  /** The container for this display style's settings. */
  public abstract get settings(): DisplayStyleSettings;

  /** Construct a new DisplayStyleState from its JSON representation.
   * @param props JSON representation of the display style.
   * @param iModel IModelConnection containing the display style.
   */
  constructor(props: DisplayStyleProps, iModel: IModelConnection) {
    super(props, iModel);
    const styles = this.jsonProperties.styles;
    const backgroundMap = undefined !== styles ? styles.backgroundMap : undefined;
    const mapProps = undefined !== backgroundMap ? backgroundMap : {};
    const mapSettings = BackgroundMapSettings.fromJSON(mapProps);

    this._backgroundMap = mapSettings.applyTerrain ? new BackgroundTerrainTileTreeReference(mapSettings, iModel) : new BackgroundMapTileTreeReference(mapSettings, iModel);
    this._backgroundDrapeMap = new BackgroundMapTileTreeReference(mapSettings, iModel, true);    // The drape map can not also include terrain. -- drape and background map share trees if terrain not on.

    if (styles) {
      if (styles.contextRealityModels)
        for (const contextRealityModel of styles.contextRealityModels)
          this._contextRealityModels.push(new ContextRealityModelState(contextRealityModel, this.iModel, this));

      if (styles.analysisStyle)
        this._analysisStyle = AnalysisStyle.fromJSON(styles.analysisStyle);
      if (styles.scheduleScript)
        this._scheduleScript = RenderScheduleState.Script.fromJSON(this.id, this.iModel, styles.scheduleScript);
    }
  }

  /** Modify the background map display settings.
   * @param mapProps JSON representation of the new settings.
   * @see [[ViewFlags.backgroundMap]] for toggling display of the map.
   * @see [[DisplayStyleState.backgroundMapSettings]] and [[DisplayStyleState.changeBackgroundMapProps]] for a more convenient API, particularly when you want to change only a subset of the map settings.
   * @note Currently the behavior of this method is not ideal.
   *  - If this display style is associated with a Viewport, you must call Viewport.invalidateScene for the view to display the new map.
   *  - Any properties omitted from `mapProps` will be reset to their defaults.
   *  - All loaded tiles will be discarded and new ones will be requested, even if only changing the groundBias.
   * @deprecated
   */
  public setBackgroundMap(mapProps: BackgroundMapProps): void {
    this.changeBackgroundMapProps(BackgroundMapSettings.fromJSON(mapProps));
  }

  /** @internal */
  public get backgroundMap(): BackgroundMapOrTerrainTileTreeReference { return this._backgroundMap; }

  /** @internal */
  public get backgroundDrapeMap(): BackgroundMapTileTreeReference { return this._backgroundDrapeMap; }

  /** The settings controlling how a background map is displayed within a view.
   * @see [[ViewFlags.backgroundMap]] for toggling display of the map on or off.
   * @note If this display style is associated with a [[Viewport]], prefer to use [[Viewport.backgroundMapSettings]] to change the settings to ensure the Viewport's display updates immediately.
   * @beta
   */
  public get backgroundMapSettings(): BackgroundMapSettings { return this._backgroundMap.settings; }
  public set backgroundMapSettings(settings: BackgroundMapSettings) {
    this._backgroundMap.settings = settings;
    this._backgroundDrapeMap.settings = settings;
    this.settings.backgroundMap = settings;
  }

  /** Modify a subset of the background map display settings.
   * @param name props JSON representation of the properties to change. Any properties not present will retain their current values in `this.backgroundMapSettings`.
   * @note If the style is associated with a Viewport, [[Viewport.changeBackgroundMapProps]] should be used instead to ensure the view updates immediately.
   * @see [[ViewFlags.backgroundMap]] for toggling display of the map.
   *
   * Example that changes only the elevation, leaving the provider and type unchanged:
   * ``` ts
   *  style.changeBackgroundMapProps({ groundBias: 16.2 });
   * ```
   * @beta
   */
  public changeBackgroundMapProps(props: BackgroundMapProps): void {
    this.backgroundMapSettings = this.backgroundMapSettings.clone(props);
    if (props.terrainSettings !== undefined && props.terrainSettings.providerName !== undefined || props.applyTerrain !== undefined)
      this._backgroundMap = ("CesiumWorldTerrain" === this.backgroundMapSettings.terrainSettings.providerName && this.backgroundMapSettings.applyTerrain) ? new BackgroundTerrainTileTreeReference(this.backgroundMapSettings, this.iModel) : new BackgroundMapTileTreeReference(this.backgroundMapSettings, this.iModel);

  }

  /** @internal */
  public forEachRealityModel(func: (model: ContextRealityModelState) => void): void {
    for (const model of this._contextRealityModels)
      func(model);
  }

  /** @internal */
  public forEachRealityTileTreeRef(func: (ref: TileTreeReference) => void): void {
    this.forEachRealityModel((model) => func(model.treeRef));
  }

  /** @internal */
  public forEachTileTreeRef(func: (ref: TileTreeReference) => void): void {
    this.forEachRealityTileTreeRef(func);
    if (this.viewFlags.backgroundMap)
      func(this._backgroundMap);
  }

  /** Performs logical comparison against another display style. Two display styles are logically equivalent if they have the same name, Id, and settings.
   * @param other The display style to which to compare.
   * @returns true if the specified display style is logically equivalent to this display style - i.e., both styles have the same values for all of their settings.
   */
  public equalState(other: DisplayStyleState): boolean {
    if (this.name !== other.name || this.id !== other.id)
      return false;
    else
      return JSON.stringify(this.settings) === JSON.stringify(other.settings);
  }

  /** The name of this DisplayStyle */
  public get name(): string { return this.code.getValue(); }

  /** Settings controlling display of analytical models.
   * @note Do not modify the style in place. Clone it and pass the clone to the setter.
   */
  public get analysisStyle(): AnalysisStyle | undefined { return this._analysisStyle; }
  public set analysisStyle(style: AnalysisStyle | undefined) {
    if (undefined === style) {
      this._analysisStyle = undefined;
    } else {
      if (undefined === this._analysisStyle)
        this._analysisStyle = AnalysisStyle.fromJSON(style);
      else
        this._analysisStyle.copyFrom(style);
    }

    this.jsonProperties.analysisStyle = this._analysisStyle;
  }

  /** @internal */
  public get scheduleScript(): RenderScheduleState.Script | undefined { return this._scheduleScript; }
  public set scheduleScript(script: RenderScheduleState.Script | undefined) {
    if (undefined === script) {
      this._scheduleScript = undefined;
    } else {
      this._scheduleScript = RenderScheduleState.Script.fromJSON(this.id, this.iModel, script.modelTimelines);
    }
    this.jsonProperties.scheduleScript = this._scheduleScript;
  }

  /** @internal */
  public getAnimationBranches(scheduleTime: number): AnimationBranchStates | undefined { return this._scheduleScript === undefined ? undefined : this._scheduleScript.getAnimationBranches(scheduleTime); }

  /** @internal */
  public attachRealityModel(props: ContextRealityModelProps): void {
    // ###TODO check if url+name already present...or do we allow same to be attached multiple times?
    if (undefined === this.jsonProperties.styles)
      this.jsonProperties.styles = {};

    if (undefined === this.jsonProperties.styles.contextRealityModels)
      this.jsonProperties.styles.contextRealityModels = [];

    this.jsonProperties.styles.contextRealityModels.push(props);
    this._contextRealityModels.push(new ContextRealityModelState(props, this.iModel, this));
  }

  /** @internal */
  public detachRealityModelByNameAndUrl(name: string, url: string): void {
    const index = this._contextRealityModels.findIndex((x) => x.matchesNameAndUrl(name, url));
    if (- 1 !== index)
      this.detachRealityModelByIndex(index);
  }

  /** @internal */
  public detachRealityModelByIndex(index: number): void {
    const styles = this.jsonProperties.styles;
    const props = undefined !== styles ? styles.contextRealityModels : undefined;
    if (!Array.isArray(props) || index >= this._contextRealityModels.length || index >= props.length)
      return;

    assert(this._contextRealityModels[index].url === props[index].tilesetUrl);
    props.splice(index, 1);
    this._contextRealityModels.splice(index, 1);
  }

  /** @internal */
  public hasAttachedRealityModel(name: string, url: string): boolean {
    return -1 !== this._contextRealityModels.findIndex((x) => x.matchesNameAndUrl(name, url));
  }

  /** The ViewFlags associated with this style.
   * @note If this style is associated with a [[ViewState]] attached to a [[Viewport]], use [[ViewState.viewFlags]] to modify the ViewFlags to ensure
   * the changes are promptly visible on the screen.
   */
  public get viewFlags(): ViewFlags { return this.settings.viewFlags; }
  public set viewFlags(flags: ViewFlags) { this.settings.viewFlags = flags; }

  /** The background color for this DisplayStyle */
  public get backgroundColor(): ColorDef { return this.settings.backgroundColor; }
  public set backgroundColor(val: ColorDef) { this.settings.backgroundColor = val; }

  /** The color used to draw geometry in monochrome mode.
   * @see [[ViewFlags.monochrome]] for enabling monochrome mode.
   */
  public get monochromeColor(): ColorDef { return this.settings.monochromeColor; }
  public set monochromeColor(val: ColorDef) { this.settings.monochromeColor = val; }

  /** @internal */
  public get backgroundMapPlane(): Plane3dByOriginAndUnitNormal | undefined { return (this.viewFlags.backgroundMap && this.backgroundMap instanceof BackgroundMapTileTreeReference) ? (this._backgroundMap as BackgroundMapTileTreeReference).plane : undefined; }

  /** Returns true if this is a 3d display style. */
  public is3d(): this is DisplayStyle3dState { return this instanceof DisplayStyle3dState; }

  /** Customize the way geometry belonging to a [[SubCategory]] is drawn by this display style.
   * @param id The ID of the SubCategory whose appearance is to be overridden.
   * @param ovr The overrides to apply to the [[SubCategoryAppearance]].
   * @note If this style is associated with a [[ViewState]] attached to a [[Viewport]], use [[ViewState.overrideSubCategory]] to ensure
   * the changes are promptly visible on the screen.
   * @see [[dropSubCategoryOverride]]
   */
  public overrideSubCategory(id: Id64String, ovr: SubCategoryOverride) { this.settings.overrideSubCategory(id, ovr); }

  /** Remove any [[SubCategoryOverride]] applied to a [[SubCategoryAppearance]] by this style.
   * @param id The ID of the [[SubCategory]].
   * @note If this style is associated with a [[ViewState]] attached to a [[Viewport]], use [[ViewState.dropSubCategoryOverride]] to ensure
   * the changes are promptly visible on the screen.
   * @see [[overrideSubCategory]]
   */
  public dropSubCategoryOverride(id: Id64String) { this.settings.dropSubCategoryOverride(id); }

  /** Returns true if an [[SubCategoryOverride]s are defined by this style. */
  public get hasSubCategoryOverride() { return this.settings.hasSubCategoryOverride; }

  /** Obtain the overrides applied to a [[SubCategoryAppearance]] by this style.
   * @param id The ID of the [[SubCategory]].
   * @returns The corresponding SubCategoryOverride, or undefined if the SubCategory's appearance is not overridden.
   * @see [[overrideSubCategory]]
   */
  public getSubCategoryOverride(id: Id64String): SubCategoryOverride | undefined { return this.settings.getSubCategoryOverride(id); }

  /** @internal */
  public getAttribution(div: HTMLTableElement, vp: ScreenViewport): void {
    if (this.viewFlags.backgroundMap)
      this._backgroundMap.addLogoCards(div, vp);
  }

  /** @internal */
  public get wantShadows(): boolean {
    return this.is3d() && this.viewFlags.shadows && false !== IModelApp.renderSystem.options.displaySolarShadows;
  }
}

/** A display style that can be applied to 2d views.
 * @public
 */
export class DisplayStyle2dState extends DisplayStyleState {
  /** @internal */
  public static get className() { return "DisplayStyle2d"; }
  private readonly _settings: DisplayStyleSettings;

  public get settings(): DisplayStyleSettings { return this._settings; }

  constructor(props: DisplayStyleProps, iModel: IModelConnection) {
    super(props, iModel);
    this._settings = new DisplayStyleSettings(this.jsonProperties);
  }
}

/** ###TODO: Generalize this into something like a PromiseOrValue<T> type which can contain
 * either a Promise<T> or a resolved T.
 * This is used to avoid flickering when loading skybox - don't want to load asynchronously unless we have to.
 * @internal
 */
export type SkyBoxParams = Promise<SkyBox.CreateParams | undefined> | SkyBox.CreateParams | undefined;

/** The SkyBox is part of an [[Environment]] drawn in the background of spatial views to provide context.
 * Several types of skybox are supported:
 *  - A cube with a texture image mapped to each face;
 *  - A sphere with a single texture image mapped to its surface;
 *  - A sphere with a [[Gradient]] mapped to its surface.
 * @public
 */
export abstract class SkyBox implements SkyBoxProps {
  /** Whether or not the skybox should be displayed. */
  public display: boolean = false;

  protected constructor(sky?: SkyBoxProps) {
    this.display = undefined !== sky && JsonUtils.asBool(sky.display, false);
  }

  public toJSON(): SkyBoxProps {
    return { display: this.display };
  }

  /** Instantiate a [[SkyBox]] from its JSON representation. */
  public static createFromJSON(json?: SkyBoxProps): SkyBox {
    let imageType = SkyBoxImageType.None;
    if (undefined !== json && undefined !== json.image && undefined !== json.image.type)
      imageType = json.image.type;

    let skybox: SkyBox | undefined;
    switch (imageType) {
      case SkyBoxImageType.Spherical:
        skybox = SkySphere.fromJSON(json!);
        break;
      case SkyBoxImageType.Cube:
        skybox = SkyCube.fromJSON(json!);
        break;
      case SkyBoxImageType.Cylindrical: // ###TODO...
        break;
    }

    return undefined !== skybox ? skybox : new SkyGradient(json);
  }

  /** @internal */
  public abstract loadParams(_system: RenderSystem, _iModel: IModelConnection): SkyBoxParams;
}

/** The SkyBox is part of an [[Environment]] drawn in the background of spatial views to provide context.
 * Several types of skybox are supported:
 *  - A cube with a texture image mapped to each face;
 *  - A sphere with a single texture image mapped to its surface;
 *  - A sphere with a [[Gradient]] mapped to its surface.
 * @public
 */
export namespace SkyBox {
  /** Parameters defining a spherical [[SkyBox]].
   * @public
   */
  export class SphereParams {
    public constructor(public readonly texture: RenderTexture, public readonly rotation: number) { }
  }

  /** Parameters used by the [[RenderSystem]] to instantiate a [[SkyBox]].
   * @public
   */
  export class CreateParams {
    public readonly gradient?: SkyGradient;
    public readonly sphere?: SphereParams;
    public readonly cube?: RenderTexture;
    public readonly zOffset: number;

    private constructor(zOffset: number, gradient?: SkyGradient, sphere?: SphereParams, cube?: RenderTexture) {
      this.gradient = gradient;
      this.sphere = sphere;
      this.cube = cube;
      this.zOffset = zOffset;
    }

    public static createForGradient(gradient: SkyGradient, zOffset: number) { return new CreateParams(zOffset, gradient); }
    public static createForSphere(sphere: SphereParams, zOffset: number) { return new CreateParams(zOffset, undefined, sphere); }
    public static createForCube(cube: RenderTexture) { return new CreateParams(0.0, undefined, undefined, cube); }
  }
}

/** A [[SkyBox]] drawn as a sphere with a gradient mapped to its interior surface.
 * @see [[SkyBox.createFromJSON]]
 * @public
 */
export class SkyGradient extends SkyBox {
  /** If true, a 2-color gradient is used (ground & sky colors only), if false a 4-color gradient is used, defaults to false. */
  public readonly twoColor: boolean = false;
  /** The color of the sky (for 4-color gradient is sky color at horizon), defaults to (143, 205, 255). */
  public readonly skyColor: ColorDef;
  /** The color of the ground (for 4-color gradient is ground color at horizon), defaults to (120, 143, 125). */
  public readonly groundColor: ColorDef;
  /** For 4-color gradient is color of sky at zenith (shown when looking straight up), defaults to (54, 117, 255). */
  public readonly zenithColor: ColorDef;
  /** For 4-color gradient is color of ground at nadir (shown when looking straight down), defaults to (40, 15, 0). */
  public readonly nadirColor: ColorDef;
  /** Controls speed of gradient change from skyColor to zenithColor (4-color SkyGradient only), defaults to 4.0. */
  public readonly skyExponent: number = 4.0;
  /** Controls speed of gradient change from groundColor to nadirColor (4-color SkyGradient only), defaults to 4.0. */
  public readonly groundExponent: number = 4.0;

  /** Construct a SkyGradient from its JSON representation. */
  public constructor(sky?: SkyBoxProps) {
    super(sky);

    sky = sky ? sky : {};
    this.twoColor = JsonUtils.asBool(sky.twoColor, false);
    this.groundExponent = JsonUtils.asDouble(sky.groundExponent, 4.0);
    this.skyExponent = JsonUtils.asDouble(sky.skyExponent, 4.0);
    this.groundColor = (undefined !== sky.groundColor) ? ColorDef.fromJSON(sky.groundColor) : ColorDef.from(120, 143, 125);
    this.zenithColor = (undefined !== sky.zenithColor) ? ColorDef.fromJSON(sky.zenithColor) : ColorDef.from(54, 117, 255);
    this.nadirColor = (undefined !== sky.nadirColor) ? ColorDef.fromJSON(sky.nadirColor) : ColorDef.from(40, 15, 0);
    this.skyColor = (undefined !== sky.skyColor) ? ColorDef.fromJSON(sky.skyColor) : ColorDef.from(143, 205, 255);
  }

  public toJSON(): SkyBoxProps {
    const val = super.toJSON();

    val.twoColor = this.twoColor ? true : undefined;
    val.groundExponent = this.groundExponent !== 4.0 ? this.groundExponent : undefined;
    val.skyExponent = this.skyExponent !== 4.0 ? this.skyExponent : undefined;

    val.groundColor = this.groundColor.toJSON();
    val.zenithColor = this.zenithColor.toJSON();
    val.nadirColor = this.nadirColor.toJSON();
    val.skyColor = this.skyColor.toJSON();

    return val;
  }

  /** @internal */
  public loadParams(_system: RenderSystem, iModel: IModelConnection): SkyBoxParams {
    return SkyBox.CreateParams.createForGradient(this, iModel.globalOrigin.z);
  }
}

/** A [[SkyBox]] drawn as a sphere with an image mapped to its interior surface.
 * @see [[SkyBox.createFromJSON]]
 * @public
 */
export class SkySphere extends SkyBox {
  /** The Id of a persistent texture element stored in the iModel which supplies the skybox image. */
  public textureId: Id64String;

  private constructor(textureId: Id64String, display?: boolean) {
    super({ display });
    this.textureId = textureId;
  }

  /** Create a [[SkySphere]] from its JSON representation.
   * @param json: The JSON representation
   * @returns A SkySphere, or undefined if the JSON lacks a valid texture Id.
   */
  public static fromJSON(json: SkyBoxProps): SkySphere | undefined {
    const textureId = Id64.fromJSON(undefined !== json.image ? json.image.texture : undefined);
    return undefined !== textureId && Id64.isValid(textureId) ? new SkySphere(textureId, json.display) : undefined;
  }

  public toJSON(): SkyBoxProps {
    const val = super.toJSON();
    val.image = {
      type: SkyBoxImageType.Spherical,
      texture: this.textureId,
    };
    return val;
  }

  /** @internal */
  public loadParams(system: RenderSystem, iModel: IModelConnection): SkyBoxParams {
    const rotation = 0.0; // ###TODO: from where do we obtain rotation?
    const createParams = (tex?: RenderTexture) => undefined !== tex ? SkyBox.CreateParams.createForSphere(new SkyBox.SphereParams(tex, rotation), iModel.globalOrigin.z) : undefined;
    const texture = system.findTexture(this.textureId, iModel);
    if (undefined !== texture)
      return createParams(texture);
    else
      return system.loadTexture(this.textureId, iModel).then((tex) => createParams(tex));
  }
}

/** A [[SkyBox]] drawn as a cube with an image mapped to each of its interior faces.
 * Each member specifies the Id of a persistent texture element stored in the iModel
 * from which the image mapped to the corresponding face is obtained.
 * @see [[SkyBox.createFromJSON]].
 * @public
 */
export class SkyCube extends SkyBox implements SkyCubeProps {
  /** Id of a persistent texture element stored in the iModel to use for the front side of the skybox cube. */
  public readonly front: Id64String;
  /** Id of a persistent texture element stored in the iModel to use for the back side of the skybox cube. */
  public readonly back: Id64String;
  /** Id of a persistent texture element stored in the iModel to use for the top of the skybox cube. */
  public readonly top: Id64String;
  /** Id of a persistent texture element stored in the iModel to use for the bottom of the skybox cube. */
  public readonly bottom: Id64String;
  /** Id of a persistent texture element stored in the iModel to use for the front right of the skybox cube. */
  public readonly right: Id64String;
  /** Id of a persistent texture element stored in the iModel to use for the left side of the skybox cube. */
  public readonly left: Id64String;

  private constructor(front: Id64String, back: Id64String, top: Id64String, bottom: Id64String, right: Id64String, left: Id64String, display?: boolean) {
    super({ display });
    this.front = front;
    this.back = back;
    this.top = top;
    this.bottom = bottom;
    this.right = right;
    this.left = left;
  }

  /** Use [[SkyCube.create]].
   * @internal
   */
  public static fromJSON(skyboxJson: SkyBoxProps): SkyCube | undefined {
    const image = skyboxJson.image;
    const json = (undefined !== image && image.type === SkyBoxImageType.Cube ? image.textures : undefined) as SkyCubeProps;
    if (undefined === json)
      return undefined;

    return this.create(Id64.fromJSON(json.front), Id64.fromJSON(json.back), Id64.fromJSON(json.top), Id64.fromJSON(json.bottom), Id64.fromJSON(json.right), Id64.fromJSON(json.left), skyboxJson.display);
  }

  public toJSON(): SkyBoxProps {
    const val = super.toJSON();
    val.image = {
      type: SkyBoxImageType.Cube,
      textures: {
        front: this.front,
        back: this.back,
        top: this.top,
        bottom: this.bottom,
        right: this.right,
        left: this.left,
      },
    };
    return val;
  }

  /** Create and return a SkyCube. (Calls the SkyCube constructor after validating the Ids passed in for the images.)
   * @param front The Id of the image to use for the front side of the sky cube.
   * @param back The Id of the image to use for the back side of the sky cube.
   * @param top The Id of the image to use for the top side of the sky cube.
   * @param bottom The Id of the image to use for the bottom side of the sky cube.
   * @param right The Id of the image to use for the right side of the sky cube.
   * @param left The Id of the image to use for the left side of the sky cube.
   * @returns A SkyCube, or undefined if any of the supplied texture Ids are invalid.
   * @note All Ids must refer to a persistent texture element stored in the iModel.
   */
  public static create(front: Id64String, back: Id64String, top: Id64String, bottom: Id64String, right: Id64String, left: Id64String, display?: boolean): SkyCube | undefined {
    if (!Id64.isValid(front) || !Id64.isValid(back) || !Id64.isValid(top) || !Id64.isValid(bottom) || !Id64.isValid(right) || !Id64.isValid(left))
      return undefined;
    else
      return new SkyCube(front, back, top, bottom, right, left, display);
  }

  /** @internal */
  public loadParams(system: RenderSystem, iModel: IModelConnection): SkyBoxParams {
    // ###TODO: We never cache the actual texture *images* used here to create a single cubemap texture...
    const textureIds = new Set<string>([this.front, this.back, this.top, this.bottom, this.right, this.left]);
    const promises = new Array<Promise<TextureImage | undefined>>();
    for (const textureId of textureIds)
      promises.push(system.loadTextureImage(textureId, iModel));

    return Promise.all(promises).then((images) => {
      // ###TODO there's gotta be a simpler way to map the unique images back to their texture Ids...
      const idToImage = new Map<string, HTMLImageElement>();
      let index = 0;
      for (const textureId of textureIds) {
        const image = images[index++];
        if (undefined === image || undefined === image.image)
          return undefined;
        else
          idToImage.set(textureId, image.image);
      }

      const params = new RenderTexture.Params(undefined, RenderTexture.Type.SkyBox);
      const textureImages = [
        idToImage.get(this.front)!, idToImage.get(this.back)!, idToImage.get(this.top)!,
        idToImage.get(this.bottom)!, idToImage.get(this.right)!, idToImage.get(this.left)!,
      ];

      const texture = system.createTextureFromCubeImages(textureImages[0], textureImages[1], textureImages[2], textureImages[3], textureImages[4], textureImages[5], iModel, params);
      return undefined !== texture ? SkyBox.CreateParams.createForCube(texture) : undefined;
    }).catch((_err) => {
      return undefined;
    });
  }
}

/** Describes the [[SkyBox]] and [[GroundPlane]] associated with a [[DisplayStyle3dState]].
 * @public
 */
export class Environment implements EnvironmentProps {
  public readonly sky: SkyBox;
  public readonly ground: GroundPlane;

  /** Construct from JSON representation. */
  public constructor(json?: EnvironmentProps) {
    this.sky = SkyBox.createFromJSON(undefined !== json ? json.sky : undefined);
    this.ground = new GroundPlane(undefined !== json ? json.ground : undefined);
  }

  public toJSON(): EnvironmentProps {
    return {
      sky: this.sky.toJSON(),
      ground: this.ground.toJSON(),
    };
  }
}

function isSameSkyBox(a: SkyBoxProps | undefined, b: SkyBoxProps | undefined): boolean {
  if (undefined === a || undefined === b)
    return undefined === a && undefined === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A [[DisplayStyleState]] that can be applied to spatial views.
 * @public
 */
export class DisplayStyle3dState extends DisplayStyleState {
  /** @internal */
  public static get className() { return "DisplayStyle3d"; }
  private _skyBoxParams?: SkyBox.CreateParams;
  private _skyBoxParamsLoaded?: boolean;
  private _environment?: Environment;
  private _settings: DisplayStyle3dSettings;

  /** @internal */
  public clone(iModel: IModelConnection): this {
    const clone = super.clone(iModel);
    if (undefined === iModel || this.iModel === iModel) {
      clone._skyBoxParams = this._skyBoxParams;
      clone._skyBoxParamsLoaded = this._skyBoxParamsLoaded;
    }

    return clone;
  }

  public get settings(): DisplayStyle3dSettings { return this._settings; }

  public constructor(props: DisplayStyleProps, iModel: IModelConnection) {
    super(props, iModel);
    this._settings = new DisplayStyle3dSettings(this.jsonProperties);
  }

  /** The [[SkyBox]] and [[GroundPlane]] settings for this style. */
  public get environment(): Environment {
    if (undefined === this._environment)
      this._environment = new Environment(this.settings.environment);

    return this._environment;
  }
  public set environment(env: Environment) {
    const prevEnv = this.settings.environment;
    this.settings.environment = env.toJSON();
    this._environment = undefined;

    // Regenerate the skybox if the sky settings have changed
    if (undefined !== this._skyBoxParamsLoaded && !isSameSkyBox(env.sky, prevEnv.sky)) {
      // NB: We only reset _skyBoxParamsLoaded - keep the previous skybox (if any) to continue drawing until the new one (if any) is ready
      this._skyBoxParamsLoaded = undefined;
    }
  }

  private onLoadSkyBoxParams(params?: SkyBox.CreateParams, vp?: Viewport): void {
    this._skyBoxParams = params;
    this._skyBoxParamsLoaded = true;
    if (undefined !== vp)
      vp.invalidateDecorations();
  }

  /** Attempts to create textures for the sky of the environment, and load it into the sky. Returns true on success, and false otherwise.
   * @internal
   */
  public loadSkyBoxParams(system: RenderSystem, vp?: Viewport): SkyBox.CreateParams | undefined {
    if (undefined === this._skyBoxParamsLoaded) {
      const params = this.environment.sky.loadParams(system, this.iModel);
      if (undefined === params || params instanceof SkyBox.CreateParams) {
        this.onLoadSkyBoxParams(params, vp);
      } else {
        this._skyBoxParamsLoaded = false; // indicates we're currently loading them.
        params.then((result?: SkyBox.CreateParams) => this.onLoadSkyBoxParams(result, vp)).catch((_err) => this.onLoadSkyBoxParams(undefined));
      }
    }

    return this._skyBoxParams;
  }
  /** @beta */
  public get sunDirection(): Vector3d | undefined { return this.settings.sunDir; }

  /** set the solar direction based on time value
   * @param time The time in unix time milliseconds.
   * @beta
   */
  public setSunTime(time: number) {
    let cartoCenter;
    if (this.iModel.isGeoLocated) {
      const projectExtents = this.iModel.projectExtents;
      const projectCenter = Point3d.createAdd2Scaled(projectExtents.low, .5, projectExtents.high, .5);
      cartoCenter = this.iModel.spatialToCartographicFromEcef(projectCenter);
    } else {
      cartoCenter = Cartographic.fromDegrees(-75.17035, 39.954927, 0.0);
    }

    this.settings.sunDir = calculateSolarDirection(new Date(time), cartoCenter);

  }
}
