/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module iModelHub
 */

import { Logger } from "@bentley/bentleyjs-core";
import { ArgumentCheck, AuthorizedClientRequestContext, FileHandler, ProgressInfo, request, RequestOptions, ResponseError } from "@bentley/imodeljs-clients";
import { Transform, TransformCallback, PassThrough } from "stream";
import { ClientsBackendLoggerCategory } from "../ClientsBackendLoggerCategory";
import WriteStreamAtomic = require("fs-write-stream-atomic");
import { AzCopy, ProgressEventArgs, StringEventArgs, InitEventArgs } from "../util/AzCopy";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";
import * as path from "path";
import * as os from "os";
import * as urllib from "url";

const loggerCategory: string = ClientsBackendLoggerCategory.IModelHub;

/**
 * Stream that buffers writing to file.
 * @internal
 */
export class BufferedStream extends Transform {
  private _buffer?: Buffer;
  private _bufferPointer: number;
  private _bufferSize: number;
  public constructor(bufferSize: number) {
    super();
    this._bufferSize = bufferSize;
    if (!Number.isInteger(this._bufferSize))
      throw new TypeError(`BufferSize must be integer.`);
  }

  private allocNewBuffer(): void {
    this._buffer = Buffer.allocUnsafe(this._bufferSize);
    this._bufferPointer = 0;
  }

  /**
   * Transforms the data passing through the stream into buffers.
   * @param chunk The Buffer to be transformed.
   * @param encoding Encoding type of chunk if chunk is string.
   * @param callback A callback function (optionally with an error argument and data) to be called after the supplied chunk has been processed.
   */
  public _transform(chunk: any, encoding: string, callback: TransformCallback): void {   // tslint:disable-line
    if (encoding !== "buffer" && encoding !== "binary")
      throw new TypeError(`Encoding '${encoding}' is not supported.`);

    if (chunk.length >= this._bufferSize) {
      if (!this._buffer) {
        callback(undefined, chunk);
        return;
      }
      this._buffer = this._buffer.slice(0, this._bufferPointer);
      callback(undefined, Buffer.concat([this._buffer, chunk]));
      this._bufferPointer = 0;
      this._buffer = undefined;
      return;
    }

    if (!this._buffer) {
      this.allocNewBuffer();
    }

    if (this._bufferPointer + chunk.length <= this._bufferSize) {
      chunk.copy(this._buffer, this._bufferPointer, 0, chunk.length);
      this._bufferPointer += chunk.length;
      if (this._bufferPointer === this._bufferSize) {
        callback(undefined, this._buffer);
        this.allocNewBuffer();
      } else {
        callback();
      }
    } else {
      const chunkEndPosition = (this._bufferSize - this._bufferPointer);
      chunk.copy(this._buffer, this._bufferPointer, 0, chunkEndPosition);
      this._bufferPointer += chunkEndPosition;
      callback(undefined, this._buffer);

      this.allocNewBuffer();
      chunk.copy(this._buffer, this._bufferPointer, chunkEndPosition, chunk.length);
      this._bufferPointer += chunk.length - chunkEndPosition;
    }
  }

  /**
   * This will be called when there is no more written data to be consumed, but before the 'end' event is emitted signaling the end of the Readable stream.
   * @param callback A callback function (optionally with an error argument and data) to be called when remaining data has been flushed.
   */
  public _flush(callback: TransformCallback): void {   // tslint:disable-line
    if (!this._buffer) {
      callback();
      return;
    }
    callback(undefined, this._buffer.slice(0, this._bufferPointer));
    this._buffer = undefined;
    this._bufferPointer = 0;
  }
}

/**
 * Provides methods to work with the file system and azure storage. An instance of this class has to be provided to [[IModelClient]] for file upload/download methods to work.
 * @internal
 */
export class AzureFileHandler implements FileHandler {
  /** @internal */
  public agent: https.Agent;
  private _threshold: number;
  private _useDownloadBuffer: boolean | undefined;

