/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module UnifiedSelection
 */

import { IDisposable, DisposableList } from "@bentley/bentleyjs-core";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { Keys, KeySet } from "@bentley/presentation-common";
import { SelectionChangeEventArgs, SelectionChangesListener } from "./SelectionChangeEvent";
import { SelectionManager } from "./SelectionManager";
import { ISelectionProvider } from "./ISelectionProvider";

/**
 * A class that handles selection changes and helps to change
 * internal the selection state.
 *
 * @public
 */
export class SelectionHandler implements IDisposable {
  private _inSelect: boolean;
  private _disposables: DisposableList;

  /** Selection manager used by this handler to manage selection */
  public readonly manager: SelectionManager;
  /** Name that's used as `SelectionChangeEventArgs.source` when making selection changes */
  public name: string;
  /** iModel whose selection is being handled */
  public imodel: IModelConnection;
  /**
   * ID of presentation ruleset used by the component using this handler. The ID is set as
   * `SelectionChangeEventArgs.rulesetId` when making selection changes and event
   * listeners can use or ignore this information.
   */
  public rulesetId?: string;
  /** Callback function called when selection changes */
  public onSelect?: SelectionChangesListener;

  /**
   * Constructor.
   * @param manager SelectionManager used to store overall selection.
   * @param name The name of the selection handler.
   * @param rulesetId Id of a ruleset selection changes will be associated.
   * @param imodel iModel connection with which the selection changes will be associated with.
   * @param onSelect Callback function called when selection changes.
   */
  constructor(manager: SelectionManager, name: string, imodel: IModelConnection, rulesetId?: string, onSelect?: SelectionChangesListener) {
    this._inSelect = false;
    this.manager = manager;
    this._disposables = new DisposableList();
    this.name = name;
    this.rulesetId = rulesetId;
    this.imodel = imodel;
    this.onSelect = onSelect;
    this._disposables.add(this.manager.selectionChange.addListener(this.onSelectionChanged));
  }

  /**
   * Destructor. Must be called before disposing this object to make sure it cleans
   * up correctly.
   */
  public dispose(): void {
    this._disposables.dispose();
  }

  /**
   * Called when the selection changes. Handles this callback by first checking whether
   * the event should be handled at all (using the `shouldHandle` method) and then calling `onSelect`
   */
  protected onSelectionChanged = (evt: SelectionChangeEventArgs, provider: ISelectionProvider): void => {
    if (!this.onSelect || !this.shouldHandle(evt))
      return;

    this._inSelect = true;
    this.onSelect(evt, provider);
    this._inSelect = false;
  }

  /** Called to check whether the event should be handled by this handler */
  protected shouldHandle(evt: SelectionChangeEventArgs): boolean {
    if (this.name === evt.source)
      return false;
    return true;
  }

  /** Get selection levels for the imodel managed by this handler */
  public getSelectionLevels(): number[] {
    return this.manager.getSelectionLevels(this.imodel);
  }

  /**
   * Get selection for the imodel managed by this handler.
   * @param level Level of the selection to get. Defaults to 0.
   */
  public getSelection(level?: number): Readonly<KeySet> {
    return this.manager.getSelection(this.imodel, level);
  }

  /**
   * Add to selection.
   * @param keys The keys to add to selection.
   * @param level Level of the selection.
   */
  public addToSelection(keys: Keys, level: number = 0): void {
    if (this._inSelect)
      return;

    return this.manager.addToSelection(this.name, this.imodel, keys, level, this.rulesetId);
  }

  /**
   * Remove from selection.
   * @param keys The keys to remove from selection.
   * @param level Level of the selection.
   */
  public removeFromSelection(keys: Keys, level: number = 0): void {
    if (this._inSelect)
      return;

    return this.manager.removeFromSelection(this.name, this.imodel, keys, level, this.rulesetId);
  }

  /**
   * Change selection.
   * @param keys The keys indicating the new selection.
   * @param level Level of the selection.
   */
  public replaceSelection(keys: Keys, level: number = 0): void {
    if (this._inSelect)
      return;

    return this.manager.replaceSelection(this.name, this.imodel, keys, level, this.rulesetId);
  }

  /**
   * Clear selection.
   * @param level Level of the selection.
   */
  public clearSelection(level: number = 0): void {
    if (this._inSelect)
      return;

    return this.manager.clearSelection(this.name, this.imodel, level, this.rulesetId);
  }
}
