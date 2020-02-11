/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module RpcInterface
 */
import { Id64, ClientRequestContext } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "@bentley/imodeljs-clients";
import { RpcInterface, RpcManager, IModelProps, IModelToken, IModelTokenProps, IModelWriteRpcInterface, ThumbnailProps, ImageSourceFormat, AxisAlignedBox3dProps } from "@bentley/imodeljs-common";
import { IModelDb, OpenParams } from "../IModelDb";
import { Range3d } from "@bentley/geometry-core";

/**
 * The backend implementation of IModelWriteRpcInterface.
 * @internal
 */
export class IModelWriteRpcImpl extends RpcInterface implements IModelWriteRpcInterface {
  public static register() { RpcManager.registerImpl(IModelWriteRpcInterface, IModelWriteRpcImpl); }

  public async openForWrite(tokenProps: IModelTokenProps): Promise<IModelProps> {
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    const iModelToken = IModelToken.fromJSON(tokenProps);
    const openParams: OpenParams = OpenParams.pullAndPush();
    openParams.timeout = 1000;
    const db = await IModelDb.open(requestContext, iModelToken.contextId!, iModelToken.iModelId!, openParams);
    return db.toJSON();
  }

  public async saveChanges(tokenProps: IModelTokenProps, description?: string): Promise<void> {
    const iModelToken = IModelToken.fromJSON(tokenProps);
    IModelDb.find(iModelToken).saveChanges(description);
  }
  public async updateProjectExtents(tokenProps: IModelTokenProps, newExtents: AxisAlignedBox3dProps): Promise<void> {
    const iModelToken = IModelToken.fromJSON(tokenProps);
    IModelDb.find(iModelToken).updateProjectExtents(Range3d.fromJSON(newExtents));
  }

  public async saveThumbnail(tokenProps: IModelTokenProps, val: Uint8Array): Promise<void> {
    const iModelToken = IModelToken.fromJSON(tokenProps);
    const int32Val = new Uint32Array(val.buffer, 0, 6);
    const props: ThumbnailProps = { format: int32Val[1] === ImageSourceFormat.Jpeg ? "jpeg" : "png", width: int32Val[2], height: int32Val[3], image: new Uint8Array(val.buffer, 24, int32Val[0]) };
    const id = Id64.fromLocalAndBriefcaseIds(int32Val[4], int32Val[5]);
    if (!Id64.isValid(id) || props.width === undefined || props.height === undefined || props.image.length <= 0)
      return Promise.reject(new Error("bad args"));

    if (0 !== IModelDb.find(iModelToken).views.saveThumbnail(id, props))
      return Promise.reject(new Error("failed to save thumbnail"));

    return Promise.resolve();
  }
}
