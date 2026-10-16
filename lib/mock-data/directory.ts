/**
 * DEMO DATA — reference records: catalogue groups, warehouse details, vendors,
 * customers, users and organisation settings. Names, addresses, emails and
 * GSTINs are fictional. Ids match products.ts and warehouses.ts.
 */
import type { AppSettings, AppUser, CatalogEntry, CustomerRecord, VendorRecord, WarehouseRecord } from "@/lib/types/operations";
import { BRANDS, CATEGORIES, SUBCATEGORIES } from "./products";
import { VENDORS, WAREHOUSES } from "./warehouses";

const CATEGORY_NOTES: Record<string, string> = {
  Audio: "Headphones, headsets and speakers.",
  Peripherals: "Keyboards, mice, webcams and input devices.",
  Displays: "Monitors and display accessories.",
  "Printers & Supplies": "Printers, toner and printing consumables.",
  Accessories: "Hubs, stands, cables and small add-ons.",
  Networking: "Switches, routers and network gear.",
  Furniture: "Chairs, desks and workspace lighting.",
  Storage: "External drives and storage media.",
  Power: "Power banks, surge protectors and chargers.",
  Services: "Labour and support you sell or buy. Not stocked.",
};

const BRAND_NOTES: Record<string, string> = {
  Sonora: "Personal and desktop audio.",
  Keyforge: "Keyboards, mice and input bundles.",
  Vistaview: "Displays and video peripherals.",
  Printwell: "Printers and genuine supplies.",
  Linkpoint: "Connectivity, cables and networking.",
  Ergoseat: "Ergonomic seating and stands.",
  Voltix: "Portable power and surge protection.",
  Datavault: "Storage and business computing.",
  Lumio: "Task and desk lighting.",
};

export function seedCategories(): CatalogEntry[] {
  return [
    ...CATEGORIES.map((name, i) => ({ id: `cat-${i + 1}`, name, description: CATEGORY_NOTES[name] ?? "", status: "active" as const, createdAt: "2025-11-01T09:00:00" })),
    ...SUBCATEGORIES.map(([name, parent], i) => ({
      id: `cat-sub-${i + 1}`,
      name,
      description: name === "Installation" ? "Setup, assembly and installation visits." : "",
      parentId: `cat-${CATEGORIES.indexOf(parent) + 1}`,
      status: "active" as const,
      createdAt: "2026-04-20T09:00:00",
    })),
    { id: "cat-legacy", name: "Cables (legacy)", description: "Retired grouping — cables now sit under Accessories.", status: "archived", createdAt: "2025-11-01T09:00:00" },
  ];
}

export function seedBrands(): CatalogEntry[] {
  return [
    ...BRANDS.map((name, i) => ({ id: `brand-${i + 1}`, name, description: BRAND_NOTES[name] ?? "", status: "active" as const, createdAt: "2025-11-01T09:00:00" })),
    { id: "brand-northwind", name: "Northwind Basics", description: "Budget accessories line, no longer stocked.", status: "archived", createdAt: "2025-11-01T09:00:00" },
  ];
}

const WAREHOUSE_DETAILS: Record<string, Omit<WarehouseRecord, "id" | "name" | "short" | "city" | "status" | "createdAt">> = {
  "wh-main": {
    code: "BLR-01",
    address: "Plot 14, KIADB Industrial Area, Hoskote",
    contactName: "Ravi Shankar",
    phone: "+91 80 4012 3300",
    email: "main.warehouse@example.com",
    zones: [
      { code: "A", name: "Fast movers", kind: "Racking", bins: 48, utilisation: 78 },
      { code: "B", name: "Electronics", kind: "Shelving", bins: 64, utilisation: 61 },
      { code: "C", name: "Furniture & bulky", kind: "Bulk floor", bins: 12, utilisation: 54 },
      { code: "S", name: "High-value cage", kind: "Secure cage", bins: 8, utilisation: 40 },
      { code: "D", name: "Dispatch staging", kind: "Staging", bins: 6, utilisation: 25 },
    ],
  },
  "wh-branch": {
    code: "PNQ-01",
    address: "Unit 7, Chakan MIDC Phase II",
    contactName: "Meera Joshi",
    phone: "+91 20 6720 1144",
    email: "branch.warehouse@example.com",
    zones: [
      { code: "A", name: "General stock", kind: "Racking", bins: 32, utilisation: 66 },
      { code: "B", name: "Small parts", kind: "Shelving", bins: 40, utilisation: 49 },
      { code: "D", name: "Dispatch staging", kind: "Staging", bins: 4, utilisation: 30 },
    ],
  },
  "wh-remote": {
    code: "HYD-01",
    address: "Survey No. 112, Medchal Logistics Park",
    contactName: "Imran Qureshi",
    phone: "+91 40 2970 5500",
    email: "remote.warehouse@example.com",
    zones: [
      { code: "A", name: "General stock", kind: "Shelving", bins: 24, utilisation: 38 },
      { code: "C", name: "Bulk floor", kind: "Bulk floor", bins: 6, utilisation: 22 },
    ],
  },
};

