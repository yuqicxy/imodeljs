/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModels
 */

import { assert, DbOpcode, Id64, Id64String, Logger, RepositoryStatus } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext, CodeQuery, CodeState, HubCode, Lock, LockLevel, LockType, LockQuery } from "@bentley/imodeljs-clients";
import { Code, IModelError, IModelStatus } from "@bentley/imodeljs-common";
import { BriefcaseEntry, BriefcaseManager } from "./BriefcaseManager";
import { Element } from "./Element";
import { IModelDb } from "./IModelDb";
import { IModelHost } from "./IModelHost";
import { IModelJsNative } from "@bentley/imodeljs-native";
import { BackendLoggerCategory } from "./BackendLoggerCategory";
import { Model } from "./Model";
import { Relationship } from "./Relationship";

const loggerCategory: string = BackendLoggerCategory.ConcurrencyControl;

/** ConcurrencyControl enables an app to coordinate local changes with changes that are being made by others to an iModel.
 * @beta
 */
export class ConcurrencyControl {
  private _pendingRequest: ConcurrencyControl.Request;
  private _codes?: ConcurrencyControl.Codes;
  private _policy?: ConcurrencyControl.PessimisticPolicy | ConcurrencyControl.OptimisticPolicy;
  constructor(private _iModel: IModelDb) { this._pendingRequest = ConcurrencyControl.createRequest(); }

  /** @internal */
  public getPolicy(): ConcurrencyControl.PessimisticPolicy | ConcurrencyControl.OptimisticPolicy | undefined { return this._policy; }

  /** @internal */
  public onSaveChanges() {
    if (this.hasPendingRequests)
      throw new IModelError(IModelStatus.TransactionActive, "Call iModelDb.concurrencyControl.request before saving changes", Logger.logError, loggerCategory);
  }

  /** @internal */
  public onSavedChanges() { this.applyTransactionOptions(); }

  /** @internal */
  public onMergeChanges() {
    if (this.hasPendingRequests)
      throw new IModelError(IModelStatus.TransactionActive, "Call iModelDb.concurrencyControl.request and iModelDb.saveChanges before applying changesets", Logger.logError, loggerCategory);
  }

  /** @internal */
  public onMergedChanges() { this.applyTransactionOptions(); }

  /** @internal */
  public onUndoRedo() { this.applyTransactionOptions(); }

  /** @internal */
  private applyTransactionOptions() {
    if (!this._policy)
      return;
    if (!this.inBulkOperation())
      this.startBulkOperation();

    // TODO: release all public locks.
  }

  /** Create an empty Request */
  public static createRequest(): ConcurrencyControl.Request { return new IModelHost.platform.BriefcaseManagerResourcesRequest(); }

  /** Convert the request to any */
  public static convertRequestToAny(req: ConcurrencyControl.Request): any { return JSON.parse((req as IModelJsNative.BriefcaseManagerResourcesRequest).toJSON()); }

  /** @internal [[Model.buildConcurrencyControlRequest]] */
  public buildRequestForModel(model: Model, opcode: DbOpcode): void {
    if (!this._iModel.briefcase)
      throw new IModelError(IModelStatus.BadRequest, "Invalid briefcase", Logger.logError, loggerCategory);
    const rc: RepositoryStatus = this._iModel.briefcase.nativeDb.buildBriefcaseManagerResourcesRequestForModel(this._pendingRequest as IModelJsNative.BriefcaseManagerResourcesRequest, JSON.stringify(model.id), opcode);
    if (rc !== RepositoryStatus.Success)
      throw new IModelError(rc, "Error building request for Model", Logger.logError, loggerCategory);
  }

