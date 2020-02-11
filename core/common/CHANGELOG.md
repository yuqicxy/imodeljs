# Change Log - @bentley/imodeljs-common

This log was last generated on Wed, 22 Jan 2020 19:24:12 GMT and should not be manually modified.

## 1.11.0
Wed, 22 Jan 2020 19:24:12 GMT

### Updates

- Simplify iterator for QPoint3dList.
- Native apps can now cancel tile requests in progress on the backend.
- Remove echo test function from devTools
- Clean up documentation modules; add PlanProjectionSettings for display styles.
- Allow outline fill to be specified by subcategory appearance.
- Upgrade to TypeScript 3.7.2.

## 1.10.0
Tue, 07 Jan 2020 19:44:01 GMT

### Updates

- Added support for embedding images in a GeometryStream.
- Moving data-holder structures used during the LinearElement.queryLinearLocations API to imodeljs-common.
- Allow events to be sent from backend to frontend
- Renamed EventSourceRpcInterface to NativeAppRpcInterface
- Moved tile IO-related APIs from frontend to common.

## 1.9.0
Tue, 10 Dec 2019 18:08:56 GMT

### Updates

- Added Tween.js code
- Added AliCloud tile cache service
- Code quality report fixes
- fix warnings from static analysis
- Add PropertyMetaData.isNavigation
- Addressing typo in a couple of members, making them match the schema properly.

## 1.8.0
Fri, 22 Nov 2019 14:03:34 GMT

### Updates

- Option to include part references in GeometrySummary output.
- Added missing topic descriptions
- Fix defect where isMobileBackend return true on windows
- Change terrain lighting default to off.
- Change SectionLocationProps.clipGeometry type to string. Add get/set ClipVector methods on SectionLocation.
- mark bias as alpha
- Update to allow Node 12
- Add support for view-independent display of geometry streams.
- Fixed camera.equals

## 1.7.0
Fri, 01 Nov 2019 13:28:37 GMT

### Updates

- Anisotropic filtering of draped map tiles.
- Tweaks to ambient occlusion settings.
- Callout clip is now local to placement. Only show marker for active clip.
- Cleanup AO settings.
- Remove @deprecated tags in GeometryStreamIteratorEntry
- Fix comparison of classification properties ignoring the 'volume' flag.
- Fixes for making volume classifiers work.
- New wip plugin for hypermodeling support.
- Add CommonLoggerCategory.Geometry
- Add Placement2d.multiplyTransform, Placement3d.multiplyTransform
- Add RelatedElement.none for nulling out existing navigation relationships
- Reacting to iPadOS change in user agent of safari
- Remove limit for binary data for mobile
- Expose FrustumPlanes.planes
- Convenience methods for overriding aspects of hidden line styles.

## 1.6.0
Wed, 09 Oct 2019 20:28:42 GMT

### Updates

- Add GeometricModel3dProps
- Add SectionLocationProps
- Remove no-longer-needed mobile RPC chunk size workaround for mobile backends.
- Fixed multiple viewport shadows

## 1.5.0
Mon, 30 Sep 2019 22:28:48 GMT

### Updates

- added support for blank IModelConnections
- Fixed reporting of errors when the ClientRequestContext is established at the backend. 
- Add DisplayStyleSettings.subCategoryOverrides
- Make ExternalSourceAspectProps.checksum optional
- Added geometry primitive typing and geometry summary types
- Support animation of models within RenderSchedule.
- Refine planar projection frustum calculation
- upgrade to TypeScript 3.6.2

## 1.4.0
Tue, 10 Sep 2019 12:09:49 GMT

### Updates

- Add documentation for RenderSchedule
- fix casing of displayStyle.contextRealityModels
- Fixed reporting of errors when the ClientRequestContext is established at the backend. 
- Electron IPC transport fix for large messages.
- Added ability to clear individual overridden flags in ViewFlag.Overrides.

## 1.3.0
Tue, 13 Aug 2019 20:25:53 GMT

### Updates

- Add optional arguments to EcefLocation.createFromCartographicOrigin
- Allow custom tile cache services.
- Add CodeSpec.isManagedWithIModel, CodeSpec.scopeType, deprecate CodeSpec.specScopeType
- Add CodeSpec.create
- Add terrain settings.
- Require electron without eval trick.
- Log more information during RPC trace/info request logging.
- Changed the transfer chunk size for mobile RPC transport.

