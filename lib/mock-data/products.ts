/**
 * DEMO DATA — sample catalogue for the frontend prototype. Brands are fictional.
 * Stock per warehouse is [onHand, reserved, reorderPoint]; reserved never exceeds
 * on hand, so available (onHand − reserved) is never negative.
 */
import type { ItemType, Lifecycle, Product, ProductIconKey, ProductSupplier, WarehouseId } from "@/lib/types/inventory";

export const CATEGORIES = ["Audio", "Peripherals", "Displays", "Printers & Supplies", "Accessories", "Networking", "Furniture", "Storage", "Power"];
export const BRANDS = ["Sonora", "Keyforge", "Vistaview", "Printwell", "Linkpoint", "Ergoseat", "Voltix", "Datavault", "Lumio"];
export const UNITS = ["pcs", "box", "set", "pack"];
export const TAX_CLASSES = ["GST 5%", "GST 12%", "GST 18%", "GST 28%", "Exempt"];

type Stock = [onHand: number, reserved: number, reorderPoint: number];

interface Seed {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  type?: ItemType;
  unit?: string;
  cost: number;
  price: number;
  tax?: string;
  icon: ProductIconKey;
  stock: [main: Stock, branch: Stock, remote: Stock];
  vendors: [vendorId: string, preferred?: boolean][];
  lifecycle?: Lifecycle;
  description: string;
  created: string;
  updated: string;
}

