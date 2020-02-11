/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Tile
 */

import {
  BeDuration,
  Dictionary,
  Id64Array,
  PriorityQueue,
  SortedArray,
  assert,
} from "@bentley/bentleyjs-core";
import {
  CurrentImdlVersion,
  getMaximumMajorTileFormatVersion,
  IModelTileRpcInterface,
  IModelToken,
  NativeAppRpcInterface,
  RpcOperation,
  RpcRegistry,
  RpcResponseCacheControl,
  TileTreeContentIds,
  TileTreeProps,
} from "@bentley/imodeljs-common";
import { IModelApp } from "../IModelApp";
import { IModelConnection } from "../IModelConnection";
import { Tile } from "./Tile";
import { TileRequest } from "./TileRequest";
import { Viewport } from "../Viewport";

/** Provides functionality associated with [[Tile]]s, mostly in the area of scheduling requests for tile content.
 * The TileAdmin tracks [[Viewport]]s which have requested tile content, maintaining a priority queue of pending requests and
 * a set of active requests. On each update it identifies previously-requested tiles whose content no viewport is interested in any longer and
 * cancels them. It then pulls pending requests off the queue and dispatches them into the active set until either the maximum number of
 * simultaneously-active requests is reached or the queue becomes empty.
 * @alpha
 */
export abstract class TileAdmin {
  /** @internal */
  public abstract get emptyViewportSet(): TileAdmin.ViewportSet;
  /** Returns basic statistics about the TileAdmin's current state. */
  public abstract get statistics(): TileAdmin.Statistics;
  /** Resets the cumulative (per-session) statistics like totalCompletedRequests, totalEmptyTiles, etc. */
  public abstract resetStatistics(): void;

  /** Controls the maximum number of simultaneously-active requests allowed.
   * If the maximum is reduced below the current size of the active set, no active requests will be canceled - but no more will be dispatched until the
   * size of the active set falls below the new maximum.
   * @see [[TileAdmin.Props.maxActiveRequests]]
   * @note Browsers impose their own limitations on maximum number of total connections, and connections per-domain. These limitations are
   * especially strict when using HTTP1.1 instead of HTTP2. Increasing the maximum above the default may significantly affect performance as well as
   * bandwidth and memory consumption.
   * @alpha
   */
  public abstract get maxActiveRequests(): number;
  public abstract set maxActiveRequests(max: number);

  /** A default multiplier applied to the size in pixels of a [[Tile]] during tile selection for any [[Viewport]].
   * Individual Viewports can override this multiplier if desired.
   * A value greater than 1.0 causes lower-resolution tiles to be selected; a value < 1.0 selects higher-resolution tiles.
   * This can allow an application to sacrifice quality for performance or vice-versa.
   * This property is initialized from the value supplied by the [[TileAdmin.Props.defaultTileSizeModifier]] used to initialize the TileAdmin at startup.
   * Changing it after startup will change it for all Viewports that do not explicitly override it with their own multiplier.
   * This value must be greater than zero.
   * @alpha
   */
  public abstract get defaultTileSizeModifier(): number;
  public abstract set defaultTileSizeModifier(modifier: number);

  /** @internal */
  public abstract get enableInstancing(): boolean;
  /** @internal */
  public abstract get enableImprovedElision(): boolean;
  /** @internal */
  public abstract get useProjectExtents(): boolean;
  /** @internal */
  public abstract get disableMagnification(): boolean;

  /** @internal */
  public abstract get tileExpirationTime(): BeDuration;
  /** @internal */
  public abstract get realityTileExpirationTime(): BeDuration;
  /** @internal */
  public abstract get tileTreeExpirationTime(): BeDuration | undefined;
  /** @internal */
  public abstract get contextPreloadParentDepth(): number;
  /** @internal */
  public abstract get contextPreloadParentSkip(): number;
  /** @internal */
  public abstract get maximumMajorTileFormatVersion(): number;

  /** Given a numeric combined major+minor tile format version (typically obtained from a request to the backend to query the maximum tile format version it supports),
   * return the maximum *major* format version to be used to request tile content from the backend.
   * @see [[TileAdmin.Props.maximumMajorTileFormatVersion]]
   * @see [[CurrentImdlVersion]]
   * @see [TileTreeProps.formatVersion]($common)
   * @internal
   */
  public abstract getMaximumMajorTileFormatVersion(formatVersion?: number): number;

