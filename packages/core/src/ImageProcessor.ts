export interface ResizeOperationParams {
    format?: string;
    noRotate?: boolean;
}
export interface ResizeAspectFitParams extends ResizeOperationParams {
    maxWidth: number;
    maxHeight: number;
    noScaleUp: boolean;
}

export interface ResizeCropParams extends ResizeOperationParams {
    width: number;
    height: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
}

export interface ConvertFormatParams {
    format: string;
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
    convertFormat(image: Buffer, format: ConvertFormatParams): Promise<Buffer>;
}
