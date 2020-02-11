/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Core
 */

import { I18N } from "@bentley/imodeljs-i18n";
import { IModelApp } from "@bentley/imodeljs-frontend";
import { PresentationError, PresentationStatus } from "@bentley/presentation-common";
import { PresentationManager, PresentationManagerProps } from "./PresentationManager";
import { SelectionManager } from "./selection/SelectionManager";
import { SelectionScopesManager } from "./selection/SelectionScopesManager";
import { FavoritePropertiesManager } from "./favorite-properties/FavoritePropertiesManager";

let presentationManager: PresentationManager | undefined;
let selectionManager: SelectionManager | undefined;
let i18n: I18N | undefined;
let favoritePropertiesManager: FavoritePropertiesManager | undefined;

/**
 * Static class used to statically set up Presentation library for the frontend.
 * Basically what it does is:
 * - Create a singleton [[PresentationManager]] instance
 * - Create a singleton [[SelectionManager]] instance
 * - Create a singleton [[FavoritePropertiesManager]]] instance
 *
 * @public
 */
export class Presentation {

  /* istanbul ignore next */
  private constructor() { }

  /**
   * Initializes Presentation library for the frontend.
   *
   * Example:
   * ``` ts
   * [[include:Presentation.Frontend.Initialization]]
   * ```
   *
   * The method should be called after a call
   * to [IModelApp.startup]($imodeljs-frontend)
   *
   * @param props Optional properties to use when creating [[PresentationManager]]. If not provided
   * or provided with `activeLocale` not set, `Presentation.i18n.languageList()[0]` is used as active locale.
   */
  public static initialize(props?: PresentationManagerProps): void {
    if (!IModelApp.initialized) {
      throw new PresentationError(PresentationStatus.NotInitialized,
        "IModelApp.startup must be called before calling Presentation.initialize");
    }
    if (!i18n) {
      i18n = IModelApp.i18n;
    }
    if (!presentationManager) {
      if (!props)
        props = {};
      if (!props.activeLocale) {
        const languages = Presentation.i18n.languageList();
        props.activeLocale = (languages.length ? languages[0] : undefined);
      }
      presentationManager = PresentationManager.create(props);
    }
    if (!selectionManager) {
      const scopesManager = new SelectionScopesManager({
        rpcRequestsHandler: presentationManager.rpcRequestsHandler,
        localeProvider: () => this.presentation.activeLocale,
      });
      selectionManager = new SelectionManager({
        scopes: scopesManager,
      });
    }
    if (!favoritePropertiesManager) {
      favoritePropertiesManager = new FavoritePropertiesManager();
    }
    presentationManager.onNewiModelConnection = favoritePropertiesManager.initializeConnection;
  }

  /**
   * Terminates Presentation library frontend. This method should be called
   * before a call to [IModelApp.shutdown]($imodeljs-frontend)
   */
  public static terminate(): void {
    if (presentationManager)
      presentationManager.dispose();
    presentationManager = undefined;
    selectionManager = undefined;
    favoritePropertiesManager = undefined;
    i18n = undefined;
  }

  /**
   * The singleton [[PresentationManager]]. The setter for this property is for internal use only.
   */
  public static get presentation(): PresentationManager {
    if (!presentationManager)
      throw new Error("Presentation must be first initialized by calling Presentation.initialize");
    return presentationManager;
  }

  public static set presentation(value: PresentationManager) {
    if (presentationManager)
      presentationManager.dispose();
    presentationManager = value;
  }

  /**
   * The singleton [[SelectionManager]]. The setter for this property is for internal use only.
   */
  public static get selection(): SelectionManager {
    if (!selectionManager)
      throw new Error("Presentation must be first initialized by calling Presentation.initialize");
    return selectionManager;
  }

  public static set selection(value: SelectionManager) {
    selectionManager = value;
  }

  /**
   * The singleton [[FavoritePropertiesManager]]. The setter for this property is for internal use only.
   * @beta
   */
  public static get favoriteProperties(): FavoritePropertiesManager {
    if (!favoritePropertiesManager)
      throw new Error("Favorite Properties must be first initialized by calling Presentation.initialize");
    return favoritePropertiesManager;
  }

  public static set favoriteProperties(value: FavoritePropertiesManager) {
    favoritePropertiesManager = value;
  }

  /**
   * The localization manager used by Presentation frontend.
   * Returns the result of `IModelApp.i18n`.
   * The setter for this property is for internal use only.
   */
  public static get i18n(): I18N {
    if (!i18n)
      throw new Error("Presentation must be first initialized by calling Presentation.initialize");
    return i18n;
  }

  public static set i18n(value: I18N) {
    i18n = value;
  }
}
