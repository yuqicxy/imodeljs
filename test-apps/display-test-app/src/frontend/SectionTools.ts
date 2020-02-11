/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import {
  IModelApp,
  ViewClipDecorationProvider,
  ScreenViewport,
} from "@bentley/imodeljs-frontend";
import {
  createComboBox,
  createButton,
} from "@bentley/frontend-devtools";
import { ToolBarDropDown } from "./ToolBar";

function setFocusToHome(): void {
  const element = document.activeElement as HTMLElement;
  if (element && element !== document.body) {
    element.blur();
    document.body.focus();
  }
}

export class SectionsPanel extends ToolBarDropDown {
  private readonly _vp: ScreenViewport;
  private readonly _element: HTMLElement;
  private _toolName = "ViewClip.ByPlane";

  public constructor(vp: ScreenViewport, parent: HTMLElement) {
    super();
    this._vp = vp;
    this._element = IModelApp.makeHTMLElement("div", { className: "toolMenu", parent });
    this._element.style.cssFloat = "left";
    this._element.style.display = "block";

    createComboBox({
      parent: this._element,
      id: "section_Type",
      name: "Clip type: ",
      value: this._toolName,
      handler: (select: HTMLSelectElement) => this._toolName = select.value,
      entries: [
        { name: "Plane", value: "ViewClip.ByPlane" },
        { name: "Range", value: "ViewClip.ByRange" },
        { name: "Element", value: "ViewClip.ByElement" },
        { name: "Shape", value: "ViewClip.ByShape" },
      ],
    });

    const div = IModelApp.makeHTMLElement("div", { parent: this._element });
    div.style.textAlign = "center";
    createButton({
      value: "Define",
      handler: () => { IModelApp.tools.run(this._toolName, ViewClipDecorationProvider.create()); setFocusToHome(); },
      parent: div,
      inline: true,
      tooltip: "Define clip",
    });
    createButton({
      value: "Edit",
      handler: () => ViewClipDecorationProvider.create().toggleDecoration(this._vp),
      parent: div,
      inline: true,
      tooltip: "Show clip edit handles",
    });
    createButton({
      value: "Clear",
      handler: () => IModelApp.tools.run("ViewClip.Clear", ViewClipDecorationProvider.create()),
      parent: div,
      inline: true,
      tooltip: "Clear clips",
    });

  }

  protected _open(): void { this._element.style.display = "block"; }
  protected _close(): void { this._element.style.display = "none"; }
  public get isOpen(): boolean { return "block" === this._element.style.display; }
}
