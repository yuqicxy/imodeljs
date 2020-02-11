/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModelHubClient
 */

/**
 * Class that provides custom request options for all future requests
 * @internal
 */
export class CustomRequestOptions {
  private _customOptions?: { [index: string]: string };

  public setCustomOptions(customOptions?: { [index: string]: string }): void {
    this._customOptions = customOptions;
  }

  public insertCustomOptions(customOptions: any): { [index: string]: string } {
    if (!this._customOptions) {
      return customOptions;
    }
    if (!customOptions) {
      customOptions = {};
    }
    customOptions = { ...customOptions, ...this._customOptions };
    return customOptions;
  }

  public get isSet(): boolean {
    return null != this._customOptions;
  }
}
