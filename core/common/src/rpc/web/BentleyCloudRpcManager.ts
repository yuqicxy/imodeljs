/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module RpcInterface
 */

import { RpcInterfaceDefinition } from "../../RpcInterface";
import { RpcManager } from "../../RpcManager";
import { RpcConfiguration } from "../core/RpcConfiguration";
import { RpcRequest, RpcRequestEventHandler } from "../core/RpcRequest";
import { OpenAPIInfo } from "./OpenAPI";
import { BentleyCloudRpcProtocol } from "./BentleyCloudRpcProtocol";
import { RpcRequestEvent } from "../core/RpcConstants";

/** Initialization parameters for BentleyCloudRpcConfiguration.
 * @public
 */
export interface BentleyCloudRpcParams {
  /** Identifies the remote server that implements a set of RpcInterfaces. Note that the ID of the remote server is not a URI or hostname. It is a string that matches a key in the orchestrator's app registry. */
  info: OpenAPIInfo;
  /** The protocol for Bentley cloud RPC interface deployments */
  protocol?: typeof BentleyCloudRpcProtocol;
  /** The URI of the orchestrator that will route requests to the remote RpcInterface server. If not supplied, this default to the origin of the Web page. This is required only when calling initializeClient and only if the server is not the origin of the Web page. */
  uriPrefix?: string;
  /** Handler for RPC request events. */
  pendingRequestListener?: RpcRequestEventHandler;
}

/** Operating parameters for Bentley cloud RPC interface deployments.
 * @public
 */
export abstract class BentleyCloudRpcConfiguration extends RpcConfiguration {
  /** The protocol of the configuration. */
  public abstract readonly protocol: BentleyCloudRpcProtocol;
}

/** Coordinates usage of RPC interfaces for Bentley cloud deployments.
 * @public
 */
export class BentleyCloudRpcManager extends RpcManager {
  /** Initializes BentleyCloudRpcManager for the frontend of an application. */
  public static initializeClient(params: BentleyCloudRpcParams, interfaces: RpcInterfaceDefinition[]): BentleyCloudRpcConfiguration {
    return BentleyCloudRpcManager.performInitialization(params, interfaces);
  }

  /** Initializes BentleyCloudRpcManager for the backend of an application. */
  public static initializeImpl(params: BentleyCloudRpcParams, interfaces: RpcInterfaceDefinition[]): BentleyCloudRpcConfiguration {
    return BentleyCloudRpcManager.performInitialization(params, interfaces);
  }

  private static performInitialization(params: BentleyCloudRpcParams, interfaces: RpcInterfaceDefinition[]): BentleyCloudRpcConfiguration {
    const protocol = class extends (params.protocol || BentleyCloudRpcProtocol) {
      public pathPrefix = params.uriPrefix || "";
      public info = params.info;
    };

    const config = class extends BentleyCloudRpcConfiguration {
      public interfaces = () => interfaces;
      public protocol: BentleyCloudRpcProtocol = new protocol(this);
    };

    for (const def of interfaces) {
      RpcConfiguration.assign(def, () => config);
    }

    const instance = RpcConfiguration.obtain(config);
    RpcConfiguration.initializeInterfaces(instance);

    if (params.pendingRequestListener) {
      const listener = params.pendingRequestListener;

      RpcRequest.events.addListener((type, request) => {
        if (type === RpcRequestEvent.PendingUpdateReceived && request.protocol === instance.protocol) {
          listener(type, request);
        }
      });
    }

    return instance;
  }
}
