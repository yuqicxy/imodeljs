# Change Log - @bentley/imodeljs-frontend

This log was last generated on Wed, 22 Jan 2020 19:24:12 GMT and should not be manually modified.

## 1.11.0
Wed, 22 Jan 2020 19:24:12 GMT

### Updates

- For fit, adjust the aspect ratio so that one dimension is increased rather than just adjusting Y.
- Fixed minor typo on RealityData rootDocument property
- TileAdmin.Props.useProjectExtents now defaults to true for better performance.
- Ensure ViewState3d's with camera enabled always have the eyepoint centered when they're created
- Fix aspect ratio adjustment bug in camera views
- Small fix for Fit when aspectRatioSkew isn't 1.0.
- Fix shadows not updating after clearing emphasized/isolated elements.
- Simplify iterator for GeometryList.
- Fix shadow rendering on MacOS Safari and any other unknown client that could fail in the same way.
- Native apps can now cancel tile requests in progress on the backend.
- Reduce tile level-of-detail (thereby improving FPS and memory usage) for models that are small relative to the project extents.
- Remvoe echo test function from devTools
- #258853 Fix for pickDepthPoint
- Add isSpatiallyLocated and isPlanProjection to GeometricModel3dState.
- Added primitive composite value.
- Make hilite and flash target syncing not depend on BeTimePoint.
- Upgrade to TypeScript 3.7.2.
- Add a FeatureToggleClient to iModelApp.
- Gracefully handle an invalid acs id
- ViewZoom not sets focus from depth point.
- #257813 Rest zoom and look tools is mouse wheel is used to zoom.

## 1.10.0
Tue, 07 Jan 2020 19:44:01 GMT

### Updates

- Clear reality tile children loading flag when selecting. 
- Animate change view operations
- Average the gpu profiler times for the last 120 frames instead of updating each frame; also simplify PerformnaceMetrics
- Implement tile availability testing for Cesium World Terrain.
- Return error message from concurrent query manager
- Fixed some bugs associated with device pixel ratio.
- Fix flickering view when zooming in/out while a section clip is applied.
- Adjust focus plane when zooming with mouse wheel.
- Prevent analysis style from overriding texture image for non-animated surfaces.
- Do not force unload of children on reality tile trees as these may be shared among viewports.
- Added support for displaying images embedded in a GeometryStream.
- Added IModelConnection.onOpen event."
- Regenerate shadow map when feature symbology overrides change.
- Use parent if reality tile children are loading.
- Allow events to be sent from backend to frontend
- Fixed Viewport.turnCameraOn() having no effect if the contents of the viewport have uniform depth.
- Set focus distance from depth point for viewing tools.
- Start of new walk tool using mouse + keyboard and touch controls.
- Reduce redundancy between CPU and GPU timers, creating a single interface for this; update display performance tests to save both CPU and GPU data (if available)
- Use pointerlockchange event to make sure it's supported.
- Reduced CPU overhead of computing uniform variable values.
- Moved tile IO-related APIs from frontend to common.
- #254280 #254276 Address "jump" when starting touch viewing operations.
- Add features prop to iModelApp and specify a default implementation for FeatureTrackingManager.
- Move PluginUiManager and PluginUiProvider to ui-abstract package.
- Use onTouchMoveStart for control sticks. Fix issue with key transiton.
- LookAndMoveTool change to use mouse look instead of treating mouse like a control stick.
- Add setting to easily disable pointer lock for walk tool.
- Fix walk tool pan when is 2d or camera is off
- Fix edges of surfaces in 2d views sometimes showing through surfaces in front of them.

## 1.9.0
Tue, 10 Dec 2019 18:08:56 GMT

### Updates

- Logo dialog is now modal.
- Animate mouse wheel zooms
- Align cartesian coordinates when attaching reality models.
- Animate applying saved views
- Code quality report fixes
- Make iModel.js viewports adhere to DPI of a host display.
- code cleanup from codeQL hits
- Setup OidcDesktopClient for Electron use cases. 
- Don't execute our event loop if there is no need
- Fix regression causing animation to be uneven.
- fix warnings from static analysis
- Don't use map tiles until reprojection is complete.
- #34206 Volume Clasify reality data only
- Don't fade grid refs when camera is off, draw based on count. Simplify modal dialog auto close.
- Treat half-floats and full-floats the same.
- added WebGLDisposable interface with defined 'isDisposed' member
- Fix regression in EmphasizeElements.overrideElements() when both color and alpha are overridden.
- Prevent touch events from firing mouse events when modal dialog is up.
- Fix unintentional darkening of views
- Only align reality models if near same height.
- Added ability to adjust tile size modifier for Viewports to trade quality for performance or vice-versa.
- Add QuantityTypes LengthSurvey and LengthEngineering to provide more formatting options and support for Survey Feet.
- Change zoom view handle to set zoom ratio based on y distance from anchor point.

## 1.8.0
Fri, 22 Nov 2019 14:03:34 GMT

### Updates

