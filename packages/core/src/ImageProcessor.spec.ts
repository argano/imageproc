import * as path from "path";
import * as fs from "fs-extra";
import test from "ava";
import * as execa from "execa";
import { ImageProcessorSharp } from "./ImageProcessorSharp";

const sourceImagesDir = path.resolve(__dirname, "..", "testImages", "source");
const sharpImagesDir = path.resolve(__dirname, "..", "tmp", "sharp");

const imageProcessorSharp = new ImageProcessorSharp();

type ImageProcessorImplementation = ImageProcessorSharp;

const compareErrorStore: { source: string; dest: string; result: number }[] = [];

async function compare(source: string, dest: string, threshold: string): Promise<number> {
    try {
        const result = await execa("compare", ["-metric", "ae", "-fuzz", threshold, source, dest, "null:"]);
        return Number(result.stdout);
    } catch (e) {
        const res = Number(e.stderr);
        compareErrorStore.push({ source, dest, result: res });
        return res;
    }
}

interface TestTarget {
    instance: ImageProcessorImplementation;
    generatedImagesDir: string;
    label: string;
    errors: {
        unsupportedFormat: string;
        getImageInfoInvalidImage: string;
        resizeAspectFitInvalidImage: string;
        resizeCropInvalidImage: string;
        convertFormatInvalidImage: string;
    };
    compareThreshold: string;
}

