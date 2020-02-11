
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Authentication
 */

/** Information on the authenticated user.
 * @beta
 */
export class UserInfo {
  constructor(
    /** Id of the user */
    public id: string,

    /** Email details */
    public email?: { id: string, isVerified?: boolean },

    /** Profile of the user */
    public profile?: { firstName: string, lastName: string, name?: string, preferredUserName?: string },

    /** Organization the user belongs to */
    public organization?: { id: string, name: string },

    /** Feature tracking information associated with the user */
    public featureTracking?: { ultimateSite: string, usageCountryIso: string },
  ) { }

  /** Creates UserInfo from JSON obtained from typical Oidc clients */
  public static fromJson(jsonObj: any): UserInfo | undefined {
    if (!jsonObj)
      return undefined;
    const id: string = jsonObj.sub;
    const email: any = jsonObj.email ? { id: jsonObj.email, isVerified: jsonObj.email_verified } : undefined;
    const profile: any = jsonObj.given_name ? { name: jsonObj.name, preferredUserName: jsonObj.preferred_username, firstName: jsonObj.given_name, lastName: jsonObj.family_name } : undefined;
    const organization: any = jsonObj.org ? { id: jsonObj.org, name: jsonObj.org_name } : undefined;
    const featureTracking: any = jsonObj.ultimate_site ? { ultimateSite: jsonObj.ultimate_site, usageCountryIso: jsonObj.usage_country_iso } : undefined;
    return new UserInfo(id, email, profile, organization, featureTracking);
  }
}