  /** @internal [[Element.buildConcurrencyControlRequest]] */
  public buildRequestForElement(element: Element, opcode: DbOpcode): void {
    if (!this._iModel.briefcase)
      throw new IModelError(IModelStatus.BadRequest, "Invalid briefcase", Logger.logError, loggerCategory);
    let rc: RepositoryStatus;
    if (element.id === undefined || opcode === DbOpcode.Insert)
      rc = this._iModel.briefcase.nativeDb.buildBriefcaseManagerResourcesRequestForElement(this._pendingRequest as IModelJsNative.BriefcaseManagerResourcesRequest, JSON.stringify({ modelid: element.model, code: element.code }), opcode);
    else
      rc = this._iModel.briefcase.nativeDb.buildBriefcaseManagerResourcesRequestForElement(this._pendingRequest as IModelJsNative.BriefcaseManagerResourcesRequest, JSON.stringify(element.id), opcode);
    if (rc !== RepositoryStatus.Success)
      throw new IModelError(rc, "Error building request for Element", Logger.logError, loggerCategory);
  }

  /** @internal [[LinkTableRelationship.buildConcurrencyControlRequest]] */
  public buildRequestForRelationship(instance: Relationship, opcode: DbOpcode): void {
    if (!this._iModel.briefcase)
      throw new IModelError(IModelStatus.BadRequest, "Invalid briefcase", Logger.logError, loggerCategory);
    const rc: RepositoryStatus = this._iModel.briefcase.nativeDb.buildBriefcaseManagerResourcesRequestForLinkTableRelationship(this._pendingRequest as IModelJsNative.BriefcaseManagerResourcesRequest, JSON.stringify(instance), opcode);
    if (rc !== RepositoryStatus.Success)
      throw new IModelError(rc, "Error building request for LinkTableRelationship", Logger.logError, loggerCategory);
  }

  private captureBulkOpRequest() {
    if (this._iModel.briefcase)
      this._iModel.briefcase.nativeDb.extractBulkResourcesRequest(this._pendingRequest as IModelJsNative.BriefcaseManagerResourcesRequest, true, true);
  }

  /** @internal */
  public get pendingRequest(): ConcurrencyControl.Request {
    this.captureBulkOpRequest();
    return this._pendingRequest;
  }

  /** Are there pending, unprocessed requests for locks or codes? */
  public get hasPendingRequests(): boolean {
    if (!this._iModel.briefcase)
      return false;
    const reqAny: any = ConcurrencyControl.convertRequestToAny(this.pendingRequest);
    return (reqAny.Codes.length !== 0) || (reqAny.Locks.length !== 0);
  }

  /**
   * Take ownership of all or some of the pending request for locks and codes.
   * @param locksOnly If true, only the locks in the pending request are extracted. The default is to extract all requests.
   * @param codesOnly If true, only the codes in the pending request are extracted. The default is to extract all requests.
   * @internal
   */
  public extractPendingRequest(locksOnly?: boolean, codesOnly?: boolean): ConcurrencyControl.Request {
    if (!this._iModel.briefcase)
      throw new IModelError(IModelStatus.BadRequest, "Invalid briefcase", Logger.logError, loggerCategory);

    const extractLocks: boolean = !codesOnly;
    const extractCodes: boolean = !locksOnly;

    const req: ConcurrencyControl.Request = ConcurrencyControl.createRequest();
    this._iModel.briefcase.nativeDb.extractBriefcaseManagerResourcesRequest(req as IModelJsNative.BriefcaseManagerResourcesRequest, this.pendingRequest as IModelJsNative.BriefcaseManagerResourcesRequest, extractLocks, extractCodes);
    return req;
  }

