/**
 * Minimal 1D barcode encoders for label previews: EAN-13 (product barcodes)
 * and Code 128 set B (SKUs and free text). Output is a module pattern
 * ("1" = bar, "0" = space) to draw as SVG.
 */

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13CheckDigit(first12: string): number {
  const sum = first12.split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

/** 95-module EAN-13 pattern, or null if the code isn't a valid EAN-13. */
export function encodeEan13(code: string): string | null {
  if (!isValidEan13(code)) return null;
  const d = code.split("").map(Number);
  const parity = EAN_PARITY[d[0]];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? EAN_L : EAN_G)[d[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += EAN_R[d[i]];
  return `${bits}101`;
}

// Code 128 bar/space widths for values 0–106 (106 = stop, 7 elements).
const C128 = (
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 " +
  "221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 " +
  "231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 " +
  "314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 " +
  "111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 " +
  "114131 311141 411131 211412 211214 211232 2331112"
).split(" ");
const START_B = 104;
const STOP = 106;

/** Code 128-B pattern for printable ASCII (space to ~), or null if a character isn't supported. */
export function encodeCode128(text: string): string | null {
  if (!text || [...text].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126)) return null;
  const values = [...text].map((c) => c.charCodeAt(0) - 32);
  const check = (START_B + values.reduce((s, v, i) => s + v * (i + 1), 0)) % 103;
  let bits = "";
  for (const v of [START_B, ...values, check, STOP]) {
    C128[v].split("").forEach((w, i) => (bits += (i % 2 ? "0" : "1").repeat(Number(w))));
  }
  return bits;
}