  /** Returns the union of the input set and the input viewport.
   * @internal
   */
  public abstract getViewportSet(vp: Viewport, vps?: TileAdmin.ViewportSet): TileAdmin.ViewportSet;

  /** Invoked from the [[ToolAdmin]] event loop to process any pending or active requests for tiles.
   * @internal
   */
  public abstract process(): void;

  /** Specifies the set of tiles currently requested for use by a viewport. This set replaces any previously specified for the same viewport.
   * The requests are not actually processed until the next call to [[TileAdmin.process].
   * This is typically invoked when the viewport recreates its scene, e.g. in response to camera movement.
   * @internal
   */
  public abstract requestTiles(vp: Viewport, tiles: Set<Tile>): void;

  /** Returns the number of pending and active requests associated with the specified viewport.
   * @alpha
   */
  public abstract getNumRequestsForViewport(vp: Viewport): number;

  /** Returns the current set of Tiles requested by the specified Viewport.
   * Do not modify the set or the Tiles.
   * @internal
   */
  public abstract getRequestsForViewport(vp: Viewport): Set<Tile> | undefined;

  /** Indicates that the TileAdmin should cease tracking the specified viewport, e.g. because it is about to be destroyed.
   * Any requests which are of interest only to the specified viewport will be canceled.
   * @internal
   */
  public abstract forgetViewport(vp: Viewport): void;

  /** @internal */
  public abstract onShutDown(): void;

  /** @internal */
  public abstract async requestTileTreeProps(iModel: IModelConnection, treeId: string): Promise<TileTreeProps>;

  /** @internal */
  public abstract async requestTileContent(iModel: IModelConnection, treeId: string, contentId: string, isCanceled: () => boolean, guid: string | undefined): Promise<Uint8Array>;

  /** Create a TileAdmin. Chiefly intended for use by subclasses of [[IModelApp]] to customize the behavior of the TileAdmin.
   * @param props Options for customizing the behavior of the TileAdmin.
   * @returns the TileAdmin
   * @beta
   */
  public static create(props?: TileAdmin.Props): TileAdmin {
    return new Admin(props);
  }

  /** Temporary workaround for authoring applications. Usage:
   * ```ts
   *  async function handleModelChanged(modelId: Id64String, iModel: IModelConnection): Promise<void> {
   *    await iModel.tiles.purgeTileTrees([modelId]);
   *    IModelApp.viewManager.refreshForModifiedModels(modelId);
   *  }
   * ```
   * @internal
   */
  public abstract async purgeTileTrees(iModel: IModelConnection, modelIds: Id64Array | undefined): Promise<void>;

  /** @internal */
  public abstract onTileCompleted(tile: Tile): void;
  /** @internal */
  public abstract onTileTimedOut(tile: Tile): void;
  /** @internal */
  public abstract onTileFailed(tile: Tile): void;
  /** @internal */
  public abstract onTilesElided(numElided: number): void;
  /** @internal */
  public abstract onCacheMiss(): void;
  /** @internal */
  public abstract onActiveRequestCanceled(tile: Tile): void;
}

/** @alpha */
export namespace TileAdmin {
  /** Statistics regarding the current and cumulative state of the [[TileAdmin]]. Useful for monitoring performance and diagnosing problems.
   * @alpha
   */
  export interface Statistics {
    /** The number of requests in the queue which have not yet been dispatched. */
    numPendingRequests: number;
    /** The number of requests which have been dispatched but not yet completed. */
    numActiveRequests: number;
    /** The number of requests canceled during the most recent update. */
    numCanceled: number;
    /** The total number of completed requests during this session. */
    totalCompletedRequests: number;
    /** The total number of failed requests during this session. */
    totalFailedRequests: number;
    /** The total number of timed-out requests during this session. */
    totalTimedOutRequests: number;
    /** The total number of completed requests during this session which produced an empty tile. These tiles also contribute to totalCompletedRequests, but not to totalUndisplayableTiles. */
    totalEmptyTiles: number;
    /** The total number of completed requests during this session which produced an undisplayable tile. These tiles also contribute to totalCompletedRequests, but not to totalEmptyTiles. */
    totalUndisplayableTiles: number;
    /** The total number of tiles whose contents were not requested during this session because their volumes were determined to be empty. */
    totalElidedTiles: number;
    /** The total number of tiles whose contents were not found in cloud storage cache and therefore resulted in a backend request to generate the tile content. */
    totalCacheMisses: number;
    /** The total number of tiles for which content requests were dispatched. */
    totalDispatchedRequests: number;
    /** The total number of tiles for which content requests were dispatched and then canceled on the backend before completion. */
    totalAbortedRequests: number;
  }

