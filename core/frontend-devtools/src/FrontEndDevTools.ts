/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Utilities
 */

import { IModelApp } from "@bentley/imodeljs-frontend";
import { ReportWebGLCompatibilityTool } from "./tools/ReportWebGLCompatibilityTool";
import {
  ToggleLogZTool,
  TogglePrimitiveVisibilityTool,
  ToggleReadPixelsTool,
  SetVolClassIntersectOn,
  SetVolClassIntersectOff,
  ToggleDrapeFrustumTool,
} from "./tools/RenderTargetTools";
import {
  CompileShadersTool,
  LoseWebGLContextTool,
  ToggleWiremeshTool,
} from "./tools/RenderSystemTools";
import {
  ClearIsolatedElementsTool,
  EmphasizeSelectedElementsTool,
  IsolateSelectedElementsTool,
} from "./tools/EmphasizeElementsTool";
import { InspectElementTool } from "./tools/InspectElementTool";
import { ChangeViewFlagsTool, ToggleSkyboxTool } from "./tools/ChangeViewFlagsTool";
import {
  SaveViewTool,
  ApplyViewTool,
} from "./tools/SavedViews";
import { ToggleProjectExtentsTool } from "./tools/ProjectExtents";
import {
  ToggleFrustumSnapshotTool,
  ToggleSelectedViewFrustumTool,
  ToggleShadowFrustumTool,
} from "./tools/FrustumDecoration";
import {
  ChangeEmphasisSettingsTool,
  ChangeHiliteSettingsTool,
  DefaultTileSizeModifierTool,
  FadeOutTool,
  FreezeSceneTool,
  SetAspectRatioSkewTool,
  ShowTileVolumesTool,
  ViewportTileSizeModifierTool,
  ViewportAddRealityModel,
} from "./tools/ViewportTools";
import { RealityTransitionTool } from "./tools/RealityTransitionTool";
import { ToggleToolTipsTool } from "./tools/ToolTipProvider";
import { ChangeUnitsTool } from "./tools/ChangeUnitsTool";
import { ToggleTileRequestDecorationTool } from "./tools/TileRequestDecoration";
import { MeasureTileLoadTimeTool } from "./tools/MeasureTileLoadTime";
import { SelectElementsByIdTool } from "./tools/SelectionTools";
import { AnimationIntervalTool } from "./tools/AnimationIntervalTool";

/** Entry-point for the package. Before using the package you *must* call [[FrontendDevTools.initialize]].
 * @beta
 */
export class FrontendDevTools {
  private static _initialized = false;

  /** Call this before using the package (e.g., before instantiating any of its widgets or attempting to use any of its tools.
   * To initialize when starting up your app:
   * ```ts
   *   IModelApp.startup();
   *   await FrontendDevTools.initialize();
   * ```
   * @beta
   */
  public static async initialize(): Promise<void> {
    if (this._initialized)
      return Promise.resolve();

    this._initialized = true;

    const i18n = IModelApp.i18n.registerNamespace("FrontendDevTools");

    InspectElementTool.register(i18n);
    ReportWebGLCompatibilityTool.register(i18n);

    LoseWebGLContextTool.register(i18n);
    ToggleWiremeshTool.register(i18n);
    CompileShadersTool.register(i18n);

    ToggleReadPixelsTool.register(i18n);
    ToggleLogZTool.register(i18n);
    TogglePrimitiveVisibilityTool.register(i18n);
    ToggleDrapeFrustumTool.register(i18n);

    ClearIsolatedElementsTool.register(i18n);
    EmphasizeSelectedElementsTool.register(i18n);
    IsolateSelectedElementsTool.register(i18n);

    ChangeViewFlagsTool.register(i18n);
    ToggleSkyboxTool.register(i18n);

    SaveViewTool.register(i18n);
    ApplyViewTool.register(i18n);

    ToggleProjectExtentsTool.register(i18n);
    ToggleToolTipsTool.register(i18n);

    ToggleFrustumSnapshotTool.register(i18n);
    ToggleSelectedViewFrustumTool.register(i18n);
    ToggleShadowFrustumTool.register(i18n);

    FreezeSceneTool.register(i18n);
    SetAspectRatioSkewTool.register(i18n);
    ShowTileVolumesTool.register(i18n);
    ChangeHiliteSettingsTool.register(i18n);
    ChangeEmphasisSettingsTool.register(i18n);
    FadeOutTool.register(i18n);
    DefaultTileSizeModifierTool.register(i18n);
    ViewportTileSizeModifierTool.register(i18n);
    ViewportAddRealityModel.register(i18n);

    RealityTransitionTool.register(i18n);
    ChangeUnitsTool.register(i18n);
    ToggleTileRequestDecorationTool.register(i18n);
    MeasureTileLoadTimeTool.register(i18n);
    SelectElementsByIdTool.register(i18n);
    AnimationIntervalTool.register(i18n);

    SetVolClassIntersectOn.register(i18n);
    SetVolClassIntersectOff.register(i18n);

    return i18n.readFinished;
  }
}
