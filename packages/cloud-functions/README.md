# @imageproc/cloud-functions

Process images on Google Cloud Storage when images are created.

## How to use?

1. Prepare your Google Cloud Functions directory.

```
functions
  |- package.json
  |- index.js
  |- .gcloudignore
 ...
```

2. Install @imageproc/cloud-functions

```
npm install @imageproc/cloud-functions
```

3. Handle stroage trigger

You can use `handleStorageObjectCreated(params: InitParams)` to initialize trigger. The followings are the property of InitParams:

- sourceBucket?: string
  - Source bucket of images
  - This is optional property. If not set, use trigger bucket as the source bucket.
- destBucket?: string
  - Destination bucket of generated images
  - This is optional property. If not set, use trigger bucket as the source bucket.
- ignoreNamePattern?: RegExp
  - Pattern of object name to be ignored.
  - If sourceBucket and destBucket is same, this property is REQUIRED to avoid infinite loop processing.
- destNamePrefix?: string
  - Prefix of destination object name
- destNameTransform?: `(sourceName: string) => void`
  - Function to transfrom object name
  - If this property is set, destNamePrefix property will be ignored.
- operation: Operation
  - Type of image processing
  - name: `resizeAspectFit`
    - params: [ResizeAspectFitParams](../core/src/ImageProcessor.ts#L5-L9)
  - name: `resizeCrop`
    - params: [ResizeCropParams](../core/src/ImageProcessor.ts#L11-L17)
  - name: `convertFormat`
    - params: [ConvertFormatParams](../core/src/ImageProcessor.ts#L19-L21)

Examples:

- Using event target bucket for both source and destination.

```index.js
const imageproc = require("@imageproc/cloud-functions");
// foo.jpg => files/foo.jpg
exports.processImage = imageproc.handleStorageObjectCreated({
    ignorePattern: /^files\//,
    destNamePrefix: "files/",
    opration: {
        name: "resizeAspectFit",
        params: {
            maxWidth: 2000,
            maxHeight: 2000,
            noScaleUp: true
        }
    }
});
```

- Using other buckets for source and destination.

```index.js
const imageproc = require("@imageproc/cloud-functions");
exports.processImage = imageproc.handleStorageObjectCreated({
    sourceBucket: "source-image",
    destBucket: "dest-images",
    ...
});
```

4. Deploy

```
gcloud functions deploy processImage \
--runtime nodejs10 \
--trigger-resource YOUR_BUCKET \
--trigger-event google.storage.object.finalize \
--memory 2048MB \ # recommended
--project YOUR_PROJECT
```