  /** Describes configuration of a [[TileAdmin]].
   * @see [[TileAdmin.create]]
   * @alpha
   */
  export interface Props {
    /** The maximum number of simultaneously-active requests. Any requests beyond this maximum are placed into a priority queue.
     *
     * Default value: 10
     */
    maxActiveRequests?: number;

    /** A default multiplier applied to the size in pixels of a [[Tile]] during tile selection for any [[Viewport]].
     * Individual Viewports can override this multiplier if desired.
     * A value greater than 1.0 causes lower-resolution tiles to be selected; a value < 1.0 selects higher-resolution tiles.
     * This value must be greater than zero.
     * This can allow an application to sacrifice quality for performance or vice-versa.
     *
     * Default value: 1.0
     */
    defaultTileSizeModifier?: number;

    /** If true, tiles may represent repeated geometry as sets of instances. This can reduce tile size and tile generation time, and improve performance.
     *
     * Default value: true
     */
    enableInstancing?: boolean;

    /** If true, during tile generation the backend will perform tighter intersection tests to more accurately identify empty sub-volumes.
     * This can reduce the number of tiles requested and the number of tile requests that return no content.
     *
     * Default value: false
     */
    enableImprovedElision?: boolean;

    /** The interval in milliseconds at which a request for tile content will be retried until a response is received.
     *
     * Default value: 1000 (1 second)
     */
    retryInterval?: number;

    /** If defined, specifies the maximum MAJOR tile format version to request. For example, if CurrentImdlVersion.Major = 3, and maximumMajorTileFormatVersion = 2,
     * requests for tile content will obtain tile content in some version 2.x of the format, never of some version 3.x.
     * Note that the actual maximum major version is also dependent on the backend which fulfills the requests - if the backend only knows how to produce tiles of format version 1.5, for example,
     * requests for tiles in format version 2.1 will still return content in format version 1.5.
     * This can be used to feature-gate newer tile formats on a per-user basis.
     *
     * Default value: undefined
     * @internal
     */
    maximumMajorTileFormatVersion?: number;

    /** When computing the range of a spatial tile tree we can use either the range of the model, or the project extents. If the model range is small relative to the
     * project extents, the "low-resolution" tiles will be much higher-resolution than is appropriate when the view is fit to the project extents. This can cause poor
     * framerate due to too much tiny geometry. Setting this option to `true` will use the project extents for the tile tree range; `false` will use the model range.
     *
     * Default value: true
     *
     * @internal
     */
    useProjectExtents?: boolean;

    /** The minimum number of seconds to keep a Tile in memory after it has become unused.
     * Each tile has an expiration timer. Each time tiles are selected for drawing in a view, if we decide to draw a tile we reset its expiration timer.
     * Otherwise, if its expiration timer has exceeded this minimum, we discard it along with all of its children. This allows us to free up memory for other tiles.
     * If we later want to draw the same tile, we must re-request it (typically from some cache).
     * Setting this value too small will cause excessive tile requests. Setting it too high will cause excessive memory consumption.
     *
     * Default value: 20 seconds.
     * Minimum value: 5 seconds.
     * Maximum value: 60 seconds.
     */
    tileExpirationTime?: number;

    /** ###TODO clean up later. Added for Microsoft demo. Specifies expiration time for reality models. Default: 5 seconds.
     * @internal
     */
    realityTileExpirationTime?: number;

