# Change Log - @bentley/build-tools

This log was last generated on Wed, 22 Jan 2020 19:24:11 GMT and should not be manually modified.

## 1.11.0
Wed, 22 Jan 2020 19:24:11 GMT

### Updates

- Upgrade to TypeScript 3.7.2.
- Update tests to pass '--inspect' instead of '--debug' to Node to support Node 12.

## 1.10.0
Tue, 07 Jan 2020 19:44:01 GMT

### Updates

- Added tslint-react-set-state-usage to ThirdPartyNotices.md in tools/build

## 1.9.0
Tue, 10 Dec 2019 18:08:56 GMT

### Updates

- Upgrade to @microsoft/api-extractor 7.6.2
- Code analysis related cleanup
- Add lint rule to enforce two-space indentation.
- Added TSLint rules for React setState calls
- Replaced the noUnusedLocals tsc option with no-unused-variable lint rule.

## 1.8.0
Fri, 22 Nov 2019 14:03:34 GMT

### Updates

- Fix mocha report failing when running in a context without a package.json
- Fix issue with custom Mocha reporter not correctly outputting mocha file when run in Certa.
- Update API-extractor to 5.7.4 to consume a fix for Node 12.

## 1.7.0
Fri, 01 Nov 2019 13:28:37 GMT

### Updates

- Upgrade to @microsoft/api-extractor 7.5.0
- Added initial ui-abstract package setup
- Update cli to better match script functionality.

## 1.6.0
Wed, 09 Oct 2019 20:28:42 GMT

*Version update only*

## 1.5.0
Mon, 30 Sep 2019 22:28:48 GMT

### Updates

- Add tslint rule banning Math.hypot
- upgrade to TypeScript 3.6.2

## 1.4.0
Tue, 10 Sep 2019 12:09:49 GMT

*Version update only*

## 1.3.0
Tue, 13 Aug 2019 20:25:53 GMT

### Updates

- Update README and code cleanup

## 1.2.0
Wed, 24 Jul 2019 11:47:26 GMT

### Updates

- Add the deprecation tslint rule as a warning. https://palantir.github.io/tslint/rules/deprecation/
- Closing STDIN no longer kills child processes created using simpleSpawn

## 1.1.0
Mon, 01 Jul 2019 19:04:29 GMT

### Updates

- Added *test* to list of excluded dirs during docs script
- Update to TypeScript 3.5

## 1.0.0
Mon, 03 Jun 2019 18:09:39 GMT

### Updates

- RPC system now accepts only basic values (primitives, "interface" objects, and binary).
- Update extract-api script to generate a summary file if in the context of an automated build.
- Update to css-loader 2.1.1
- Fix the docs script to not require consumers to take a devDependency on TypeDoc.
- Update the standard configuration for extract-api to turn off ae-forgotten-export warnings.

## 0.191.0
Mon, 13 May 2019 15:52:05 GMT

### Updates

- Adds error handling in api-extractor to handle no lib folder
- Updates api-=extractor to accept parameters for missing release tags
- ""
- Move to @microsoft/api-extractor 7.0.35 to fix issue when reporting missing tags
- "Updates API extractor to v7"
- Added tools/build/tslint-docs.json. Added SvgPath & SvgSprite to ui-core.
- Fix broken links
- Fix the extract-api script to use this packages dependency instead of requiring consumers to take a devDep on api-extractor.
- Import within package lint rule
- Remove the mastermodule as it is not used.
- Upgrade TypeDoc dependency to 0.14.2
- Update the version of nyc to 14.0.0

## 0.190.0
Thu, 14 Mar 2019 14:26:49 GMT

*Version update only*

## 0.189.0
Wed, 06 Mar 2019 15:41:22 GMT

### Updates

- Add new lint rule that checks that all method names are camel cased.
- Changes package.json to include api-extractor and adds api-extractor.json
- Changes extract-api script to remove tsdoc-metadata.json files
- Changes error hadling in extract-api
- Use new buildIModelJsBuild script
- Remove unneeded typedoc plugin dependency
- Changed stripInternal to false so @internal-marked symbols still put in .d.ts files
- upgrade to TypeScript 3.2.2

## 0.188.0
Wed, 16 Jan 2019 16:36:09 GMT

*Version update only*

## 0.187.0
Tue, 15 Jan 2019 15:18:59 GMT

*Version update only*

## 0.186.0
Mon, 14 Jan 2019 23:09:10 GMT

*Version update only*

## 0.185.0
Fri, 11 Jan 2019 18:29:00 GMT

*Version update only*

## 0.184.0
Thu, 10 Jan 2019 22:46:17 GMT

*Version update only*

## 0.183.0
Mon, 07 Jan 2019 21:49:21 GMT

*Version update only*

## 0.182.0
Mon, 07 Jan 2019 13:31:34 GMT

### Updates

- added missing dependencies for tslint
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

*Version update only*

## 0.175.0
Mon, 10 Dec 2018 17:08:55 GMT

*Version update only*

## 0.174.0
Mon, 10 Dec 2018 13:24:09 GMT

*Version update only*

## 0.173.0
Thu, 06 Dec 2018 22:03:29 GMT

### Updates

- Custom imodelJs noDirectImport lint rule implemented, noDuplicateImport lint rule turned on.

## 0.172.0
Tue, 04 Dec 2018 17:24:39 GMT

*Version update only*

## 0.171.0
Mon, 03 Dec 2018 18:52:58 GMT

### Updates

- Specify PromisedAssertion as a valid type to await on

## 0.170.0
Mon, 26 Nov 2018 19:38:42 GMT

*Version update only*

## 0.169.0
Tue, 20 Nov 2018 16:17:15 GMT

### Updates

- Turn on tslint no-floating-promises rule

## 0.168.0
Sat, 17 Nov 2018 14:20:11 GMT

*Version update only*

## 0.167.0
Fri, 16 Nov 2018 21:45:44 GMT

### Updates

- Turn on tslint await-promise rule
- Turn on tslint promise-function-async rule
- Turn on tslint no-return-await rule

## 0.166.0
Mon, 12 Nov 2018 16:42:10 GMT

*Version update only*

## 0.165.0
Mon, 12 Nov 2018 15:47:00 GMT

*Version update only*

## 0.164.0
Thu, 08 Nov 2018 17:59:20 GMT

### Updates

- Copy CHANGELOG.json on rush docs
- Updated to TypeScript 3.1
- Add "skipLibCheck" flag to avoid checking third-party declarations

## 0.163.0
Wed, 31 Oct 2018 20:55:37 GMT

### Updates

- Remove the cover script in favor of an nycrc configuration file.

## 0.162.0
Wed, 24 Oct 2018 19:20:06 GMT

### Updates

- Fail rush docs on invalid tags

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

### Updates

- Fixing scripts for linux

## 0.156.0
Fri, 12 Oct 2018 23:00:10 GMT

### Updates

- Initial release

