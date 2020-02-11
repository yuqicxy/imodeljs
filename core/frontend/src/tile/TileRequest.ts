/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Tile
 */

import { AbandonedError, assert, base64StringToUint8Array, IModelStatus } from "@bentley/bentleyjs-core";
import { ImageSource } from "@bentley/imodeljs-common";
import { Tile } from "./Tile";
import { TileTree, TileLoader } from "./TileTree";
import { TileAdmin } from "./TileAdmin";
import { Viewport } from "../Viewport";
import { IModelApp } from "../IModelApp";

/** Represents a pending or active request to load the contents of a [[Tile]]. The request coordinates with a [[TileLoader]] to execute the request for tile content and
 * convert the result into a renderable graphic.
 * @internal
 */
export class TileRequest {
  /** The requested tile. While the request is pending or active, `tile.request` points back to this TileRequest. */
  public readonly tile: Tile;
  /** Determines the order in which pending requests are pulled off the queue to become active. A tile with a lower value takes precedence over one with a higher value. */
  /** The set of [[Viewport]]s that are awaiting the result of this request. When this becomes empty, the request is canceled because no viewport cares about it. */
  public viewports: TileAdmin.ViewportSet;
  private _state: TileRequest.State;
  public priority = 0;

  public constructor(tile: Tile, vp: Viewport) {
    this._state = TileRequest.State.Queued;
    this.tile = tile;
    this.viewports = IModelApp.tileAdmin.getViewportSet(vp);
  }

  public get state(): TileRequest.State { return this._state; }
  public get isQueued() { return TileRequest.State.Queued === this._state; }
  public get isCanceled(): boolean {
    // If iModel was closed, cancel immediately
    if (this.tile.iModel.tiles.isDisposed)
      return true;

    // After we've received the raw tile data, always finish processing it - otherwise tile may end up in limbo (and producing tile content should be faster than re-requesting raw data).
    if (TileRequest.State.Loading === this._state)
      return false;

    // If no viewport cares about this tile any more, we're canceled.
    return this.viewports.isEmpty;
  }

  public get tree(): TileTree { return this.tile.root; }
  public get loader(): TileLoader { return this.tree.loader; }

  public addViewport(vp: Viewport): void {
    this.viewports = IModelApp.tileAdmin.getViewportSet(vp, this.viewports);
  }

  /** Transition the request from "queued" to "active", kicking off a series of asynchronous operations usually beginning with an http request, and -
   * if the request is not subsequently canceled - resulting in either a successfully-loaded Tile, or a failed ("not found") Tile.
   */
  public async dispatch(onHttpResponse: () => void): Promise<void> {
    if (this.isCanceled)
      return Promise.resolve();

    assert(this._state === TileRequest.State.Queued);
    this._state = TileRequest.State.Dispatched;
    let response;
    let gotResponse = false;
    try {
      response = await this.loader.requestTileContent(this.tile, () => this.isCanceled);
      gotResponse = true;

      // Set this now, so our `isCanceled` check can see it.
      this._state = TileRequest.State.Loading;
    } catch (err) {
      if (err instanceof AbandonedError) {
        // Content not found in cache and we were cancelled while awaiting that response, so not forwarded to backend.
        this.notifyAndClear();
        this._state = TileRequest.State.Failed;
      } else if (err.errorNumber && err.errorNumber === IModelStatus.ServerTimeout) {
        // Invalidate scene - if tile is re-selected, it will be re-requested.
        this.notifyAndClear();
        this._state = TileRequest.State.Failed;
        IModelApp.tileAdmin.onTileTimedOut(this.tile);
      } else {
        // Unknown error - not retryable
        this.setFailed();
      }
    }

    // Notify caller that we have finished http activity.
    onHttpResponse();

    if (!gotResponse || this.isCanceled)
      return Promise.resolve();

    return this.handleResponse(response);
  }

  /** Cancels this request. This leaves the associated Tile's state untouched. */
  public cancel(): void {
    this.notifyAndClear();
    if (TileRequest.State.Dispatched === this._state)
      this.loader.onActiveRequestCanceled(this.tile);

    this._state = TileRequest.State.Failed;
  }

  /** Invalidates the scene of each [[Viewport]] interested in this request - typically because the request succeeded, failed, or was canceled. */
  private notify(): void {
    this.viewports.forEach((vp) => vp.invalidateScene());
  }

  /** Invalidates the scene of each [[Viewport]] interested in this request and clears the set of interested viewports. */
  private notifyAndClear(): void {
    this.notify();
    this.viewports = IModelApp.tileAdmin.emptyViewportSet;
    this.tile.request = undefined;
  }

  private setFailed() {
    this.notifyAndClear();
    this._state = TileRequest.State.Failed;
    this.tile.setNotFound();
    IModelApp.tileAdmin.onTileFailed(this.tile);
  }

  /** Invoked when the raw tile content becomes available, to convert it into a tile graphic. */
  private async handleResponse(response: TileRequest.Response): Promise<void> {
    let data: TileRequest.ResponseData | undefined;
    if (undefined !== response) {
      if (typeof response === "string")
        data = base64StringToUint8Array(response);
      else if (response instanceof Uint8Array || response instanceof ImageSource)
        data = response;
      else if (response instanceof ArrayBuffer)
        data = new Uint8Array(response);
    }

    if (undefined === data) {
      this.setFailed();
      return Promise.resolve();
    }

    try {
      const content = await this.loader.loadTileContent(this.tile, data, () => this.isCanceled);
      if (this.isCanceled)
        return Promise.resolve();

      this._state = TileRequest.State.Completed;
      this.tile.setContent(content);
      this.notifyAndClear();
      IModelApp.tileAdmin.onTileCompleted(this.tile);
    } catch (_err) {
      this.setFailed();
    }

    return Promise.resolve();
  }
}
// tslint:disable:no-const-enum

/** @internal */
export namespace TileRequest {
  /** The type of a raw response to a request for tile content. Processed upon receipt into a [[TileRequest.Response]] type.
   * @internal
   */
  export type Response = Uint8Array | ArrayBuffer | string | ImageSource | undefined;
  /** The input to [[TileLoader.loadTileContent]], to be converted into a [[Tile.Content]].
   * @internal
   */
  export type ResponseData = Uint8Array | ImageSource;

  /** The states through which a TileRequest proceeds. During the first 3 states, the [[Tile]]'s `request` member is defined, and its [[Tile.LoadStatus]] is computed based on the state of its request.
   * @internal
   */
  export const enum State {
    /** Initial state. Request is pending but not yet dispatched. */
    Queued,
    /** Follows `Queued` when request begins to be actively processed. */
    Dispatched,
    /** Follows `Dispatched` when tile content is being converted into tile graphics. */
    Loading,
    /** Follows `Loading` when tile graphic has successfully been produced. */
    Completed,
    /** Follows any state in which an error prevents progression, or during which the request was canceled. */
    Failed,
  }
}
