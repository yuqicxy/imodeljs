/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { Transform } from "@bentley/geometry-core";
import { ViewFlags, RenderMode, Feature } from "@bentley/imodeljs-common";
import { Id64, Id64String, assert, lowerBound } from "@bentley/bentleyjs-core";
import { IModelConnection } from "../../IModelConnection";
import { FeatureSymbology } from "../FeatureSymbology";
import { Branch, Batch } from "./Graphic";
import { ClipPlanesVolume, ClipMaskVolume } from "./ClipVolume";
import { PlanarClassifier } from "./PlanarClassifier";
import { TextureDrape } from "./TextureDrape";

/**
 * Represents a branch node in the scene graph, with associated view flags and transform to be applied to
 * all sub-nodes of the branch.
 * @internal
 */
export class BranchState {
  public readonly transform: Transform;
  private readonly _viewFlags: ViewFlags;
  public symbologyOverrides: FeatureSymbology.Overrides;
  public readonly clipVolume?: ClipPlanesVolume | ClipMaskVolume;
  public readonly planarClassifier?: PlanarClassifier;
  public readonly textureDrape?: TextureDrape;
  public readonly iModel?: IModelConnection;

  public static fromBranch(prev: BranchState, branch: Branch) {
    const vf = branch.branch.getViewFlags(prev.viewFlags);
    const transform = prev.transform.multiplyTransformTransform(branch.localToWorldTransform);
    const ovrs = undefined !== branch.branch.symbologyOverrides ? branch.branch.symbologyOverrides : prev.symbologyOverrides;
    const iModel = undefined !== branch.iModel ? branch.iModel : prev.iModel;
    const planarClassifier = (undefined !== branch.planarClassifier && undefined !== branch.planarClassifier.texture) ? branch.planarClassifier : prev.planarClassifier;
    const textureDrape = undefined !== branch.textureDrape ? branch.textureDrape : prev.textureDrape;
    const clip = undefined !== branch.clips ? branch.clips : prev.clipVolume;
    return new BranchState(vf, transform, ovrs, clip, planarClassifier, textureDrape, iModel);
  }

  public static create(ovrs: FeatureSymbology.Overrides, flags?: ViewFlags, transform?: Transform, clip?: ClipMaskVolume | ClipPlanesVolume, planarClassifier?: PlanarClassifier, iModel?: IModelConnection) {
    return new BranchState(ViewFlags.createFrom(flags), undefined !== transform ? transform.clone() : Transform.createIdentity(), ovrs, clip, planarClassifier, undefined, iModel);
  }

  public static createForDecorations(): BranchState {
    const vf = new ViewFlags();
    vf.renderMode = RenderMode.SmoothShade;
    vf.lighting = false;
    return new BranchState(vf, Transform.createIdentity(), new FeatureSymbology.Overrides());
  }

  public get viewFlags() { return this._viewFlags; }
  public set viewFlags(vf: ViewFlags) { vf.clone(this._viewFlags); }
  public get showClipVolume(): boolean { return this.viewFlags.clipVolume; }

  // This is set to true when we're rendering overlay decorations for readPixels(). Otherwise, transparent surfaces become un-pickable when they are flashed.
  public set isReadPixelsInProgress(inProgress: boolean) {
    this._viewFlags.transparency = !inProgress;
  }

  private constructor(flags: ViewFlags, transform: Transform, ovrs: FeatureSymbology.Overrides, clip?: ClipPlanesVolume | ClipMaskVolume, planarClassifier?: PlanarClassifier, textureDrape?: TextureDrape, iModel?: IModelConnection) {
    this._viewFlags = flags;
    this.transform = transform;
    this.symbologyOverrides = ovrs;
    this.clipVolume = clip;
    this.planarClassifier = planarClassifier;
    this.textureDrape = textureDrape;
    this.iModel = iModel;
  }
}

/**
 * Represents the current state of the scene graph. As the scene graph is traversed,
 * branch states are pushed and popped. Pushing a branch state replaces the current view flags
 * and multiplies the current transform with the branch's transform. Popping it inverts this
 * operation. The state at the top of the stack applies to the rendering of all primitives.
 * The stack does not store the scene graph itself.
 * @internal
 */
export class BranchStack {
  private readonly _stack: BranchState[] = [];

  public constructor(flags?: ViewFlags, transform?: Transform) { this.pushState(BranchState.create(new FeatureSymbology.Overrides(), flags, transform)); }

  public get top(): BranchState {
    assert(!this.empty);
    return this._stack[this._stack.length - 1];
  }

  public get bottom(): BranchState {
    assert(!this.empty);
    return this._stack[0];
  }

  public get length() { return this._stack.length; }
  public get empty() { return 0 === this.length; }

  public pushBranch(branch: Branch): void {
    assert(this.length > 0);
    this.pushState(BranchState.fromBranch(this.top, branch));
  }
  public pushState(state: BranchState) {
    this._stack.push(state);
  }