  /**
   * Constructor for AzureFileHandler.
   * @param useDownloadBuffer Should Buffering be used when downloading files. If undefined, buffering is enabled only for Azure File Shares mounted with a UNC path.
   * @param threshold Minimum chunk size in bytes for a single file write.
   */
  constructor(useDownloadBuffer?: boolean, threshold = 1024 * 1024 * 20) {
    this._threshold = threshold;
    this._useDownloadBuffer = useDownloadBuffer;
  }

  /** Check if using Azure File Share with UNC path. This is a temporary optimization for Design Review, until they move to using SSD disks. */
  private useBufferedDownload(downloadPath: string): boolean {
    if (this._useDownloadBuffer === undefined) {
      return downloadPath.includes("file.core.windows.net");
    } else {
      return this._useDownloadBuffer;
    }
  }

  /** Create a directory, recursively setting up the path as necessary. */
  private static makeDirectoryRecursive(dirPath: string) {
    if (fs.existsSync(dirPath))
      return;

    AzureFileHandler.makeDirectoryRecursive(path.dirname(dirPath));

    fs.mkdirSync(dirPath);
  }

  private async downloadFileUsingAzCopy(requestContext: AuthorizedClientRequestContext, downloadUrl: string, downloadToPathname: string, _fileSize?: number,
    progressCallback?: (progress: ProgressInfo) => void): Promise<void> {
    requestContext.enter();
    Logger.logTrace(loggerCategory, `Using AzCopy with verison ${AzCopy.getVersion()} located at ${AzCopy.execPath}`);

    // setup log dir so we can delete it. It seem there is no way of disable it.
    const azLogDir = path.join(os.tmpdir(), "bentley", "log", "azcopy");
    if (!fs.existsSync(azLogDir)) {
      AzureFileHandler.makeDirectoryRecursive(azLogDir);
    }
    const azcopy = new AzCopy({ logLocation: azLogDir });
    if (progressCallback) {
      const cb = (args: ProgressEventArgs) => {
        progressCallback({ total: args.TotalBytesEnumerated, loaded: args.BytesOverWire, percent: args.BytesOverWire ? (args.BytesOverWire / args.TotalBytesEnumerated) : 0 });
      };

      azcopy.on("azprogress", cb);
      azcopy.on("azexit", cb);
    }

    azcopy.on("azerror", (args: StringEventArgs) => {
      requestContext.enter();
      Logger.logError(loggerCategory, `AzCopy reported error: '${args.MessageContent}'`);
    });

    azcopy.on("azinit", (args: InitEventArgs) => {
      requestContext.enter();
      Logger.logInfo(loggerCategory, `AzCopy started JobId: ${args.JobID} and log file located at ${args.LogFileLocation}`);
    });

    azcopy.on("azruntimeerror", (args: string) => {
      requestContext.enter();
      Logger.logInfo(loggerCategory, `AzCopy runtime error: ${args}`);
    });
    // start download by spawning in a azcopy process
    const rc = await azcopy.copy(downloadUrl, downloadToPathname);
    if (rc !== 0) {
      return Promise.reject(`AzCopy failed with return code: ${rc}`);
    }
  }