- Added iModel.js logo in lower right corner of views.
- Touch move event should not clear viewport animator. Put a time limit on what's considered a touch tap.
- Clip low resolution terrain tiles to their displayable children ranges.
- Fix bing tile attribution.  Optimize map reprojection.
- Logo card link opens in a new tab/window.
- Fix whitespace
- Update PluginAdmin.loadPlugin to accept a plugin path with a url scheme already defined.
- optimized ReadPixels call for when volumes classifiers are in use
- Flashed element wasn't being cleared after a tentative.
- Limit map tile loading in orthographic views.
- Add css styles in IModelApp.ts
- Open logo card on touch start.
- Allow zoom handle to move through depth point.
- Added measure area by points tool. Measure and clip tool decoration improvements.
- Added missing topic descriptions
- When rendering transparent objects during opaque pass, ensure alpha is set to 1.
- Report unsuported snap mode for view independent geometry when not using origin snap instead of unsnappable subcategory
- Rework reality model loading to preload tiles.
- Added method to Plugin that allows a Plugin to control whether the "loaded" message appears on repeated loads of same Plugin.
- When a reality tile is not present use higher resolution tiles if ready.
- Fix excessive number of tile requests when solar shadows are enabled.
- Change shadow bias to 0.1
- Ensure only surfaces cast shadows.
- Tweak map and terrain tile loading.
- Improve user experience by not displaying underresolved tiles.
- Add support for view-independent display.
- View target center handle now uses depth preview point instead of AccuSnap.
- Added depth point preview for rotate, pan, and zoom tools.
- When depth point is from an element hit, flash the element too.
- Depth preview refinement and new view tool cursors.
- Simplify walk tool by using Viewport Animator interface
- Add walk cursor
- Fix shadows failing to draw after resizing a viewport.
- Use Viewport.animate for zoom and scroll tools

## 1.7.0
Fri, 01 Nov 2019 13:28:37 GMT

### Updates

- Anisotropic filting of draped map tiles.
- Add debug tool for drape frustum.
- Added MarkerSet.changeViewport
- Allow sub classes of OidcBrowserClient to override the settings passed to the underlying oidc-client library. 
- Tweaks to ambient occlusion settings.
- Fixed issues with use of OIDC AuthCode workflow in Electron and Single Page Applications.
- Update DefaultToolSettingsProvider to create responisve UI.
- Reduce size of Cesium ION copyright logo.
- Cleanup AO settings.
- Added badge support to context menu items. Moved some Plugin Ui definitions to ui-abstract.
- Concatenate projection and model matrix to avoid jitter.
- Make toJSON methods of EmphasizeElements and FeatureSymbology.Appearance return pure JSON types.
- Added support for English key-ins in addition to translated key-ins
- Simplify fitView. Hypermodeling plugin cleanup.
- Rework perspective frustum calculation for planar projections
- Fix plugin loader to honor the bundleName from the manifest file of the plugin.
- Prevent background map terrain from being affected by default symbology overrides.
- Fix failure to report shader compilation errors to user in debug builds.
- Create terrain tiles about center to correct drape jitter.
- Fix terrain skirt quantization
- Fixes for making volume classifiers work.
- Fixes to volume classifier hilite & flashing
- Fixed EmphasizeElements.wantEmphasis having no effect if neither color nor transparency were overridden.
- Added better control over auto-disposal of decoration graphics.
- New wip plugin for hypermodeling support.
- Added popup toolbar when cursor stops over marker or marker is tapped.
- Add imageUtil functions that are used in Design Review and needed in other packages.
- Improve horizon calculation
- Fixed bug that caused duplicated points to be handled improperly in batched spatial<->geocoord conversions
- MarkerSet applies only to a single ScreenViewport
- Make viewport member of MarkerSet public
- More OIDC fixes for logout of electron apps. 
- Improve performance for multiple viewports.
- Added New badge for UI items
- Cross-platform function to open an image in a new window.
- Reduce planar texture frustum by clipping to view planes.
- Fix planar-classified regions not displaying hilite silhouettes in perspective views.
- Prioritize loading of map tiles.
- RenderSystem.Options.displaySolarShadows now defaults to true; and directScreenRendering has no effect (deprecated).
- Ensure shadows are continually updated using the best available tiles.
- Apply transparency cutoff to shadows
- Ensure transparency threshold takes into account material and feature overrides.
- Make shadows not apply to world decorations
- Reduce threshold for moving camera in planar texture projection
- Added initial ui-abstract package setup
- Added UiAdmin with support for displaying Menus and Toolbars at a location

## 1.6.0
Wed, 09 Oct 2019 20:28:42 GMT

### Updates

- Implement proper flashing and hiliting of classified geometry.
- Add new range that represents the dipslayed extents.  This is currently used to set the displayed depths.
- Dont expand displayed extents for unbounded trees.
- Added support for overriding feature symbology to use a hilite effect.
- Fix display artifacts caused by interpolation of material settings.
- Rework frustum calculation for terrain draping.
- Fix inability to locate polylines and edges if their transparency was overridden.
- Add GPU timing queries for devtools.
- Addressed memory leaks when repeatedly restarting IModelApp (typically only done in tests.)
- Enable display of non-spatial, spatially-located models in spatial views.
- Geometry of planar classifier models is not required to itself be planar.
- #165461 #183765 #184303 Fixes for getting image from readMarkup
- Refine planar texture frustum calculation to handle parallel views.
- Errors during shader program compilation produce exceptions.
- Improve shadow lighting to match shadow direction
- Fixed multiple viewport shadows
- Refine classification frustum calculation.
- Support transparency for terrain and planar classification.
- #168481 Tool assistance for viewing tools. Prompt punctuation consistency.

## 1.5.0
Mon, 30 Sep 2019 22:28:48 GMT

### Updates

