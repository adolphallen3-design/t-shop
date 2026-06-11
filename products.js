// src/lib/products.js
// File-based data layer — reads/writes public/products.json
// No database required. Works perfectly on Vercel and everywhere else.

import fs   from "fs";
import path from "path";
import nodePath from "path";

const DATA_PATH = path.join(process.cwd(), "public", "products.json");

// ── Markup pricing ────────────────────────────────────────────
export const MARKUP = {
  "Baby Carriers":   1.8,
  "Accessories":     2.5,
  "Toys & Bouncers": 1.6,
  default:           1.5,
};

export function applyMarkup(basePrice, category) {
  if (!basePrice || isNaN(Number(basePrice))) return null;
  return Math.round(Number(basePrice) * (MARKUP[category] ?? MARKUP.default));
}

export function detectCategory(text = "") {
  const t = text.toLowerCase();
  if (/carrier|wrap|sling/.test(t))                  return "Baby Carriers";
  if (/bouncer|rocker|swing|seat|jumper|walker|bassinet/.test(t)) return "Toys & Bouncers";
  if (/cap|turban|hat|beanie|headband|bow|spoon|fork|soap|pin|sheet|mirror/.test(t)) return "Accessories";
  return "Accessories";
}

export function extractFromFilename(filename) {
  const stem  = nodePath.parse(filename).name;
  const parts = stem.split(/_+/).filter(Boolean);
  let basePrice = null, code = null;
  const nameParts = [];
  for (const part of parts) {
    if (/^\d+$/.test(part))                                                                    { if (!basePrice) basePrice = Number(part); }
    else if (/^[A-Z0-9][A-Z0-9-]+$/i.test(part) && /[A-Za-z]/.test(part) && /\d/.test(part)) { if (!code) code = part.toUpperCase(); }
    else nameParts.push(part);
  }
  const name = nameParts.join(" ").replace(/[-_]+/g, " ").trim()
    .replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return { basePrice, code, name };
}

// ── Read / Write ──────────────────────────────────────────────
function readAll() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

function writeAll(products) {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(products, null, 2), "utf8");
  } catch (e) {
    console.warn("Could not write products.json:", e.message);
  }
}

// ── CRUD ──────────────────────────────────────────────────────
export async function getAllProducts() {
  return readAll();
}

export async function getProduct(id) {
  return readAll().find(p => String(p.id) === String(id)) || null;
}

export async function addProduct(data) {
  const products  = readAll();
  const nextId    = products.length ? Math.max(...products.map(p => Number(p.id))) + 1 : 1;
  const category  = data.category || detectCategory((data.name || "") + " " + (data.image_path || ""));
  const basePrice = data.base_price ? Number(data.base_price) : null;
  const price     = (data.price && data.price !== "EDIT_ME")
    ? Number(data.price)
    : (basePrice ? applyMarkup(basePrice, category) : 0);

  // Duplicate check by product_code
  if (data.product_code) {
    const existing = products.find(p => p.product_code === data.product_code);
    if (existing) return existing;
  }

  const product = {
    id:           nextId,
    name:         data.name         || "New Product",
    product_code: data.product_code || `PROD-${String(nextId).padStart(4, "0")}`,
    price,
    base_price:   basePrice,
    category,
    image_path:   data.image_path   || "",
    in_stock:     data.in_stock     ?? true,
    featured:     data.featured     ?? false,
    source:       data.source       || "manual",
    description:  data.description  || null,
  };

  writeAll([...products, product]);
  return product;
}

export async function updateProduct(id, patch) {
  const products = readAll();
  const idx      = products.findIndex(p => String(p.id) === String(id));
  if (idx === -1) return null;
  const { id: _id, created_at: _ca, ...safe } = patch;
  if (safe.base_price && !safe.price) {
    safe.price = applyMarkup(Number(safe.base_price), safe.category || products[idx].category);
  }
  products[idx] = { ...products[idx], ...safe };
  writeAll(products);
  return products[idx];
}

export async function deleteProduct(id) {
  const products = readAll().filter(p => String(p.id) !== String(id));
  writeAll(products);
}

export async function mergeFromCsv(csvText) {
  const lines   = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const rows    = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.replace(/"/g, "").trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });

  const products     = readAll();
  const existingCodes = new Set(products.map(p => p.product_code));
  const merged       = [...products];

  for (const r of rows) {
    if (existingCodes.has(r.product_code)) {
      const idx = merged.findIndex(p => p.product_code === r.product_code);
      if (idx >= 0) merged[idx] = { ...merged[idx], ...r, in_stock: r.in_stock !== "false" };
    } else {
      merged.push({
        id:           merged.length + 1,
        name:         r.name         || "Unnamed",
        product_code: r.product_code || `CSV-${Date.now()}`,
        price:        r.price        ? Number(r.price)      : 0,
        base_price:   r.base_price   ? Number(r.base_price) : null,
        category:     r.category     || "Accessories",
        image_path:   r.image_path   || "",
        in_stock:     r.in_stock     !== "false",
        featured:     r.featured     === "true",
        source:       r.source       || "csv",
        description:  r.description  || null,
      });
      existingCodes.add(r.product_code);
    }
  }

  writeAll(merged);
  return merged;
}

export function exportCsv(products) {
  const h = ["id","name","product_code","price","base_price","category","image_path","in_stock","featured","description"];
  return [h.join(","), ...products.map(p => h.map(k => { const v = String(p[k]??""); return v.includes(",") ? `"${v}"` : v; }).join(","))].join("\n");
}

export function suggestBundles(product, allProducts) {
  const MAP = {
    "Baby Carriers":   ["Accessories", "Toys & Bouncers"],
    "Accessories":     ["Baby Carriers", "Toys & Bouncers"],
    "Toys & Bouncers": ["Baby Carriers", "Accessories"],
  };
  return (MAP[product.category] || [])
    .map(cat => allProducts.find(p => p.category === cat && p.id !== product.id && p.in_stock))
    .filter(Boolean).slice(0, 2);
}

export const FALLBACK_PRODUCTS = [
  { id:1, name:"Infant-to-Toddler Rocker (Pink)", product_code:"68147",  price:5800, category:"Toys & Bouncers", image_path:"/images/BOUNCER__5800__4_.webp",         in_stock:true, featured:false },
  { id:2, name:"Infant-to-Toddler Rocker (Teal)", product_code:"68144",  price:5800, category:"Toys & Bouncers", image_path:"/images/BOUNCER__5800.webp",              in_stock:true, featured:false },
  { id:3, name:"Baby Turban Cap",                 product_code:"0021",   price:575,  category:"Accessories",     image_path:"/images/BABY_TURBAN_CAP__0021__230.webp", in_stock:true, featured:false },
  { id:4, name:"Baby Carrier EN71",               product_code:"EN71-2", price:1764, category:"Baby Carriers",   image_path:"/images/BABY_CARRIER_EN71-2___980.webp",  in_stock:true, featured:true  },
];
