/** How far (0–255 per channel) a pixel may be from the background colour and still count as background. */
const TOLERANCE = 26;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('decode'));
    im.src = src;
  });
}

/**
 * Cuts the product out of a photo: the plain background touching the photo's edges becomes transparent
 * and the result is cropped to what is left. A photo without a plain background (or one where nothing
 * would be left) is returned uncut. `w` and `h` are the size of the returned image in pixels.
 */
export async function cutOut(src: string, max = 480): Promise<{ img: string; w: number; h: number }> {
  const im = await loadImage(src);
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k));
  const h = Math.max(1, Math.round(im.naturalHeight * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(im, 0, 0, w, h);
  const uncut = { img: canvas.toDataURL('image/jpeg', 0.85), w, h };

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // The background colour is the median colour of the border.
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const median = (ch: number) => {
    const v = border.map((i) => px[i * 4 + ch]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const ref = [median(0), median(1), median(2)];
  const dist = (i: number) =>
    Math.max(
      Math.abs(px[i * 4] - ref[0]),
      Math.abs(px[i * 4 + 1] - ref[1]),
      Math.abs(px[i * 4 + 2] - ref[2]),
    );
  // Most of the border must be that colour, otherwise the photo has no plain background.
  if (border.filter((i) => dist(i) <= TOLERANCE).length < border.length * 0.6) return uncut;

  // Flood fill the background from the edges.
  const bg = new Uint8Array(w * h);
  const stack = border.filter((i) => dist(i) <= TOLERANCE);
  for (const i of stack) bg[i] = 1;
  let count = stack.length;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
    for (const n of next) {
      if (n < 0 || n >= w * h || bg[n] || dist(n) > TOLERANCE) continue;
      bg[n] = 1;
      count++;
      stack.push(n);
    }
  }
  if (count < w * h * 0.03 || count > w * h * 0.97) return uncut;

  // Clear the background; soften the product's outline so it does not look jagged.
  let x1 = w;
  let y1 = h;
  let x2 = -1;
  let y2 = -1;
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) {
      px[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    const edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || bg[i - w] || bg[i + w];
    if (edge) px[i * 4 + 3] = Math.round(255 * Math.min(1, dist(i) / (TOLERANCE * 3)));
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
  }
  ctx.putImageData(data, 0, 0);

  const cw = x2 - x1 + 1;
  const ch = y2 - y1 + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d')!.drawImage(canvas, x1, y1, cw, ch, 0, 0, cw, ch);
  // WebP keeps the transparency and is much smaller than PNG; browsers that cannot write it fall back to PNG.
  return { img: out.toDataURL('image/webp', 0.9), w: cw, h: ch };
}
