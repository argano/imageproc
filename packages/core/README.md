# @imageproc/core

Image processing core module

## Usage

```shell
npm install @imageproc/core
```

```ts
import * as imageproc from "@imageproc/core";

(async () => {
    const proc = new imageproc.ImageProcessorSharp();
    const sourceBuf = fs.readFileSync("image.png");
    const buf = await proc.resizeAspectFit(sourceBuf, {
        ...
    });
    fs.writeFileSync("generated.png", buf);
})();
```

## ImageProcessor usage

see: [ImageProcessor.ts](./src/ImageProcessor.ts)

## ImageProcessor implementation

- ImageProcessorSharp
  - [sharp](https://github.com/lovell/sharp)
- (Feature Support) ImageProcessorMagick
  - [gm (ImageMagick/GraphicsMagick)](https://github.com/aheckmann/gm)
