// Client-side image compressor using Canvas API.
// Resizes to max 1200x1200px and compresses to WebP/JPEG quality 0.85.

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg";
  targetMaxKB?: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<{ dataUrl: string; blob: Blob; sizeKB: number; width: number; height: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = "image/webp",
    targetMaxKB = 250,
  } = options;

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: format, quality });
  let finalBlob = blob;
  let finalQuality = quality;

  // If still too large, progressively reduce quality
  while (finalBlob.size > targetMaxKB * 1024 && finalQuality > 0.3) {
    finalQuality -= 0.1;
    finalBlob = await canvas.convertToBlob({ type: format, quality: finalQuality });
  }

  // Fallback to JPEG if WebP is too large
  if (format === "image/webp" && finalBlob.size > targetMaxKB * 1024) {
    finalBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: finalQuality });
  }

  const dataUrl = await blobToDataUrl(finalBlob);
  const sizeKB = Math.round(finalBlob.size / 1024);

  return { dataUrl, blob: finalBlob, sizeKB, width, height };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
  return promise;
}

export async function uploadPhoto(
  blob: Blob,
  fileName: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("photo", blob, fileName);

  const res = await fetch("/api/alumni/upload-photo", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload gagal" })) as { error?: string };
    throw new Error(err.error || "Upload gagal");
  }

  const data = await res.json() as { url: string };
  return data.url;
}
