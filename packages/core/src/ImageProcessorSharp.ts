import * as sharp from "sharp";
import { extensionMimeTypeMap } from "./imageTypes";
import { ImageProcessor, ResizeAspectFitParams, ResizeCropParams, ImageInfo } from "./ImageProcessor";

const supportedExtensions = ["jpeg", "png"];

export class ImageProcessorSharp implements ImageProcessor {
    static assertSupportedExtension(type: string): string {
        if (!supportedExtensions.includes(type)) {
            throw new Error(`Unsupported image file type: ${type}`);
        }
        return type;
    }

    static async validateImageAndGetInfo(image: Buffer): Promise<ImageInfo> {
        const metadata = await sharp(image).metadata();
        if (metadata.width == null || metadata.height == null || !metadata.format) {
            throw new Error("Can't read required info form metadata");
        }
        return {
            width: metadata.width,
            height: metadata.height,
            mimeType: extensionMimeTypeMap[ImageProcessorSharp.assertSupportedExtension(metadata.format)]
        };
    }

    async getImageInfo(image: Buffer): Promise<ImageInfo> {
        return await ImageProcessorSharp.validateImageAndGetInfo(image);
    }

    async resizeAspectFit(image: Buffer, params: ResizeAspectFitParams): Promise<Buffer> {
        let sharpImage = sharp(image);
        if (!params.noRotate) {
            sharpImage = sharpImage.rotate();
        }
        if (params.noScaleUp) {
            const { width, height } = await ImageProcessorSharp.validateImageAndGetInfo(image);
            if (width <= params.maxWidth && height <= params.maxHeight) {
                return await sharpImage.toBuffer();
            }
        }
        sharpImage = sharpImage.resize(params.maxWidth, params.maxHeight, { fit: "inside" });

        if (params.format) {
            sharpImage = sharpImage.toFormat(params.format);
        }
        return await sharpImage.toBuffer();
    }

    async resizeCrop(image: Buffer, params: ResizeCropParams): Promise<Buffer> {
        let sharpImage = sharp(image);
        if (!params.noRotate) {
            sharpImage = sharpImage.rotate();
        }
        const offsetX = params.offsetX || 0;
        const offsetY = params.offsetY || 0;
        const scale = params.scale || 1;
        const imageInfo = await ImageProcessorSharp.validateImageAndGetInfo(image);
        const resizeScale = Math.floor(scale * imageInfo.width);
        if (resizeScale <= 0) {
            throw new Error(`Can't scale ${imageInfo.width}x${imageInfo.height} by ${scale}`);
        }

        const extractWidth = Math.min(params.width, Math.floor(scale * imageInfo.width - offsetX));
        const extractHeight = Math.min(params.height, Math.floor(scale * imageInfo.height - offsetY));
        if (!(extractWidth > 0 && extractHeight > 0)) {
            throw new Error(`Invalid resize params`);
        }
        sharpImage = sharpImage.resize(resizeScale, null).extract({ width: extractWidth, height: extractHeight, left: offsetX, top: offsetY });
        if (params.format) {
            sharpImage = sharpImage.toFormat(params.format);
        }
        return await sharpImage.toBuffer();
    }

    async convertFormat(image: Buffer, format: string): Promise<Buffer> {
        return await sharp(image)
            .toFormat(format)
            .toBuffer();
    }
}
