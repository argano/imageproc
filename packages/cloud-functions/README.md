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

```index.js
const imageproc = require("@imageproc/cloud-functions");
exports.processImage = imageproc.handleStorageObjectCreated({
    sourceBucket: "source-image",
    destBucket: "dest-images",
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
