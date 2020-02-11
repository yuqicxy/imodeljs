/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module RpcInterface
 */

import { RpcInterface, RpcInterfaceDefinition, RpcInterfaceImplementation } from "./RpcInterface";
import { RpcRegistry } from "./rpc/core/RpcRegistry";

/** Describes the endpoints of an RPC interface.
 * @public
 */
export interface RpcInterfaceEndpoints {
  interfaceName: string;
  interfaceVersion: string;
  operationNames: string[];
  compatible: boolean;
}

/** RPC interface management is concerned with coordination of access and configuration for RPC interfaces.
 * @public
 */
export class RpcManager {
  /** Initializes an RPC interface class.
   * @note This function must be called on the frontend and on the backend for each RPC interface class used by an application.
   */
  public static initializeInterface<T extends RpcInterface>(definition: RpcInterfaceDefinition<T>): void {
    RpcRegistry.instance.initializeRpcInterface(definition);
  }

  /** Terminates an RPC interface class. */
  public static terminateInterface<T extends RpcInterface>(definition: RpcInterfaceDefinition<T>): void {
    RpcRegistry.instance.terminateRpcInterface(definition);
  }

  /** Returns the RPC client instance for the frontend. */
  public static getClientForInterface<T extends RpcInterface>(definition: RpcInterfaceDefinition<T>): T {
    return RpcRegistry.instance.getClientForInterface(definition);
  }

  /** Register the RPC implementation class for the backend. */
  public static registerImpl<TDefinition extends RpcInterface, TImplementation extends TDefinition>(definition: RpcInterfaceDefinition<TDefinition>, implementation: RpcInterfaceImplementation<TImplementation>): void {
    RpcRegistry.instance.registerImpl(definition, implementation);
  }

  /** Supply the instance of the RPC interface implementation class for the backend (optional). */
  public static supplyImplInstance<TDefinition extends RpcInterface, TImplementation extends TDefinition>(definition: RpcInterfaceDefinition<TDefinition>, instance: TImplementation): void {
    RpcRegistry.instance.supplyImplInstance(definition, instance);
  }

  /** Unregister the RPC implementation class for the backend. */
  public static unregisterImpl<TDefinition extends RpcInterface>(definition: RpcInterfaceDefinition<TDefinition>): void {
    RpcRegistry.instance.unregisterImpl(definition);
  }

  /** Describes the RPC interfaces and endpoints that are currently available from the backend.
   * @note Some endpoints may be marked incompatible if the frontend expected a different interface declaration than the backend supplied. RPC operations against an incompatible interface will fail.
   */
  public static async describeAvailableEndpoints(): Promise<RpcInterfaceEndpoints[]> {
    return RpcRegistry.instance.describeAvailableEndpoints();
  }
}