- AccuDraw Popup Editors. Improved editor sizes. Editor Params improvements.
- Support animation and classification in same tiles.
- Always adjust y dimension for aspectRatioSkew
- added support for blank IModelConnections
- Added Cesium ION logo; fixed exception when opening a second viewport while terrain, shadows,  or planar classification are enabled.
- add checkbrowser.js, refine i18n in Tool
- #168241 Don't try to correct clip plane handle location when plane has been moved outside project extents. Updated image for two finger drag svg.
- Refine frustum calculation for planar projection to create a tighter fit. 
- #136470 Added ViewManager.getElementToolTip for overriding default persistent element tooltip.
- Various EVSM shadow tweaks
- Fix scenario in which a tile request is canceled after its http request completes and it remains perpetually in the request queue.
- Fixed elements failing to draw if transparency was overridden to be exactly 15.
- Fix marker decorations not updating when markers are added or deleted; fix canvas decorations sometimes failing to display in Firefox.
- Fix a problem with direct-screen rendering (black viewport in certain situations).
- Fix edges of instanced geometry failing to respect edge color override defined by display style.
- Fix transparency for some shaders
- Added Viewport.readImageToCanvas() to obtain viewport image as a HTMLCanvasElement with a 2d rendering context.
- Ensure IModelApp.queryRenderCompatibility() always returns an error message if webgl context creation fails.
- Fix failure to locate an element if it also serves as a modeled element for a sub-model.
- #168481 Added missing iconSpec to measure and clipping tools.
- Correct ViewClipByPlaneTool icon.
- Add minArgs, maxArgs, and parseAndRun to PluginTool
- Added ToolTipProvider interface to augment tool tips.
- Fix tool tip formatting for terrain.
- Enable display of non-spatial, spatially-located models in spatial views.
- Add public Tool method translateWithNamespace to allow plugins to supply their own localization.
- Support animation of models within RenderSchedule.
- Added support for iterating a Viewport's per-model category visibility overrides.
- Refine planar projection frustum
- Added autoExpand property to PropertyRecord
- Add QuantityFormatter.onInitialized method to set up default formatting and parsing Specs. Update SetupCameraTool to use new LengthDescription (PropertyDescription)
- Only apply pseudo-rtc workaround if no true RTC exist in GLTF
- Performance optimization (benefits non-chromium-based browsers): Render directly to an on-screen canvas when rendering only a single viewport.
- #168481 Select elements tool assistance. Add touch inputs, use new qualifier+button mouse inputs.
- Fix for pinch zoom not being smooth.
- Added facility to load plugins specified in settings at startup
- Add ability for QuantityFormatter to generate station formatting.
- Allow cached tiles to be used across revisions as long as the model geometry has not changed.
- Tool Assistance changes per UX Design
- #168481 Tool assistance: Measure tools, view clip tools, and touch cursor inputs.
- Added touch entries to ToolAssistanceImage
- Only force update of tool assistance for touch tap that creates the touch cursor.
- upgrade to TypeScript 3.6.2
- Fix WindowAreaTool full screen cursor. Added selected view frustum debug tool.

## 1.4.0
Tue, 10 Sep 2019 12:09:49 GMT

### Updates

- Register tools for AccuDraw shortcuts to support keyboard shortcuts.
- Partially support animation of classifiers for MicroSoft Poc.  
- Prevent ambient occlusion from being applied to unlit geometry.
- Add methods for setting render schedule in display style
- Identify classified reality data to avoid snap using classification element geometry.
- Apply pseudo bias to batch range when tileset has huge offset.
- Add workaround for ContextCapture tiles with large offsets.
- load bentleyjs-core before geometry-core instead of in parallel from the IModelJsLoader script
- Refine tile corners on reprojection.  Fix bing HTTP request
- Added a new component for the Poc, an icon picker.
- Support symbology overrides with no batchId for render schedules, Plugin case fixes.
- Don't display markers that are very close to eye point.
- Change how Marker scale is computed for views background map displayed.
- Report coordinates to message center for copy to clipboard. Support drawing views.
- Ensure texture memory is properly tracked.
- Add support for GeometricModel.geometryGuid for detecting whether tiles for a model can be reused across versions
- Added access to debugging features to RenderSystem via RenderSystemDebugControl; includes support for forcing webgl context loss and toggling pseudo-wiremesh surface display.
- Support reality model masking via black classifier geometry.
- Support nearest snap for reality models.
- Remove doubling of planar classifier size.  This caused excessive generation time.
- Refine texture projection calculation to include height range (for terrain). 
- Ensure DisplayStyle3dState.sunDirection is synchronized with DisplayStyle3dSettings JSON.
- Clip volume applied to view also applies to reality models.
- Added SetupCameraTool for defining camera by eye point and target point.
- Prioritize requests for reality model tiles based on distance from camera.
- #165662. Allow an app to specify touch-specific instructions in tool assistance.
- Tweak tile priorities so that reality models don't block quicker maps and classifiers.
- Call to pickNearestVisibleGeometry on 1st data button almost always succeeds now that acs plane is used, remove from updateTargetCenter.

## 1.3.0
Tue, 13 Aug 2019 20:25:53 GMT

### Updates

- Add a frontend keyin UI and handler.
- Add inertia to Pan and Rotate tools
- Add test to avoid crash on null view
- Add support for BackstageComposer so Plugins can add backstage items.
- Fix loading bug with IModelConnection.codeSpecs
- Support depth buffered background map and terrain provided through Cesium World Terrain.  Switch to logarithmic Z-Buffer
- Added CursorPopupRenderer to render multiple CursorPopups per RelativePosition.
- Added CursorPrompt, improved Pointer messages
- Added support for displaying shadows.
- Fixed inability to select pickable overlay decorations when elements are emphasized or isolated in the viewport.
- EmphasizeElements API for resymbolizing and isolating elements.
- Fix Feature IDs for planar classification picking.
- Use https: to download Plugin files, unless server is localhost
- Correct cutting plane direction for Syncro schedule support.
- Fix element locate occassionally locating transparent areas of textured surfaces.
- Fix DecorateContext.addDecoration() ignoring view background graphic type.
- Fix specular lighting in specific case when specular exponent is zero.
- #151464 Improved grid display performance.
- Don't check eyeDot in camera view.
- Grid - fix loop test point, check spacing once when camera is off, don't fade unless decreasing.
- Mass properties tool, report error when selection contains no valid elements for operation.
- Report WebGL context loss to the user.
- Optimized shader programs by moving computations from fragment to vertex shader; implemented material atlases to reduce number of draw calls associated with surface materials.
- Measure distance, don't use cursor location in decorate while suspended.
- Plugin changes to support building to tar files and hosting by external web servers.
- Allow defining points with `number[]` and `{x,y}` or `{x,y,z}`
- Made onClick event handler in LinkElementInfo optional.
- #139626 Change SelectTool to always start in pick mode, add better filter explanations.
- Add tool assistance for SelectTool.
- Update SelectTool to set want tool setting property to true.
- Rework map imagery and terrain tile trees to improve display fidelity during panning and zooming.
- If a material specifies a pattern map and transparency, multiply pattern alpha by material alpha.
- Fix a bug in which a tile request could become stuck in the "loading" state.
- Added Tool.parseAndRun to make executing Tools from keyins easier.
- #155077 Project point to ACS plane when zooming if an element isn't identify and no background map is displayed.