    /** If defined, the minimum number of seconds to keep a TileTree in memory after it has become disused.
     * Each time a TileTree is drawn, we record the current time as its most-recently-used time.
     * Periodically we traverse all TileTrees in the system. Any which have not been used within this specified number of seconds will be discarded, freeing up memory.
     *
     * @note This is separate from [[tileExpirationTime]], which is applied to individual Tiles each time the TileTree *is* drawn.
     *
     * Default value: undefined.
     * Minimum value: 10 seconds.
     * Maximum value: 3600 seconds (1 hour).
     *
     * @alpha
     */
    tileTreeExpirationTime?: number;

    /** When producing child tiles for a given tile, two refinement strategies are considered:
     *  - Subdivision: typical oct- or quad-tree subdivision into 8 or 4 smaller child tiles; and
     *  - Magnification: production of a single child tile of the same size as the parent but with twice the level of detail
     * The magnification strategy can in some cases produce extremely large, detailed tiles, because the heuristic which decides which strategy to use considers that if
     * a tile contains fewer than some "small" number of elements, it is not worth subdividing, and instead chooses magnification - but element sizes vary **wildly**.
     *
     * If this option is defined and true, the magnification strategy will never be chosen.
     *
     * Default value: false
     */
    disableMagnification?: boolean;

    /** Preloading parents for context (reality and map tiles) will improve the user experience by making it more likely that tiles in nearly the required resolution will be
     * already loaded as the view is manipulated.  This value controls the depth above the the selected tile depth that will be preloaded. The default
     * value (2) with default contextPreloadParentDepth of one will load only grandparents and great grandparents.  This generally preloas around 20% more tiles than are required.
     * Default value: 2.
     * Minimum value 0.
     * Maximum value 8.
     * @alpha
     */
    contextPreloadParentDepth?: number;

    /** Preloading parents for context (reality and map tiles) will improve the user experience by making it more likely that tiles in nearly the required resolution will be
     * already loaded as the view is manipulated.  This value controls the number of parents that are skipped before parents are preloaded.  The default value of 1 will skip
     * immediate parents and significantly reduce the number of preloaded tiles without significant reducing the value of preloading.
     * Default value: 1;
     * Minimum value: 0.
     * Maximum value: 5.
     * @alpha
     */
    contextPreloadParentSkip?: number;

    /** In a single-client application, when a request for tile content is cancelled, whether to ask the backend to cancel the corresponding tile generation task.
     * Has no effect unless `NativeAppRpcInterface` is registered.
     * Default value: false.
     * @internal
     */
    cancelBackendTileRequests?: boolean;
  }

  /** A set of [[Viewport]]s.
   * ViewportSets are managed and cached by [[TileAdmin]] such that any number of [[TileRequest]]s associated with the same set of viewports will
   * use the same ViewportSet object.
   * @internal
   */
  export class ViewportSet extends SortedArray<Viewport> {
    public constructor(vp?: Viewport) {
      super((lhs, rhs) => lhs.viewportId - rhs.viewportId);
      if (undefined !== vp)
        this.insert(vp);
    }

    public clone(out?: ViewportSet): ViewportSet {
      if (undefined === out)
        out = new ViewportSet();
      else
        out.clear();

      for (let i = 0; i < this.length; i++)
        out._array.push(this._array[i]);

      return out;
    }
  }
}

function comparePriorities(lhs: TileRequest, rhs: TileRequest): number {
  let diff = lhs.tile.loader.priority - rhs.tile.loader.priority;
  if (0 === diff)
    diff = lhs.priority - rhs.priority;

  return diff;
}

class Queue extends PriorityQueue<TileRequest> {
  public constructor() {
    super((lhs, rhs) => comparePriorities(lhs, rhs));
  }

  public has(request: TileRequest): boolean {
    return this._array.indexOf(request) >= 0;
  }
}

function compareViewportSets(lhs: TileAdmin.ViewportSet, rhs: TileAdmin.ViewportSet): number {
  if (lhs === rhs)
    return 0;

  let diff = lhs.length - rhs.length;
  if (0 === diff) {
    for (let i = 0; i < lhs.length; i++) {
      const lhvp = lhs.get(i)!;
      const rhvp = rhs.get(i)!;
      diff = lhvp.viewportId - rhvp.viewportId;
      if (0 !== diff)
        break;
    }
  }

  return diff;
}

