import * as core from "@imageproc/core";
import * as gcs from "@google-cloud/storage";

export type Operation = { name: "resizeAspectFit"; params: core.ResizeAspectFitParams } | { name: "resizeCrop"; params: core.ResizeCropParams };

export interface InitParams {
    sourceBucket: string;
    sourceKeyPrefix?: string;
    destBucket: string;
    destKeyPrefix?: string;
    opration: Operation;
}

async function assertBucket(bucket: gcs.Bucket): Promise<void> {
    const [exists] = await bucket.exists();
    if (!exists) {
        throw new Error("Bucket not exists");
    }
}

// see: https://cloud.google.com/functions/docs/calling/storage
export function handleStorageObjectCreated(params: InitParams): Function {
    function isTargetSource(eventType: string, bucketName: string, file: string): boolean {
        if (eventType !== "google.storage.object.finalize") {
            return false;
        }
        if (bucketName !== params.sourceBucket) {
            return false;
        }
        if (params.sourceKeyPrefix && file.indexOf(params.sourceKeyPrefix) !== 0) {
            return false;
        }
        return true;
    }
    return async (data: any, context: any) => {
        const storage = new gcs.Storage();
        const sourceBucket = storage.bucket(params.sourceBucket);
        const destBucket = storage.bucket(params.destBucket);
        await assertBucket(sourceBucket);
        await assertBucket(destBucket);

        const eventType = context.eventType;
        const bucket = data.bucket;
        const file = data.name;
        console.log({ eventType, bucket, file, isTarget: isTargetSource(eventType, bucket, file) });
    };
}
