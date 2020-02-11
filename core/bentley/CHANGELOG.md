# Change Log - @bentley/bentleyjs-core

This log was last generated on Wed, 22 Jan 2020 19:24:11 GMT and should not be manually modified.

## 1.11.0
Wed, 22 Jan 2020 19:24:11 GMT

### Updates

- VSS$257397: Temporary fix for checking electron renderer. 
- Upgrade to TypeScript 3.7.2.

## 1.10.0
Tue, 07 Jan 2020 19:44:01 GMT

### Updates

- Added ByteStream class.

## 1.9.0
Tue, 10 Dec 2019 18:08:56 GMT

### Updates

- Setup OidcDesktopClient for Electron use cases. 
- Added non-static wait and executeAfter to BeDuration
- fix warnings from static analysis
- Added `BeDuration.race` for common timeout operations.

## 1.8.0
Fri, 22 Nov 2019 14:03:34 GMT

*Version update only*

## 1.7.0
Fri, 01 Nov 2019 13:28:37 GMT

*Version update only*

## 1.6.0
Wed, 09 Oct 2019 20:28:42 GMT

*Version update only*

## 1.5.0
Mon, 30 Sep 2019 22:28:48 GMT

### Updates

- Fixed AuthStatus error numbers not to overlap with others.
- Added ObservableSet<T>.
- upgrade to TypeScript 3.6.2

## 1.4.0
Tue, 10 Sep 2019 12:09:49 GMT

### Updates

- Fixed AuthStatus error numbers not to overlap with others.
- Added PriorityQueue.append function for adding new elements without applying sorting logic.

## 1.3.0
Tue, 13 Aug 2019 20:25:53 GMT

*Version update only*

## 1.2.0
Wed, 24 Jul 2019 11:47:26 GMT

*Version update only*

## 1.1.0
Mon, 01 Jul 2019 19:04:29 GMT

### Updates

- added OneAtATimeActivity class
- Introduced AsyncMutex - a utility to run async blocks of code in sequence. 
- Update to TypeScript 3.5

## 1.0.0
Mon, 03 Jun 2019 18:09:39 GMT

### Updates

- RPC system now accepts only basic values (primitives, "interface" objects, and binary).
- added Id64.getFirst to get the first value of an Id64Arg
- Added an error for seed file initialization timeout
- Switched from iModelHub Project API to Context API
- Refactored and simplified implementation of IModelDb.open
- add property accessor for empty Guid

## 0.191.0
Mon, 13 May 2019 15:52:05 GMT

### Updates

- Adds parameter for api-extractor to validate missing release tags
- Add a Dictionary-based least-recently-used cache.
- Fix broken links
- LoggerCategory -> BentleyLoggerCategory
- Logged the fields in ClientRequestContext
- Logging fixes. 
- Put sourcemap in npm package.
- Fixed logger to not mutate incoming objects. 
- Improved performance logging
- Added functions for iterating and obtaining the number of elements of a collection of Id64s represented as an Id64Arg.
- Setup a generic context for tracking client requests, and made various related enhancements to logging, usage tracking and authorization. 
- Use TextDecoder to decode binary utf-8 strings if supported.
- Upgrade TypeDoc dependency to 0.14.2

## 0.190.0
Thu, 14 Mar 2019 14:26:49 GMT

*Version update only*

## 0.189.0
Wed, 06 Mar 2019 15:41:22 GMT

### Updates

- Changes package.json to include api-extractor and adds api-extractor.json
- Use new buildIModelJsBuild script
- Add release tags to indicate API stability
- Remove unneeded typedoc plugin dependency
- Save BUILD_SEMVER to globally accessible map
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

- Removed IModelDb's cache of accessToken. For long running operations like AutoPush, the user must explicitly supply an IAccessTokenManager to keep the token current. 

## 0.185.0
Fri, 11 Jan 2019 18:29:00 GMT

### Updates

- Optimize Id64String operations and supply specialized, optimized collection types.

## 0.184.0
Thu, 10 Jan 2019 22:46:17 GMT

*Version update only*

## 0.183.0
Mon, 07 Jan 2019 21:49:21 GMT

*Version update only*

## 0.182.0
Mon, 07 Jan 2019 13:31:34 GMT

*Version update only*

## 0.181.0
Fri, 04 Jan 2019 13:02:40 GMT

*Version update only*

## 0.180.0
Wed, 02 Jan 2019 15:18:23 GMT

### Updates

- Enable usage of custom collection classes inside for..of loops.

## 0.179.0
Wed, 19 Dec 2018 18:26:14 GMT

### Updates

- Fix issue where all event listeners are removed.

## 0.178.0
Thu, 13 Dec 2018 22:06:10 GMT

*Version update only*

## 0.177.0
Wed, 12 Dec 2018 17:21:31 GMT

*Version update only*

## 0.176.0
Mon, 10 Dec 2018 21:19:45 GMT

*Version update only*

## 0.175.0
Mon, 10 Dec 2018 17:08:55 GMT

*Version update only*

## 0.174.0
Mon, 10 Dec 2018 13:24:09 GMT

*Version update only*

## 0.173.0
Thu, 06 Dec 2018 22:03:29 GMT

*Version update only*

## 0.172.0
Tue, 04 Dec 2018 17:24:39 GMT

*Version update only*

## 0.171.0
Mon, 03 Dec 2018 18:52:58 GMT

*Version update only*

## 0.170.0
Mon, 26 Nov 2018 19:38:42 GMT

### Updates

- Change Logger.ParseLogLevel() to use camelCased method naming, Logger.parseLogLevel().

## 0.169.0
Tue, 20 Nov 2018 16:17:15 GMT

### Updates

- Remove PromiseUtil class

## 0.168.0
Sat, 17 Nov 2018 14:20:11 GMT

*Version update only*

## 0.167.0
Fri, 16 Nov 2018 21:45:44 GMT

### Updates

- changes to debug utilities. 
- Fluentd Bunnyan Logger added

## 0.166.0
Mon, 12 Nov 2018 16:42:10 GMT

*Version update only*

## 0.165.0
Mon, 12 Nov 2018 15:47:00 GMT

*Version update only*

## 0.164.0
Thu, 08 Nov 2018 17:59:20 GMT

### Updates

- OIDC related enhancments (WIP).
- Updated to TypeScript 3.1

## 0.163.0
Wed, 31 Oct 2018 20:55:37 GMT

### Updates

- Turn Guid class into a namespace and use GuidString in signatures.
- Guid.wrap creates a Guid object without validating the input string.
- Changed Id64 from a class to a namespace.

## 0.162.0
Wed, 24 Oct 2018 19:20:06 GMT

### Updates

- Breaking changes to optimize usage of 64-bit IDs.

## 0.161.0
Fri, 19 Oct 2018 13:04:14 GMT

*Version update only*

## 0.160.0
Wed, 17 Oct 2018 18:18:38 GMT

*Version update only*

## 0.159.0
Tue, 16 Oct 2018 14:09:09 GMT

*Version update only*

## 0.158.0
Mon, 15 Oct 2018 19:36:09 GMT

*Version update only*

## 0.157.0
Sun, 14 Oct 2018 17:20:06 GMT

*Version update only*

## 0.156.0
Fri, 12 Oct 2018 23:00:10 GMT

### Updates

- Initial release

