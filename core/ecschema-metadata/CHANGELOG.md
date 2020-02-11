# Change Log - @bentley/ecschema-metadata

This log was last generated on Wed, 22 Jan 2020 19:24:12 GMT and should not be manually modified.

## 1.11.0
Wed, 22 Jan 2020 19:24:12 GMT

### Updates

- Setting ECEnumeration property 'isStrict' to true if not present when parsing schema XML.
- Upgrade to TypeScript 3.7.2.

## 1.10.0
Tue, 07 Jan 2020 19:44:01 GMT

### Updates

- Diagnostic is now a parameter in rule suppression functions
- deprecating EC schema file locater classes (moved to ecschema-locaters package)
- Adding SchemaReferenceDelta to allow reporting of schema reference version differences during schema comparison.

## 1.9.0
Tue, 10 Dec 2019 18:08:56 GMT

### Updates

- Update sinon version.
- Resolving an error in schema validation in ecschema-metadata

## 1.8.0
Fri, 22 Nov 2019 14:03:34 GMT

### Updates

- Edited Schema.ts and all related .test.ts files to require a schema alias.
- Bis-Rule Suppression Implementation

## 1.7.0
Fri, 01 Nov 2019 13:28:37 GMT

### Updates

- Fix in Schema XML serialization to ensure type references include Schema alias, not Schema name.

## 1.6.0
Wed, 09 Oct 2019 20:28:42 GMT

### Updates

- Updating ECSchema-Metadata docs to clarify that FormatOverrides return a fully qualified name for both name and fullname.  Update tests to make it clear as well
- Add ability to get inherited custom attributes from base properties

## 1.5.0
Mon, 30 Sep 2019 22:28:48 GMT

### Updates

- Fixing bug where format overrides which specified a unit but no label set the label to 'undefined'  #177676
- upgrade to TypeScript 3.6.2

## 1.4.0
Tue, 10 Sep 2019 12:09:49 GMT

### Updates

- Add public method getCustomAttributes() and getCustomAttributesSync() to ECClass to recursively retrieve all custom attributes in the current class and its bases

## 1.3.0
Tue, 13 Aug 2019 20:25:53 GMT

### Updates

- Fix bug with OverrideFormat names.  Remove the setter from KindOfQuantity for persistence format as that shouldn't be set by the public API.
- Fix issues with KindOfQuantity serialization and deserialization to ECXml

## 1.2.0
Wed, 24 Jul 2019 11:47:26 GMT

### Updates

- Add Xml serialization methods for Schema, SchemaItem and Property
- Fixing XmlParser.getQualifiedTypeName() to be able to parse alias:ItemName correctly

## 1.1.0
Mon, 01 Jul 2019 19:04:29 GMT

### Updates

- Update to TypeScript 3.5

## 1.0.0
Mon, 03 Jun 2019 18:09:39 GMT

*Version update only*

## 0.191.0
Mon, 13 May 2019 15:52:05 GMT

### Updates

- Add XmlParser for direct consumption of Xml Schemas
- Adds parameter for api-extractor to validate missing release tags
- Adds ignoreMissingTags flag
- Fix broken links
- Setup a generic context for tracking client requests, and made various related enhancements to logging, usage tracking and authorization. 
- Added ability to suppress rule violations from being reported during schema validation.
- Upgrade TypeDoc dependency to 0.14.2
- Updated BIS and EC schema validation documentation and adjusted diagnostic codes to match documentation.

## 0.190.0
Thu, 14 Mar 2019 14:26:49 GMT

*Version update only*

## 0.189.0
Wed, 06 Mar 2019 15:41:22 GMT

### Updates

- Changes package.json to include api-extractor and adds api-extractor.json
- Implemented BIS rules for schema validation.
- Use new buildIModelJsBuild script
- Change the default version pattern to be padded with zeroes to match 'RR.ww.mm'.
- Convert Schema._items from Array to Map and return IterableIterator instead of Array in Schema.getItems/getClasses
- Removing BIS Rules from ecschema-metadata
- SchemaContext is now required when constructing a Schema instance.
- Added schema validation support via the configuration of rule sets that can be applied during schema traversal
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

*Version update only*

## 0.181.0
Fri, 04 Jan 2019 13:02:40 GMT

*Version update only*

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

*Version update only*

## 0.172.0
Tue, 04 Dec 2018 17:24:39 GMT

*Version update only*

## 0.171.0
Mon, 03 Dec 2018 18:52:58 GMT

*Version update only*

## 0.170.0
Mon, 26 Nov 2018 19:38:42 GMT

*Version update only*

## 0.169.0
Tue, 20 Nov 2018 16:17:15 GMT

*Version update only*

## 0.168.0
Sat, 17 Nov 2018 14:20:11 GMT

*Version update only*

## 0.167.0
Fri, 16 Nov 2018 21:45:44 GMT

*Version update only*

## 0.166.0
Mon, 12 Nov 2018 16:42:10 GMT

*Version update only*

## 0.165.0
Mon, 12 Nov 2018 15:47:00 GMT

*Version update only*

## 0.164.0
Thu, 08 Nov 2018 17:59:20 GMT

### Updates

- Updated to TypeScript 3.1

## 0.163.0
Wed, 31 Oct 2018 20:55:37 GMT

### Updates

- rename CustomAttributeInstance to CustomAttribute
- Refactored parsing of JSON data to happen in a new dedicated class JsonParser instead of fromJson methods. The fromJson methods have been replaced with deserialize methods which work in conjunction with JsonParser to ensure type safety and objects are created with required properties.
- Update barrel module to include missing types.

## 0.162.0
Wed, 24 Oct 2018 19:20:06 GMT

### Updates

- Test added, exports are imported from Index and tested against explicitly imported modules to ensure equality.
- Updated how default values are set. They are now all set within the constructor.

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