  /**
   * Try to acquire locks and/or reserve codes from iModelHub.
   * This function may fulfill some requests and fail to fulfill others. This function returns a rejection of type RequestError if some or all requests could not be fulfilled.
   * The error object will identify the locks and/or codes that are unavailable.
   * <p><em>Example:</em>
   * ``` ts
   * [[include:ConcurrencyControl.request]]
   * ```
   * @param requestContext The client request context
   * @param req The requests to be sent to iModelHub. If undefined, all pending requests are sent to iModelHub.
   * @throws [[ConcurrencyControl.RequestError]] if some or all of the request could not be fulfilled by iModelHub.
   * @throws [[IModelError]] if the IModelDb is not open or is not connected to an iModel.
   * See [CodeHandler]($clients) and [LockHandler]($clients) for details on what errors may be thrown.
   */
  public async request(requestContext: AuthorizedClientRequestContext, req?: ConcurrencyControl.Request): Promise<void> {
    requestContext.enter();
    if (!this._iModel.isOpen)
      return Promise.reject(new Error("not open"));

    assert(this.inBulkOperation(), "should always be in bulk mode");

    if (req === undefined)
      req = this.extractPendingRequest();

    const codeResults = await this.reserveCodesFromRequest(requestContext, req, this._iModel.briefcase);
    requestContext.enter();

    await this.acquireLocksFromRequest(requestContext, req, this._iModel.briefcase);
    requestContext.enter();

    assert(this.inBulkOperation(), "should always be in bulk mode");

    let err: ConcurrencyControl.RequestError | undefined;
    for (const code of codeResults) {
      if (code.state !== CodeState.Reserved) {
        if (err === undefined)
          err = new ConcurrencyControl.RequestError(IModelStatus.CodeNotReserved, "Code not reserved", Logger.logError, loggerCategory);
        err.unavailableCodes.push(code);
      }
    }

    if (err !== undefined)
      return Promise.reject(err);
  }

  private buildHubCodes(briefcaseEntry: BriefcaseEntry, codeSpecId: Id64String, codeScope: string, value?: string): HubCode {
    const requestCode = new HubCode();
    requestCode.briefcaseId = briefcaseEntry.briefcaseId;
    requestCode.state = CodeState.Reserved;
    requestCode.codeSpecId = codeSpecId;
    requestCode.codeScope = codeScope;
    requestCode.value = value;
    return requestCode;
  }

  private buildHubCodesFromCode(briefcaseEntry: BriefcaseEntry, code: Code): HubCode {
    return this.buildHubCodes(briefcaseEntry, code.spec, code.scope, code.value);
  }

  private buildHubCodesFromRequest(briefcaseEntry: BriefcaseEntry, req: ConcurrencyControl.Request): HubCode[] | undefined {
    const reqAny = ConcurrencyControl.convertRequestToAny(req);
    if (!reqAny.hasOwnProperty("Codes") || reqAny.Codes.length === 0)
      return undefined;

    return reqAny.Codes.map((cReq: any) => this.buildHubCodes(briefcaseEntry, cReq.Id, cReq.Scope, cReq.Name));
  }

  private buildHubCodesFromCodes(briefcaseEntry: BriefcaseEntry, codes: Code[]): HubCode[] | undefined {
    return codes.map((code: Code) => this.buildHubCodesFromCode(briefcaseEntry, code));
  }

  /** Obtain the schema lock. This is always an immediate request, never deferred. See [LockHandler]($clients) for details on what errors may be thrown. */
  public async lockSchema(requestContext: AuthorizedClientRequestContext): Promise<Lock[]> {
    requestContext.enter();
    const locks: Lock[] = [
      {
        wsgId: "what-is-this",
        ecId: "and-what-is-this",
        lockLevel: LockLevel.Exclusive,
        lockType: LockType.Schemas,
        objectId: Id64.fromString("0x1"),
        briefcaseId: this._iModel.briefcase.briefcaseId,
        seedFileId: this._iModel.briefcase.fileId,
        releasedWithChangeSet: this._iModel.briefcase.currentChangeSetId,
      },
    ];

    const alreadyHeld = await this.queryLocksAlreadyHeld(requestContext, locks, this._iModel.briefcase);
    if (alreadyHeld.length !== 0)
      return alreadyHeld;

    assert(this.inBulkOperation(), "should always be in bulk mode");
    const res = BriefcaseManager.imodelClient.locks.update(requestContext, this._iModel.iModelToken.iModelId!, locks);
    assert(this.inBulkOperation(), "should always be in bulk mode");
    return res;
  }

