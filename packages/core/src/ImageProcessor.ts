export interface OperationParams {
    format?: string;
    noRotate?: boolean;
}
export interface ResizeAspectFitParams extends OperationParams {
    maxWidth: number;
    maxHeight: number;
    noScaleUp: boolean;
}

export interface ResizeCropParams extends OperationParams {
    width: number;
    height: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
}

export interface ImageInfo {
    width: number;
    height: number;
    mimeType: string;
}

export interface ImageProcessor {
    getImageInfo(image: Buffer): Promise<ImageInfo>;
    resizeAspectFit(image: Buffer, params: ResizeAspectFitParams): Promise<Buffer>;
    resizeCrop(image: Buffer, params: ResizeCropParams): Promise<Buffer>;
    convertFormat(image: Buffer, format: string): Promise<Buffer>;
}
