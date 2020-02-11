/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Views
 */

import { RenderSchedule, RgbColor } from "@bentley/imodeljs-common";
import { Range1d, Transform, Point3d, Vector3d, Matrix3d, Plane3dByOriginAndUnitNormal, ClipPlane, ClipPrimitive, ClipVector, ConvexClipPlaneSet, UnionOfConvexClipPlaneSets, Point4d } from "@bentley/geometry-core";
import { Id64String, Id64 } from "@bentley/bentleyjs-core";
import { FeatureSymbology } from "./render/FeatureSymbology";
import { IModelApp } from "./IModelApp";
import { IModelConnection } from "./IModelConnection";
import { DisplayStyleState } from "./DisplayStyleState";
import { AnimationBranchStates, AnimationBranchState, RenderClipVolume } from "./render/System";

/** @internal */
export namespace RenderScheduleState {
  class Interval {
    constructor(public index0: number = 0, public index1: number = 0, public fraction: number = 0.0) { }
    public init(index0: number, index1: number, fraction: number) { this.index0 = index0; this.index1 = index1; this.fraction = fraction; }
  }
  function interpolate(value0: number, value1: number, fraction: number) {
    return value0 + fraction * (value1 - value0);
  }
  export class TimelineEntry implements RenderSchedule.TimelineEntryProps {
    public time: number;
    public interpolation: number;
    constructor(props: RenderSchedule.TimelineEntryProps) {
      this.time = props.time;
      this.interpolation = props.interpolation;
    }
  }
  export class VisibilityEntry extends TimelineEntry implements RenderSchedule.VisibilityEntryProps {
    public value: number = 100.0;
    constructor(props: RenderSchedule.VisibilityEntryProps) {
      super(props);
      this.value = props.value;
    }
  }
  export class ColorEntry extends TimelineEntry implements RenderSchedule.ColorEntryProps {
    public value: { red: number, green: number, blue: number };
    constructor(props: RenderSchedule.ColorEntryProps) {
      super(props);
      this.value = props.value;
    }
  }

  export class TransformEntry extends TimelineEntry implements RenderSchedule.TransformEntryProps {
    public value: RenderSchedule.TransformProps;
    constructor(props: RenderSchedule.TransformEntryProps) {
      super(props);
      this.value = props.value;
    }
  }
  export class CuttingPlaneEntry extends TimelineEntry implements RenderSchedule.CuttingPlaneEntryProps {
    public value: RenderSchedule.CuttingPlaneProps;
    constructor(props: RenderSchedule.CuttingPlaneEntryProps) {
      super(props);
      this.value = props.value;
    }
  }
  export class Timeline implements RenderSchedule.TimelineProps {
    public visibilityTimeline?: VisibilityEntry[];
    public colorTimeline?: ColorEntry[];
    public transformTimeline?: TransformEntry[];
    public cuttingPlaneTimeline?: CuttingPlaneEntry[];
    public currentClip?: RenderClipVolume;

    public extractTimelinesFromJSON(json: RenderSchedule.TimelineProps) {
      if (json.visibilityTimeline) {
        this.visibilityTimeline = [];
        json.visibilityTimeline.forEach((entry) => this.visibilityTimeline!.push(new VisibilityEntry(entry)));
      }
      if (json.colorTimeline) {
        this.colorTimeline = [];
        json.colorTimeline.forEach((entry) => this.colorTimeline!.push(new ColorEntry(entry)));
      }
      if (json.transformTimeline) {
        this.transformTimeline = [];
        json.transformTimeline.forEach((entry) => this.transformTimeline!.push(new TransformEntry(entry)));
      }
      if (json.cuttingPlaneTimeline) {
        this.cuttingPlaneTimeline = [];
        json.cuttingPlaneTimeline.forEach((entry) => this.cuttingPlaneTimeline!.push(new CuttingPlaneEntry(entry)));
      }
    }
    public get duration() {
      const duration = Range1d.createNull();
      if (this.visibilityTimeline) this.visibilityTimeline.forEach((entry) => duration.extendX(entry.time));
      if (this.colorTimeline) this.colorTimeline.forEach((entry) => duration.extendX(entry.time));
      if (this.transformTimeline) this.transformTimeline.forEach((entry) => duration.extendX(entry.time));
      if (this.cuttingPlaneTimeline) this.cuttingPlaneTimeline.forEach((entry) => duration.extendX(entry.time));

      return duration;
    }

