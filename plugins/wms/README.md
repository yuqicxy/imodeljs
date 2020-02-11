# WMS Example Plugin

Copyright © Bentley Systems, Incorporated. All rights reserved.

An iModel.js example Plugin that demonstrates adding a WMS (Web Map Service) tiled graphics provider to the graphics of a view:

This plugin serves as an example of a plugin that can be added to iModel.js host applications.
See http://imodeljs.org for comprehensive documentation on the iModel.js API and the various constructs used in this sample.

## Development Setup

1. Select and prepare an iModel.js host application. You can use the [Simple Viewer App](https://imodeljs.gitbub.io/simple-viewer-app), for example.

2. The dependencies are installed as part of "rush install" in the iModel.js monorepository.

3. Build the plugin as part of the "rush build" in the iModel.js monorepository, or separately build using the npm build command.

  ```sh
  npm run build
  ```

4. Copy all the output files in the lib/build directory tree to imjs_plugins/iotDemo directory in the web resources of the host application.

5. Start the host application - go to its directory and run:

  ```sh
  npm run start:servers
  ```

6. Open a web browser (e.g., Chrome or Edge), and browse to localhost:3000.

7. Start the plugin using the PluginTool - PluginTool.run("localhost:3000/wmsPlugin");

## Contributing

[Contributing to iModel.js](https://github.com/imodeljs/imodeljs/blob/master/CONTRIBUTING.md)