const SEEDS: Seed[] = [
  { id: "wireless-headphones", name: "Wireless Headphones", sku: "WH-1000XM5", category: "Audio", brand: "Sonora", cost: 18500, price: 24990, icon: "headphones", stock: [[4, 0, 20], [18, 3, 10], [6, 1, 6]], vendors: [["vn-meridian", true], ["vn-apex"]], description: "Over-ear wireless headphones with active noise cancellation, 30-hour battery and a carry case.", created: "2025-11-04T10:12:00", updated: "2026-10-09T15:40:00" },
  { id: "mechanical-keyboard", name: "Mechanical Keyboard", sku: "MK-815", category: "Peripherals", brand: "Keyforge", cost: 6200, price: 8499, icon: "keyboard", stock: [[6, 2, 15], [22, 4, 10], [9, 0, 5]], vendors: [["vn-apex", true]], description: "Full-size mechanical keyboard with hot-swappable tactile switches and white backlight.", created: "2025-11-04T10:20:00", updated: "2026-10-02T11:05:00" },
  { id: "gaming-mouse", name: "Gaming Mouse", sku: "GM-500", category: "Peripherals", brand: "Keyforge", cost: 2900, price: 4199, icon: "mouse", stock: [[40, 5, 15], [2, 0, 10], [12, 2, 6]], vendors: [["vn-apex", true], ["vn-crestline"]], description: "Wired optical gaming mouse, 16,000 DPI sensor, six programmable buttons.", created: "2025-11-06T09:30:00", updated: "2026-09-28T17:10:00" },
  { id: "led-monitor-24", name: "24\" LED Monitor", sku: "LM-24FHD", category: "Displays", brand: "Vistaview", cost: 9800, price: 13499, icon: "monitor", stock: [[3, 0, 12], [5, 1, 6], [0, 0, 4]], vendors: [["vn-meridian", true]], description: "24-inch Full HD IPS monitor with HDMI and DisplayPort inputs and a tilt-adjustable stand.", created: "2025-11-10T14:00:00", updated: "2026-10-11T09:25:00" },
  { id: "inkjet-printer", name: "Inkjet Printer", sku: "IP-2770", category: "Printers & Supplies", brand: "Printwell", cost: 7400, price: 9999, icon: "printer", stock: [[1, 0, 8], [0, 0, 4], [0, 0, 2]], vendors: [["vn-orbit", true]], description: "All-in-one colour inkjet printer with Wi-Fi, scanning and duplex printing.", created: "2025-11-12T11:45:00", updated: "2026-10-12T16:00:00" },
  { id: "usb-c-hub", name: "USB-C Hub", sku: "UH-7P", category: "Accessories", brand: "Linkpoint", cost: 1650, price: 2499, icon: "usb", stock: [[120, 15, 30], [64, 8, 20], [30, 0, 10]], vendors: [["vn-crestline", true], ["vn-apex"]], description: "7-in-1 USB-C hub with HDMI 4K, three USB-A ports, SD card reader and 100 W pass-through.", created: "2025-11-15T10:00:00", updated: "2026-09-30T12:30:00" },
  { id: "office-chair", name: "Office Chair", sku: "OC-ERG", category: "Furniture", brand: "Ergoseat", unit: "pcs", cost: 11200, price: 16499, icon: "chair", stock: [[14, 2, 8], [6, 0, 4], [0, 0, 2]], vendors: [["vn-orbit", true]], description: "Ergonomic mesh office chair with adjustable lumbar support and 4D armrests.", created: "2025-12-01T09:00:00", updated: "2026-09-18T10:15:00" },
  { id: "network-switch", name: "Network Switch", sku: "NS-24G", category: "Networking", brand: "Linkpoint", cost: 14800, price: 19999, icon: "network", stock: [[0, 0, 4], [0, 0, 2], [0, 0, 2]], vendors: [["vn-meridian", true]], description: "24-port gigabit managed switch, rack-mountable, with VLAN and QoS support.", created: "2025-12-03T13:20:00", updated: "2026-10-07T14:45:00" },
  { id: "wireless-mouse", name: "Wireless Mouse", sku: "WM-310", category: "Peripherals", brand: "Keyforge", cost: 950, price: 1499, icon: "mouse", stock: [[85, 10, 25], [40, 6, 15], [22, 0, 10]], vendors: [["vn-apex", true]], description: "Compact wireless mouse with silent clicks and a 12-month battery life.", created: "2025-12-05T10:30:00", updated: "2026-09-21T09:50:00" },
  { id: "portable-ssd-1tb", name: "Portable SSD 1TB", sku: "PS-1TB", category: "Storage", brand: "Datavault", cost: 6900, price: 9299, icon: "storage", stock: [[26, 4, 10], [12, 2, 6], [5, 0, 4]], vendors: [["vn-meridian", true], ["vn-crestline"]], description: "1 TB USB-C portable SSD with read speeds up to 1,050 MB/s.", created: "2026-01-08T11:00:00", updated: "2026-10-05T13:35:00" },
  { id: "hd-webcam", name: "HD Webcam", sku: "WC-1080", category: "Peripherals", brand: "Vistaview", cost: 2400, price: 3499, icon: "webcam", stock: [[18, 2, 10], [9, 1, 5], [3, 0, 3]], vendors: [["vn-meridian", true]], description: "1080p webcam with dual microphones, auto-focus and a privacy shutter.", created: "2026-01-10T15:10:00", updated: "2026-09-25T11:20:00" },
  { id: "bluetooth-speaker", name: "Bluetooth Speaker", sku: "BS-200", category: "Audio", brand: "Sonora", cost: 3100, price: 4499, icon: "speaker", stock: [[32, 3, 10], [14, 0, 6], [8, 1, 4]], vendors: [["vn-meridian", true]], description: "Portable splash-resistant Bluetooth speaker with 20-hour playback.", created: "2026-01-14T12:00:00", updated: "2026-09-12T16:40:00" },
  { id: "laptop-stand", name: "Laptop Stand", sku: "LS-ALU", category: "Accessories", brand: "Ergoseat", cost: 1200, price: 1899, icon: "laptop", stock: [[48, 5, 15], [20, 2, 8], [11, 0, 5]], vendors: [["vn-orbit", true]], description: "Adjustable aluminium laptop stand for 10–17 inch laptops.", created: "2026-02-02T10:00:00", updated: "2026-08-30T10:10:00" },
  { id: "led-desk-lamp", name: "LED Desk Lamp", sku: "DL-LED", category: "Furniture", brand: "Lumio", cost: 1450, price: 2199, icon: "lamp", stock: [[7, 1, 10], [10, 0, 6], [4, 0, 3]], vendors: [["vn-orbit", true]], description: "Dimmable LED desk lamp with adjustable colour temperature and USB charging port.", created: "2026-02-06T09:40:00", updated: "2026-10-10T12:00:00" },
  { id: "monitor-27-4k", name: "27\" 4K Monitor", sku: "LM-27UHD", category: "Displays", brand: "Vistaview", cost: 24500, price: 31999, icon: "monitor", stock: [[11, 3, 6], [4, 1, 3], [2, 0, 2]], vendors: [["vn-meridian", true]], description: "27-inch 4K UHD IPS monitor with USB-C power delivery and height-adjustable stand.", created: "2026-02-15T14:25:00", updated: "2026-10-01T15:15:00" },
  { id: "laser-printer", name: "Laser Printer", sku: "LP-M404", category: "Printers & Supplies", brand: "Printwell", cost: 16800, price: 21999, icon: "printer", stock: [[5, 1, 3], [2, 0, 2], [1, 0, 1]], vendors: [["vn-orbit", true]], description: "Monochrome laser printer, 38 pages per minute, with Ethernet and duplex printing.", created: "2026-02-20T11:30:00", updated: "2026-09-15T09:30:00" },
  { id: "toner-cartridge", name: "Toner Cartridge", sku: "TC-404X", category: "Printers & Supplies", brand: "Printwell", type: "consumable", cost: 3800, price: 5299, icon: "box", stock: [[24, 4, 12], [9, 1, 6], [2, 0, 4]], vendors: [["vn-orbit", true], ["vn-crestline"]], description: "High-yield black toner cartridge for the LP-M404 laser printer (approx. 10,000 pages).", created: "2026-02-20T11:45:00", updated: "2026-10-08T10:50:00" },
  { id: "power-bank", name: "Power Bank 20000mAh", sku: "PB-20K", category: "Power", brand: "Voltix", cost: 1800, price: 2799, icon: "power", stock: [[60, 6, 20], [28, 3, 10], [15, 0, 6]], vendors: [["vn-crestline", true]], description: "20,000 mAh power bank with 65 W USB-C PD output.", created: "2026-03-03T10:05:00", updated: "2026-09-20T14:05:00" },
  { id: "surge-protector", name: "Surge Protector", sku: "SP-6W", category: "Power", brand: "Voltix", cost: 900, price: 1399, icon: "power", stock: [[70, 0, 20], [35, 2, 10], [18, 0, 6]], vendors: [["vn-crestline", true]], description: "6-socket surge protector with 2 USB ports and a 2-metre cable.", created: "2026-03-05T12:15:00", updated: "2026-08-26T11:45:00" },
  { id: "standing-desk", name: "Standing Desk", sku: "SD-140", category: "Furniture", brand: "Ergoseat", cost: 21500, price: 28999, icon: "desk", stock: [[4, 1, 3], [2, 0, 2], [0, 0, 1]], vendors: [["vn-orbit", true]], description: "Electric height-adjustable standing desk, 140 × 70 cm top, dual motor.", created: "2026-03-18T09:20:00", updated: "2026-09-29T16:20:00" },
  { id: "hdmi-cable", name: "HDMI Cable 2m", sku: "HC-2M", category: "Accessories", brand: "Linkpoint", type: "consumable", unit: "pack", cost: 1100, price: 1699, icon: "box", stock: [[90, 10, 30], [45, 5, 15], [20, 0, 8]], vendors: [["vn-crestline", true]], description: "Pack of five 2-metre high-speed HDMI 2.1 cables.", created: "2026-04-01T10:00:00", updated: "2026-09-10T10:00:00" },
  { id: "wifi-router", name: "Wi-Fi 6 Router", sku: "WR-AX3000", category: "Networking", brand: "Linkpoint", cost: 5600, price: 7999, icon: "network", stock: [[9, 2, 6], [3, 0, 4], [2, 0, 2]], vendors: [["vn-meridian", true]], description: "Dual-band Wi-Fi 6 router, AX3000, with four gigabit LAN ports.", created: "2026-04-12T15:30:00", updated: "2026-10-06T13:00:00" },
  { id: "keyboard-mouse-combo", name: "Keyboard & Mouse Combo", sku: "KM-COMBO", category: "Peripherals", brand: "Keyforge", type: "bundle", unit: "set", cost: 2100, price: 2999, icon: "keyboard", stock: [[25, 3, 10], [12, 0, 6], [6, 0, 3]], vendors: [["vn-apex", true]], description: "Bundle of a wireless keyboard and the WM-310 wireless mouse with a shared receiver.", created: "2026-05-02T10:10:00", updated: "2026-09-05T15:30:00" },
  { id: "usb-headset", name: "USB Headset with Mic", sku: "HS-USB", category: "Audio", brand: "Sonora", cost: 1900, price: 2799, icon: "headphones", stock: [[16, 2, 8], [0, 0, 4], [5, 0, 2]], vendors: [["vn-meridian", true]], description: "On-ear USB headset with noise-cancelling boom microphone and inline controls.", created: "2026-05-20T11:50:00", updated: "2026-10-13T10:30:00" },
  { id: "laptop-14", name: "Business Laptop 14\"", sku: "BL-14I5", category: "Accessories", brand: "Datavault", cost: 52000, price: 64999, icon: "laptop", stock: [[2, 0, 2], [0, 0, 1], [0, 0, 1]], vendors: [["vn-meridian", true]], lifecycle: "inactive", description: "14-inch business laptop. Inactive: no longer reordered while the replacement model is evaluated.", created: "2026-06-01T09:00:00", updated: "2026-09-02T12:40:00" },
  { id: "wired-keyboard", name: "Wired Keyboard", sku: "KB-120", category: "Peripherals", brand: "Keyforge", cost: 650, price: 999, icon: "keyboard", stock: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], vendors: [["vn-apex", true]], lifecycle: "archived", description: "Basic wired membrane keyboard. Archived after being replaced by the combo set.", created: "2025-11-04T10:25:00", updated: "2026-07-15T09:10:00" },
];

