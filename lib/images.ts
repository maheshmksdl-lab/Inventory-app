/**
 * Product image handling in the browser. Uploads are decoded, scaled down and
 * re-encoded as data URLs so they can live in the in-memory demo store; a real
 * backend would receive the file and return a URL instead.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");
/** Longest side kept after upload: plenty for a product page, small enough for memory. */
const MAX_SIDE = 1600;

/** Why a file can't be used, or null when it's fine. */
export function imageFileProblem(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `${file.name} isn't a JPG, PNG, WebP or GIF image`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 5 MB`;
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image couldn't be read"));
    img.src = src;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`${file.name} couldn't be read`));
    reader.readAsDataURL(file);
  });
}

let webp: boolean | null = null;
/** WebP keeps transparency and is smaller; browsers that can't encode it fall back to JPEG. */
const canWebp = () => (webp ??= document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp"));

const encode = (canvas: HTMLCanvasElement) => (canWebp() ? canvas.toDataURL("image/webp", 0.88) : canvas.toDataURL("image/jpeg", 0.88));

/** Draw an image, optionally rotated by a quarter turn, onto a canvas no larger than MAX_SIDE. */
function draw(img: HTMLImageElement, quarterTurns = 0): HTMLCanvasElement {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const turn = ((quarterTurns % 4) + 4) % 4;
  const canvas = document.createElement("canvas");
  canvas.width = turn % 2 ? h : w;
  canvas.height = turn % 2 ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Images can't be processed in this browser");
  // JPEG has no transparency: paint white behind the image.
  if (!canWebp()) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turn * Math.PI) / 2);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas;
}

/** Turn an uploaded file into a scaled data URL ready to store. */
export async function prepareImage(file: File): Promise<string> {
  const problem = imageFileProblem(file);
  if (problem) throw new Error(problem);
  const img = await loadImage(await readFile(file));
  // Animated GIFs would lose their animation on a canvas: keep small ones as they are.
  if (file.type === "image/gif" && Math.max(img.naturalWidth, img.naturalHeight) <= MAX_SIDE) return readFile(file);
  return encode(draw(img));
}

/** Rotate a stored image (data URL or same-origin path) a quarter turn: 1 = clockwise, -1 = anticlockwise. */
export async function rotateImage(src: string, direction: 1 | -1): Promise<string> {
  const img = await loadImage(src);
  return encode(draw(img, direction));
}