## 1.2.0
Wed, 24 Jul 2019 11:47:26 GMT

### Updates

- added optional HTMLElement member to Marker
- Product Backlog Items 148512: OidcBrowserClient can be used for authorization code workflows; Product Backlog Item 148571: Generalized OidcBrowserClient to work with Cesium and SharePoint.
- catch load errors for Sprites
- Remove colinear clip shape points. Grid spacing is a double.
- Added tests for Spatial Classifications
- Added TileAdmin option to disable "magnification" tile refinement strategy, which can prevent production of extraordinarily large tiles in some cases.
- ViewManager.dropViewport clears tool events associated with the dropped viewport, preventing errors in async event processing code. Added Viewport.isDisposed property.
- Added limited opt-in support for drawing tiles from secondary IModelConnections and locating elements within them. Users must implement tools that can properly handle results like a HitDetail pointing to a different IModelConnection than the one associated with the viewport.
- Fix Viewport.addViewedModels() failing to update view if some models needed to be loaded asynchronously.
- Fix empty message body when display Bing map attribution info.
- Update beta PluginUiProvider interfaces.
- Add support for GroupItemInsertSpec, badges, and svg symbolId in ToolbarItemInsertSpecs
- Added method to get element mass properties.
- Added option to discard alpha channel when converting ImageBuffer to HTMLCanvasElement.
- Measure distance, allow snap outside project extents for version compare. Added measure length, area, and volume tools.
- Various OIDC related fixes - Bugs: 148507, 148508, Product Backlog Items: 148510, 148517, 148522.
- Add PluginUiManager class and PluginUiProvider interface that will be used by Plugins to specify UI components to add to an iModeljs application.
- Choose handle location for for section plane that is visible in the view.
- Temporarily undid change to save tokens in local storage. 
- Added ToolAssistance support and Tool.iconSpec
- The WebGL rendering system now takes advantage of Vertex Array Objects if they are available via an extension.  These provide a measurable performance increase in certain datasets.

## 1.1.0
Mon, 01 Jul 2019 19:04:29 GMT

### Updates

- Added userAgent, renderer, and vendor to WebGLRenderCompatibilityInfo
- Cleaned up background map API
- Support batch Ids in I3dm (instanced) tiles
- Add support for applying bing elevation to background map (Terrain).
- Avoid forwarding tile content request to backend if request is canceled while awaiting content from blob storage.
- Support batch tables in 3d Tilesets.
- Added SelectTool.processMiss method to better support clearing logical selections.
- #128860 Clip from element change to try local range XZ or YZ when XY extents aren't valid.
- Added Viewport.onChangeView event to notify listeners when a new ViewState becomes associated with the Viewport.
- Eliminate need to cache tool setting properties by ensuring active tool is available before activeToolChanged event is fired.
- Removed missing group descriptions
- Support draping of background map tiles on reality models.
- Added internal method to retrieve attachments from SheetViewState for use in saving/recalling views.
- Fix for Bing attribution hotspot - was unreliable with elements behind it.
- Fix bing map URL template - http: -> https:
- Fix background map tile when child not found.
- Fix failure to use geocoordinate system to transform map tiles.
- Ensure new tiles are loaded when edge display is toggled.
- fix usage of varyings
- Fix incorrect range computation when Viewport.zoomToPlacementProps encounters a null range.
- Added support for 'HTMLElement | string' for message strings
- Allow index.html to set a CDN from which to load imodeljs external modules.
- make Viewport.invaildateDecorations @beta, was @internal
- add default unhandled exception handler to ToolAdmin
- Added feature tracking info to UserInfo obtained by OidcBrowserClient. 
- ensure we never have two active snap or tooltip requests
- Refine tile selection for map tiles
- Prevent default symbology overrides applying to subcategories whose appearances were explicitly overridden.
- Add option to periodically purge unused tile trees from memory.
- Allow Viewport's readImage() method to resize images as requested.
- Fix Bug 127182 - Force toolsettings to refresh when a tool is started even if new toolId is same as active toolId.
- #130062 fixed skybox for extreeme otho zoomin
- exit on uncaught exception in render loop (Electron only)
- thumbnail size was limited to 64K
- Improve memory management for tile trees.
- Update to TypeScript 3.5
- A Viewport can now be instructed to load models when enabling their display.

## 1.0.0
Mon, 03 Jun 2019 18:09:39 GMT

### Updates