[
    {
        instance: imageProcessorSharp,
        generatedImagesDir: sharpImagesDir,
        label: "ImageProcessorSharp",
        errors: {
            unsupportedFormat: "Unsupported image file type",
            getImageInfoInvalidImage: "Input buffer contains unsupported image format",
            resizeAspectFitInvalidImage: "Input buffer contains unsupported image format",
            resizeCropInvalidImage: "Input buffer contains unsupported image format",
            convertFormatInvalidImage: "Input buffer contains unsupported image format"
        },
        compareThreshold: "30%"
    }
].forEach((testTarget: TestTarget) => {
    let generatedPrefix = 0;
    function generatedFilePath(filename: string, noPrefix = false) {
        if (noPrefix) {
            return path.resolve(testTarget.generatedImagesDir, filename);
        } else {
            generatedPrefix = generatedPrefix + 1;
            return path.resolve(testTarget.generatedImagesDir, generatedPrefix + "_" + filename);
        }
    }
    test.before(async () => {
        try {
            await fs.mkdirp(testTarget.generatedImagesDir);
        } catch (e) {
            // nop
        }
        await fs.remove(testTarget.generatedImagesDir + "/*");
    });
    test.after(async () => {
        let html = "<html><head><style>img { max-width: 300px }</style></head><body><table><tr><td>source</td><td>dest</td><td>result</td></tr>";
        compareErrorStore.forEach(row => {
            html += `<tr><td><img src="${row.source}"></td><td><img src="${row.dest}"></td><td>${row.result}</td></td>\n`;
        });
        html += "</body></html>";
        await fs.writeFile(generatedFilePath("result.html", true), html);
    });
    test.serial(`${testTarget.label}#getImageInfo should get the correct images info`, async t => {
        const imagePath = path.resolve(sourceImagesDir, "penguin1250x1250.png");
        const imageBuffer = await fs.readFile(imagePath);
        const result = await testTarget.instance.getImageInfo(imageBuffer);
        const { width, height, mimeType } = result;
        t.is(width, 1250);
        t.is(height, 1250);
        t.is(mimeType, "image/png");
    });
    test.serial(`${testTarget.label}#resizeAspectFit should scale up jpg image when aspect ratio is maintained in arguments and noScaleUp is false`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat400x600.jpg");
        const generatedImagePath = generatedFilePath("cat400x600.jpg");
        const testAspectFitParams = { maxWidth: 400, maxHeight: 600, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale up jpg image based on given width when noScaleUp is false`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat400x600.jpg");
        const generatedImagePath = generatedFilePath("cat400x600-width.jpg");
        const testAspectFitParams = { maxWidth: 400, maxHeight: 1000, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale up jpg image based on given height when noScaleUp is false`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat400x600.jpg");
        const generatedImagePath = generatedFilePath("cat400x600-height.jpg");
        const testAspectFitParams = { maxWidth: 1000, maxHeight: 600, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale down jpg image when aspect ratio is maintained in arguments and noScaleUp is false`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const generatedImagePath = generatedFilePath("cat100x150.jpg");
        const testAspectFitParams = { maxWidth: 100, maxHeight: 150, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale down jpg image when aspect ratio is maintained in arguments and noScaleUp is true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const generatedImagePath = generatedFilePath("cat100x150.jpg");
        const testAspectFitParams = { maxWidth: 100, maxHeight: 150, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should return original jpg image when resize dimensions equal image dimensions & noScaleUp=true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const generatedImagePath = generatedFilePath("cat200x300.jpg");
        const testAspectFitParams = { maxWidth: 200, maxHeight: 300, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(originalImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should return original jpg image when width < maxWidth && height = maxHeight and noScaleUp is true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const generatedImagePath = generatedFilePath("cat200x300-no-scale-up-1.jpg");
        const testAspectFitParams = { maxWidth: 400, maxHeight: 300, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(originalImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should return original jpg image when width = maxWidth && height < maxHeight and noScaleUp is true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const generatedImagePath = generatedFilePath("cat200x300-no-scale-up-2.jpg");
        const testAspectFitParams = { maxWidth: 200, maxHeight: 500, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(originalImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should return original jpg image when width < maxWidth && height < maxHeight and noScaleUp is true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const generatedImagePath = generatedFilePath("cat200x300-no-scale-up-2.jpg");
        const testAspectFitParams = { maxWidth: 400, maxHeight: 500, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(originalImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale down jpg image based on given width when noScaleUp is false`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const generatedImagePath = generatedFilePath("cat100x150-width.jpg");
        const testAspectFitParams = { maxWidth: 100, maxHeight: 1000, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale down jpg image based on given width when noScaleUp is true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const generatedImagePath = generatedFilePath("cat100x150-width.jpg");
        const testAspectFitParams = { maxWidth: 100, maxHeight: 1000, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale down jpg image based on given height when noScaleUp is false`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const generatedImagePath = generatedFilePath("cat100x150-height.jpg");
        const testAspectFitParams = { maxWidth: 1000, maxHeight: 150, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should scale down jpg image based on given height when noScaleUp is true`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat200x300.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const generatedImagePath = generatedFilePath("cat100x150-height.jpg");
        const testAspectFitParams = { maxWidth: 1000, maxHeight: 150, noScaleUp: true };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should rotated image`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "exif-orientation-right-top.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "exif-orientation-right-top-rotated-maxwidth-1000.jpg");
        const generatedImagePath = generatedFilePath("exif-orientation-right-top.jpg");
        const testAspectFitParams = { maxWidth: 1000, maxHeight: 150, noScaleUp: false };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeAspectFit(originalImageBuffer, testAspectFitParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should throw error when encountering unsupported file format and noScaleUp is true`, async t => {
        const unsupportedImagePath = path.resolve(sourceImagesDir, "unsupported.svg");
        const unsupportedImageBuffer = await fs.readFile(unsupportedImagePath);
        const testAspectFitParams = { maxWidth: 100, maxHeight: 150, noScaleUp: true };
        const err = await t.throwsAsync(testTarget.instance.resizeAspectFit(unsupportedImageBuffer, testAspectFitParams));
        t.not(err.message.indexOf(testTarget.errors.unsupportedFormat), -1);
    });

    test.serial(`${testTarget.label}#resizeAspectFit should throw error when encountering invalid image data and noScaleUp is true`, async t => {
        const testAspectFitParams = { maxWidth: 100, maxHeight: 150, noScaleUp: true };
        const err = await t.throwsAsync(testTarget.instance.resizeAspectFit(Buffer.alloc(10), testAspectFitParams));
        t.not(err.message.indexOf(testTarget.errors.resizeAspectFitInvalidImage), -1);
    });

    test.serial(`${testTarget.label}#resizeCrop should crop png image`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "penguin1250x1250.png");
        const expectedImagePath = path.resolve(sourceImagesDir, "penguin600x500+400+300.png");
        const generatedImagePath = generatedFilePath("penguin600x500+400+300.png");
        const testCropParams = { width: 600, height: 500, offsetX: 400, offsetY: 300 };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeCrop(originalImageBuffer, testCropParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeCrop should crop png image when offsets are not given`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "penguin1250x1250.png");
        const expectedImagePath = path.resolve(sourceImagesDir, "penguin600x500+0+0.png");
        const generatedImagePath = generatedFilePath("penguin600x500+0+0.png");
        const testCropParams = { width: 600, height: 500 };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeCrop(originalImageBuffer, testCropParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeCrop should crop png image when scale < 1`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "penguin1250x1250.png");
        const expectedImagePath = path.resolve(sourceImagesDir, "penguin325x325+300+300-0.5.png");
        const generatedImagePath = generatedFilePath("penguin325x325+300+300-0.5.png");
        const testCropParams = { width: 325, height: 325, offsetX: 300, offsetY: 300, scale: 0.5 };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeCrop(originalImageBuffer, testCropParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeCrop should crop png image when scale > 1`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "cat100x150.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "cat50x50+60+80-2.jpg");
        const generatedImagePath = generatedFilePath("cat50x50+60+80-2.jpg");
        const testCropParams = { width: 50, height: 50, offsetX: 60, offsetY: 80, scale: 2 };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeCrop(originalImageBuffer, testCropParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeCrop should produce same png image`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "penguin1250x1250.png");
        const generatedImagePath = generatedFilePath("penguin1250x1250+0+0.png");
        const testCropParams = { width: 1250, height: 1250, offsetX: 0, offsetY: 0 };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeCrop(originalImageBuffer, testCropParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(originalImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeCrop should return rotated image`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "exif-orientation-right-top.jpg");
        const expectedImagePath = path.resolve(sourceImagesDir, "exif-orientation-right-top-cropped-rotated.jpg");
        const generatedImagePath = generatedFilePath("exif-orientation-right-top.jpg");
        const testCropParams = { width: 300, height: 300, offsetX: 200, offsetY: 200, scale: 1.5 };
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.resizeCrop(originalImageBuffer, testCropParams);
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#resizeCrop should throw error when encountering unsupported file format`, async t => {
        const testCropParams = { width: 600, height: 500, offsetX: 400, offsetY: 300 };
        const err = await t.throwsAsync(testTarget.instance.resizeCrop(Buffer.alloc(10), testCropParams));
        t.not(err.message.indexOf(testTarget.errors.resizeCropInvalidImage), -1);
    });

    test.serial(`${testTarget.label}#convertFormat should convert png to jpg`, async t => {
        const originalImagePath = path.resolve(sourceImagesDir, "penguin1250x1250.png");
        const expectedImagePath = path.resolve(sourceImagesDir, "penguin1250x1250.jpg");
        const generatedImagePath = generatedFilePath("penguin1250x1250.jpg");
        const originalImageBuffer = await fs.readFile(originalImagePath);
        const generatedImageBuffer = await testTarget.instance.convertFormat(originalImageBuffer, "jpg");
        await fs.writeFile(generatedImagePath, generatedImageBuffer);
        const result = await compare(expectedImagePath, generatedImagePath, testTarget.compareThreshold);
        t.is(result, 0);
    });

    test.serial(`${testTarget.label}#convertFormat should throw error when encountering unsupported file format`, async t => {
        const err = await t.throwsAsync(testTarget.instance.convertFormat(Buffer.alloc(10), "jpg"));
        t.not(err.message.indexOf(testTarget.errors.convertFormatInvalidImage), -1);
    });
});
