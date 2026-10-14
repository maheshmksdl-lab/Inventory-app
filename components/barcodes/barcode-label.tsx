import { encode } from "uqr";
import { encodeCode128, encodeEan13 } from "@/lib/barcode";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Symbology = "ean13" | "code128" | "qr";

export const LABEL_SIZES = {
  small: { label: "Small · 38 × 25 mm", w: 38, h: 25 },
  medium: { label: "Medium · 50 × 30 mm", w: 50, h: 30 },
  large: { label: "Large · 100 × 50 mm", w: 100, h: 50 },
} as const;
export type LabelSize = keyof typeof LABEL_SIZES;

/** Draws a module pattern as crisp SVG bars (each module 1 unit wide). */
function Bars({ bits, className }: { bits: string; className?: string }) {
  const quiet = 10;
  const rects: { x: number; w: number }[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    let j = i;
    while (bits[j + 1] === "1") j++;
    rects.push({ x: i + quiet, w: j - i + 1 });
    i = j;
  }
  return (
    <svg viewBox={`0 0 ${bits.length + quiet * 2} 50`} preserveAspectRatio="none" className={className} aria-hidden shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" />
      {rects.map((r) => (
        <rect key={r.x} x={r.x} y={0} width={r.w} height={50} fill="#101828" />
      ))}
    </svg>
  );
}

function Qr({ text, className }: { text: string; className?: string }) {
  const { data } = encode(text, { ecc: "M", border: 1 });
  const n = data.length;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={className} aria-hidden shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      {data.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#101828" /> : null)))}
    </svg>
  );
}

export interface LabelData {
  name: string;
  sku: string;
  barcode: string;
  price: number;
}

/** What the symbol encodes for a product. QR carries the SKU and barcode. */
export function labelValue(p: Omit<LabelData, "price">, symbology: Symbology): string {
  if (symbology === "ean13") return p.barcode;
  if (symbology === "code128") return p.sku;
  return `SKU:${p.sku};EAN:${p.barcode || "-"};NAME:${p.name}`;
}

export function canEncode(p: Omit<LabelData, "price">, symbology: Symbology): boolean {
  if (symbology === "ean13") return !!encodeEan13(p.barcode);
  if (symbology === "code128") return !!encodeCode128(p.sku);
  return true;
}

/**
 * One product label at its physical size (mm), for screen preview and print.
 */
export function BarcodeLabel({ product, symbology, size, showName = true, showPrice = true, className }: { product: LabelData; symbology: Symbology; size: LabelSize; showName?: boolean; showPrice?: boolean; className?: string }) {
  const dims = LABEL_SIZES[size];
  const small = size === "small";
  const value = labelValue(product, symbology);
  const bits = symbology === "ean13" ? encodeEan13(value) : symbology === "code128" ? encodeCode128(value) : null;
  return (
    <div
      className={cn("flex shrink-0 flex-col overflow-hidden rounded-[2mm] border border-dashed border-[#D0D5DD] bg-white text-[#101828] print:rounded-none print:border-[#D0D5DD]", className)}
      style={{ width: `${dims.w}mm`, height: `${dims.h}mm`, padding: small ? "1.5mm" : "2.5mm", breakInside: "avoid" }}
      role="img"
      aria-label={`Label for ${product.name}: ${symbology === "qr" ? "QR code" : symbology === "ean13" ? "EAN-13 barcode" : "Code 128 barcode"} ${symbology === "qr" ? product.sku : value}`}
    >
      {showName && <p className={cn("truncate leading-tight font-semibold", small ? "text-[2.4mm]" : "text-[3mm]")}>{product.name}</p>}
      {symbology === "qr" ? (
        <div className="flex min-h-0 flex-1 items-center gap-[2mm] pt-[1mm]">
          <Qr text={value} className="h-full max-h-full w-auto" />
          <div className={cn("min-w-0 leading-tight", small ? "text-[2.2mm]" : "text-[2.8mm]")}>
            <p className="font-mono font-semibold">{product.sku}</p>
            {product.barcode && <p className="font-mono text-[#475467]">{product.barcode}</p>}
            {showPrice && <p className="mt-[1mm] font-semibold">{formatCurrency(product.price)}</p>}
          </div>
        </div>
      ) : bits ? (
        <>
          <Bars bits={bits} className="mt-[0.8mm] min-h-0 w-full flex-1" />
          <div className={cn("mt-[0.6mm] flex items-baseline justify-between gap-2 leading-none", small ? "text-[2.2mm]" : "text-[2.8mm]")}>
            <span className="font-mono tracking-wide">{value}</span>
            {showPrice && <span className="font-semibold">{formatCurrency(product.price)}</span>}
          </div>
        </>
      ) : (
        <p className="m-auto text-center text-[2.6mm] text-[#B42318]">{symbology === "ean13" ? "No valid EAN-13 barcode on this item" : "SKU can't be encoded"}</p>
      )}
    </div>
  );
}
