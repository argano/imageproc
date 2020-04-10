# @imageproc/cloud-functions

Trigger image processing when images are created on Google Cloud Storage.

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
npm install --save @imageproc/cloud-functions
```

3. Handle stroage trigger


Using event target bucket for both source and destination.

```index.js
const imageproc = require("@imageproc/cloud-functions");
exports.processImage = imageproc.handleStorageObjectCreated({
    ignorePattern: /^files\//,
    destKeyPrefix: "files/",
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

Using other buckets for source and destination.

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
gcloud functions deploy processImage --runtime nodejs10 --trigger-resource YOUR_BUCKET --trigger-event google.storage.object.finalize --project YOUR_PROJECT
```