    public static findTimelineInterval(interval: Interval, time: number, timeline?: TimelineEntry[]) {
      if (!timeline || timeline.length === 0)
        return false;

      if (time < timeline[0].time) {
        interval.init(0, 0, 0);
        return true;
      }
      const last = timeline.length - 1;
      if (time >= timeline[last].time) {
        interval.init(last, last, 0.0);
        return true;
      }
      let i: number;
      for (i = 0; i < last; i++)
        if (timeline[i].time <= time && timeline[i + 1].time >= time) {
          interval.init(i, i + 1, timeline[i].interpolation === 2 ? ((time - timeline[i].time) / (timeline[i + 1].time - timeline[i].time)) : 0.0);
          break;
        }
      return true;
    }

    public getVisibilityOverride(time: number, interval: Interval): number {
      if (undefined === this.visibilityTimeline ||
        !ElementTimeline.findTimelineInterval(interval, time, this.visibilityTimeline) && this.visibilityTimeline![interval.index0].value !== null)
        return 100.0;
      const timeline = this.visibilityTimeline!;
      let visibility = timeline[interval.index0].value;
      if (visibility === undefined || visibility === null)
        return 100.0;

      if (interval.fraction > 0)
        visibility = interpolate(visibility, timeline[interval.index1].value, interval.fraction);

      return visibility;
    }
    public getColorOverride(time: number, interval: Interval): RgbColor | undefined {
      let colorOverride;
      if (undefined !== this.colorTimeline && Timeline.findTimelineInterval(interval, time, this.colorTimeline) && this.colorTimeline![interval.index0].value !== null) {
        const entry0 = this.colorTimeline![interval.index0].value;
        if (interval.fraction > 0) {
          const entry1 = this.colorTimeline![interval.index1].value;
          colorOverride = new RgbColor(interpolate(entry0.red, entry1.red, interval.fraction), interpolate(entry0.green, entry1.green, interval.fraction), interpolate(entry0.blue, entry1.blue, interval.fraction));
        } else
          colorOverride = new RgbColor(entry0.red, entry0.green, entry0.blue);
      }
      return colorOverride;
    }

    public getAnimationTransform(time: number, interval: Interval): Transform | undefined {
      if (!ElementTimeline.findTimelineInterval(interval, time, this.transformTimeline) || this.transformTimeline![interval.index0].value === null)
        return undefined;

      if (interval.index0 < 0)
        return Transform.createIdentity();

      const timeline = this.transformTimeline!;
      const value = timeline[interval.index0].value;
      const transform = Transform.fromJSON(value.transform);
      if (interval.fraction > 0.0) {
        const value1 = timeline[interval.index1].value;
        if (value1.pivot !== null && value1.orientation !== null && value1.position !== null) {
          const q0 = Point4d.fromJSON(value.orientation), q1 = Point4d.fromJSON(value1.orientation);
          const sum = Point4d.interpolateQuaternions(q0, interval.fraction, q1);
          const interpolatedMatrix = Matrix3d.createFromQuaternion(sum);
          const position0 = Vector3d.fromJSON(value.position), position1 = Vector3d.fromJSON(value1.position);
          const pivot = Vector3d.fromJSON(value.pivot);
          const pre = Transform.createTranslation(pivot);
          const post = Transform.createTranslation(position0.interpolate(interval.fraction, position1));
          const product = post.multiplyTransformMatrix3d(interpolatedMatrix);
          transform.setFromJSON(product.multiplyTransformTransform(pre));
        } else {
          const transform1 = Transform.fromJSON(value1.transform);
          const q0 = transform.matrix.inverse()!.toQuaternion(), q1 = transform1.matrix.inverse()!.toQuaternion();
          const sum = Point4d.interpolateQuaternions(q0, interval.fraction, q1);
          const interpolatedMatrix = Matrix3d.createFromQuaternion(sum);

          const origin = Vector3d.createFrom(transform.origin), origin1 = Vector3d.createFrom(transform1.origin);
          transform.setFromJSON({ origin: origin.interpolate(interval.fraction, origin1), matrix: interpolatedMatrix });
        }
      }
      return transform;
    }