// The scheduler needs to know about all viewports which have tile requests.
// Each request needs to know the set of viewports for which it has been requested.
// We don't want to duplicate the latter per-Request - in addition to wasting memory, that would
// also require us to traverse all requests whenever a viewport becomes un-tracked in order to remove it from their sets.
// This class holds unique sets of viewports and doles them out to Requests.
class UniqueViewportSets extends SortedArray<TileAdmin.ViewportSet> {
  public readonly emptySet = new TileAdmin.ViewportSet();
  private readonly _scratchSet = new TileAdmin.ViewportSet();

  public constructor() {
    super((lhs, rhs) => compareViewportSets(lhs, rhs));
    Object.freeze(this.emptySet);
  }

  public eraseAt(index: number): void {
    assert(index < this.length && index >= 0);
    this._array.splice(index, 1);
  }

  public getForViewport(vp: Viewport): TileAdmin.ViewportSet {
    for (let i = 0; i < this.length; i++) {
      const set = this._array[i];
      if (1 === set.length && set.get(0)! === vp)
        return set;
    }

    const newSet = new TileAdmin.ViewportSet(vp);
    this.insert(newSet);
    return newSet;
  }

  public getViewportSet(vp: Viewport, vps?: TileAdmin.ViewportSet): TileAdmin.ViewportSet {
    if (undefined === vps || vps.isEmpty)
      return this.getForViewport(vp);

    // Use the scratch set for equality comparison - only allocate if no equivalent set already exists.
    const toFind = vps.clone(this._scratchSet);
    toFind.insert(vp);
    const found = this.findEqual(toFind);
    if (undefined !== found) {
      toFind.clear();
      return found;
    }

    const newSet = toFind.clone();
    toFind.clear();
    this.insert(newSet);
    return newSet;
  }

  public clearAll(): void {
    this.forEach((set) => set.clear());
    this.clear();
  }
}

class RequestsPerViewport extends Dictionary<Viewport, Set<Tile>> {
  public constructor() {
    super((lhs, rhs) => lhs.viewportId - rhs.viewportId);
  }
}

class Admin extends TileAdmin {
  private readonly _requestsPerViewport = new RequestsPerViewport();
  private readonly _uniqueViewportSets = new UniqueViewportSets();
  private _maxActiveRequests: number;
  private _defaultTileSizeModifier: number;
  private readonly _retryInterval: number;
  private readonly _enableInstancing: boolean;
  private readonly _enableImprovedElision: boolean;
  private readonly _disableMagnification: boolean;
  private readonly _maxMajorVersion: number;
  private readonly _useProjectExtents: boolean;
  private readonly _removeIModelConnectionOnCloseListener: () => void;
  private _activeRequests = new Set<TileRequest>();
  private _pendingRequests = new Queue();
  private _swapPendingRequests = new Queue();
  private _numCanceled = 0;
  private _totalCompleted = 0;
  private _totalFailed = 0;
  private _totalTimedOut = 0;
  private _totalEmpty = 0;
  private _totalUndisplayable = 0;
  private _totalElided = 0;
  private _totalCacheMisses = 0;
  private _totalDispatchedRequests = 0;
  private _totalAbortedRequests = 0;
  private _rpcInitialized = false;
  private readonly _tileExpirationTime: BeDuration;
  private readonly _realityTileExpirationTime: BeDuration;
  private readonly _treeExpirationTime?: BeDuration;
  private readonly _contextPreloadParentDepth: number;
  private readonly _contextPreloadParentSkip: number;
  private _canceledRequests?: Map<IModelToken, Map<string, Set<string>>>;
  private readonly _cancelBackendTileRequests: boolean;

  public get emptyViewportSet(): TileAdmin.ViewportSet { return this._uniqueViewportSets.emptySet; }
  public get statistics(): TileAdmin.Statistics {
    return {
      numPendingRequests: this._pendingRequests.length,
      numActiveRequests: this._activeRequests.size,
      numCanceled: this._numCanceled,
      totalCompletedRequests: this._totalCompleted,
      totalFailedRequests: this._totalFailed,
      totalTimedOutRequests: this._totalTimedOut,
      totalEmptyTiles: this._totalEmpty,
      totalUndisplayableTiles: this._totalUndisplayable,
      totalElidedTiles: this._totalElided,
      totalCacheMisses: this._totalCacheMisses,
      totalDispatchedRequests: this._totalDispatchedRequests,
      totalAbortedRequests: this._totalAbortedRequests,
    };
  }

