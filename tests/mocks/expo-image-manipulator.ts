/** Doble para `expo-image-manipulator`. */
export type SaveFormatType = 'JPEG' | 'PNG' | 'WEBP';

export const SaveFormat = {
    JPEG: 'jpeg' as SaveFormatType,
    PNG: 'png' as SaveFormatType,
    WEBP: 'webp' as SaveFormatType,
};

export interface ImageResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
}

interface ActionResize {
    resize: { width?: number; height?: number };
}

type Action = ActionResize | Record<string, unknown>;

export async function manipulateAsync(
    uri: string,
    actions: Action[] = [],
    _options: { compress?: number; format?: SaveFormatType } = {},
): Promise<ImageResult> {
    let width = 1000;
    let height = 1000;

    for (const action of actions) {
        const resize = (action as ActionResize).resize;
        if (resize) {
            if (resize.width !== undefined) {
                const ratio = resize.width / width;
                width = resize.width;
                height = Math.round(height * ratio);
            }
            if (resize.height !== undefined) {
                const ratio = resize.height / height;
                height = resize.height;
                width = Math.round(width * ratio);
            }
        }
    }

    return { uri: `${uri}#processed`, width, height };
}

export const FlipType = { Horizontal: 'horizontal', Vertical: 'vertical' } as const;
export const ResizeType = { Cover: 'cover', Contain: 'contain' } as const;
