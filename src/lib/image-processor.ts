import { encode } from '@jsquash/webp';

export interface ProcessOptions {
  convertToWebp?: boolean;
  quality?: number;
  maxWidth?: number;
}

export async function processImage(
  file: File,
  options: ProcessOptions = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const {
    convertToWebp = true,
    quality = 85,
    maxWidth = 1920
  } = options;

  // Load image
  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.width, img.height, maxWidth);

  // Create canvas and resize
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  if (convertToWebp) {
    // Convert to WebP using @jsquash/webp
    const imageData = ctx.getImageData(0, 0, width, height);
    const webpData = await encode(imageData, { quality });
    return {
      blob: new Blob([webpData], { type: 'image/webp' }),
      width,
      height
    };
  } else {
    // Return as original format or JPEG
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve({
            blob: blob!,
            width,
            height
          });
        },
        file.type.startsWith('image/') ? file.type : 'image/jpeg',
        quality / 100
      );
    });
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = maxWidth / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(originalHeight * ratio)
  };
}

export async function createPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