  public resetStatistics(): void {
    this._totalCompleted = this._totalFailed = this._totalTimedOut =
    this._totalEmpty = this._totalUndisplayable = this._totalElided =
    this._totalCacheMisses = this._totalDispatchedRequests = this._totalAbortedRequests = 0;
  }

  public constructor(options?: TileAdmin.Props) {
    super();

    if (undefined === options)
      options = {};

    this._maxActiveRequests = undefined !== options.maxActiveRequests ? options.maxActiveRequests : 10;
    this._defaultTileSizeModifier = (undefined !== options.defaultTileSizeModifier && options.defaultTileSizeModifier > 0) ? options.defaultTileSizeModifier : 1.0;
    this._retryInterval = undefined !== options.retryInterval ? options.retryInterval : 1000;
    this._enableInstancing = false !== options.enableInstancing;
    this._enableImprovedElision = true === options.enableImprovedElision;
    this._disableMagnification = true === options.disableMagnification;
    this._maxMajorVersion = undefined !== options.maximumMajorTileFormatVersion ? options.maximumMajorTileFormatVersion : CurrentImdlVersion.Major;
    this._useProjectExtents = false !== options.useProjectExtents;
    this._cancelBackendTileRequests = true === options.cancelBackendTileRequests;

    const clamp = (seconds: number | undefined, min: number, max: number): BeDuration | undefined => {
      if (undefined === seconds)
        return undefined;

      seconds = Math.min(seconds, max);
      seconds = Math.max(seconds, min);
      return BeDuration.fromSeconds(seconds);
    };

    // If unspecified, tile expiration time defaults to 20 seconds.
    this._tileExpirationTime = clamp((options.tileExpirationTime ? options.tileExpirationTime : 20), 5, 60)!;

    // If unspecified, reality tile expiration time defaults to 5 seconds.
    this._realityTileExpirationTime = clamp((options.realityTileExpirationTime ? options.realityTileExpirationTime : 5), 5, 60)!;

    // If unspecified, trees never expire (will change this to use a default later).
    this._treeExpirationTime = clamp(options.tileTreeExpirationTime, 10, 3600);

    this._removeIModelConnectionOnCloseListener = IModelConnection.onClose.addListener((iModel) => this.onIModelClosed(iModel));
    // If unspecified preload 2 levels of parents for context tiles.
    this._contextPreloadParentDepth = Math.max(0, Math.min((options.contextPreloadParentDepth === undefined ? 2 : options.contextPreloadParentDepth), 8));
    // If unspecified skip one leveo before prealoading  of parents of context tiles.
    this._contextPreloadParentSkip = Math.max(0, Math.min((options.contextPreloadParentSkip === undefined ? 1 : options.contextPreloadParentSkip), 5));
  }

  public get enableInstancing() { return this._enableInstancing && IModelApp.renderSystem.supportsInstancing; }
  public get enableImprovedElision() { return this._enableImprovedElision; }
  public get useProjectExtents() { return this._useProjectExtents; }
  public get disableMagnification() { return this._disableMagnification; }
  public get tileExpirationTime() { return this._tileExpirationTime; }
  public get realityTileExpirationTime() { return this._realityTileExpirationTime; }
  public get tileTreeExpirationTime() { return this._treeExpirationTime; }
  public get contextPreloadParentDepth() { return this._contextPreloadParentDepth; }
  public get contextPreloadParentSkip() { return this._contextPreloadParentSkip; }
  public get maximumMajorTileFormatVersion() { return this._maxMajorVersion; }
  public getMaximumMajorTileFormatVersion(formatVersion?: number): number {
    return getMaximumMajorTileFormatVersion(this.maximumMajorTileFormatVersion, formatVersion);
  }

  public get maxActiveRequests() { return this._maxActiveRequests; }
  public set maxActiveRequests(max: number) {
    if (max > 0)
      this._maxActiveRequests = max;
  }

  public get defaultTileSizeModifier() { return this._defaultTileSizeModifier; }
  public set defaultTileSizeModifier(modifier: number) {
    if (modifier !== this._defaultTileSizeModifier && modifier > 0 && !Number.isNaN(modifier)) {
      this._defaultTileSizeModifier = modifier;
      IModelApp.viewManager.invalidateScenes();
    }
  }

