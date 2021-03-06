import * as core from "@imageproc/core";
import * as gcs from "@google-cloud/storage";

export type Operation =
    | { name: "resizeAspectFit"; params: core.ResizeAspectFitParams }
    | { name: "resizeCrop"; params: core.ResizeCropParams }
    | { name: "convertFormat"; params: core.ConvertFormatParams };

export interface InitParams {
    sourceBucket?: string;
    ignoreNamePattern?: RegExp;
    copyOnlyNamePattern?: RegExp;
    destBucket?: string;
    destNamePrefix?: string;
    destNameTransform?: (sourceName: string) => string;
    opration: Operation;
}

async function assertBucket(bucket: gcs.Bucket): Promise<void> {
    const [exists] = await bucket.exists();
    if (!exists) {
        throw new Error("Bucket not exists");
    }
}

async function saveFile(bucket: gcs.Bucket, name: string, buf: Buffer, mimeType: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const stream = bucket.file(name).createWriteStream({
            metadata: {
                contentType: mimeType
            },
            resumable: false
        });
        stream.on("error", err => {
            reject(err);
        });
        stream.on("finish", () => {
            resolve();
        });
        stream.end(buf);
    });
}

// see: https://cloud.google.com/functions/docs/calling/storage
export function handleStorageObjectCreated(params: InitParams): Function {
    function isTargetSource(eventType: string, bucketName: string, file: string): boolean {
        if (eventType !== "google.storage.object.finalize") {
            return false;
        }
        if (params.sourceBucket && bucketName !== params.sourceBucket) {
            return false;
        }
        if (params.ignoreNamePattern && params.ignoreNamePattern.test(file)) {
            return false;
        }
        return true;
    }
    return async (data: any, context: any) => {
        const eventType = context.eventType;
        const bucket = data.bucket;
        const file = data.name;

        const storage = new gcs.Storage();
        const sourceBucket = storage.bucket(params.sourceBucket || bucket);
        const destBucket = storage.bucket(params.destBucket || bucket);
        if (sourceBucket === destBucket && !params.ignoreNamePattern) {
            console.error("params.ignoreNamePattern is not set even though source and destination bucket is same.");
            return;
        }
        await assertBucket(sourceBucket);
        await assertBucket(destBucket);

        if (!isTargetSource(eventType, bucket, file)) {
            console.log(`Event is not target, bucket: ${bucket}, eventType: ${eventType}, file: ${file}`);
            return;
        }
        const [sourceFile] = await sourceBucket.file(file).get();
        const [sourceBuf] = await sourceFile.download();
        if (!sourceBuf) {
            return;
        }
        const destKey = (() => {
            if (params.destNameTransform) {
                return params.destNameTransform(file);
            }
            if (params.destNamePrefix) {
                return params.destNamePrefix + file;
            }
            return file;
        })();
        if (params.copyOnlyNamePattern && params.copyOnlyNamePattern.test(file)) {
            await saveFile(destBucket, destKey, sourceBuf, sourceFile.metadata.contentType);
            return;
        }
        const proc = new core.ImageProcessorSharp();
        const destBuf = await (() => {
            switch (params.opration.name) {
                case "resizeAspectFit":
                    return proc.resizeAspectFit(sourceBuf, params.opration.params);
                case "resizeCrop":
                    return proc.resizeCrop(sourceBuf, params.opration.params);
                case "convertFormat":
                    return proc.convertFormat(sourceBuf, params.opration.params);
                default:
                    throw new Error("Unknown operation: " + params.opration);
            }
        })();
        const imageInfo = await proc.getImageInfo(destBuf);
        await saveFile(destBucket, destKey, destBuf, imageInfo.mimeType);
    };
}