  /** Returns `true` if the schema lock is held.
   * @param requestContext The client request context
   * @alpha Need to determine if we want this method
   */
  public async hasSchemaLock(requestContext: AuthorizedClientRequestContext): Promise<boolean> {
    requestContext.enter();
    const locks: Lock[] = await BriefcaseManager.imodelClient.locks.get(
      requestContext,
      this._iModel.iModelToken.iModelId!,
      new LockQuery().byBriefcaseId(this._iModel.briefcase.briefcaseId).byLockType(LockType.Schemas).byLockLevel(LockLevel.Exclusive),
    );
    requestContext.enter();
    return locks.length > 0;
  }

  /** Obtain the CodeSpec lock. This is always an immediate request, never deferred. See [LockHandler]($clients) for details on what errors may be thrown. */
  public async lockCodeSpecs(requestContext: AuthorizedClientRequestContext): Promise<Lock[]> {
    requestContext.enter();
    const locks: Lock[] = [
      {
        wsgId: "what-is-this",
        ecId: "and-what-is-this",
        lockLevel: LockLevel.Exclusive,
        lockType: LockType.CodeSpecs,
        objectId: Id64.fromString("0x1"),
        briefcaseId: this._iModel.briefcase.briefcaseId,
        seedFileId: this._iModel.briefcase.fileId,
        releasedWithChangeSet: this._iModel.briefcase.currentChangeSetId,
      },
    ];

    const alreadyHeld = await this.queryLocksAlreadyHeld(requestContext, locks, this._iModel.briefcase);
    requestContext.enter();
    if (alreadyHeld.length !== 0)
      return alreadyHeld;

    assert(this.inBulkOperation(), "should always be in bulk mode");
    const res = BriefcaseManager.imodelClient.locks.update(requestContext, this._iModel.iModelToken.iModelId!, locks);
    assert(this.inBulkOperation(), "should always be in bulk mode");
    return res;
  }

  private buildLockRequests(briefcaseInfo: BriefcaseEntry, req: ConcurrencyControl.Request): Lock[] | undefined {
    const reqAny: any = ConcurrencyControl.convertRequestToAny(req);

    if (!reqAny.hasOwnProperty("Locks") || reqAny.Locks.length === 0)
      return undefined;

    const locks: Lock[] = [];
    for (const reqLock of reqAny.Locks) {
      const lock = new Lock();
      lock.briefcaseId = briefcaseInfo.briefcaseId;
      lock.lockLevel = reqLock.Level;
      lock.lockType = reqLock.LockableId.Type;
      lock.objectId = reqLock.LockableId.Id;
      lock.releasedWithChangeSet = this._iModel.briefcase.currentChangeSetId;
      lock.seedFileId = this._iModel.briefcase.fileId!;
      locks.push(lock);
    }
    return locks;
  }

  private static isLockOnSameObject(c1: Lock, c2: Lock): boolean {
    return c1.briefcaseId === c2.briefcaseId
      && c1.lockType === c2.lockType
      && c1.objectId === c2.objectId;
  }

  private static getLockLevelAsInt(l: LockLevel): number {
    switch (l) {
      case LockLevel.None: return 0;
      case LockLevel.Shared: return 1;
    }
    return 2;
  }

  private static compareLockLevels(l1: LockLevel | undefined, l2: LockLevel | undefined): number {
    if (!l1)
      return -1;
    if (!l2)
      return 1;
    return this.getLockLevelAsInt(l2) - this.getLockLevelAsInt(l1);
  }

  private static containsLockOnSameObject(haveLocks: Lock[], wantLock: Lock): boolean {
    return haveLocks.find((haveLock: Lock) => this.isLockOnSameObject(haveLock, wantLock) && (this.compareLockLevels(haveLock.lockLevel, wantLock.lockLevel) >= 0)) !== undefined;
  }

  private static isEqualHubCode(c1: HubCode, c2: HubCode): boolean {
    return c1.briefcaseId === c2.briefcaseId
      && c1.codeSpecId === c2.codeSpecId
      && c1.codeScope === c2.codeScope
      && c1.value === c2.value;
  }

  private static containsEqualHubCode(codes: HubCode[], code: HubCode): boolean {
    return codes.find((c) => this.isEqualHubCode(c, code)) !== undefined;
  }