    public getAnimationClip(time: number, interval: Interval): RenderClipVolume | undefined {
      if (this.currentClip) {
        this.currentClip.dispose();
        this.currentClip = undefined;
      }
      if (!ElementTimeline.findTimelineInterval(interval, time, this.cuttingPlaneTimeline) || this.cuttingPlaneTimeline![interval.index0].value === null)
        return undefined;

      const timeline = this.cuttingPlaneTimeline!;
      const value = timeline[interval.index0].value;
      if (!value)
        return undefined;

      const position = Point3d.fromJSON(value.position);
      const direction = Vector3d.fromJSON(value.direction);
      if (interval.fraction > 0.0) {
        const value1 = timeline[interval.index1].value;
        position.interpolate(interval.fraction, Point3d.fromJSON(value1.position), position);
        direction.interpolate(interval.fraction, Vector3d.fromJSON(value1.direction), direction);
      } else {
        if (value.hidden || value.visible)
          return undefined;
      }

      direction.negate(direction);
      direction.normalizeInPlace();
      const plane = Plane3dByOriginAndUnitNormal.create(position, direction);
      const clipPlane = ClipPlane.createPlane(plane!);
      const clipPlaneSet = UnionOfConvexClipPlaneSets.createConvexSets([ConvexClipPlaneSet.createPlanes([clipPlane])]);
      const clipPrimitive = ClipPrimitive.createCapture(clipPlaneSet);
      const clipVector = ClipVector.createCapture([clipPrimitive]);
      this.currentClip = IModelApp.renderSystem.createClipVolume(clipVector);
      return this.currentClip;
    }
  }

  export class ElementTimeline extends Timeline implements RenderSchedule.ElementTimelineProps {
    public elementIds: Id64String[];
    public batchId: number;

    public get isValid() { return this.elementIds.length > 0 && (Array.isArray(this.visibilityTimeline) && this.visibilityTimeline.length > 0) || (Array.isArray(this.colorTimeline) && this.colorTimeline.length > 0); }
    private constructor(elementIds: Id64String[], batchId: number) {
      super();
      this.elementIds = elementIds; this.batchId = batchId;
    }
    public static fromJSON(json?: RenderSchedule.ElementTimelineProps): ElementTimeline {
      if (!json)
        return new ElementTimeline([], 0);

      const val = new ElementTimeline(json.elementIds, json.batchId);
      val.extractTimelinesFromJSON(json);
      return val;
    }

    public get containsFeatureOverrides() { return undefined !== this.visibilityTimeline || undefined !== this.colorTimeline; }
    public get containsAnimation() { return undefined !== this.transformTimeline || undefined !== this.cuttingPlaneTimeline || (undefined !== this.colorTimeline && 0 !== this.batchId) || (undefined !== this.visibilityTimeline && 0 !== this.batchId); }
    public getSymbologyOverrides(overrides: FeatureSymbology.Overrides, time: number, interval: Interval, batchId: number, elementIds: Id64String[]) {
      let transparencyOverride;

      const visibility = this.getVisibilityOverride(time, interval);
      if (visibility <= 0) {
        overrides.setAnimationNodeNeverDrawn(batchId);
        return;
      }
      if (visibility < 100)
        transparencyOverride = 1.0 - visibility / 100.0;

      const colorOverride = this.getColorOverride(time, interval);

      if (colorOverride || transparencyOverride) {
        if (0 === batchId) {
          for (const elementId of elementIds)
            overrides.overrideElement(elementId, FeatureSymbology.Appearance.fromJSON({ rgb: colorOverride, transparency: transparencyOverride }));
        } else {
          overrides.overrideAnimationNode(batchId, FeatureSymbology.Appearance.fromJSON({ rgb: colorOverride, transparency: transparencyOverride }));
        }
      }
    }
  }

  export class ModelTimeline extends Timeline implements RenderSchedule.ModelTimelineProps {
    public modelId: Id64String;
    public elementTimelines: ElementTimeline[] = [];
    public containsFeatureOverrides: boolean = false;
    public containsModelAnimation: boolean = false;
    public containsElementAnimation: boolean = false;
    private constructor(modelId: Id64String) {
      super();
      this.modelId = modelId;
    }
    public get duration() {
      const duration = super.duration;
      this.elementTimelines.forEach((element) => duration.extendRange(element.duration));
      return duration;
    }

    public static fromJSON(json?: RenderSchedule.ModelTimelineProps, displayStyle?: DisplayStyleState) {
      if (!json)
        return new ModelTimeline("");

      let modelId = json.modelId;
      if (undefined !== json.realityModelUrl && undefined !== displayStyle) {
        displayStyle.forEachRealityModel((realityModel) => {
          if (realityModel.url === json.realityModelUrl &&
            undefined !== realityModel.treeRef &&
            undefined !== realityModel.treeRef.treeOwner.tileTree)
            modelId = realityModel.treeRef.treeOwner.tileTree.modelId;
        });
      }

      const value = new ModelTimeline(modelId);
      value.extractTimelinesFromJSON(json);
      value.containsFeatureOverrides = undefined !== value.visibilityTimeline || undefined !== value.colorTimeline;
      value.containsModelAnimation = undefined !== value.transformTimeline || undefined !== value.cuttingPlaneTimeline;
      if (json.elementTimelines)
        json.elementTimelines.forEach((element) => {
          const elementTimeline = ElementTimeline.fromJSON(element);
          value.elementTimelines.push(elementTimeline);
          if (elementTimeline.containsFeatureOverrides)
            value.containsFeatureOverrides = true;
          if (elementTimeline.containsAnimation)
            value.containsElementAnimation = true;
        });

      return value;
    }