## 1.2.0
Wed, 24 Jul 2019 11:47:26 GMT

### Updates

- Added option to restrict tile cache URLs by client IP address.
- Added method to get element mass properties.

## 1.1.0
Mon, 01 Jul 2019 19:04:29 GMT

### Updates

- Add support for applying terrain to background map.
- Minor error fixed.
- Initial implementation of the LinearReferencing typescript domain
- Adding domain classes for all relationships in the LinearReferencing schema.
- Update to TypeScript 3.5

## 1.0.0
Mon, 03 Jun 2019 18:09:39 GMT

### Updates

- RPC system now accepts only basic values (primitives, "interface" objects, and binary).
- Add ExternalSourceAspectProps
- Refactored and simplified implementation of IModelDb.open
- Rename terrain to backgroundMap.
- Retire some tile-related feature gates.
- Introduced tile format v4.0

## 0.191.0
Mon, 13 May 2019 15:52:05 GMT

### Updates

- Support spatial classification of context reality models. 
- Added OpenAPIInfo to the barrel file
- Adds parameter for api-extractor to validate missing release tags
- Adds ignoreMissingTags flag
- Added option to use azure-based tile caching
- Added a utility to diagnose backends
- Do not cache pending http responses.
- Allow a view to define a set of elements which should never be drawn in that view.
- Allow snapshot imodeltokens through bentleycloudrpcprotocol in development mode only.
- Fix broken links
- LoggerCategory -> CommonLoggerCategory
- Fix default line pattern for hidden edges.
- Introduce LoggerCategory enum to advertise logger categories used by this package.
- Logging fixes. 
- Put sourcemap in npm package.
- add SVG to ImageSourceFormat
- add imodeljs-markup
- New tile cache naming scheme.
- queryPage use memoization/pending pattern
- Remove StandaloneIModelRpcInterface
- Setup a generic context for tracking client requests, and made various related enhancements to logging, usage tracking and authorization. 
- Prefer the IModelToken values in the url (if different from values in JSON body -- should never happen except in a malicious request).
- Exports interface MarshalingBinaryMarker to prevent errors in api-extractor V7
- Add SnapshotIModelRpcInterface
- Refactor solar shadow settings - make these 3d only.
- Support solar shadow display.
- Simplified tile caching IModelHost config and removed dev flags. Allow browser caching of tiles
- Upgrade TypeDoc dependency to 0.14.2
- only save viewing volume for view undo rather than cloning ViewState

## 0.190.0
Thu, 14 Mar 2019 14:26:49 GMT

### Updates

- Cleaned up documentation related to the display system.
- Rename PagableECSql interface to PageableECSql to fix spelling error
- Documentation for Skybox

## 0.189.0
Wed, 06 Mar 2019 15:41:22 GMT

### Updates

- allow to check if frontend is ios wkwebview
- allow subclasses of Range to use static methods
- Changes package.json to include api-extractor and adds api-extractor.json
- Update docs for BRepEntity.DataProps
- Use new buildIModelJsBuild script
- AxisAlignedBox and ElementAlignedBox are now typed to Range3d rather than classes
- clone methods are no longer generic
- Add release tags to indicate API stability
- Handle transforms on child tiles.
- Optimize use of animation cutting planes.
- Remove unneeded typedoc plugin dependency
- Add support for draco compressed meshes.
- Consistent naming of "get" methods in Growable arrays.
- Added spatial <-> cartographic methods that check/use the geographic coordinate system before using ecef location.
- update for geometry GrowableXYArray usage
- Add material props classes
- Defer loading of edges until needed
- Save BUILD_SEMVER to globally accessible map
- Implemented spatial criterai when searching through all reality data associated to a project.
- Optimize containment test with spheres.
- Move the IModelUnitTestRpcInterface into the testbed and out of the public AP
- Renamed constructor variable in RpcConfiguration and RpcRequest
- Support for sending large RPC binary payloads in configurable chunks.
- Remove loadNativeAsset and formatElements RPC calls from the IModelReadRpcInterface
- Removed IModelConnection.connectionId, added IModelApp.sessionId
- Tile requests can optionally specify a retryInterval.
- upgrade to TypeScript 3.2.2

## 0.188.0
Wed, 16 Jan 2019 16:36:09 GMT

### Updates

