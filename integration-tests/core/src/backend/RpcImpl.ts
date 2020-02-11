/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { ClientRequestContext, ClientRequestContextProps, GuidString } from "@bentley/bentleyjs-core";
import { RpcInterface, RpcManager, IModelTokenProps, IModelToken } from "@bentley/imodeljs-common";
import { AuthorizedClientRequestContext, AuthorizedClientRequestContextProps } from "@bentley/imodeljs-clients";
import { IModelDb, ChangeSummaryExtractOptions, ChangeSummaryManager, BriefcaseManager, IModelJsFs, IModelHost, EventSinkManager } from "@bentley/imodeljs-backend";
import { TestRpcInterface, EventsTestRpcInterface } from "../common/RpcInterfaces";

export class TestRpcImpl extends RpcInterface implements TestRpcInterface {
  public static register() {
    RpcManager.registerImpl(TestRpcInterface, TestRpcImpl);
  }

  public async restartIModelHost(): Promise<void> {
    IModelHost.shutdown();
    IModelHost.startup();
  }

  public async extractChangeSummaries(tokenProps: IModelTokenProps, options: any): Promise<void> {
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    const iModelToken = IModelToken.fromJSON(tokenProps);
    await ChangeSummaryManager.extractChangeSummaries(requestContext, IModelDb.find(iModelToken), options as ChangeSummaryExtractOptions);
  }

  public async deleteChangeCache(tokenProps: IModelTokenProps): Promise<void> {
    const iModelToken = IModelToken.fromJSON(tokenProps);
    if (!iModelToken.iModelId)
      throw new Error("iModelToken is invalid. Must not be a standalone iModel");

    const changesPath: string = BriefcaseManager.getChangeCachePathName(iModelToken.iModelId);
    if (IModelJsFs.existsSync(changesPath))
      IModelJsFs.unlinkSync(changesPath);
  }

  public async executeTest(tokenProps: IModelTokenProps, testName: string, params: any): Promise<any> {
    const iModelToken = IModelToken.fromJSON(tokenProps);
    return JSON.parse(IModelDb.find(iModelToken).nativeDb.executeTest(testName, JSON.stringify(params)));
  }

  public async reportRequestContext(): Promise<ClientRequestContextProps> {
    if (ClientRequestContext.current instanceof AuthorizedClientRequestContext)
      throw new Error("Did not expect AuthorizedClientRequestContext");
    return ClientRequestContext.current.toJSON();
  }

  public async reportAuthorizedRequestContext(): Promise<AuthorizedClientRequestContextProps> {
    if (!(ClientRequestContext.current instanceof AuthorizedClientRequestContext))
      throw new Error("Expected AuthorizedClientRequestContext");
    const context = ClientRequestContext.current as AuthorizedClientRequestContext;
    return context.toJSON();
  }
}
/** The backend implementation of WipRpcInterface.
 * @internal
 */
export class EventsTestRpcImpl extends RpcInterface implements EventsTestRpcInterface {
  public static register() { RpcManager.registerImpl(EventsTestRpcInterface, EventsTestRpcImpl); }

  // set event that will be send to the frontend
  public async echo(tokenProps: IModelTokenProps, id: GuidString, message: string): Promise<void> {
    if (EventSinkManager.GLOBAL === tokenProps.key) {
      EventSinkManager.global.emit(EventsTestRpcInterface.name, "echo", { id, message });
    } else {
      const iModelToken = IModelToken.fromJSON(tokenProps);
      const iModelDb = IModelDb.find(iModelToken);
      iModelDb.eventSink!.emit(EventsTestRpcInterface.name, "echo", { id, message });
    }
  }
}
EventsTestRpcImpl.register();
TestRpcImpl.register();