- RPC system now accepts only basic values (primitives, "interface" objects, and binary).
- Updated release tags. 
- added Viewport.changeViewedModel2d
- Clip shape tool should only set AccuDraw rotation on 1st point.
- #123874 Fix a prompt. #123731 Clip from element change to ignore selection set containing clip transient.
- Combine planar classifier textures to converve texture units
- Removed MaybeRenderApp and WebGLTestContext from tests
- Remove unnecessary comment and initialization checks from tests
- Fix bug sending sync ToolSettings message to UI when tool did not want ToolSettings.
- Support emphasize of isolated elements. Allow default appearance independent of emphasize.
- Dont enforce front/back ratio when displaying map as it does not require z-Buffer.
- Export the classes from WebMercatorTileTree
- Fix contentRange when GLTF contains RTC
- Fix assertion when computing range of instanced meshes.
- Fix loader so that it doesn't attempt to load .css files that don't exist.
- Fix background map tile when child not found.
- Allow ^ to be used to define angle degrees.
- Downgraded certain NotificationManager methods to @beta to question styling support
- Fix erroneous clipping of instanced geometry.
- constructors for BeButtonEvent classes now take props argument
- Remove back face culling option due to lack of performance benefit and other observations
- Increase precision of clipping by transforming clip planes off the GPU.
- Change ModifyElementSource to internal.
- Added onActiveClipChanged event to ViewClipDecorationProvider instead of having to implement ViewClipEventHandler. Support for named clips using SettingsAdmin (needs integration tests).
- Saved clip integration tests. Change view rotate wheel to only zoom about target center when displayed.
- Support multipass rendering for planar classification for computers that down support multi-target framebuffers
- Refactored and simplified implementation of IModelDb.open
- 83505
- Reduce display performance degradation when non-convex clip shapes are applied to a view.
- Added Overflow button support
- PropertyRecord can now optionally have `extendedData` which is a map of `any`
- Add support for synchronous quantity parsing and showing and hiding InputFieldMessages.
- Set max tiles to skip to 1 for reality model tiles. (better user experience)
- Set release tags for TiledGraphicsProvider classes
- Reload tile tree if animation id changes
- Removed use of OidcClientWrapper. 
- Add cSpell comment.
- Rename terrain to backgroundMap.
- Add IModelApp.queryRenderCompatibility() API to allow querying of any rendering limitations of a client system.
- Retire some tile-related feature gates.
- Add ability to save/restore toolsetting properties during a session.
- Change to using the new SharedSettings API.
- Added test for shareClip.
- Add slope biasing to solar shadow mapping.
- Reduce horizon limit so that shadows appear earlier and later.
- Reduced delay between opening a viewport and seeing any graphics.
- Don't await tentative as it can prevent being able to double click to fit.
- Change to the way the background map is specified, to allow overlays.
- Introduced tile format v4.0
- Tool writers only need AccuDrawHintBuilder, AccuDraw should be internal.
- use HTMLElements for tooltips
- Improve touch cursor visibility. Fix tap on canvas decoration when touch cursor is active.
- loader finds and loads css files in production mode.

## 0.191.0
Mon, 13 May 2019 15:52:05 GMT

### Updates

