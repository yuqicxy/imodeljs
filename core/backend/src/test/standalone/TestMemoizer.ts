/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { BeDuration } from "@bentley/bentleyjs-core";
import { PromiseMemoizer, QueryablePromise, MemoizeFnType, GenerateKeyFnType } from "../../PromiseMemoizer";

const generateKeyTestFn: GenerateKeyFnType = (param: number, waitTime: number): string => {
  return `key ${param}:${waitTime}`;
};

export const testFn: MemoizeFnType<string> = async (param: number, waitTime: number): Promise<string> => {
  await BeDuration.wait(waitTime);
  return `value ${param}:${waitTime}`;
};

export class TestMemoizer extends PromiseMemoizer<string> {
  private readonly _pendingWaitTime: number;

  public constructor(maxCacheSize: number, pendingWaitTime: number) {
    super(testFn, generateKeyTestFn, maxCacheSize);
    this._pendingWaitTime = pendingWaitTime;
  }

  private _superMemoize = this.memoize;
  public memoize = (param: number, waitTime: number): QueryablePromise<string> => {
    return this._superMemoize(param, waitTime);
  }

  private _superDeleteMemoized = this.deleteMemoized;
  public deleteMemoized = (param: number, waitTime: number) => {
    this._superDeleteMemoized(param, waitTime);
  }

  public async callMemoizedTestFn(param: number, waitTime: number): Promise<string> {
    const { memoize: memoizeTestFn, deleteMemoized: deleteMemoizedTestFn } = this;

    const testQP = memoizeTestFn(param, waitTime);

    await BeDuration.race(this._pendingWaitTime, testQP.promise); // This resolves as soon as either the fn is completed or the wait time has expired. Prevents waiting un-necessarily if the open has already completed.
    if (testQP.isPending)
      return "Pending";

    deleteMemoizedTestFn(param, waitTime);

    return testQP.isFulfilled ? testQP.result! : testQP.error!;
  }
}