  public process(): void {
    this._numCanceled = 0;

    // Mark all requests as being associated with no Viewports, indicating they are no longer needed.
    this._uniqueViewportSets.clearAll();

    // Process all requests, enqueueing on new queue.
    const previouslyPending = this._pendingRequests;
    this._pendingRequests = this._swapPendingRequests;
    this._swapPendingRequests = previouslyPending;

    // We will repopulate pending requests queue from each viewport. We do NOT sort by priority while doing so.
    this._requestsPerViewport.forEach((key, value) => this.processRequests(key, value));

    // Recompute priority of each request.
    for (const req of this._pendingRequests)
      req.priority = req.tile.loader.computeTilePriority(req.tile, req.viewports);

    // Sort pending requests by priority.
    this._pendingRequests.sort();

    // Cancel any previously pending requests which are no longer needed.
    for (const queued of previouslyPending)
      if (queued.viewports.isEmpty)
        this.cancel(queued);

    previouslyPending.clear();

    // Cancel any active requests which are no longer needed.
    // NB: Do NOT remove them from the active set until their http activity has completed.
    for (const active of this._activeRequests)
      if (active.viewports.isEmpty)
        this.cancel(active);

    // If the backend is servicing a single client, ask it to immediately stop processing requests for content we no longer want.
    if (undefined !== this._canceledRequests && this._canceledRequests.size > 0) {
      for (const [iModelToken, entries] of this._canceledRequests) {
        const treeContentIds: TileTreeContentIds[] = [];
        for (const [treeId, tileIds] of entries) {
          const contentIds = Array.from(tileIds);
          treeContentIds.push({ treeId, contentIds });
          this._totalAbortedRequests += contentIds.length;
        }

        NativeAppRpcInterface.getClient().cancelTileContentRequests(iModelToken.toJSON(), treeContentIds);
      }

      this._canceledRequests.clear();
    }

    // Fill up the active requests from the queue.
    while (this._activeRequests.size < this._maxActiveRequests) {
      const request = this._pendingRequests.pop();
      if (undefined === request)
        break;
      else
        this.dispatch(request);
    }
  }

  private processRequests(vp: Viewport, tiles: Set<Tile>): void {
    for (const tile of tiles) {
      if (undefined === tile.request) {
        // ###TODO: This assertion triggers for AttachmentViewports used for rendering 3d sheet attachments.
        // Determine why and fix.
        // assert(tile.loadStatus === Tile.LoadStatus.NotLoaded);
        if (Tile.LoadStatus.NotLoaded === tile.loadStatus) {
          const request = new TileRequest(tile, vp);
          tile.request = request;
          this._pendingRequests.append(request);
        }
      } else {
        const req = tile.request;
        assert(undefined !== req);
        if (undefined !== req) {
          // Request may already be dispatched (in this._activeRequests) - if so do not re-enqueue!
          if (req.isQueued && 0 === req.viewports.length)
            this._pendingRequests.append(req);

          req.addViewport(vp);
          assert(0 < req.viewports.length);
        }
      }
    }
  }

  public getNumRequestsForViewport(vp: Viewport): number {
    const requests = this.getRequestsForViewport(vp);
    return undefined !== requests ? requests.size : 0;
  }

  public getRequestsForViewport(vp: Viewport): Set<Tile> | undefined {
    return this._requestsPerViewport.get(vp);
  }

  public requestTiles(vp: Viewport, tiles: Set<Tile>): void {
    this._requestsPerViewport.set(vp, tiles);
  }

  public forgetViewport(vp: Viewport): void {
    // NB: vp will be removed from ViewportSets in process() - but if we can establish that only this vp wants a given tile, cancel its request immediately.
    const tiles = this._requestsPerViewport.get(vp);
    if (undefined !== tiles) {
      for (const tile of tiles) {
        const request = tile.request;
        if (undefined !== request && 1 === request.viewports.length)
          request.cancel();
      }

      this._requestsPerViewport.delete(vp);
    }
  }

