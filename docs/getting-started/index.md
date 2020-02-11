# Getting Started With iModel.js

## 1. Get the Tools

Writing an iModel.js application requires the following software:

- [Node.js](https://nodejs.org) (latest 10.x or 12.x LTS version)
  - This provides the backend JavaScript runtime.
  - The installation also includes the `npm` command line tool.
- [Google Chrome](https://www.google.com/chrome/)
  - This is the preferred tool for developing and debugging frontend JavaScript.
- [Git](https://git-scm.com/downloads)
  - This is the source code control system for the iModel.js repositories.

### Suggested Tools

The following tools are very helpful and highly suggested for working with iModel.js:

- [Visual Studio Code](https://code.visualstudio.com/)
  - This is the recommended editor and debugger for iModel.js applications.
  - VS Code also supplies a graphical user interface for working with Git.
  - The following VS Code extensions can also be quite helpful:
    - [TSLint](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin) (use tslint.json from @bentley/build-tools to enforce Bentley coding standards)
    - [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)
    - [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens) (great tools for using Git inside VSCode)
    - [MarkdownLint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) (for editing documentation)

## 2. Register Yourself

To be able to view/read [iModel](../learning/imodels) data, you will need access to the [iModelHub]($docs/learning/IModelHub/index.md), which requires a Bentley user account.

**[Register here](https://ims.bentley.com/IMS/Registration)**

> Note: Skip to step 3, if you already have a Bentley User Account.

## 3. Register your Application

Once you have a Bentley User account, you will need to register the application you are about to create so it can access iModelHub.

**[Register Here](./registration-dashboard.md)**

There are three types of apps you can register:

[Web Application](../learning/app.md/#interactive-apps)<br/>
An interactive application obtains information from an iModel and presents that information in a user interface.

[Agent Application](../learning/app.md/#agents-and-services)<br/>
iModel agents and services are apps that have no interactive user interface.

[Desktop Application](../learning/app.md/#desktop-apps)<br/>
An interactive application obtains information from an iModel and presents that information in a user interface. The app runs in Electron on the user's desktop.

## 4. Create a Sample Project

Once you have a registered application, you will need an iModel. Our registration process makes it easy to create a new project in our “iModel Test Drive” organization, populate it with content, and give access to other developers.

The content can be either:

- **Bentley supplied example content** – Recommended if you are just starting out. Simply select an example from the Project Registration page.

OR

- **You can use your own** – Follow <a href="https://communities.bentley.com/products/microstation/b/microstation_blog/posts/publishing-an-imodel-in-bentley-view" target="_blank">these steps</a> to format your content into a ‘Snapshot iModel’ (.bim) before proceeding to the Project Registration page below.

**[Register Project Here](./registration-dashboard?tab=1)**

*Note: The “iModel Testdrive” organization is intended for developer testing only.  See <a href="https://learn.bentley.com/app/VideoPlayer/LinkToIndividualCourse?LearningPathID=109270&CourseId=114330&MediaID=5006537" target="_blank">this page</a> for information about administering a CONNECT project in your own organization.*

## 5. Get the Sample Code

The samples are included in [imodeljs-samples](https://github.com/imodeljs/imodeljs-samples).  For the complete list of samples see the readme.

Depending on your choice of application type from step 3, you should start out with one of the following:

[Basic Viewport App](https://github.com/imodeljs/imodeljs-samples/tree/master/interactive-app/basic-viewport-app)<br/>
An example of an *interactive application* which demonstrates how to:

- Embed an iModel.js viewport into your application to display graphical data.
- Include built-in tools for view navigation such as Pan, Rotate, Zoom.

[iModel Query Agent](https://github.com/imodeljs/imodeljs-samples/tree/master/agent-app/query-agent)<br/>
An example of an *agent application* which demonstrates how to:

- Listen to changes made to an iModel on the iModelHub.
- Construct a 'Change Summary' of useful information.

<br/>

---

### Recommended Reading

- [TypeScript](http://www.typescriptlang.org/)
  - iModel.js applications are written in TypeScript and then _compiled_ to plain JavaScript.
- [Node Package Manager (npm)](https://www.npmjs.com/)
  - `npm` is used to install and manage dependencies of an iModel.js application.
  - The `npm` [command line](https://docs.npmjs.com/cli/npm) and `npm` [scripts](https://docs.npmjs.com/misc/scripts) are used to build and test iModel.js applications.

### Support

Please see the [Community Resources](../learning/CommunityResources.md) page for the best places to get more help.