const WH: WarehouseId[] = ["wh-main", "wh-branch", "wh-remote"];

const barcodeFor = (i: number) => {
  // 13-digit EAN with a valid check digit.
  const body = `890${String(4471000 + i * 137).padStart(7, "0")}${String(10 + i).slice(-2)}`.slice(0, 12);
  const sum = body.split("").reduce((s, d, idx) => s + Number(d) * (idx % 2 ? 3 : 1), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
};

const supplierSku = (vendorId: string, sku: string) => `${vendorId.slice(3, 6).toUpperCase()}-${sku.replace(/[^A-Z0-9]/gi, "")}`;

export function seedProducts(): Product[] {
  return SEEDS.map((s, i) => {
    const suppliers: ProductSupplier[] = s.vendors.map(([vendorId, preferred], j) => ({
      vendorId,
      supplierSku: supplierSku(vendorId, s.sku),
      // Secondary suppliers quote a little higher.
      lastCost: Math.round(s.cost * (1 + j * 0.04)),
      preferred: !!preferred,
    }));
    const stock = s.stock.map(([onHand, reserved, reorderPoint], k) => ({ warehouseId: WH[k], onHand, reserved, reorderPoint }));
    const activity: Product["activity"] = [{ id: `${s.id}-a1`, kind: "created", text: "Item created", user: "Admin User", at: s.created }];
    if (s.updated > s.created) activity.push({ id: `${s.id}-a2`, kind: "updated", text: "Item details updated", user: i % 2 ? "Sarah M." : "Priya K.", at: s.updated });
    if (s.lifecycle === "inactive") activity.push({ id: `${s.id}-a3`, kind: "status", text: "Status changed to Inactive", user: "Admin User", at: s.updated });
    if (s.lifecycle === "archived") activity.push({ id: `${s.id}-a3`, kind: "archived", text: "Item archived", user: "Admin User", at: s.updated });
    return {
      id: s.id,
      name: s.name,
      sku: s.sku,
      barcode: barcodeFor(i),
      description: s.description,
      category: s.category,
      brand: s.brand,
      type: s.type ?? "stocked",
      unit: s.unit ?? "pcs",
      costPrice: s.cost,
      sellingPrice: s.price,
      taxClass: s.tax ?? "GST 18%",
      reorderPoint: stock.reduce((sum, b) => sum + b.reorderPoint, 0),
      lifecycle: s.lifecycle ?? "active",
      icon: s.icon,
      stock,
      suppliers,
      activity: activity.reverse(),
      createdAt: s.created,
      updatedAt: s.updated,
    };
  });
}