  private async queryLocksAlreadyHeld(reqctx: AuthorizedClientRequestContext, hubLocks: Lock[], briefcaseEntry: BriefcaseEntry): Promise<Lock[]> {
    reqctx.enter();
    const alreadyHeld: Lock[] = [];

    const query = new LockQuery().byBriefcaseId(briefcaseEntry.briefcaseId).byLocks(hubLocks);
    const states = await BriefcaseManager.imodelClient.locks.get(reqctx, this._iModel.briefcase.iModelId, query);
    reqctx.enter();

    states.forEach((hubLock: Lock) => {
      assert(hubLock.briefcaseId === briefcaseEntry.briefcaseId);
      if ((hubLock.lockLevel !== undefined) && (hubLock.lockLevel !== LockLevel.None))
        alreadyHeld.push(hubLock);
    });
    return alreadyHeld;
  }

  private async queryCodesAlreadyReserved(reqctx: AuthorizedClientRequestContext, hubCodes: HubCode[], briefcaseEntry: BriefcaseEntry): Promise<HubCode[]> {
    reqctx.enter();
    const alreadyHeld: HubCode[] = [];

    const query = new CodeQuery().byBriefcaseId(briefcaseEntry.briefcaseId).byCodes(hubCodes);
    const states = await BriefcaseManager.imodelClient.codes.get(reqctx, this._iModel.briefcase.iModelId, query);
    reqctx.enter();

    states.forEach((hubCode: HubCode) => {
      assert(hubCode.briefcaseId === briefcaseEntry.briefcaseId);
      if (hubCode.state === CodeState.Reserved) {
        alreadyHeld.push(hubCode);
      }
    });
    return alreadyHeld;
  }

  /** process the Lock-specific part of the request. */
  private async acquireLocksFromRequest(requestContext: AuthorizedClientRequestContext, req: ConcurrencyControl.Request, briefcaseEntry: BriefcaseEntry): Promise<Lock[]> {
    requestContext.enter();
    let locks = this.buildLockRequests(briefcaseEntry, req);
    if (locks === undefined)
      return [];

    const alreadyReserved = await this.queryLocksAlreadyHeld(requestContext, locks, briefcaseEntry);
    requestContext.enter();
    if (alreadyReserved.length !== 0)
      locks = locks.filter((lock) => !ConcurrencyControl.containsLockOnSameObject(alreadyReserved, lock));

    if (locks.length === 0)
      return [];

    return BriefcaseManager.imodelClient.locks.update(requestContext, this._iModel.iModelToken.iModelId!, locks);
  }

  /** process a Code-reservation request. The requests in bySpecId must already be in iModelHub REST format. */
  private async reserveCodes2(requestContext: AuthorizedClientRequestContext, request: HubCode[], briefcaseEntry: BriefcaseEntry): Promise<HubCode[]> {
    requestContext.enter();

    const alreadyReserved = await this.queryCodesAlreadyReserved(requestContext, request, briefcaseEntry);
    requestContext.enter();
    if (alreadyReserved.length !== 0)
      request = request.filter((reqCode) => !ConcurrencyControl.containsEqualHubCode(alreadyReserved, reqCode));

    if (request.length === 0)
      return [];

    return BriefcaseManager.imodelClient.codes.update(requestContext, briefcaseEntry.iModelId, request);
  }

  /** process the Code-specific part of the request. */
  private async reserveCodesFromRequest(requestContext: AuthorizedClientRequestContext, req: ConcurrencyControl.Request, briefcaseEntry: BriefcaseEntry): Promise<HubCode[]> {
    requestContext.enter();
    const request = this.buildHubCodesFromRequest(briefcaseEntry, req);
    if (request === undefined)
      return [];

    return this.reserveCodes2(requestContext, request, briefcaseEntry);
  }