    public getSymbologyOverrides(overrides: FeatureSymbology.Overrides, time: number) {
      const interval = new Interval();
      let transparencyOverride;

      const visibility = this.getVisibilityOverride(time, interval);

      if (visibility < 100)
        transparencyOverride = 1.0 - visibility / 100.0;

      const colorOverride = this.getColorOverride(time, interval);

      if (colorOverride || transparencyOverride) {
        console.log("Model Transparency: " + transparencyOverride);   // tslint:disable-line
        overrides.overrideModel(this.modelId, FeatureSymbology.Appearance.fromJSON({ rgb: colorOverride, transparency: transparencyOverride }));
      }

      this.elementTimelines.forEach((entry) => entry.getSymbologyOverrides(overrides, time, interval, entry.batchId, entry.elementIds));
    }
    private getAnimationBranch(timeline: Timeline, branchId: number, branches: AnimationBranchStates, scheduleTime: number, interval: Interval) {
      const transform = timeline.getAnimationTransform(scheduleTime, interval);
      const clip = timeline.getAnimationClip(scheduleTime, interval);
      if (transform || clip)
        branches.set(this.modelId + ((branchId < 0) ? "" : ("_Node_" + branchId.toString())), new AnimationBranchState(transform, clip));
    }

    public getAnimationBranches(branches: AnimationBranchStates, scheduleTime: number) {
      const interval = new Interval();
      this.getAnimationBranch(this, -1, branches, scheduleTime, interval);
      for (let i = 0; i < this.elementTimelines.length; i++) {
        const elementTimeline = this.elementTimelines[i];
        if (elementTimeline.getVisibilityOverride(scheduleTime, interval) <= 0.0) {
          branches.set(this.modelId + "_Node_" + (i + 1).toString(), new AnimationBranchState(undefined, undefined, true));
        } else {
          this.getAnimationBranch(elementTimeline, i + 1, branches, scheduleTime, interval);

        }
      }
    }
  }

  export class Script {
    public modelTimelines: ModelTimeline[] = [];
    public iModel: IModelConnection;
    public displayStyleId: Id64String;
    public containsElementAnimation = false;
    public containsModelAnimation = false;

    constructor(displayStyleId: Id64String, iModel: IModelConnection) { this.displayStyleId = displayStyleId; this.iModel = iModel; }
    public static fromJSON(displayStyleId: Id64String, iModel: IModelConnection, modelTimelines: RenderSchedule.ModelTimelineProps[]): Script | undefined {
      const value = new Script(displayStyleId, iModel);
      modelTimelines.forEach((entry) => value.modelTimelines.push(ModelTimeline.fromJSON(entry)));

      for (const modelTimeline of value.modelTimelines) {
        if (modelTimeline.containsModelAnimation) value.containsModelAnimation = true;
        if (modelTimeline.containsElementAnimation) value.containsElementAnimation = true;
      }
      return value;
    }

    public getAnimationBranches(scheduleTime: number): AnimationBranchStates | undefined {
      if (!this.containsModelAnimation && !this.containsElementAnimation)
        return undefined;

      const animationBranches = new Map<string, AnimationBranchState>();
      this.modelTimelines.forEach((modelTimeline) => modelTimeline.getAnimationBranches(animationBranches, scheduleTime));
      return animationBranches;
    }

    public get duration() {
      const duration = Range1d.createNull();
      this.modelTimelines.forEach((model) => duration.extendRange(model.duration));
      return duration;
    }

    public get containsFeatureOverrides() {
      let containsFeatureOverrides = false;
      this.modelTimelines.forEach((entry) => { if (entry.containsFeatureOverrides) containsFeatureOverrides = true; });
      return containsFeatureOverrides;
    }

    public getSymbologyOverrides(overrides: FeatureSymbology.Overrides, time: number) {
      this.modelTimelines.forEach((entry) => entry.getSymbologyOverrides(overrides, time));
    }
    public getModelAnimationId(modelId: Id64String): Id64String | undefined {
      // Only if the animation contains animation (transform or cutting plane) of individual elements do we require separate tilesets for animations.
      if (Id64.isTransient(modelId))
        return undefined;

      for (const modelTimeline of this.modelTimelines)
        if (modelTimeline.modelId === modelId && modelTimeline.containsElementAnimation)
          return this.displayStyleId;

      return undefined;
    }
  }
}