- Changed Elements Db support for addon changes and generating the changed elements cache. Added WipRpcInterface methods to get changed elements list and check if a changeset is processed in the cache. Bumped WipRpcInterface version. Integration tests for changed elements db.
- Fix error in semver parsing."

## 0.187.0
Tue, 15 Jan 2019 15:18:59 GMT

*Version update only*

## 0.186.0
Mon, 14 Jan 2019 23:09:10 GMT

### Updates

- Removed IModelDb's cache of accessToken. For long running operations like AutoPush, the user must explicitly supply an IAccessTokenManager to keep the token current. 
- Add TextureProps for use by new backend Texture API

## 0.185.0
Fri, 11 Jan 2019 18:29:00 GMT

*Version update only*

## 0.184.0
Thu, 10 Jan 2019 22:46:17 GMT

### Updates

- Add support for general 3d tilesets
- Fix drag select decorator when cursor moves out of view. Doc fixes.

## 0.183.0
Mon, 07 Jan 2019 21:49:21 GMT

### Updates

- Add ambient occlusion structures.
- Change iModelReadRpcInterface' version because Geocoordinate calculation methods added.

## 0.182.0
Mon, 07 Jan 2019 13:31:34 GMT

*Version update only*

## 0.181.0
Fri, 04 Jan 2019 13:02:40 GMT

*Version update only*

## 0.180.0
Wed, 02 Jan 2019 15:18:23 GMT

### Updates

- merge
- Do not send X-Application-Version header if empty.
- Add path pivot data to render schedule

## 0.179.0
Wed, 19 Dec 2018 18:26:14 GMT

### Updates

- Log context and imodel ids as separate properties. Surface interface and operation names in logging title.

## 0.178.0
Thu, 13 Dec 2018 22:06:10 GMT

*Version update only*

## 0.177.0
Wed, 12 Dec 2018 17:21:31 GMT

*Version update only*

## 0.176.0
Mon, 10 Dec 2018 21:19:45 GMT

### Updates

- New signature for RpcInterface.forward

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

### Updates

- Changed index file name to match package name. Change imports to use other packages' index file.

## 0.171.0
Mon, 03 Dec 2018 18:52:58 GMT

### Updates

- Polyfill URLSearchParams for edge.
- Front end "read pixels" can now provide subCategoryId and GeometryClass to backend.

## 0.170.0
Mon, 26 Nov 2018 19:38:42 GMT

### Updates

- Fix GeometryParams constructor. Added test to ensure subcategory id set correctly.
- Remove dependency on 'window'-named global object.

## 0.169.0
Tue, 20 Nov 2018 16:17:15 GMT

### Updates

- GeometryStream markdown

## 0.168.0
Sat, 17 Nov 2018 14:20:11 GMT

*Version update only*

## 0.167.0
Fri, 16 Nov 2018 21:45:44 GMT

### Updates

- Add CartographicRange
- Use URL query instead of path segment for cacheable RPC request parameters.
- Updated Mobile RPC to deal with binary data
- Temporarily disable tile caching.

## 0.166.0
Mon, 12 Nov 2018 16:42:10 GMT

*Version update only*

## 0.165.0
Mon, 12 Nov 2018 15:47:00 GMT

*Version update only*

## 0.164.0
Thu, 08 Nov 2018 17:59:20 GMT

### Updates

- Fix JSON representation of display styles.
- GeoJson and Analysis Importer simplification
- ModelSelectorProps, CategorySelectorProps, and DisplayStyleProps now properly extend DefinitionElementProps
- Support displacement scale for PolyfaceAuxData
- Do not diffentiate between backend provisioning and imodel downloading state in RPC wire format (202 for all).
- Updated to TypeScript 3.1

## 0.163.0
Wed, 31 Oct 2018 20:55:37 GMT

### Updates

- Fully support mixed binary and JSON content in both directions in RPC layer. RPC system internal refactoring. Basic support for cacheable RPC requests.
- Remove unused RpcInterface methods, move WIP methods

## 0.162.0
Wed, 24 Oct 2018 19:20:06 GMT

### Updates

- Added view decoration examples to docs.
- Make ToolAdmin.defaultTool. public. Allow getToolTip to return HTMLElement | string.
- Breaking changes to optimize usage of 64-bit IDs.
- Remove unused createAndInsert methods from IModelWriteRpcInterface
- Correctly parse RPC interface versions with zero major component.
- Add RpcInterface versioning documentation

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

