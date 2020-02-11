/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import {
  compareStrings,
  BeEvent,
  Id64String,
  Id64,
  SortedArray,
} from "@bentley/bentleyjs-core";
import {
  DisplayStyle3dState,
  IModelConnection,
  SpatialViewState,
  ViewState,
} from "@bentley/imodeljs-frontend";
import { ColorDef } from "@bentley/imodeljs-common";

export class ViewList extends SortedArray<IModelConnection.ViewSpec> {
  private _defaultViewId = Id64.invalid;
  private readonly _views = new Map<Id64String, ViewState>();

  private constructor() {
    super((lhs, rhs) => compareStrings(lhs.id, rhs.id));
  }

  public get defaultViewId(): Id64String { return this._defaultViewId; }

  public async getView(id: Id64String, iModel: IModelConnection): Promise<ViewState> {
    let view = this._views.get(id);
    if (undefined === view) {
      view = await iModel.views.load(id);
      this._views.set(id, view);
    }

    // NB: We clone so that if user switches back to this view, it is shown in its initial (persistent) state.
    return view.clone();
  }

  public async getDefaultView(iModel: IModelConnection): Promise<ViewState> {
    return this.getView(this.defaultViewId, iModel);
  }

  public static async create(iModel: IModelConnection, viewName?: string): Promise<ViewList> {
    const viewList = new ViewList();
    await viewList.populate(iModel, viewName);
    return viewList;
  }

  public clear(): void {
    super.clear();
    this._defaultViewId = Id64.invalid;
    this._views.clear();
  }

  public async populate(iModel: IModelConnection, viewName?: string): Promise<void> {
    this.clear();

    const query = { wantPrivate: false };
    const specs = await iModel.views.getViewList(query);
    for (const spec of specs)
      this.insert(spec);

    if (undefined !== viewName) {
      for (const spec of this) {
        if (spec.name === viewName) {
          this._defaultViewId = spec.id;
          break;
        }
      }
    }

    if (Id64.isInvalid(this._defaultViewId) && 0 < this._array.length) {
      this._defaultViewId = this._array[0].id;
      const defaultViewId = await iModel.views.queryDefaultViewId();
      for (const spec of this) {
        if (spec.id === defaultViewId) {
          this._defaultViewId = defaultViewId;
          break;
        }
      }
    }

    if (Id64.isInvalid(this._defaultViewId))
      this.insert({ id: Id64.invalid, name: "Spatial View", class: SpatialViewState.classFullName });

    const selectedView = Id64.isInvalid(this._defaultViewId) ? this.manufactureSpatialView(iModel) : await iModel.views.load(this._defaultViewId);
    this._views.set(this._defaultViewId, selectedView);
  }

  // create a new spatial view initialized to show the project extents from top view. Model and
  // category selectors are empty, so this is really only useful for testing backgroundMaps and
  // reality models.
  private manufactureSpatialView(iModel: IModelConnection): SpatialViewState {
    const ext = iModel.projectExtents;

    // start with a new "blank" spatial view to show the extents of the project, from top view
    const blankView = SpatialViewState.createBlank(iModel, ext.low, ext.high.minus(ext.low));

    // turn on the background map
    const style = blankView.displayStyle as DisplayStyle3dState;
    const viewFlags = style.viewFlags;
    viewFlags.backgroundMap = true;
    style.viewFlags = viewFlags; // call to accessor to get the json properties to reflect the changes to ViewFlags

    style.backgroundColor = ColorDef.white;

    // turn on the skybox in the environment
    const env = style.environment;
    env.sky.display = true;
    style.environment = env; // call to accessor to get the json properties to reflect the changes

    return blankView;
  }
}

export class ViewPicker {
  private readonly _select: HTMLSelectElement;
  public readonly onSelectedViewChanged = new BeEvent<(viewId: Id64String) => void>();

  public get element(): HTMLElement { return this._select; }

  public constructor(parent: HTMLElement, views: ViewList) {
    this._select = document.createElement("select") as HTMLSelectElement;
    this._select.className = "viewList";
    this._select.onchange = () => this.onSelectedViewChanged.raiseEvent(this._select.value);

    parent.appendChild(this._select);

    this.populate(views);
  }

  public populate(views: ViewList): void {
    while (this._select.hasChildNodes())
      this._select.removeChild(this._select.firstChild!);

    let index = 0;
    for (const spec of views) {
      const option = document.createElement("option") as HTMLOptionElement;
      option.innerText = spec.name;
      option.value = spec.id;
      this._select.appendChild(option);
      if (spec.id === views.defaultViewId)
        this._select.selectedIndex = index;
      index++;
    }
  }
}
