/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as path from "path";
import * as puppeteer from "puppeteer";
import * as detect from "detect-port";
import { spawnChildProcess } from "../../utils/SpawnUtils";
import { executeRegisteredCallback } from "../../utils/CallbackUtils";
import { CertaConfig } from "../../CertaConfig";
import { writeCoverageData } from "../../utils/CoverageUtils";
import { configureRemoteReporter } from "./MochaRemoteReporter";

interface ChromeTestResults {
  failures: number;
  coverage: any;
}

type ConsoleMethodName = keyof typeof console;

export class ChromeTestRunner {
  public static readonly supportsCoverage = true;
  public static async initialize(config: CertaConfig): Promise<void> {
    const openPort = await detect(config.ports.frontend);
    if (openPort !== config.ports.frontend)
      console.warn(`CERTA: Port ${config.ports.frontend} is already in use, so serving test resources on port ${openPort}`);

    process.env.CERTA_PORT = String(openPort);
  }

  public static async runTests(config: CertaConfig): Promise<void> {
    const webserverEnv = {
      CERTA_PORT: process.env.CERTA_PORT,
      CERTA_PATH: path.join(__dirname, "../../../public/index.html"),
      CERTA_PUBLIC_DIRS: JSON.stringify(config.chromeOptions.publicDirs),
    };
    const webserverProcess = spawnChildProcess("node", [require.resolve("./webserver")], webserverEnv, true);

    // Don't start puppeteer until the webserver is started and listening.
    await new Promise((resolve) => webserverProcess.once("message", resolve));

    // FIXME: Do we really want to always enforce this behavior?
    if (process.env.CI || process.env.TF_BUILD)
      (config.mochaOptions as any).forbidOnly = true;

    const { failures, coverage } = await runTestsInPuppeteer(config, process.env.CERTA_PORT!);
    webserverProcess.kill();

    // Save nyc/istanbul coverage file.
    if (config.cover)
      writeCoverageData(coverage);

    process.exit(failures);
  }
}

async function loadScript(page: puppeteer.Page, scriptPath: string) {
  return page.addScriptTag({ url: "/@/" + scriptPath });
}

async function loadScriptAndTemporarilyBreak(page: puppeteer.Page, scriptPath: string) {
  // Give VSCode a second to attach before setting an instrumentation breakpoint.
  // This way it can detect the instrumentationBreakpoint and auto-resume once breakpoints are loaded.
  // Otherwise, VSCode will only be able to see that the page is paused, not _why_ it was paused.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Connect to debugger over chrome devtools protocol, and have it stop on the first statement of next script loaded
  const session = await page.target().createCDPSession();
  await session.send("Debugger.enable");
  await session.send("DOMDebugger.setInstrumentationBreakpoint", { eventName: "scriptFirstStatement" });

  // _Start_ loading the script, but don't wait for it to finish - it can't finish with that breakpoint set!
  const loadedPromise = loadScript(page, scriptPath);

  // Resume execution once breakpoints have had a chance to be resolved (unless user/vscode already resumed)
  const resumed = new Promise((resolve) => session.once("Debugger.resumed", resolve)).then(() => false);
  const timeout = new Promise((resolve) => setTimeout(resolve, 30000)).then(() => true);
  if (await Promise.race([resumed, timeout]))
    await session.send("Debugger.resume");
  await session.detach();

  // **Now** it's safe to wait for script to load
  return loadedPromise;
}

async function runTestsInPuppeteer(config: CertaConfig, port: string) {
  return new Promise<ChromeTestResults>(async (resolve, reject) => {
    try {
      const options = {
        ignoreHTTPSErrors: true,
        args: config.chromeOptions.args,
        headless: !config.debug,
      };

      if (config.debug)
        options.args.push(`--disable-gpu`, `--remote-debugging-port=${config.ports.frontendDebugging}`);

      const browser = await puppeteer.launch(options);
      const page = (await browser.pages()).pop() || await browser.newPage();

      // Don't let dialogs block tests
      page.on("dialog", async (dialog) => dialog.dismiss());

      // Re-throw any uncaught exceptions from the frontend in the backend
      page.on("pageerror", reject);

      // Expose some functions to the frontend that will execute _in the backend context_
      await page.exposeFunction("_CertaConsole", (type: ConsoleMethodName, args: any[]) => console[type](...args));
      await page.exposeFunction("_CertaSendToBackend", executeRegisteredCallback);
      await page.exposeFunction("_CertaReportResults", (results) => {
        setTimeout(async () => {
          await browser.close();
          resolve(results);
        });
      });

      // Now load the page (and requisite scripts)...
      const testBundle = (config.cover && config.instrumentedTestBundle) || config.testBundle;
      await page.goto(`http://localhost:${port}`);
      await page.addScriptTag({ content: `var _CERTA_CONFIG = ${JSON.stringify(config)};` });
      await loadScript(page, require.resolve("mocha/mocha.js"));
      await loadScript(page, require.resolve("source-map-support/browser-source-map-support.js"));
      await loadScript(page, require.resolve("../../utils/initSourceMaps.js"));
      await loadScript(page, require.resolve("./MochaSerializer.js"));
      await configureRemoteReporter(page);
      await loadScript(page, require.resolve("../../utils/initMocha.js"));
      if (config.debug)
        await loadScriptAndTemporarilyBreak(page, testBundle);
      else
        await loadScript(page, testBundle);

      // ...and start the tests
      await page.evaluate(async () => {
        // NB: This is being evaluated in the frontend context!
        Mocha.reporters.Base.useColors = true;
        const globals = window as any;
        mocha.run((failures) => {
          const coverage = globals.__coverage__;
          globals._CertaReportResults({ failures, coverage }); // This will close the browser
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}
