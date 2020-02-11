/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** Parameters for starting DisplayPerformanceTestApp with a specified initial configuration */
export interface SVTConfiguration {
  customOrchestratorUri?: string;
  viewName?: string;
  // standalone-specific config:
  standalone?: boolean;
  iModelName?: string;
  filename?: string;
  standalonePath?: string;    // Used when run in the browser - a common base path for all standalone imodels
}

export interface ConnectProjectConfiguration {
  userName: string;
  password: string;
  projectName: string;
  iModelName: string;
}