  /** Reserve the specified codes. See [CodeHandler]($clients) for details on what errors may be thrown. */
  public async reserveCodes(requestContext: AuthorizedClientRequestContext, codes: Code[]): Promise<HubCode[]> {
    requestContext.enter();
    if (!this._iModel.isOpen)
      return Promise.reject(new Error("not open"));

    const bySpecId = this.buildHubCodesFromCodes(this._iModel.briefcase, codes);
    if (bySpecId === undefined)
      return Promise.reject(new IModelError(IModelStatus.NotFound, "Error reserving codes", Logger.logWarning, loggerCategory));

    return this.reserveCodes2(requestContext, bySpecId, this._iModel.briefcase);
  }

  // Query the state of the Codes for the specified CodeSpec and scope. See [CodeHandler]($clients) for details on what errors may be thrown.
  public async queryCodeStates(requestContext: AuthorizedClientRequestContext, specId: Id64String, scopeId: string, _value?: string): Promise<HubCode[]> {
    requestContext.enter();
    if (!this._iModel.isOpen)
      return Promise.reject(new Error("not open"));

    const query = new CodeQuery().byCodeSpecId(specId).byCodeScope(scopeId);

    /* NEEDS WORK
    if (value !== undefined) {
      queryOptions.$filter += `+and+Value+eq+'${value}'`;
    }
    */

    return BriefcaseManager.imodelClient.codes.get(requestContext, this._iModel.briefcase.iModelId, query);
  }

  /** Abandon any pending requests for locks or codes. */
  public abandonRequest() { this.extractPendingRequest(); }

  /**
   * Check to see if *all* of the codes in the specified request are available.
   * @param requestContext The client request context
   * @param req the list of code requests to be fulfilled. If not specified then all pending requests for codes are queried.
   * @returns true if all codes are available or false if any is not.
   */
  public async areCodesAvailable(requestContext: AuthorizedClientRequestContext, req?: ConcurrencyControl.Request): Promise<boolean> {
    requestContext.enter();
    if (!this._iModel.isOpen)
      return Promise.reject(new Error("not open"));
    // throw new Error("TBD");
    if (req === undefined)
      req = this.pendingRequest;

    const hubCodes = this.buildHubCodesFromRequest(this._iModel.briefcase, req);

    if (!hubCodes)
      return true;

    const codesHandler = BriefcaseManager.imodelClient.codes;
    const chunkSize = 100;
    for (let i = 0; i < hubCodes.length; i += chunkSize) {
      const query = new CodeQuery().byCodes(hubCodes.slice(i, i + chunkSize));
      const result = await codesHandler.get(requestContext, this._iModel.briefcase.iModelId, query);
      for (const code of result) {
        if (code.state !== CodeState.Available)
          return false;
      }
    }
    return true;
  }

  /**
   * Check to see if *all* of the requested resources could be acquired from iModelHub.
   * @param requestContext The client request context
   * @param req the list of resource requests to be fulfilled. If not specified then all pending requests for locks and codes are queried.
   * @returns true if all resources could be acquired or false if any could not be acquired.
   */
  public async areAvailable(requestContext: AuthorizedClientRequestContext, req?: ConcurrencyControl.Request): Promise<boolean> {
    requestContext.enter();
    if (!this._iModel.isOpen)
      return Promise.reject(new Error("not open"));
    if (req === undefined)
      req = this.pendingRequest;

    const allCodesAreAvailable = await this.areCodesAvailable(requestContext, req);
    requestContext.enter();
    if (!allCodesAreAvailable)
      return false;

    // TODO: Locks

    return true;
  }

  /** Set the concurrency control policy.
   * Before changing from optimistic to pessimistic, all local changes must be saved and uploaded to iModelHub.
   * Before changing the locking policy of the pessimistic concurrency policy, all local changes must be saved to the IModelDb.
   * Here is an example of setting an optimistic policy:
   * <p><em>Example:</em>
   * ``` ts
   * [[include:ConcurrencyControl.setPolicy]]
   * ```
   * @param policy The policy to used
   * @throws [[IModelError]] if the policy cannot be set.
   */
  public setPolicy(policy: ConcurrencyControl.PessimisticPolicy | ConcurrencyControl.OptimisticPolicy): void {
    this._policy = policy;
    if (!this._iModel.briefcase)
      throw new IModelError(IModelStatus.BadRequest, "Invalid briefcase", Logger.logError, loggerCategory);
    let rc: RepositoryStatus;
    if (policy instanceof ConcurrencyControl.OptimisticPolicy) {
      const oc: ConcurrencyControl.OptimisticPolicy = policy as ConcurrencyControl.OptimisticPolicy;
      rc = this._iModel.briefcase.nativeDb.setBriefcaseManagerOptimisticConcurrencyControlPolicy(oc.conflictResolution);
    } else {
      rc = this._iModel.briefcase.nativeDb.setBriefcaseManagerPessimisticConcurrencyControlPolicy();
    }
    if (RepositoryStatus.Success !== rc) {
      throw new IModelError(rc, "Error setting concurrency control policy", Logger.logError, loggerCategory);
    }
    this.applyTransactionOptions();
  }

