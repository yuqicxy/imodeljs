# Change Log - @bentley/imodeljs-clients

This log was last generated on Wed, 22 Jan 2020 19:24:12 GMT and should not be manually modified.

## 1.11.0
Wed, 22 Jan 2020 19:24:12 GMT

### Updates

- Move the iModelHub Global Event APIs to internal.  Only Bentley can use them since they require a service account.
- Upgrade to TypeScript 3.7.2.
- Added TypeScript wrapper over the native SaaSClient.

## 1.10.0
Tue, 07 Jan 2020 19:44:01 GMT

### Updates

- I removed the hardCoded RealityData 3DTiles on the getRealityData method. I added a method who accept RealityDataServicesRequestQueryOptions

## 1.9.0
Tue, 10 Dec 2019 18:08:56 GMT

### Updates

- Setup OidcDesktopClient for Electron use cases. 
- Fix issue with Code InstanceId encoding

## 1.8.0
Fri, 22 Nov 2019 14:03:34 GMT

### Updates

- Added properties related to acquisitions in RealityDataServicesClient
- Added missing topic descriptions
- Update to allow Node 12

## 1.7.0
Fri, 01 Nov 2019 13:28:37 GMT

### Updates

- Fixing fourth digit elimination if third one is zero while parsing version in ulas LogEntryConverter
- Fixed issues with use of OIDC AuthCode workflow in Electron and Single Page Applications.
- Fixed a typo in the RealityDataServices client for accessing the lastAccessedTimestamp
- Fix thumbnail download issue in ElectronJs
- Enhancements to the ProjectShare plugin. 
- Added Basic authentication for iModelBank
- fixed ios client issues
- Fix for Bug#192178 - Settings service returns only 20 at a time from namespace query. Also, use query rather than /Namespace/Settingname url to avoid 404 return code.

## 1.6.0
Wed, 09 Oct 2019 20:28:42 GMT

### Updates

- Setup imodeljs-clients tests to be run in chrome (and not node.js).

## 1.5.0
Mon, 30 Sep 2019 22:28:48 GMT

### Updates

- Added iModel extent property
- Added ProjectShareClient
- upgrade to TypeScript 3.6.2

## 1.4.0
Tue, 10 Sep 2019 12:09:49 GMT

### Updates

- Allow to create baseline Named Version
- Moved optional iModel creation arguments into single options interface. Added support for iModel cloning.

## 1.3.0
Tue, 13 Aug 2019 20:25:53 GMT

### Updates

- Added application data querying for iModelHub Briefcases and ChangeSets

## 1.2.0
Wed, 24 Jul 2019 11:47:26 GMT

### Updates

- Product Backlog Items 148512: OidcBrowserClient can be used for authorization code workflows; Product Backlog Item 148571: Generalized OidcBrowserClient to work with Cesium and SharePoint.
- Fix broken links in docs
- Various OIDC related fixes - Bugs: 148507, 148508, Product Backlog Items: 148510, 148517, 148522.
- SAS token leaked in log

## 1.1.0
Mon, 01 Jul 2019 19:04:29 GMT

### Updates

- Removed missing group descriptions
- Added feature tracking info to userInfo obtained by OidcBrowserClient. 
- Update to TypeScript 3.5

## 1.0.0
Mon, 03 Jun 2019 18:09:39 GMT

### Updates

- RPC system now accepts only basic values (primitives, "interface" objects, and binary).
- Updated release tags. 
- Added state for Checkpoint class
- Added an error for seed file timeout
- Switched from iModelHub Project API to Context API
- Fixed release tags. 
- Added query option to get owned briefcases
- Logging changes. 
- Refactored and simplified implementation of IModelDb.open
- Added hability to obtain an Azure blub SAS URL write-access.
- Added methods to SettingsAdmin that retrieve all settings saved with the given namespace. Intended for use with user-named settings such as Named Clips.
- Incorporate the newly implemented SharedSettings feature of the Product Settings Service into the Settings API.
- cease providing ulas user data that can be inferred from the accesstoken
- specify explicit GuidString type for activityId and sessionId on ClientRequestContext
- remove .only() on ulas tests
- restore projectId/contextId to ULAS requests
- remove machine-specifi-usernames in ulas tests
- Use paging for Locks, Codes and ChangeSets