- Support spatial classification of context reality models.
- API methods for adding and removing context reality models
- Account for view clip in adjustZPlanes. Fit view needs to check clipVolume ViewFlag.
- Increase ambient light to .2
- Adds parameter for api-extractor to validate missing release tags
- Eliminate display performance issue caused by normal matrix computation.
- remove requirement that JavaScript classnames match BIS classnames
- Reduce the number of geocoordination requests produced when loading map tiles.
- Save ClipVector on ViewState instead of always creating new one from json.
- Set initial GL state to match default
- Dispose of planar classifiers.
- Add spatial classifier UX 
- Hide clip decoration during modify. Easier right-click/touch tap support for non-handle pickable decoration.
- Add orientation option button to toolsettings for ClipByPlane/ClipByShape tools.
- ConvexClipPlaneSet modify handles. Make EmphasizeElements internal.
- ClipShape modify handles.
- Fix clip to element tool. wip: Compute clp plane offset in world to support tool settings to enter distance.
- #114939 Fix handle drag test. Support smart lock wth clip shape tool. Offset all clip planes w/shift.
- View clip fixes and start of tools.
- Fit view support for planes clip primitive. View clipping tools.
- Fix tolerance multiplier for reality models
- Cull geometry outside view clipping volume before drawing.
- Fix root tile range on webmercator tile tree for ground bias.
- Added support for disabling certain capabilities for performance testing
- Adding support for readPixels performance testing
- Prevent tooltip from blocking tool event loop.
- add test coverage in frontend
- Debug json clip plane usage.
- ClipVector and ClipUtilities test and enhancements
- Add backface culling feature to improve performance.
- Continue showing old skybox until new is ready
- Add method to return available reality models excluding attached.
- Allow a view to define a set of elements which should never be drawn in that view.
- Allow selected viewport to be changed when filterViewport rejects view.
- Support instanced geometry.
- Support clipping view volume with multiple convex clipPlane sets.
- Fix rare failure to refine tiles displayed in view resulting in missing geometry.
- Fix display of animated edges.
- fixes for release tags
- When loading a perspective view, fix up potentially bad camera settings.
- Reduce mininum front clip (Defect 103868).
- Ensure webgl resources allocated by clip volumes are properly released.
- Fix broken links
- LoggerCategory -> FrontendLoggerCategory
- Fix IModelJsLoader to load imodeljs-markup only when needed
- Export solar calculations for UI
- Fix scenario in which lower-resolution tiles would be inappropriately substituted for tiles of appropriate resolution.
- Fix multipass depth issue
- Fixed visual artifacts when drawing large batches of polylines.
- Handle non-rds tile tree URLS when signed in.
- Fix issue in which tiles of incorrect LOD would be drawn.
- Fix issue with undo/redo view not having render materials
- Fixes to web mercator. 
- Interfaces used by PropertyRecord are set to either beta or alpha as modules that use them to implement UI are not finalized.
- eliminate depedency on JavaScript class names for EnityState subclasses
- Add support for appending GeoJson to existing IModel
- Use default background map type if an invalid type is specified in JSON.
- Ensure queries for large numbers of subcategories are paged appropriately.
- Improve graphics performance in Firefox.
- Only use instancing optimization if the system supports instancing.
- update Sprite after it is loaded
- Introduce LoggerCategory enum to advertise logger categories used by this package.
- Logging fixes. 
- Put sourcemap in npm package.
- documentation cleanup
- add SVG to ImageSourceFormat
- add imodeljs-markup
- added vpDiv between parent and canvas
- Allow a view's extent limits to be overridden.
- #108055 Update measure distance tooltip on click. Improve total distance visibility.
- Add alpha tags to PropertyEditorParams interfaces that are not ready for public use.
- Improved performance of multipass rendering
- #96348 Improve default rotate point for navigation cube
- Fixes to OidcBrowserClient. 
- Optimize frontend renderer's performance by minimizing allocations of float arrays passed to the GPU.
- Add more discrete, efficient Viewport synchronization events.
- Added the ability to override category visibility on a per-model basis.
- Rework projection of planar classifiers
- Refactor classification  rename to SpatialClassification
- Remove "assembly lock" from SelectTool now that SelectionScope has been implemented.
- remove IModelApp subclasses
- Remove IModelConnection.openStandalone and IModelConnection.closeStandalone
- Setup a generic context for tracking client requests, and made various related enhancements to logging, usage tracking and authorization. 
- Allow tile content to be requested without edge data, reducing tile size and download time.
- Support image textures larger than WebGL capabilities by resizing them.
- Update icons-generic-webfont version to latest available.
- Update the ToolSettings properties defined in the Select Tool so two groups of options are presented, one for selection method and one for selection mode.
- Simplify SelectTool SelectionMethod and SelectionMode.
- Remove need to sync SelectionMethod since it is not changed within tool code.
- Add IModelConnection.openSnapshot/closeSnapshot, deprecate IModelConnection.openStandalone/closeStandalone
- Refactor solar shadow settings - make these 3d only.
- Support solar shadow display.
- Make sky sphere / sky gradient use separate rendering primitive from sky cube.
- don't draw Sprite before it is loaded
- Unit tests and fixed ColorEditor alignment
- Fix errors on Linux caused by case-sensitivity and shader optimizations.
- Upgrade TypeDoc dependency to 0.14.2
- Update the primitive types to be within a Primitives namespace.
- allow IModelApp subclass to override applicationId & applicationVersion
- revert static inheritance in IModelApp.ts
- wrap applicationId & applicationVersion in IModelApp
- Changes to build process to put all JavaScript files in version-specific subdirectories to avoid browser caching problems when deploying new versions.
- view undo only saves changes to ViewState, not categories, models, or diplayStyle
- Clip tool changes now that undo/redo does not affect clipping. Right-click menu support for clip handles.
- only save viewing volume for view undo rather than cloning ViewState
- Tools to create and modify view clip.
- VSTS#114189 Reality data shown as Model and picker
- World decorations ignore symbology overrides defined for the view.

## 0.190.0
Thu, 14 Mar 2019 14:26:49 GMT

### Updates

- Add ColorEditor to list of available Type Editors including new ColorParams to specify set of colors.
- #73219 FitViewTool enhancement to fit to isolated elements or clip volume.
- Supply additional statistics for monitoring tile requests.
- Resolve transparency rendering error in multi-pass compositor due to way textures are bound.
- Cleaned up documentation related to the display system.
- use bubble-up for keyboard events
- Plugin Enhancements
- Documentation for Skybox
- Added vertex handles for line/arrow markup.

## 0.189.0
Wed, 06 Mar 2019 15:41:22 GMT

### Updates