  /**
   * By entering bulk operation mode, an app can insert, update, and delete entities in the IModelDb without first acquiring locks.
   * When the app calls saveChanges, the transaction manager attempts to acquire all needed locks and codes.
   * The transaction manager will roll back all pending changes if any lock or code cannot be acquired at save time. Lock and code acquisition will fail if another user
   * has pushed changes to the same entities or used the same codes as the local transaction.
   * This mode can therefore be used safely only in special cases where contention for locks and codes is not a risk.
   * Normally, that is only possible when writing to a model that is exclusively locked and where codes are scoped to that model.
   * See [[request]] and [[IModelDb.saveChanges]].
   * @throws [[IModelError]] if it would be illegal to enter bulk operation mode.
   */
  private startBulkOperation(): void {
    if (!this._iModel.briefcase)
      throw new IModelError(IModelStatus.BadRequest, "Invalid briefcase", Logger.logError, loggerCategory);
    const rc: RepositoryStatus = this._iModel.briefcase.nativeDb.briefcaseManagerStartBulkOperation();
    if (RepositoryStatus.Success !== rc)
      throw new IModelError(rc, "Error starting bulk operation", Logger.logError, loggerCategory);
  }

  /** Check if there is a bulk operation in progress */
  private inBulkOperation(): boolean {
    if (!this._iModel.briefcase)
      return false;
    return this._iModel.briefcase.nativeDb.inBulkOperation();
  }

  /*
   * Ends the bulk operation and appends the locks and codes that it recorded to the pending request.
  private endBulkOperation() {
    if (!this._imodel.briefcaseEntry)
      return;
    this.captureBulkOpRequest();
    // Now exit bulk operation mode in the addon. It will then stop collecting (and start enforcing) lock and code requirements.
    const rc: RepositoryStatus = this._imodel.briefcaseEntry.nativeDb.briefcaseManagerEndBulkOperation();
    if (RepositoryStatus.Success !== rc)
      throw new IModelError(rc);
    this.applyTransactionOptions(); // (may re-start the bulk operation)
  }
   */

  /** API to reserve Codes and query the status of Codes */
  get codes(): ConcurrencyControl.Codes {
    if (this._codes === undefined)
      this._codes = new ConcurrencyControl.Codes(this._iModel);
    return this._codes;
  }
}

/** @beta */
export namespace ConcurrencyControl {
  /** A request for locks and/or code reservations. */
  export class Request {
    private constructor() { }
  }

  /* Keep this consistent with DgnPlatform/RepositoryManager.h. */
  /** How to handle a conflict. */
  export enum OnConflict {
    /** Reject the incoming change */
    RejectIncomingChange = 0,
    /** Accept the incoming change */
    AcceptIncomingChange = 1,
  }

  /**
   * The options for how conflicts are to be handled during change-merging in an OptimisticConcurrencyControlPolicy.
   * The scenario is that the caller has made some changes to the *local* IModelDb. Now, the caller is attempting to
   * merge in changes from iModelHub. The properties of this policy specify how to handle the *incoming* changes from iModelHub.
   */
  export class ConflictResolutionPolicy {
    /** What to do with the incoming change in the case where the same element was updated locally and also would be updated by the incoming change. */
    public updateVsUpdate: OnConflict;
    /** What to do with the incoming change in the case where an element was updated locally and would be deleted by the incoming change. */
    public updateVsDelete: OnConflict;
    /** What to do with the incoming change in the case where an element was deleted locally and would be updated by the incoming change. */
    public deleteVsUpdate: OnConflict;