  private onIModelClosed(iModel: IModelConnection): void {
    this._requestsPerViewport.forEach((vp, _req) => {
      if (vp.iModel === iModel)
        this.forgetViewport(vp);
    });
  }

  public onShutDown(): void {
    this._removeIModelConnectionOnCloseListener();

    for (const request of this._activeRequests)
      request.cancel();

    this._activeRequests.clear();

    for (const queued of this._pendingRequests)
      queued.cancel();

    this._requestsPerViewport.clear();
    this._uniqueViewportSets.clear();
  }

  private dispatch(req: TileRequest): void {
    ++this._totalDispatchedRequests;
    this._activeRequests.add(req);
    req.dispatch(() => {
      this.dropActiveRequest(req);
    }).catch((_) => {
      //
    });
  }

  private cancel(req: TileRequest) {
    req.cancel();
    ++this._numCanceled;
  }

  private dropActiveRequest(req: TileRequest) {
    assert(this._activeRequests.has(req) || req.isCanceled);
    this._activeRequests.delete(req);
  }

  public getViewportSet(vp: Viewport, vps?: TileAdmin.ViewportSet): TileAdmin.ViewportSet {
    return this._uniqueViewportSets.getViewportSet(vp, vps);
  }

  public async requestTileTreeProps(iModel: IModelConnection, treeId: string): Promise<TileTreeProps> {
    this.initializeRpc();
    const intfc = IModelTileRpcInterface.getClient();
    return intfc.requestTileTreeProps(iModel.iModelToken.toJSON(), treeId);
  }

  public async purgeTileTrees(iModel: IModelConnection, modelIds: Id64Array | undefined): Promise<void> {
    this.initializeRpc();
    return IModelTileRpcInterface.getClient().purgeTileTrees(iModel.iModelToken.toJSON(), modelIds);
  }

  public async requestTileContent(iModel: IModelConnection, treeId: string, contentId: string, isCanceled: () => boolean, guid: string | undefined): Promise<Uint8Array> {
    this.initializeRpc();
    const intfc = IModelTileRpcInterface.getClient();
    return intfc.requestTileContent(iModel.iModelToken.toJSON(), treeId, contentId, isCanceled, guid);
  }

  private initializeRpc(): void {
    // Would prefer to do this in constructor - but nothing enforces that the app initializes the rpc interfaces before it creates the TileAdmin (via IModelApp.startup()) - so do it on first request instead.
    if (this._rpcInitialized)
      return;

    this._rpcInitialized = true;
    const retryInterval = this._retryInterval;
    RpcOperation.lookup(IModelTileRpcInterface, "requestTileTreeProps").policy.retryInterval = () => retryInterval;

    const policy = RpcOperation.lookup(IModelTileRpcInterface, "requestTileContent").policy;
    policy.retryInterval = () => retryInterval;
    policy.allowResponseCaching = () => RpcResponseCacheControl.Immutable;

    if (this._cancelBackendTileRequests && RpcRegistry.instance.isRpcInterfaceInitialized(NativeAppRpcInterface))
      this._canceledRequests = new Map<IModelToken, Map<string, Set<string>>>();
  }

  public onTileFailed(_tile: Tile) { ++this._totalFailed; }
  public onTileTimedOut(_tile: Tile) { ++this._totalTimedOut; }
  public onTilesElided(numElided: number) { this._totalElided += numElided; }
  public onCacheMiss() { ++this._totalCacheMisses; }
  public onTileCompleted(tile: Tile) {
    ++this._totalCompleted;
    if (tile.isEmpty)
      ++this._totalEmpty;
    else if (!tile.isDisplayable)
      ++this._totalUndisplayable;
  }

  public onActiveRequestCanceled(tile: Tile): void {
    if (undefined === this._canceledRequests)
      return;

    let iModelEntry = this._canceledRequests.get(tile.root.iModel.iModelToken);
    if (undefined === iModelEntry) {
      iModelEntry = new Map<string, Set<string>>();
      this._canceledRequests.set(tile.root.iModel.iModelToken, iModelEntry);
    }

    let contentIds = iModelEntry.get(tile.root.id);
    if (undefined === contentIds) {
      contentIds = new Set<string>();
      iModelEntry.set(tile.root.id, contentIds);
    }

    contentIds.add(tile.contentId);
  }
}