- add ios oidc client
- geometry-core camel case
- Add Selection Scope toolsettings to SelectTool.
- allow subclasses of Range to use static methods
- Raise events when a Viewport's always- or never-drawn element sets change.
- OIDC changes needed for Angular client
- Changes package.json to include api-extractor and adds api-extractor.json
- #66826 Default SelectTool to select all members of the selected element's assembly.
- Default scope to element.
- Use new buildIModelJsBuild script
- Generalize support for reading tiles to include tiles generated for Bimium.
- AxisAlignedBox and ElementAlignedBox are now typed to Range3d rather than classes
- clone methods are no longer generic
- Optimize renderer to elide debug-only code paths unless explicitly enabled.
- Generalize 3d tile support.   Handle transform on child nodes.
- Avoid using cutting planes while animating if not displayed, completely hidden or completely visible.
- Started work on webworker to decode jpeg files for GLTF
- Defer Draco support until moved to web worker
- Reduce memory consumption when ambient occlusion is disabled.
- Fix incorrect colors for some decoration graphics.
- Remove unneeded typedoc plugin dependency
- Add support for Draco compressed meshes
- Change drag select to exclude non locatable
- noMotion doesn't need to call beginDynamicUpdate
- example code (in comments) for frustum interpolator
- Consistent naming of "get" methods in Growable arrays.
- Add EmphasizeElements to/from wire format methods
- Draw non-emphasized elements in "fade-out", non-locatable mode.
- Move neverDrawn/alwaysDrawn to Viewport they are not part of the persistent ViewState. Change Viewport.addFeatureOverrides to an interface.
- Rework and simplify ecef transform for reality models.
- Correct ID for loading classifier trees.
- Fix clipping volume being inconsistently applied to view.
- Dont make textures transparent unless technique enables it.
- Fix incorrect "fit view" behavior when empty tiles exist.
- Handle relative subpaths in reality model tile trees.  Handle Y for axis/ 
- Fix handling of null animation visibility - should be 100% not 0.
- Added spatial <-> cartographic methods that check/use the geographic coordinate system before using ecef location.
- DefaultViewTouchTool should not call handleEvent until it's installed as the active ViewTool.
- Traverse GLTF node structure rather than meshes so that node transforms are used correctly.
- Ensure viewport updates immediately when background map settings are changed.
- Add a test to determine if GCS is present before using GCS converter.
- Documentation improvements
- Support instanced rendering of .i3dm 3D tiles.
- Preliminary support for drawing instanced geometry.
- Fix branch transform for animation correctly - back out incorrect fix to BranchState.
- Implemented, then commented out, doing jpeg decompression in a web worker
- added markup mode
- events are now on ScreenViewport.parentDiv rather than canvas
- update for geometry GrowableXYArray usage.
- Measure Distance - change selected segment hilite. Measure Location - WIP use ecef transform.
- More ui-framework unit tests
- Make it possible to define editor params for default Type Editors not explicitly specified by name.
- Fixed a bug which caused non-locatable geometry to be rendered when no other symbology was overridden.
- Defer loading of edges until needed
- Omit animation branches that are not visible.
- Improve efficiency and completeness of SubCategory loading for ViewStates.
- Save BUILD_SEMVER to globally accessible map. PluginAdmin and Plugin classes defined. IModelJsLoader improved.
- add optional iModel argument to EntityState.clone 
- added GeometricModelState.queryModelRange
- Added creatorId, new method to list RD per project, identified numerous area for changes WIP
- IModelConnection.close() always disposes the briefcase held at the backend in the case of ReadWrite connections. 
- Implemented spatial criterai when searching through all reality data associated to a project.
- Problem with root document of reality data not in root of blob. Tiles could not be fetched. Root path is added to tiles names.
- Threading issue accessing Reality Data, RealityData class was transformed to be the main data access object instead of the client that was used by most/all reality data causing cache data clash and mix between many reality data.
- Optimze containment test with spheres.
- Move the IModelUnitTestRpcInterface into the testbed and out of the public AP
- Retry tile requests on time-out.
- Remove loadNativeAsset and formatElements RPC calls from the IModelReadRpcInterface
- Removed IModelConnection.connectionId, added IModelApp.sessionId
- make view transition animations smoother
- Optimizations to tile format and schedule animation.
- Tile requests can optionally specify a retryInterval.
-  Cleanup of DefaultToolSetting provider and EnumButtonGroup editor including new EditorParams.
- Move property definitions to imodeljs-frontend so they could be used by tools to define properties for tool settings. Add toolsettings to Select Tool.
- Added a new property to PropertyRecord - links.
- IModelConnection.connectionTimeout is public to allow application customization.
- upgrade to TypeScript 3.2.2

## 0.188.0
Wed, 16 Jan 2019 16:36:09 GMT

### Updates

- Report unsigned measure distance deltas.
- Add batch id to schedule scripts
- Add batchID to schedule scripts
- Handle wider variety of GLTF bounding boxes etc.

## 0.187.0
Tue, 15 Jan 2019 15:18:59 GMT

*Version update only*

## 0.186.0
Mon, 14 Jan 2019 23:09:10 GMT

### Updates

- Fix visible seams between map tiles.

## 0.185.0
Fri, 11 Jan 2019 18:29:00 GMT

### Updates

- Optimize performance of schedule animation.
- Use QuantityType.Coordinate for measure distance start/end points.
- Add QuantityTypes LatLong and Coordinate.

## 0.184.0
Thu, 10 Jan 2019 22:46:17 GMT

### Updates

- Add support for general 3d tilesets
- Fix drag select decorator when cursor moves out of view. Doc fixes.
- Support region bounding volumes
- Fix IModelJsLoader to ensure react loaded before bwc.
- MeasureLocationTool show lat/long and altitude.
- Make raster text locate behave better.
- Removed default OIDC scopes. All applications must now explicitly pass the required scopes. 
- Can now await result from QuantityFormatter. Report delta relative to ACS when context lock enabled. Cleanup "Measure.Points" plug-in example until real measure tools are available.
- Quantity formatter now allows async method to get FormatterSpec that can be used to format quantities.
- QuantityFormatter.formatQuantity is now the only method to format quantities.
- Rename formatQuantityWithSpec to formatQuantity
- Added ToolAdmin method for undo/undo last data button and call from Ctrl+Z.

## 0.183.0
Mon, 07 Jan 2019 21:49:21 GMT

### Updates

- Add ambient occlusion to the display frontend system.
- Account for global origin when reporting coordinates.
- Add measure distance tool, will be moved to plug-in later.
- Fixed unnecessary reload during OIDC redirect callback.

## 0.182.0
Mon, 07 Jan 2019 13:31:34 GMT

### Updates

- When the iModel covers a large enough area, get the corners of background map tiles using Geographic reprojection

## 0.181.0
Fri, 04 Jan 2019 13:02:40 GMT

### Updates

- Fix incorrect display of point strings containing duplicate points.
- Optimize performance when reading depth buffer.

## 0.180.0
Wed, 02 Jan 2019 15:18:23 GMT

### Updates

- Allow the maximum number of active tile requests to be modified at run-time.
- Fix excessive memory consumption by polyline graphics.
- merge
- Enable path interpolation
- Enable schedule animation
- if view delta is too large or small, set it to max/min rather than aborting viewing operations.
- Fix transform order when pushing branch.
- Implement quaternion interpolation for Synchro schedule animation
- remove trash files
- Add batch feature overrides to optimize schedule animation.
- Prioritize tile requests based on tile type and depth.
- Improve performance by limiting the number of simultaneously-active tile requests.