    /**
     * Construct a ConflictResolutionPolicy.
     * @param updateVsUpdate What to do with the incoming change in the case where the same element was updated locally and also would be updated by the incoming change
     * @param updateVsDelete What to do with the incoming change in the case where an element was updated locally and would be deleted by the incoming change
     * @param deleteVsUpdate What to do with the incoming change in the case where an element was deleted locally and would be updated by the incoming change
     */
    constructor(updateVsUpdate?: OnConflict, updateVsDelete?: OnConflict, deleteVsUpdate?: OnConflict) {
      this.updateVsUpdate = updateVsUpdate ? updateVsUpdate! : ConcurrencyControl.OnConflict.RejectIncomingChange;
      this.updateVsDelete = updateVsDelete ? updateVsDelete! : ConcurrencyControl.OnConflict.AcceptIncomingChange;
      this.deleteVsUpdate = deleteVsUpdate ? deleteVsUpdate! : ConcurrencyControl.OnConflict.RejectIncomingChange;
    }
  }

  /** Specifies an optimistic concurrency policy. */
  export class OptimisticPolicy {
    public conflictResolution: ConflictResolutionPolicy;
    constructor(policy?: ConflictResolutionPolicy) { this.conflictResolution = policy ? policy! : new ConflictResolutionPolicy(); }
  }

  /** Specifies a pessimistic concurrency policy. */
  export class PessimisticPolicy {
  }

  /** Thrown when iModelHub denies or cannot process a request. */
  export class RequestError extends IModelError {
    public unavailableCodes: HubCode[] = [];
    public unavailableLocks: HubCode[] = [];
  }

  /** Code manager */
  export class Codes {
    constructor(private _iModel: IModelDb) { }

    /**
     * Reserve Codes.
     * If no Codes are specified, then all of the Codes that are in currently pending requests are reserved.
     * This function may only be able to reserve some of the requested Codes. In that case, this function will return a rejection of type RequestError.
     * The error object will identify the codes that are unavailable.
     * <p><em>Example:</em>
     * ``` ts
     * [[include:ConcurrencyControl_Codes.reserve]]
     * ```
     * @param requestContext The client request context
     * @param codes The Codes to reserve
     * @throws [[ConcurrencyControl.RequestError]]
     */
    public async reserve(requestContext: AuthorizedClientRequestContext, codes?: Code[]): Promise<void> {
      requestContext.enter();

      if (!this._iModel.isOpen)
        return Promise.reject(new Error("not open"));

      if (codes !== undefined) {
        await this._iModel.concurrencyControl.reserveCodes(requestContext, codes);

        // TODO: examine result and throw CodeReservationError if some codes could not be reserved
        return;
      }
      requestContext.enter();

      const req: ConcurrencyControl.Request = this._iModel.concurrencyControl.extractPendingRequest(false, true);
      this._iModel.briefcase.nativeDb.extractBulkResourcesRequest(req as IModelJsNative.BriefcaseManagerResourcesRequest, false, true);
      this._iModel.briefcase.nativeDb.extractBriefcaseManagerResourcesRequest(req as IModelJsNative.BriefcaseManagerResourcesRequest, req as IModelJsNative.BriefcaseManagerResourcesRequest, false, true);
      return this._iModel.concurrencyControl.request(requestContext, req);
    }

    /**
     * Queries the state of the specified Codes in the code service.
     * @param requestContext The client request context
     * @param specId The CodeSpec to query
     * @param scopeId The scope to query
     * @param value Optional. The Code value to query.
     */
    public async query(requestContext: AuthorizedClientRequestContext, specId: Id64String, scopeId: string, value?: string): Promise<HubCode[]> {
      return this._iModel.concurrencyControl.queryCodeStates(requestContext, specId, scopeId, value);
    }
  }
}