## 0.191.0
Mon, 13 May 2019 15:52:05 GMT

### Updates

- Adds parameter for api-extractor to validate missing release tags
- Allowed setup of global Request timeouts. 
- Added initial iModelHub Checkpoint API.
- Added 'query' method for Config, which combines the functions of 'has' and 'get'
- Fix broken links
- LoggerCategory -> ClientsLoggerCategory
- Enhance Config so that it can contain nested properties - used by Design Review
- add support for imodelbank use in clients-backend
- Introduce LoggerCategory enum to advertise logger categories used by this package.
- Put sourcemap in npm package.
- Fixes to OidcBrowserClient. 
- Added Reality Data creation/delete/update and relationship support.
- remove .only from test
- Setup a generic context for tracking client requests, and made various related enhancements to logging, usage tracking and authorization. 
- Minimized serialization/deserialization costs when round tripping SAML based AccessToken-s. 
- Upgrade TypeDoc dependency to 0.14.2
- add sessionId to usage logging
- remove redundant usage and feature log properties
- VSTS#114189 Reality data shown as Model and picker

## 0.190.0
Thu, 14 Mar 2019 14:26:49 GMT

### Updates

- Add missing peerDependency on @bentley/geometry-core

## 0.189.0
Wed, 06 Mar 2019 15:41:22 GMT

### Updates

- Added OidcAgentClientV2. This will replace OidcAgentClient after some fixes from IMS+Connect.
- OIDC changes needed for Angular client
- Changes package.json to include api-extractor and adds api-extractor.json
- Use new buildIModelJsBuild script
- Moved AzureFileHandler, IOSAzureFileHandler, UrlFileHandler and the iModelHub tests to the imodeljs-clients-backend package. This removes the dependency of imodeljs-clients on the "fs" module, and turns it into a browser only package. 
- Fixed expansion of config variables. 
- Remove unneeded typedoc plugin dependency
- Fix error parsing
- Documentation improvements
- Create iModel from empty template if seed file path not defined.
- Save BUILD_SEMVER to globally accessible map
- fix for cache member mix and preserve full root document
- Added creatorId, new method to list RD per project, identified numerous area for changes WIP
- Implemented spatial criterai when searching through all reality data associated to a project.
- Threading issue accessing Reality Data, RealityData class was transformed to be the main data access object instead of the client that was used by most/all reality data causing cache data clash and mix between many reality data.
- Removed RBAC client - the RBAC service is considered internal. 
- Handled error with fetching host information on deployed machines.
- WIP fixes to Usage Logging. 
- upgrade to TypeScript 3.2.2

## 0.188.0
Wed, 16 Jan 2019 16:36:09 GMT

*Version update only*

## 0.187.0
Tue, 15 Jan 2019 15:18:59 GMT

*Version update only*

## 0.186.0
Mon, 14 Jan 2019 23:09:10 GMT

### Updates

- More logging of HTTP requests, and enabled use of fiddler for backend diagnostics. 
- Removed IModelDb's cache of accessToken. For long running operations like AutoPush, the user must explicitly supply an IAccessTokenManager to keep the token current. 

## 0.185.0
Fri, 11 Jan 2019 18:29:00 GMT

*Version update only*

## 0.184.0
Thu, 10 Jan 2019 22:46:17 GMT

### Updates

- Removed default OIDC scopes. All applications must now explicitly pass the required scopes.

## 0.183.0
Mon, 07 Jan 2019 21:49:21 GMT

*Version update only*

## 0.182.0
Mon, 07 Jan 2019 13:31:34 GMT

### Updates

- Move to Node 10

## 0.181.0
Fri, 04 Jan 2019 13:02:40 GMT

### Updates

- Move to Node 10