## 0.179.0
Wed, 19 Dec 2018 18:26:14 GMT

### Updates

- Added showDialogInitially support to ActivityMessageDetails
- View tools enhancement to use background map plane for depth point when geometry isn't identified.
- Fix regression in the display of reality models induced by switch to OIDC for access token.
- Support Pre animation tiles
- Add support for Syncro schedules (transform disabled)

## 0.178.0
Thu, 13 Dec 2018 22:06:10 GMT

### Updates

- Fix view becoming black in some circumstnces when locate cursor exits viewport.
- Only make createGraphicBuilder available to DecorationContext. DynamicsContext/SceneContext require a scene graphic.
- Added StringGetter support to ItemDefBase, ItemProps & ToolButton. Added IModelApp.i18n checks to Tool for unit tests.
- Fix failure to locate elements if their transparency is overridden.
- Added tool prompts. Fix dynamics changing locate circle. Hide touch cursor on mouse motion.

## 0.177.0
Wed, 12 Dec 2018 17:21:31 GMT

### Updates

- Added TwoWayViewportSync class to connect two Viewports so that changes to one are reflected in the other.
- Renamed ViewStateData to ViewStateProps and ViewState.createFromStateData to ViewState.createFromProps.
- turn off locate circle when mouse leaves a view

## 0.176.0
Mon, 10 Dec 2018 21:19:45 GMT

### Updates

- Move cursors and sprites to separate directories
- Fix bug in which the frustum of a spatial view was always expanded to include the ground plane even if the ground plane was not displayed.
- Ignore 2d models in model selectors.
- Add tracking of active + pending tile requests.

## 0.175.0
Mon, 10 Dec 2018 17:08:55 GMT

### Updates

- route map tiles over https

## 0.174.0
Mon, 10 Dec 2018 13:24:09 GMT

### Updates

- Touch tap with AccuSnap enabled now brings up a decoration planchette to help choose the snap point.

## 0.173.0
Thu, 06 Dec 2018 22:03:29 GMT

### Updates

- map api cors fix
- Fix failure to display Bing maps logo.
- Fix "maximum window" error when viewing large drawings.
- enable tslint rules for asyncs
- T
- Custom imodelJs noDirectImport lint rule implemented, noDuplicateImport lint rule turned on.

## 0.172.0
Tue, 04 Dec 2018 17:24:39 GMT

### Updates

- Changed index file name to match package name. Change imports to use other packages' index file.

## 0.171.0
Mon, 03 Dec 2018 18:52:58 GMT

### Updates

- WIP: add support for schedule animation (symbology).
- geometry coverage
- geometry coverage
- Fix incorrect length used to create Uint32Array from Uint8Array.
- Fix incorrect display of raster text.
- Fix bug in which the frustum of a spatial view was always expanded to include the ground plane even if the ground plane was not displayed.
- Fix exception when attempting to create a SubCategoryAppearance from an empty string.
- Locate circle should be initialized to off.
- Enable locate and hilite for point clouds.
- Rename SimpleViewTest to display-test-app
- SnapStatus and LocateFailure cleanup
- Front end "read pixels" can now provide subCategoryId and GeometryClass to backend.
- Check SubCategoryAppearance dontLocate and dontSnap now that HitDetail has subCategoryId.

## 0.170.0
Mon, 26 Nov 2018 19:38:42 GMT

### Updates

- Fix missing uniform error in Edge browser.
- Optimize 'pick buffer' portion of renderer.

## 0.169.0
Tue, 20 Nov 2018 16:17:15 GMT

*Version update only*

## 0.168.0
Sat, 17 Nov 2018 14:20:11 GMT

*Version update only*

## 0.167.0
Fri, 16 Nov 2018 21:45:44 GMT

### Updates

- Add support for finding reality models that overlap project extent.
- Refactor ContextRealityModelState
- Numerous shader program optimizations.

## 0.166.0
Mon, 12 Nov 2018 16:42:10 GMT

### Updates

- Hydrated briefcases for ReadOnly cases from the latest checkpoint, rather than the seed files. This significantly improves performance of IModelDb/IModelConnection.open() for typical cases. 

## 0.165.0
Mon, 12 Nov 2018 15:47:00 GMT

### Updates

- Fix SelectionSet broadcasting excessive selection change events
- Add support for Context Reality Models

## 0.164.0
Thu, 08 Nov 2018 17:59:20 GMT

### Updates

- AccuDraw/AccuSnap markdown/examples
- Fix edge animation of PolyfaceAuxData
- Updated frontend performance testing
- Change filterHit on InteractiveTool to async to support backend queries
- Fix JSON representation of DisplayStyleState.
- Fix links in tool docs
- Added an option to Viewport.readImage() to flip the resultant image vertically.
- PrimitiveTool isValidLocation shouldn't require write, want check for measure tools too
- Add Comments
- Updated to TypeScript 3.1

## 0.163.0
Wed, 31 Oct 2018 20:55:37 GMT

### Updates

- Get snap sprites and view cursors from a url
- Move filterHit from PrimitveTool to InteractiveTool. PrimitiveTool docs.
- Support conversion of ImageBuffer to PNG.
- PrimitiveTool cursor fixes and wip markdown
- Hide WIP ChangeCache methods on IModelConnection

## 0.162.0
Wed, 24 Oct 2018 19:20:06 GMT

### Updates

- Added view decoration examples to docs.
- Make ToolAdmin.defaultTool. public. Allow getToolTip to return HTMLElement | string.
- Fix clipping planes with large floating point values for iOS.
- Breaking changes to optimize usage of 64-bit IDs.
- Avoid small allocations within render loop.
- Added NotificationManager.isToolTipSupported so that we can avoid asking for tooltip message when _showToolTip isn't implemented by application.

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

