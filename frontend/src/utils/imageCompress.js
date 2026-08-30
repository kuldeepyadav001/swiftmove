// src/utils/imageCompress.js
// Client-side image compression before upload.
//
// WHY: Phone cameras produce 5-15MB JPEGs. Storing those as Base64 in MongoDB
// hits the 16MB document limit fast (6 KYC docs = ~60-90MB). Compressing on
// the client means:
//   - Smaller request payloads (faster uploads on mobile networks)
//   - Smaller MongoDB documents (more headroom before the 16MB limit)
//   - Faster page loads when images are rendered
//
// ALGORITHM:
//   1. Load image into a canvas
//   2. Resize so the longest side is at most MAX_DIM px
//   3. Export as JPEG at QUALITY compression
//   4. Return data URL (same format as before — no API changes)
//
// TARGET: ~300-500KB per image (vs 5-15MB original)

const MAX_DIM = 1200;       // max width/height in pixels
const QUALITY = 0.7;        // JPEG quality (0-1)
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — skip compression if already small

/**
 * Compress an image file to a Base64 data URL.
 * Returns the original data URL if compression fails (graceful degradation).
 */
export async function compressImage(file) {
  // If the file is already small, skip compression entirely
  if (file.size <= MAX_SIZE_BYTES) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Scale down so longest side is MAX_DIM
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG (smaller than PNG for photos)
          const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
          resolve(dataUrl);
        } catch {
          // Compression failed — fall back to original
          resolve(e.target.result);
        }
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
