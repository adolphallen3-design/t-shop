# TiiBaby Shop 🌸

A production-ready Next.js 14 e-commerce app for baby products.  
Supabase backend · Google OAuth · Claude AI image scanning · WebP compression · WhatsApp ordering.

---

## Quick Start

### 1. Configure environment
```bash
cp .env.local.example .env.local
# Fill in your Supabase and Anthropic keys
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**, paste the contents of `supabase/migrations/001_products.sql`, and run it
3. Go to **Authentication → Providers → Google**, enable it, and add your Google OAuth credentials
4. Add this redirect URL in Google Cloud Console:
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 3. Install and run
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### 4. Add products
**Option A — AI scan (recommended):**
Go to `/admin`, drag product photos into the upload zone. Claude reads the image and fills in name, price, code and category automatically. Images are compressed to WebP (typically 70–85% smaller).

**Option B — Ingest script:**
```bash
# Drop images into public/images/, then:
npm run ingest          # AI + filename parsing
npm run ingest:no-ai    # Filename parsing only
npm run ingest:dry      # Preview without saving
```

**Option C — CSV import:**
Download the template from `/admin`, fill it in, re-upload.

---

## Filename Convention (for manual/script ingest)

```
PRODUCT_NAME__CODE__BASE_PRICE.jpg
```

| Filename | Detected name | Code | Base price | Sell price |
|---|---|---|---|---|
| `BABY_CARRIER__EN71-2__980.jpeg` | Baby Carrier | EN71-2 | $980 | $1,764 (1.8×) |
| `BOUNCER__68147__3625.jpeg` | Bouncer | 68147 | $3,625 | $5,800 (1.6×) |
| `TURBAN_CAP__0021__230.jpeg` | Turban Cap | 0021 | $230 | $575 (2.5×) |

**Markup rates:**
- Baby Carriers → 1.8×
- Toys & Bouncers → 1.6×
- Accessories → 2.5×

---

## Image Compression

All uploaded images are automatically:
- Resized to max **800px** on the longest side
- Converted to **WebP** at 85% quality
- Typically **70–85% smaller** than the original JPEG

Your 4 sample images: **746 KB → 153 KB (80% reduction)**

---

## Project Structure

```
tiibaby-shop/
├── public/
│   ├── images/           ← product images (WebP after compression)
│   ├── products.json     ← local backup (Supabase is primary)
│   └── placeholder.png
├── scripts/
│   └── ingest.js         ← CLI ingestion (AI + filename + markup)
├── src/
│   ├── app/
│   │   ├── page.js                     ← shop homepage
│   │   ├── cart/page.js                ← cart + WhatsApp order
│   │   ├── wishlist/page.js            ← saved items
│   │   ├── orders/page.js              ← order history
│   │   ├── products/[id]/page.js       ← product detail
│   │   ├── admin/
│   │   │   ├── page.js                 ← admin panel (guarded)
│   │   │   └── AdminClient.js          ← inline edit, AI upload
│   │   └── api/
│   │       ├── products/route.js       ← GET all, POST new
│   │       ├── products/[id]/route.js  ← GET, PATCH, DELETE
│   │       ├── images/route.js         ← upload + compress + AI scan
│   │       ├── orders/route.js         ← POST create, GET user orders
│   │       └── upload/route.js         ← CSV import
│   ├── components/
│   │   ├── Nav.js          ← sticky nav, Google login, cart badge, mobile menu
│   │   ├── ProductCard.js  ← card with wishlist + add-to-cart
│   │   └── ShopClient.js   ← search, filters, stock toggle
│   └── lib/
│       ├── supabase.js     ← Supabase client (safe init)
│       ├── products.js     ← all DB CRUD + business logic
│       ├── compress.js     ← sharp-based WebP compression
│       ├── CartContext.js  ← global cart state (localStorage)
│       ├── useUser.js      ← Supabase auth hook
│       └── useWishlist.js  ← wishlist (Supabase or localStorage)
├── supabase/
│   └── migrations/001_products.sql
├── .env.local.example
└── package.json
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Shop — grid, search, category filter, stock toggle |
| `/products/[id]` | Product detail — add to cart, WhatsApp, wishlist, bundles |
| `/cart` | Cart — qty controls, WhatsApp order (saves to Supabase if logged in) |
| `/wishlist` | Saved items — synced to Supabase when logged in |
| `/orders` | Order history — requires login |
| `/admin` | Admin panel — AI upload, inline edit, CSV, stock toggle |

---

## WhatsApp Number

Update in two places:
- `src/app/products/[id]/page.js` → `const WA_PHONE = "18763405862"`
- `src/app/cart/page.js` → `const WA_PHONE = "18763405862"`

---

## Admin Access

Set `ADMIN_EMAILS` in `.env.local` to show a warning if unconfigured.  
For full route protection, add Next.js middleware (see Supabase docs on auth middleware).

---

## Deploy

```bash
npm run build && npm start
```

**Vercel (recommended):**
```bash
npx vercel
```
Add your `.env.local` keys as environment variables in the Vercel dashboard.

> **Note:** The filesystem is read-only on Vercel. Images uploaded via the admin panel won't persist. Use Supabase Storage or Cloudinary for production image hosting.