export function seedWarehouses(): WarehouseRecord[] {
  return WAREHOUSES.map((w) => ({ id: w.id, name: w.name, short: w.short, city: w.city, status: "active", createdAt: "2025-11-01T09:00:00", ...WAREHOUSE_DETAILS[w.id] }));
}

const VENDOR_DETAILS: Record<string, Omit<VendorRecord, "id" | "name" | "status" | "createdAt">> = {
  "vn-apex": { code: "V-APX", contactName: "Karan Malhotra", email: "orders@apex-distributors.example", phone: "+91 98450 11220", address: "22 Residency Road", city: "Bengaluru", gstin: "29AAACA1234F1Z5", paymentTerms: "Net 30" },
  "vn-northstar": { code: "V-NSC", contactName: "Divya Menon", email: "sales@northstar-supply.example", phone: "+91 98201 55410", address: "Andheri East, Marol", city: "Mumbai", gstin: "27AABCN5678K1Z2", paymentTerms: "Net 45" },
  "vn-meridian": { code: "V-MER", contactName: "Arjun Rao", email: "purchase@meridian-electronics.example", phone: "+91 99000 47821", address: "Electronic City Phase 1", city: "Bengaluru", gstin: "29AADCM9012P1Z8", paymentTerms: "Net 30" },
  "vn-orbit": { code: "V-ORB", contactName: "Neha Kapoor", email: "accounts@orbit-office.example", phone: "+91 98110 66302", address: "Okhla Industrial Estate", city: "New Delhi", gstin: "07AAECO3456Q1Z1", paymentTerms: "Net 15" },
  "vn-crestline": { code: "V-CRT", contactName: "Suresh Pillai", email: "trade@crestline.example", phone: "+91 94440 23871", address: "Guindy Industrial Estate", city: "Chennai", gstin: "33AAFCC7890R1Z4", paymentTerms: "Net 30" },
};

export function seedVendors(): VendorRecord[] {
  return [
    ...VENDORS.map((v) => ({ id: v.id, name: v.name, status: "active" as const, createdAt: "2025-11-01T09:00:00", ...VENDOR_DETAILS[v.id] })),
    {
      id: "vn-bluepeak",
      code: "V-BLP",
      name: "Bluepeak Imports",
      contactName: "Tara Fernandes",
      email: "hello@bluepeak.example",
      phone: "+91 98230 77190",
      address: "Verna Industrial Estate",
      city: "Goa",
      gstin: "30AAGCB2468M1Z6",
      paymentTerms: "Advance",
      status: "archived",
      createdAt: "2025-11-01T09:00:00",
    },
  ];
}