## 0.180.0
Wed, 02 Jan 2019 15:18:23 GMT

*Version update only*

## 0.179.0
Wed, 19 Dec 2018 18:26:14 GMT

*Version update only*

## 0.178.0
Thu, 13 Dec 2018 22:06:10 GMT

*Version update only*

## 0.177.0
Wed, 12 Dec 2018 17:21:31 GMT

*Version update only*

## 0.176.0
Mon, 10 Dec 2018 21:19:45 GMT

### Updates

- Remove cabundle.pem - no longer used

## 0.175.0
Mon, 10 Dec 2018 17:08:55 GMT

*Version update only*

## 0.174.0
Mon, 10 Dec 2018 13:24:09 GMT

*Version update only*

## 0.173.0
Thu, 06 Dec 2018 22:03:29 GMT

### Updates

- Appended system environment with "imjs" prefix to Config. 
- Fixes to errors during file downloads
- added AzureFileHandler for ios
- Custom imodelJs noDirectImport lint rule implemented, noDuplicateImport lint rule turned on.

## 0.172.0
Tue, 04 Dec 2018 17:24:39 GMT

### Updates

- Changed index file name to match package name. Change imports to use other packages' index file.

## 0.171.0
Mon, 03 Dec 2018 18:52:58 GMT

### Updates

- Use property getters instead of methods for IModelClient

## 0.170.0
Mon, 26 Nov 2018 19:38:42 GMT

### Updates

- Fixed floating promises in iModelHub client
- Fix for integration tests
- Use property getters instead of methods for IModelClient

## 0.169.0
Tue, 20 Nov 2018 16:17:15 GMT

*Version update only*

## 0.168.0
Sat, 17 Nov 2018 14:20:11 GMT

*Version update only*

## 0.167.0
Fri, 16 Nov 2018 21:45:44 GMT

### Updates

- Updated iModel Hub Client so iModel Base Handler is injectable. Now Http Request Options can be sepecified for the iModelHubClient
- Added IModelHubClient.IModel, removed IModelQuery.primary(), use IModelHubClient.IModel.Get instead
- Simplified download stream

## 0.166.0
Mon, 12 Nov 2018 16:42:10 GMT

*Version update only*

## 0.165.0
Mon, 12 Nov 2018 15:47:00 GMT

*Version update only*

## 0.164.0
Thu, 08 Nov 2018 17:59:20 GMT

### Updates

- Deprecated dev-cors-proxy-server and use of it. 
- Removed PropertySerializer used by ECJsonTypeMap.
- OIDC related enhancments (WIP).
- Fixed more integration tests. 
- Updated to TypeScript 3.1

## 0.163.0
Wed, 31 Oct 2018 20:55:37 GMT

### Updates

- Fix issue where buddi require full url from config instead of just the base without /GetUrl
- Cleanup clients. Removed unused clients and methods.

## 0.162.0
Wed, 24 Oct 2018 19:20:06 GMT

### Updates

- BIM Review Share WsgClient and tests
- Updated docs to change URL that were used as example but pointed to actuall internal server
- SettingsClient now accepts AccessToken (from SAML and OIDC) rather than (SAML-only) AuthorizationToken.
- it.only fix for BIM review share

## 0.161.0
Fri, 19 Oct 2018 13:04:14 GMT

### Updates

- Allow case-insensitive lookup of keys from Config.App

## 0.160.0
Wed, 17 Oct 2018 18:18:38 GMT

*Version update only*

## 0.159.0
Tue, 16 Oct 2018 14:09:09 GMT

### Updates

- Removed KnownRegions Enum

## 0.158.0
Mon, 15 Oct 2018 19:36:09 GMT

### Updates

- Cleaned up frontend configuration. 
- add default Buddi URL and region and a added docs for region id

## 0.157.0
Sun, 14 Oct 2018 17:20:06 GMT

### Updates

- Fixing scripts for linux

## 0.156.0
Fri, 12 Oct 2018 23:00:10 GMT

### Updates

- Initial release