  private async downloadFileUsingHttps(_requestContext: AuthorizedClientRequestContext, downloadUrl: string, downloadToPathname: string, fileSize?: number,
    progressCallback?: (progress: ProgressInfo) => void): Promise<void> {

    let bufferedStream: Transform;
    if (this.useBufferedDownload(downloadToPathname)) {
      bufferedStream = new BufferedStream(this._threshold);
    } else {
      bufferedStream = new PassThrough();
    }

    const fileStream = new WriteStreamAtomic(downloadToPathname, { encoding: "binary" });
    let bytesWritten: number = 0;

    if (progressCallback) {
      fileStream.on("drain", () => {
        progressCallback({ loaded: bytesWritten, total: fileSize, percent: fileSize ? bytesWritten / fileSize : 0 });
      });
      fileStream.on("finish", () => {
        progressCallback({ loaded: bytesWritten, total: fileSize, percent: fileSize ? bytesWritten / fileSize : 0 });
      });
    }

    return new Promise((resolve, reject) => {
      const downloadCallback = ((res: http.IncomingMessage) => {
        res.pipe(bufferedStream)
          .on("data", (chunk: any) => {
            bytesWritten += chunk.length;
          })
          .pipe(fileStream)
          .on("error", (error: any) => {
            const parsedError = ResponseError.parse(error);
            reject(parsedError);
          })
          .on("finish", () => {
            resolve();
          });
      });

      const clientRequest = downloadUrl.startsWith("https:") ?
        https.get(downloadUrl, downloadCallback) : http.get(downloadUrl, downloadCallback);

      clientRequest.on("error", (error: any) => {
        const parsedError = ResponseError.parse(error);
        reject(parsedError);
      });
    });
  }
  /**
   * Make url safe for logging by removing sensitive information
   * @param url input url that will be strip of search and query parameters and replace them by ... for security reason
   */
  private static getSafeUrlForLogging(url: string): string {
    const safeToLogDownloadUrl = urllib.parse(url);
    if (safeToLogDownloadUrl.search && safeToLogDownloadUrl.search.length > 0)
      safeToLogDownloadUrl.search = "...";
    if (safeToLogDownloadUrl.hash && safeToLogDownloadUrl.hash.length > 0)
      safeToLogDownloadUrl.hash = "...";
    return safeToLogDownloadUrl.toString();
  }
  /**
   * Download a file from AzureBlobStorage for the iModelHub. Creates the directory containing the file if necessary. If there is an error in the operation, incomplete file is deleted from disk.
   * @param requestContext The client request context
   * @param downloadUrl URL to download file from.
   * @param downloadToPathname Pathname to download the file to.
   * @param fileSize Size of the file that's being downloaded.
   * @param progressCallback Callback for tracking progress.
   * @throws [[IModelHubClientError]] with [IModelHubStatus.UndefinedArgumentError]($bentley) if one of the arguments is undefined or empty.
   * @throws [[ResponseError]] if the file cannot be downloaded.
   */
  public async downloadFile(requestContext: AuthorizedClientRequestContext, downloadUrl: string, downloadToPathname: string, fileSize?: number,
    progressCallback?: (progress: ProgressInfo) => void): Promise<void> {
    // strip search and hash parameters from download Url for logging purpose
    requestContext.enter();
    const safeToLogUrl = AzureFileHandler.getSafeUrlForLogging(downloadUrl);
    Logger.logInfo(loggerCategory, `Downloading file from ${safeToLogUrl}`);
    ArgumentCheck.defined("downloadUrl", downloadUrl);
    ArgumentCheck.defined("downloadToPathname", downloadToPathname);

    if (fs.existsSync(downloadToPathname))
      fs.unlinkSync(downloadToPathname);

    AzureFileHandler.makeDirectoryRecursive(path.dirname(downloadToPathname));
    try {
      if (AzCopy.isAvaliable) {
        await this.downloadFileUsingAzCopy(requestContext, downloadUrl, downloadToPathname, fileSize, progressCallback);
      } else {
        await this.downloadFileUsingHttps(requestContext, downloadUrl, downloadToPathname, fileSize, progressCallback);
      }
    } catch (err) {
      requestContext.enter();
      if (fs.existsSync(downloadToPathname))
        fs.unlinkSync(downloadToPathname); // Just in case there was a partial download, delete the file
      Logger.logError(loggerCategory, `Error downloading file`);
      return Promise.reject(err);
    }
    requestContext.enter();
    Logger.logTrace(loggerCategory, `Downloaded file from ${safeToLogUrl}`);
  }
  /** Get encoded block id from its number. */
  private getBlockId(blockId: number) {
    return Base64.encode(blockId.toString(16).padStart(5, "0"));
  }