const CUSTOMERS: [name: string, company: string, contact: string, city: string][] = [
  ["Acme Workspaces", "Acme Workspaces Pvt Ltd", "Rohit Verma", "Bengaluru"],
  ["Brightline Studios", "Brightline Studios LLP", "Ananya Iyer", "Pune"],
  ["Cobalt Analytics", "Cobalt Analytics Pvt Ltd", "Vikram Sethi", "Hyderabad"],
  ["Delta Learning", "Delta Learning Foundation", "Fatima Shaikh", "Mumbai"],
  ["Evergreen Clinics", "Evergreen Health Services", "Dr. Kavya Nair", "Bengaluru"],
  ["Fintrail Solutions", "Fintrail Solutions Pvt Ltd", "Aditya Bose", "Pune"],
  ["Greenleaf Co-working", "Greenleaf Spaces LLP", "Sneha Kulkarni", "Hyderabad"],
  ["Horizon Retail", "Horizon Retail Ltd", "Manoj Gupta", "Chennai"],
  ["Indigo Design Lab", "Indigo Design Lab", "Ishita Roy", "Bengaluru"],
  ["Juniper Logistics", "Juniper Logistics Pvt Ltd", "Harpreet Singh", "Pune"],
  ["Kestrel Software", "Kestrel Software Pvt Ltd", "Nikhil Jain", "Hyderabad"],
  ["Lotus Hospitality", "Lotus Hotels & Resorts", "Priyanka Das", "Goa"],
  ["Monarch Legal", "Monarch Legal Associates", "Sameer Khan", "Mumbai"],
  ["Nimbus Media", "Nimbus Media House", "Pooja Reddy", "Hyderabad"],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function seedCustomers(): CustomerRecord[] {
  return CUSTOMERS.map(([name, company, contact, city], i) => {
    const addr = `${12 + i * 7}, ${["MG Road", "Baner Road", "HITEC City", "Linking Road", "Indiranagar", "Kalyani Nagar", "Gachibowli"][i % 7]}, ${city}`;
    return {
      id: `cu-${slug(name).slice(0, 10)}`,
      code: `C-${String(101 + i)}`,
      name,
      company,
      contactName: contact,
      email: `purchasing@${slug(name)}.example`,
      phone: `+91 9${String(8100000000 + i * 7310421).slice(0, 9)}`,
      billingAddress: addr,
      shippingAddress: i % 3 === 0 ? `Warehouse gate 2, ${addr}` : addr,
      status: i === 12 ? "archived" : "active",
      createdAt: `2026-0${1 + (i % 6)}-1${i % 9}T10:00:00`,
    };
  });
}

/** The first five appear (by short name) on stock movements and activity. */
export function seedUsers(): AppUser[] {
  return [
    { id: "us-admin", name: "Admin User", short: "Admin User", email: "admin@demo-company.example", role: "administrator", team: "Operations", status: "active", lastActive: "2026-10-14T10:20:00" },
    { id: "us-john", name: "John Dsouza", short: "John D.", email: "john.d@demo-company.example", role: "warehouse-staff", team: "Main Warehouse", status: "active", lastActive: "2026-10-14T09:55:00" },
    { id: "us-sarah", name: "Sarah Mathew", short: "Sarah M.", email: "sarah.m@demo-company.example", role: "inventory-manager", team: "Inventory Control", status: "active", lastActive: "2026-10-14T09:12:00" },
    { id: "us-mike", name: "Mike Lobo", short: "Mike L.", email: "mike.l@demo-company.example", role: "warehouse-staff", team: "Branch Warehouse", status: "active", lastActive: "2026-10-13T18:05:00" },
    { id: "us-priya", name: "Priya Kumar", short: "Priya K.", email: "priya.k@demo-company.example", role: "purchasing-manager", team: "Purchasing", status: "active", lastActive: "2026-10-14T08:40:00" },
    { id: "us-rahul", name: "Rahul Nair", short: "Rahul N.", email: "rahul.n@demo-company.example", role: "sales-staff", team: "Sales", status: "active", lastActive: "2026-10-12T16:30:00" },
    { id: "us-aisha", name: "Aisha Khan", short: "Aisha K.", email: "aisha.k@demo-company.example", role: "sales-staff", team: "Sales", status: "active", lastActive: "2026-10-14T07:58:00" },
    { id: "us-deepak", name: "Deepak Rao", short: "Deepak R.", email: "deepak.r@demo-company.example", role: "warehouse-staff", team: "Remote Warehouse", status: "suspended", lastActive: "2026-08-30T17:15:00" },
    { id: "us-lena", name: "Lena Thomas", short: "Lena T.", email: "lena.t@demo-company.example", role: "viewer", team: "Finance", status: "invited", lastActive: null },
  ];
}

export function seedSettings(): AppSettings {
  return {
    orgName: "Demo Company",
    legalName: "Demo Company Private Limited",
    gstin: "29AAACD0000X1Z0",
    email: "operations@demo-company.example",
    phone: "+91 80 4000 1000",
    address: "4th Floor, Example Tech Park, Bengaluru 560103",
    defaultWarehouse: "wh-main",
    costingMethod: "weighted-average",
    allowNegativeStock: false,
    reorderSuggestion: "double-reorder-point",
    units: ["pcs", "box", "set", "pack", "hrs"],
    numbering: { po: "PO-", so: "SO-", grn: "GRN-", trf: "TRF-", adj: "ADJ-", bill: "BILL-", rma: "RMA-", stk: "STK-" },
    skuPattern: "{CATEGORY}-{SEQ}",
    currency: "INR",
    locale: "en-IN",
    dateFormat: "MMM D, YYYY",
    notifications: { lowStock: true, poApproval: true, receipts: true, transfers: false, dailyDigest: false },
    preferences: { landing: "/dashboard", density: "comfortable", rowsPerPage: 10 },
    integrations: { accounting: false, ecommerce: false, shipping: false, email: false },
  };
}
