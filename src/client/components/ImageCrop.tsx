import { useState, useRef, useEffect, useCallback } from "react";
import { Modal, Button } from "./ui";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

interface ImageCropProps {
  file: File;
  aspectRatio: number;
  title?: string;
  confirmText?: string;
  onCropComplete: (blob: Blob, dataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCrop({ file, aspectRatio, title = "Crop Foto", confirmText = "Simpan", onCropComplete, onCancel }: ImageCropProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const cropperRef = useRef<Cropper | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Convert file to data URL for display
  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!cancelled) setImgUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    return () => { cancelled = true; };
  }, [file]);

  // Initialize cropperjs once the image element is in the DOM
  useEffect(() => {
    if (!imgRef.current || !imgUrl) return;

    const cropper = new Cropper(imgRef.current, {
      aspectRatio,
      viewMode: 1,        // Restrict crop box to not exceed canvas
      autoCropArea: 0.9,  // Auto crop 90% of the image
      movable: true,
      zoomable: true,
      rotatable: false,
      scalable: false,
      background: false,   // Hide grid background
      responsive: true,
      ready: () => {
        setCropping(false);
      },
    });

    cropperRef.current = cropper;
    setCropping(true);

    return () => {
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [imgUrl, aspectRatio]);

  const handleConfirm = useCallback(() => {
    if (!cropperRef.current) return;
    setCropping(true);

    // Get cropped canvas at high resolution
    const canvas = cropperRef.current.getCroppedCanvas({
      maxWidth: 1200,
      maxHeight: 1200,
      imageSmoothingQuality: "high",
    });

    if (!canvas) {
      setCropping(false);
      return;
    }

    // Convert to WebP blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCropping(false);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          onCropComplete(blob, reader.result as string);
          setCropping(false);
        };
        reader.readAsDataURL(blob);
      },
      "image/webp",
      0.85,
    );
  }, [onCropComplete]);

  return (
    <Modal open={true} onClose={onCancel} title={title}>
      <div className="space-y-4">
        {imgUrl ? (
          <div className="max-h-[60vh] overflow-hidden rounded-lg bg-slate-100">
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Crop preview"
              className="block w-full"
              style={{ maxHeight: "60vh" }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-[#087348] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Batal</Button>
          <Button onClick={handleConfirm} disabled={cropping || !imgUrl}>
            {cropping ? "Memproses..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