  public pop(): void {
    assert(!this.empty);
    if (!this.empty) {
      this._stack.pop();
    }
  }

  public setViewFlags(vf: ViewFlags) { assert(1 === this.length); this.top.viewFlags = vf; }
  public setSymbologyOverrides(ovrs: FeatureSymbology.Overrides) {
    assert(1 === this.length);
    this.top.symbologyOverrides = ovrs;
  }
}

/**
 * Assigns a transient, unique 32-bit integer ID to each Batch in a RenderCommands.
 * A batch ID of 0 means "no batch".
 * The first batch gets batch ID of 1.
 * The next batch gets the previous batch's ID plus the number of features in the previous batch's feature table
 * (or 1, if empty feature table).
 * The IDs are set temporarily as members on the Batch objects and reset to 0 immediately after rendering.
 * The currentBatch member identifies the batch containing primitives currently being drawn.
 * The combination of the current batch's ID (passed as uniform to shader) and the index of a given Feature within
 * its batch's FeatureTable (stored in vertex table) produce a unique ID for every feature rendered during a frame.
 * During rendering, the feature IDs are written to the "feature ID" color attachment.
 * The batch IDs remain valid during a call to Target.readPixels() so that they can be used to extract
 * Features from the Batch's FeatureTables.
 * @internal
 */
export class BatchState {
  private readonly _stack: BranchStack;
  private _batches: Batch[] = []; // NB: this list is ordered - but *not* indexed - by batch ID.
  private _curBatch?: Batch;

  public constructor(stack: BranchStack) {
    this._stack = stack;
  }

  public get currentBatch(): Batch | undefined { return this._curBatch; }
  public get currentBatchId(): number { return undefined !== this._curBatch ? this._curBatch.batchId : 0; }
  public get currentBatchIModel(): IModelConnection | undefined { return undefined !== this._curBatch ? this._curBatch.batchIModel : undefined; }
  public get isEmpty(): boolean { return 0 === this._batches.length; }

  public push(batch: Batch, allowAdd: boolean): void {
    assert(undefined === this.currentBatch, "batches cannot nest");
    this.getBatchId(batch, allowAdd);
    this._curBatch = batch;
  }

  public pop(): void {
    assert(undefined !== this.currentBatch);
    this._curBatch = undefined;
  }

  public reset(): void {
    assert(undefined === this.currentBatch);
    for (const batch of this._batches)
      batch.resetContext();

    this._batches.length = 0;
    this._curBatch = undefined;
  }

  public getElementId(featureId: number): Id64String {
    const batch = this.find(featureId);
    if (undefined === batch)
      return Id64.invalid;

    const featureIndex = featureId - batch.batchId;
    assert(featureIndex >= 0);

    const parts = batch.featureTable.getElementIdPair(featureIndex);
    return Id64.fromUint32Pair(parts.lower, parts.upper);
  }

  public getFeature(featureId: number): Feature | undefined {
    const batch = this.find(featureId);
    if (undefined === batch)
      return undefined;

    const featureIndex = featureId - batch.batchId;
    assert(featureIndex >= 0);

    return batch.featureTable.findFeature(featureIndex);
  }

  public get numFeatureIds() { return this.nextBatchId; }
  public get numBatches() { return this._batches.length; }
  public findBatchId(featureId: number) {
    const batch = this.find(featureId);
    return undefined !== batch ? batch.batchId : 0;
  }

  public get nextBatchId(): number {
    if (this.isEmpty)
      return 1;

    const prev = this._batches[this._batches.length - 1];
    assert(0 !== prev.batchId);

    let prevNumFeatures = prev.featureTable.numFeatures;
    if (0 === prevNumFeatures)
      prevNumFeatures = 1;

    return prev.batchId + prevNumFeatures;
  }

  private getBatchId(batch: Batch, allowAdd: boolean): number {
    if (allowAdd && 0 === batch.batchId) {
      batch.setContext(this.nextBatchId, this._stack.top.iModel);
      this._batches.push(batch);
    }

    return batch.batchId;
  }

  private indexOf(featureId: number): number {
    if (featureId <= 0)
      return -1;

    const found = lowerBound(featureId, this._batches, (lhs: number, rhs: Batch) => {
      // Determine if the requested feature ID is within the range of this batch.
      if (lhs < rhs.batchId)
        return -1;

      const numFeatures = rhs.featureTable.numFeatures;
      const nextBatchId = rhs.batchId + (numFeatures > 0 ? numFeatures : 1);
      return lhs < nextBatchId ? 0 : 1;
    });

    return found.index < this._batches.length ? found.index : -1;
  }

  public find(featureId: number): Batch | undefined {
    const index = this.indexOf(featureId);
    return -1 !== index ? this._batches[index] : undefined;
  }
}
