/** Downscales an image file to fit `max` px and re-encodes it as a JPEG data URL on a white background. */
export function shrinkImage(file: Blob, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      const ctx = c.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error('canvas'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(im, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    im.src = url;
  });
}

export const isImageFile = (f: File | undefined | null): f is File => !!f && /^image\//.test(f.type);