  private async uploadChunk(requestContext: AuthorizedClientRequestContext, uploadUrlString: string, fileDescriptor: number, blockId: number, callback?: (progress: ProgressInfo) => void) {
    requestContext.enter();
    const chunkSize = 4 * 1024 * 1024;
    let buffer = Buffer.alloc(chunkSize);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, chunkSize, chunkSize * blockId);
    buffer = buffer.slice(0, bytesRead);

    const options: RequestOptions = {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.length,
      },
      body: buffer,
      progressCallback: callback,
      agent: this.agent,
      timeout: {
        deadline: 60000,
        response: 60000,
      },
    };

    const uploadUrl = `${uploadUrlString}&comp=block&blockid=${this.getBlockId(blockId)}`;
    await request(requestContext, uploadUrl, options);
  }

  /**
   * Upload a file to AzureBlobStorage for the iModelHub.
   * @param requestContext The client request context
   * @param uploadUrl URL to upload the file to.
   * @param uploadFromPathname Pathname to upload the file from.
   * @param progressCallback Callback for tracking progress.
   * @throws [[IModelHubClientError]] with [IModelHubStatus.UndefinedArgumentError]($bentley) if one of the arguments is undefined or empty.
   * @throws [[ResponseError]] if the file cannot be uploaded.
   */
  public async uploadFile(requestContext: AuthorizedClientRequestContext, uploadUrlString: string, uploadFromPathname: string, progressCallback?: (progress: ProgressInfo) => void): Promise<void> {
    const safeToLogUrl = AzureFileHandler.getSafeUrlForLogging(uploadUrlString);
    requestContext.enter();
    Logger.logTrace(loggerCategory, `Uploading file to ${safeToLogUrl}`);
    ArgumentCheck.defined("uploadUrlString", uploadUrlString);
    ArgumentCheck.defined("uploadFromPathname", uploadFromPathname);

    const fileSize = this.getFileSize(uploadFromPathname);
    const file = fs.openSync(uploadFromPathname, "r");
    const chunkSize = 4 * 1024 * 1024;

    try {
      let blockList = '<?xml version=\"1.0\" encoding=\"utf-8\"?><BlockList>';
      let i = 0;
      const callback = (progress: ProgressInfo) => {
        const uploaded = i * chunkSize + progress.loaded;
        progressCallback!({ loaded: uploaded, percent: uploaded / fileSize, total: fileSize });
      };
      for (; i * chunkSize < fileSize; ++i) {
        await this.uploadChunk(requestContext, uploadUrlString, file, i, progressCallback ? callback : undefined);
        blockList += `<Latest>${this.getBlockId(i)}</Latest>`;
      }
      blockList += "</BlockList>";

      const options: RequestOptions = {
        method: "PUT",
        headers: {
          "Content-Type": "application/xml",
          "Content-Length": blockList.length,
        },
        body: blockList,
        agent: this.agent,
        timeout: {
          response: 5000,
          deadline: 60000,
        },
      };

      const uploadUrl = `${uploadUrlString}&comp=blocklist`;
      await request(requestContext, uploadUrl, options);
    } finally {
      fs.closeSync(file);
    }
  }

  /**
   * Get size of a file.
   * @param filePath Path of the file.
   * @returns Size of the file.
   */
  public getFileSize(filePath: string): number {
    return fs.statSync(filePath).size;
  }

  /**
   * Check if path is a directory.
   * @param filePath Path of the file.
   * @returns True if path is directory.
   */
  public isDirectory(filePath: string): boolean {
    return fs.statSync(filePath).isDirectory();
  }

  /**
   * Check if path exists.
   * @param filePath Path of the file.
   * @returns True if path exists.
   */
  public exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get file name from the path.
   * @param filePath Path of the file.
   * @returns File name.
   */
  public basename(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * Join multiple strings into a single path.
   * @param paths Strings to join.
   * @returns Joined path.
   */
  public join(...paths: string[]): string {
    return path.join(...paths);
  }
}
