/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { assert } from "@bentley/bentleyjs-core";
import { GL } from "./GL";
import { System } from "./System";
import { WebGLDisposable } from "./Disposable";

/** @internal */
export class RenderBuffer implements WebGLDisposable {
  private _glBuffer?: WebGLRenderbuffer;

  public getHandle() { return this._glBuffer; }

  public static create(width: number, height: number, format = GL.RenderBuffer.Format.DepthComponent16) {
    const gl: WebGLRenderingContext = System.instance.context;

    const glBuffer = gl.createRenderbuffer();
    if (null === glBuffer) {
      return undefined;
    }

    assert(0 < width && 0 < height);
    RenderBuffer.bindBuffer(glBuffer);
    gl.renderbufferStorage(GL.RenderBuffer.TARGET, format, width, height);
    RenderBuffer.unbind();

    return new RenderBuffer(glBuffer);
  }

  public get isDisposed(): boolean { return this._glBuffer === undefined || this._glBuffer === null; }

  public dispose(): void {
    if (!this.isDisposed) {
      System.instance.context.deleteRenderbuffer(this._glBuffer!);
      this._glBuffer = undefined;
    }
  }

  public bind() {
    assert(undefined !== this._glBuffer);
    if (undefined !== this._glBuffer) {
      RenderBuffer.bindBuffer(this._glBuffer);
    }
  }

  private constructor(glBuffer: WebGLRenderbuffer) { this._glBuffer = glBuffer; }

  private static bindBuffer(glBuffer: WebGLRenderbuffer | null) { System.instance.context.bindRenderbuffer(GL.RenderBuffer.TARGET, glBuffer); }
  private static unbind() { this.bindBuffer(null); }
}
