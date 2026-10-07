/**
 * Demo data for local development and staging. `npm run db:seed`
 * WARNING: wipes all tables first. Never run against production.
 */
import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as s from "./schema";
import { coverSvg, lookbookSvg, swatchSvg, tryOnSvg, type GarmentKind } from "./demo-art";
import { addDays, todayPK } from "../../lib/utils";
import { priceOrder } from "../../lib/pricing";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SEED) throw new Error("Refusing to seed production (set ALLOW_SEED=1 to override)");

const client = postgres(url, { max: 4 });
const db = drizzle(client, { schema: s, casing: "snake_case" });
const PUBLIC = path.join(process.cwd(), "public", "demo");
const today = todayPK();

async function art(rel: string, svg: string) {
  const file = path.join(PUBLIC, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, svg);
  return `/demo/${rel}`;
}

const pw = (p: string) => hash(p, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
let seq = 0;
const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const num = () => {
  seq++;
  return "DF" + Array.from({ length: 8 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
};

/* ─────────────────────────────── Tailors ─────────────────────────────── */

type DesignSeed = { title: string; category: string; audience: "men" | "women" | "kids"; price: number; days: number; kind: GarmentKind; color: string; trouser?: string; desc: string };
type TailorSeed = {
  key: string;
  owner: string;
  email: string;
  phone: string;
  shopName: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  bio: string;
  serves: string[];
  specialties: string[];
  years: number;
  home?: boolean;
  women?: boolean;
  visit?: boolean;
  capacity: number;
  status?: "approved" | "pending";
  cover: [string, string];
  designs: DesignSeed[];
  fabrics?: [string, string, string, string, number, number][]; // name, material, colorName, hex, price/m, stock
};

const TAILORS: TailorSeed[] = [
  {
    key: "masterji",
    owner: "Muhammad Aslam",
    email: "masterji@dressify.pk",
    phone: "03001234501",
    shopName: "Master Ji Tailors",
    area: "Shadman",
    city: "Lahore",
    lat: 31.5381,
    lng: 74.3335,
    bio: "Three generations of gents' tailoring in Shadman. Known for crisp shalwar kameez, sharp collars and waistcoats that sit just right.",
    serves: ["men", "kids"],
    specialties: ["shalwar_kameez", "kurta", "waistcoat", "kids_wear", "alteration"],
    years: 24,
    capacity: 4,
    cover: ["#2a3b33", "#5b6f61"],
    designs: [
      { title: "Classic Shalwar Kameez", category: "shalwar_kameez", audience: "men", price: 2200, days: 5, kind: "kameez_men", color: "#f2efe6", trouser: "#f2efe6", desc: "Straight cut kameez with ban collar, side pockets and a neat placket. Our most-ordered suit." },
      { title: "Wash & Wear Office Suit", category: "shalwar_kameez", audience: "men", price: 2000, days: 4, kind: "kameez_men", color: "#7f8a96", trouser: "#7f8a96", desc: "Everyday wash & wear suit with shirt collar, double-stitched seams." },
      { title: "Embroidered Eid Kurta", category: "kurta", audience: "men", price: 2800, days: 6, kind: "kurta", color: "#1f2f4a", trouser: "#f2efe6", desc: "Navy kurta with tilla embroidery along the placket and cuffs." },
      { title: "Velvet Waistcoat", category: "waistcoat", audience: "men", price: 4500, days: 7, kind: "waistcoat", color: "#3b1f2b", desc: "Fully lined waistcoat, six buttons, welt pockets. Pairs with any kurta." },
      { title: "Kids Kurta Pajama", category: "kids_wear", audience: "kids", price: 1400, days: 3, kind: "kids", color: "#c9e0d1", trouser: "#f7f4ec", desc: "Soft cotton kurta pajama for ages 3–12." },
    ],
    fabrics: [
      ["Premium Wash & Wear", "wash_and_wear", "Steel Grey", "#7f8a96", 650, 80],
      ["Egyptian Cotton", "cotton", "Off White", "#f2efe6", 900, 60],
      ["Winter Karandi", "karandi", "Camel", "#b08b5b", 1500, 40],
      ["Boski Silk", "silk", "Ivory Gold", "#e9dcc0", 3200, 25],
      ["Pure Khaddar", "khaddar", "Charcoal", "#3c3c3c", 950, 45],
      ["Latha Cotton", "cotton", "Sky Blue", "#a9c4dd", 700, 3],
    ],
  },
  {
    key: "sadia",
    owner: "Sadia Rehman",
    email: "sadia@dressify.pk",
    phone: "03001234502",
    shopName: "Silai by Sadia",
    area: "Model Town",
    city: "Lahore",
    lat: 31.4846,
    lng: 74.3236,
    bio: "A home atelier run by Sadia and her daughters. Ladies' 3-piece suits, kurtis and festive frocks — stitched with patience and finished by hand.",
    serves: ["women", "kids"],
    specialties: ["shalwar_kameez", "kurti", "frock", "kids_wear"],
    years: 12,
    home: true,
    women: true,
    visit: true,
    capacity: 2,
    cover: ["#7a4a52", "#c79a8f"],
    designs: [
      { title: "Lawn 3-Piece Suit", category: "shalwar_kameez", audience: "women", price: 2800, days: 6, kind: "kameez_women", color: "#e6b8b0", trouser: "#f4ece4", desc: "Straight shirt with lace-trimmed daman, trouser and dupatta finishing." },
      { title: "Festive Anarkali Frock", category: "frock", audience: "women", price: 8500, days: 10, kind: "frock", color: "#6b1f3a", desc: "Floor-length anarkali with gota trim and fitted bodice." },
      { title: "Everyday Kurti", category: "kurti", audience: "women", price: 1800, days: 4, kind: "kameez_women", color: "#2f5d62", trouser: "#e9e1d2", desc: "Short kurti with round neck and three-quarter sleeves." },
      { title: "Little Girls' Frock", category: "kids_wear", audience: "kids", price: 2200, days: 5, kind: "frock", color: "#f1c9d4", desc: "Twirl-ready frock for ages 2–10, cotton lining." },
    ],
    fabrics: [
      ["Printed Lawn", "lawn", "Blush Pink", "#e6b8b0", 750, 50],
      ["Chiffon", "chiffon", "Emerald", "#1f5c4a", 1600, 30],
      ["Cambric", "cambric", "Mustard", "#d4a43a", 680, 40],
      ["Raw Silk", "silk", "Maroon", "#6b1f3a", 2900, 18],
    ],
  },
  {
    key: "nafees",
    owner: "Nafees Ahmed",
    email: "nafees@dressify.pk",
    phone: "03001234503",
    shopName: "Nafees Bespoke",
    area: "Gulberg III",
    city: "Lahore",
    lat: 31.5106,
    lng: 74.3441,
    bio: "Formal menswear house: sherwanis, prince coats and pant coats cut to your measurements with full canvas construction.",
    serves: ["men"],
    specialties: ["sherwani", "pant_coat", "waistcoat"],
    years: 18,
    capacity: 2,
    cover: ["#17140f", "#4a3f30"],
    designs: [
      { title: "Groom's Jamawar Sherwani", category: "sherwani", audience: "men", price: 38000, days: 21, kind: "sherwani", color: "#e8dcc2", desc: "Jamawar sherwani with hand-finished zardozi collar and nine covered buttons." },
      { title: "Black Prince Coat", category: "sherwani", audience: "men", price: 22000, days: 14, kind: "sherwani", color: "#1c1c1f", desc: "Slim prince coat in fine suiting, perfect for mehndi and walima." },
      { title: "Jamawar Waistcoat", category: "waistcoat", audience: "men", price: 6500, days: 7, kind: "waistcoat", color: "#5a2a2a", desc: "Silk jamawar waistcoat with satin back." },
    ],
    fabrics: [
      ["Jamawar", "jamawar", "Antique Gold", "#b9965b", 3800, 22],
      ["Velvet", "velvet", "Midnight", "#1d2233", 4200, 15],
      ["Raw Silk", "silk", "Champagne", "#e8dcc2", 3400, 20],
    ],
  },
  {
    key: "zari",
    owner: "Farzana Bibi",
    email: "zari@dressify.pk",
    phone: "03001234504",
    shopName: "Zari House Bridal",
    area: "Liberty, Gulberg",
    city: "Lahore",
    lat: 31.5108,
    lng: 74.3486,
    bio: "Bridal and formal womenswear — lehengas, ghararas and peshwas with hand embroidery from our own karigars.",
    serves: ["women"],
    specialties: ["lehenga", "gharara", "frock"],
    years: 15,
    women: true,
    capacity: 1,
    cover: ["#5e1a2c", "#b0703c"],
    designs: [
      { title: "Bridal Lehenga", category: "lehenga", audience: "women", price: 65000, days: 30, kind: "lehenga", color: "#8f1d2c", desc: "Heavily embroidered bridal lehenga with can-can and choli." },
      { title: "Mehndi Gharara", category: "gharara", audience: "women", price: 28000, days: 21, kind: "lehenga", color: "#d9a520", desc: "Mustard gharara with gota patti and short shirt." },
      { title: "Walima Maxi", category: "frock", audience: "women", price: 42000, days: 25, kind: "frock", color: "#c9b8d8", desc: "Pastel maxi with pearl and dabka work." },
    ],
    fabrics: [
      ["Organza", "organza", "Tea Pink", "#e9c3c0", 2600, 30],
      ["Velvet", "velvet", "Royal Red", "#8f1d2c", 4800, 12],
    ],
  },
  {
    key: "rehman",
    owner: "Abdul Rehman",
    email: "rehman@dressify.pk",
    phone: "03001234505",
    shopName: "Rehman Cloth & Stitch",
    area: "Garden Town",
    city: "Lahore",
    lat: 31.5032,
    lng: 74.3168,
    bio: "Cloth shop and tailor under one roof. Pick your fabric here, we stitch it the same week.",
    serves: ["men", "women"],
    specialties: ["shalwar_kameez", "kurta", "alteration"],
    years: 9,
    capacity: 5,
    cover: ["#33443d", "#a3a089"],
    designs: [
      { title: "Summer Lawn Kurta", category: "kurta", audience: "men", price: 1600, days: 3, kind: "kurta", color: "#e8efe9", trouser: "#e8efe9", desc: "Breathable kurta for summer, simple round neck." },
      { title: "Ladies Shalwar Kameez", category: "shalwar_kameez", audience: "women", price: 2400, days: 5, kind: "kameez_women", color: "#9cb8a5", trouser: "#f1ede4", desc: "Clean straight shirt with piping." },
      { title: "Alteration (fit adjust)", category: "alteration", audience: "men", price: 500, days: 1, kind: "kurta", color: "#d8d2c6", desc: "Take-in, shorten or let-out one garment." },
    ],
    fabrics: [
      ["Lawn", "lawn", "Mint", "#9cb8a5", 600, 70],
      ["Cotton", "cotton", "White", "#f7f5ef", 650, 90],
      ["Wash & Wear", "wash_and_wear", "Navy", "#1f2f4a", 620, 55],
      ["Linen", "linen", "Sand", "#d8c7a6", 980, 25],
    ],
  },
  {
    key: "amna",
    owner: "Amna Tariq",
    email: "amna@dressify.pk",
    phone: "03001234506",
    shopName: "Amna's Atelier",
    area: "Johar Town",
    city: "Lahore",
    lat: 31.4697,
    lng: 74.2728,
    bio: "Modest wear from my home studio — abayas, kurtis and co-ord sets with clean finishing.",
    serves: ["women"],
    specialties: ["abaya", "kurti", "shalwar_kameez"],
    years: 6,
    home: true,
    women: true,
    capacity: 2,
    cover: ["#2b2b33", "#8c7e72"],
    designs: [
      { title: "Classic Black Abaya", category: "abaya", audience: "women", price: 4800, days: 7, kind: "abaya", color: "#1a1a1d", desc: "Nida fabric abaya with flared sleeves and hidden snaps." },
      { title: "Embroidered Abaya", category: "abaya", audience: "women", price: 6800, days: 9, kind: "abaya", color: "#3a3f4a", desc: "Abaya with tonal embroidery on sleeves." },
      { title: "Linen Co-ord Kurti", category: "kurti", audience: "women", price: 2600, days: 5, kind: "kameez_women", color: "#c9b79c", trouser: "#c9b79c", desc: "Kurti and straight pants in matching linen." },
    ],
  },
  {
    key: "bashir",
    owner: "Ustad Bashir",
    email: "bashir@dressify.pk",
    phone: "03001234507",
    shopName: "Ustad Bashir Darzi",
    area: "Mozang",
    city: "Lahore",
    lat: 31.5536,
    lng: 74.3147,
    bio: "Old-school darzi since 1986. Honest prices, quick alterations and kids' clothes.",
    serves: ["men", "kids"],
    specialties: ["shalwar_kameez", "kids_wear", "alteration"],
    years: 38,
    capacity: 6,
    cover: ["#4b3a2a", "#a68a64"],
    designs: [
      { title: "Simple Shalwar Kameez", category: "shalwar_kameez", audience: "men", price: 1500, days: 4, kind: "kameez_men", color: "#d9d3c5", trouser: "#d9d3c5", desc: "No-fuss everyday suit." },
      { title: "School Uniform Kurta", category: "kids_wear", audience: "kids", price: 1100, days: 3, kind: "kids", color: "#f4f4f0", trouser: "#2f3b55", desc: "Durable uniform stitching for boys." },
    ],
  },
  {
    key: "noor",
    owner: "Noor Fatima",
    email: "noor@dressify.pk",
    phone: "03001234508",
    shopName: "Noor Stitches",
    area: "Gulberg II",
    city: "Lahore",
    lat: 31.5226,
    lng: 74.3523,
    bio: "Home-based tailoring for women and little ones. Party frocks are my favourite!",
    serves: ["women", "kids"],
    specialties: ["frock", "kurti", "kids_wear"],
    years: 8,
    home: true,
    women: true,
    capacity: 2,
    cover: ["#5c6b8a", "#c8b6c9"],
    designs: [
      { title: "Party Frock", category: "frock", audience: "women", price: 6500, days: 8, kind: "frock", color: "#2c4a7a", desc: "Mid-length party frock with net sleeves." },
      { title: "Cotton Kurti", category: "kurti", audience: "women", price: 1700, days: 4, kind: "kameez_women", color: "#f0d9a8", trouser: "#f5efe3", desc: "Easy cotton kurti with button placket." },
      { title: "Eid Frock (Girls)", category: "kids_wear", audience: "kids", price: 2400, days: 5, kind: "frock", color: "#e7a3b5", desc: "Festive frock for girls with gota lace." },
    ],
  },
  {
    key: "sherwanistudio",
    owner: "Kamran Javed",
    email: "kamran@dressify.pk",
    phone: "03001234509",
    shopName: "The Sherwani Studio",
    area: "DHA Phase 3",
    city: "Lahore",
    lat: 31.4778,
    lng: 74.3805,
    bio: "Contemporary groomwear — sherwanis, waistcoats and pant coats with modern cuts.",
    serves: ["men"],
    specialties: ["sherwani", "waistcoat", "pant_coat"],
    years: 11,
    capacity: 2,
    cover: ["#1b2a33", "#6f7f86"],
    designs: [
      { title: "Ivory Sherwani", category: "sherwani", audience: "men", price: 32000, days: 18, kind: "sherwani", color: "#efe8d8", desc: "Ivory raw-silk sherwani with antique buttons." },
      { title: "Charcoal Waistcoat", category: "waistcoat", audience: "men", price: 5200, days: 6, kind: "waistcoat", color: "#3a3d42", desc: "Tailored waistcoat in wool blend." },
    ],
  },
  {
    key: "hina",
    owner: "Hina Saleem",
    email: "hina@dressify.pk",
    phone: "03001234510",
    shopName: "Hina's Home Boutique",
    area: "Samanabad",
    city: "Lahore",
    lat: 31.5343,
    lng: 74.2953,
    bio: "Stitching ladies' suits from home for 10 years. Neat work, fair price, always on time.",
    serves: ["women"],
    specialties: ["shalwar_kameez", "kurti"],
    years: 10,
    home: true,
    women: true,
    capacity: 3,
    cover: ["#6f4f3a", "#d9b99b"],
    designs: [
      { title: "Daily Wear 3-Piece", category: "shalwar_kameez", audience: "women", price: 2200, days: 5, kind: "kameez_women", color: "#b9cbd9", trouser: "#f3efe7", desc: "Comfortable everyday suit with tulip shalwar." },
      { title: "Embroidered Kurti", category: "kurti", audience: "women", price: 2400, days: 5, kind: "kameez_women", color: "#7e2b3b", trouser: "#efe6d8", desc: "Kurti with neckline embroidery." },
    ],
  },
  {
    key: "clifton",
    owner: "Sana Mirza",
    email: "clifton@dressify.pk",
    phone: "03001234511",
    shopName: "Clifton Couture",
    area: "Clifton Block 5",
    city: "Karachi",
    lat: 24.8138,
    lng: 67.0299,
    bio: "Karachi atelier for formal and bridal womenswear.",
    serves: ["women"],
    specialties: ["lehenga", "frock", "shalwar_kameez"],
    years: 14,
    women: true,
    capacity: 2,
    cover: ["#24404f", "#9cb4b8"],
    designs: [{ title: "Formal Maxi", category: "frock", audience: "women", price: 18000, days: 14, kind: "frock", color: "#24404f", desc: "Floor-length formal maxi." }],
  },
  {
    key: "f7",
    owner: "Imran Qureshi",
    email: "f7@dressify.pk",
    phone: "03001234512",
    shopName: "F-7 Tailors",
    area: "F-7 Markaz",
    city: "Islamabad",
    lat: 33.7213,
    lng: 73.0533,
    bio: "Islamabad's trusted gents' tailor for suits and kurtas.",
    serves: ["men"],
    specialties: ["shalwar_kameez", "pant_coat", "kurta"],
    years: 20,
    capacity: 3,
    cover: ["#2f3b2f", "#8fa38a"],
    designs: [{ title: "Executive Shalwar Kameez", category: "shalwar_kameez", audience: "men", price: 2600, days: 5, kind: "kameez_men", color: "#e7e3da", trouser: "#e7e3da", desc: "Crisp formal suit." }],
  },
  {
    key: "faisal",
    owner: "Faisal Khan",
    email: "faisal@dressify.pk",
    phone: "03001234513",
    shopName: "Faisal Tailoring",
    area: "Ichhra",
    city: "Lahore",
    lat: 31.5276,
    lng: 74.3187,
    bio: "New shop in Ichhra — gents' suits and alterations.",
    serves: ["men"],
    specialties: ["shalwar_kameez", "alteration"],
    years: 5,
    capacity: 3,
    status: "pending",
    cover: ["#3a3a3a", "#9a9a9a"],
    designs: [],
  },
];

const CUSTOMERS = [
  { name: "Ayesha Khan", email: "ayesha@example.com", phone: "03211234567" },
  { name: "Bilal Ahmed", email: "bilal@example.com", phone: "03211234568" },
  { name: "Fatima Noor", email: "fatima@example.com", phone: "03211234569" },
  { name: "Hamza Malik", email: "hamza@example.com", phone: "03211234570" },
  { name: "Zainab Ali", email: "zainab@example.com", phone: "03211234571" },
  { name: "Usman Tariq", email: "usman@example.com", phone: "03211234572" },
  { name: "Mehwish Raza", email: "mehwish@example.com", phone: "03211234573" },
  { name: "Ali Hassan", email: "ali@example.com", phone: "03211234574" },
];

const REVIEW_LINES = [
  [5, "Perfect fitting, collar is exactly how I wanted. Delivered a day early."],
  [5, "Bohat acha kaam. Stitching is neat and the rider was on time."],
  [4, "Good finishing. Sleeves were slightly long but they fixed it quickly."],
  [5, "Best tailor I've found in Lahore. Will order again for Eid."],
  [4, "Nice work and polite. Took one extra day."],
  [5, "Measurements were spot on from my saved profile. Loved it."],
] as const;

async function main() {
  console.log("→ Resetting tables");
  await db.execute(sql`TRUNCATE users, tailor_profiles, designs, fabrics, orders, order_items, order_events, payments, messages, notifications, push_subscriptions, reviews, appointments, inventory_items, inventory_logs, forum_posts, forum_replies, favorites, addresses, measurement_profiles, tailor_day_overrides, tailor_slot_usage RESTART IDENTITY CASCADE`);

  console.log("→ Writing demo artwork");
  const [adminHash, tailorHash, customerHash] = await Promise.all([pw("Admin@12345"), pw("Tailor@123"), pw("Customer@123")]);

  const [admin] = await db.insert(s.users).values({ role: "admin", name: "Dressify Admin", email: "admin@dressify.pk", phone: "03000000000", passwordHash: adminHash }).returning();

  /* Customers */
  const customers = await db
    .insert(s.users)
    .values(CUSTOMERS.map((c) => ({ ...c, role: "customer" as const, passwordHash: customerHash })))
    .returning();
  const ayesha = customers[0];

  /* Tailors, designs, fabrics */
  const tailorIds: Record<string, { id: string; userId: string; slug: string; designs: (typeof s.designs.$inferSelect)[]; fabrics: (typeof s.fabrics.$inferSelect)[] }> = {};
  for (const t of TAILORS) {
    const [u] = await db.insert(s.users).values({ role: "tailor", name: t.owner, email: t.email, phone: t.phone, passwordHash: tailorHash }).returning();
    const slug = t.key === "masterji" ? "master-ji-tailors-shadman" : `${t.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${t.area.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/-+$/, "");
    const coverUrl = await art(`covers/${t.key}.svg`, coverSvg(t.cover[0], t.cover[1]));
    const [profile] = await db
      .insert(s.tailorProfiles)
      .values({
        userId: u.id,
        shopName: t.shopName,
        slug,
        bio: t.bio,
        phone: t.phone,
        city: t.city,
        area: t.area,
        addressLine: `${t.area}, ${t.city}`,
        lat: t.lat,
        lng: t.lng,
        serves: t.serves,
        specialties: t.specialties,
        isHomeBased: Boolean(t.home),
        isWomenLed: Boolean(t.women),
        offersHomeVisit: Boolean(t.visit),
        yearsExperience: t.years,
        dailyCapacity: t.capacity,
        workingDays: [1, 2, 3, 4, 5, 6],
        status: t.status ?? "approved",
        coverUrl,
        priceFrom: t.designs.length ? Math.min(...t.designs.map((d) => d.price)) : 0,
      })
      .returning();

    const designRows = [];
    for (const [i, d] of t.designs.entries()) {
      const img = await art(`designs/${t.key}-${i}.svg`, lookbookSvg(d.kind, d.color, { trouser: d.trouser, bg: i % 2 ? "#ece4d6" : "#f1ebe1" }));
      const tryOn = await art(`tryon/${t.key}-${i}.svg`, tryOnSvg(d.kind, d.color));
      designRows.push({ tailorId: profile.id, title: d.title, description: d.desc, category: d.category, audience: d.audience, price: d.price, durationDays: d.days, images: [img], tryOnUrl: d.kind === "kids" ? null : tryOn });
    }
    const insertedDesigns = designRows.length ? await db.insert(s.designs).values(designRows).returning() : [];

    const fabricRows = [];
    for (const [i, f] of (t.fabrics ?? []).entries()) {
      const img = await art(`fabrics/${t.key}-${i}.svg`, swatchSvg(f[1], f[3]));
      fabricRows.push({ tailorId: profile.id, name: f[0], material: f[1], colorName: f[2], colorHex: f[3], pricePerMeter: f[4], stockMeters: f[5], imageUrl: img });
    }
    const insertedFabrics = fabricRows.length ? await db.insert(s.fabrics).values(fabricRows).returning() : [];
    tailorIds[t.key] = { id: profile.id, userId: u.id, slug, designs: insertedDesigns, fabrics: insertedFabrics };
  }

  /* Customer data for Ayesha */
  const [mAyesha, mFather] = await db
    .insert(s.measurementProfiles)
    .values([
      { userId: ayesha.id, name: "Me", gender: "women", values: { shoulder: 14.5, bust: 36, waist: 30, hip: 39, shirtLength: 40, sleeveLength: 21, armhole: 17, frontNeckDepth: 6.5, backNeckDepth: 4, trouserLength: 38, thigh: 22, bottom: 14 }, notes: "Slightly loose fit" },
      { userId: ayesha.id, name: "Abbu", gender: "men", values: { neck: 16, shoulder: 18.5, chest: 42, waist: 38, hip: 42, shirtLength: 42, sleeveLength: 24, armhole: 20, bicep: 14, wrist: 9, trouserLength: 40, thigh: 25, bottom: 16 }, notes: null },
    ])
    .returning();
  const [addr] = await db
    .insert(s.addresses)
    .values({ userId: ayesha.id, label: "Home", line1: "House 24, Street 7, Block E", area: "Gulberg II", city: "Lahore", phone: ayesha.phone, lat: 31.5175, lng: 74.3502, isDefault: true })
    .returning();
  await db.insert(s.favorites).values([
    { userId: ayesha.id, tailorId: tailorIds.sadia.id },
    { userId: ayesha.id, tailorId: tailorIds.masterji.id },
  ]);

  /* Orders: a realistic history across statuses */
  console.log("→ Creating orders, chats and reviews");
  type OrderPlan = { tailor: string; customer: (typeof customers)[number]; status: s.OrderStatus; designIdx: number[]; fabric: "own" | "store"; slotOffset: number; pay: s.PaymentMethod; review?: number; chat?: [boolean, string][] };
  const plans: OrderPlan[] = [
    // Ayesha's own orders (customer demo)
    { tailor: "masterji", customer: ayesha, status: "in_stitching", designIdx: [2], fabric: "own", slotOffset: -1, pay: "easypaisa", chat: [[true, "Assalam-o-Alaikum, please keep the collar a bit narrow."], [false, "Walaikum Salam, ji bilkul. Narrow ban collar, 1.25 inch."], [true, "Shukriya! And cuffs with the same embroidery please."], [false, "Done. Stitching started today, ready by the due date In shaa Allah."]] },
    { tailor: "sadia", customer: ayesha, status: "placed", designIdx: [0], fabric: "store", slotOffset: 3, pay: "cod" },
    { tailor: "sadia", customer: ayesha, status: "delivered", designIdx: [2], fabric: "own", slotOffset: -20, pay: "card", review: 0 },
    // Master Ji's dashboard (tailor demo)
    { tailor: "masterji", customer: customers[1], status: "placed", designIdx: [0], fabric: "own", slotOffset: 2, pay: "cod" },
    { tailor: "masterji", customer: customers[3], status: "placed", designIdx: [1, 3], fabric: "store", slotOffset: 4, pay: "easypaisa" },
    { tailor: "masterji", customer: customers[5], status: "confirmed", designIdx: [0], fabric: "own", slotOffset: 1, pay: "cod" },
    { tailor: "masterji", customer: customers[7], status: "pickup_scheduled", designIdx: [2], fabric: "own", slotOffset: 1, pay: "card" },
    { tailor: "masterji", customer: customers[1], status: "ready", designIdx: [3], fabric: "store", slotOffset: -4, pay: "cod" },
    { tailor: "masterji", customer: customers[3], status: "delivered", designIdx: [0], fabric: "own", slotOffset: -6, pay: "cod", review: 1 },
    { tailor: "masterji", customer: customers[5], status: "delivered", designIdx: [1], fabric: "store", slotOffset: -18, pay: "easypaisa", review: 3 },
    { tailor: "masterji", customer: customers[7], status: "delivered", designIdx: [4], fabric: "own", slotOffset: -25, pay: "cod", review: 4 },
    // Reviews for other tailors so ratings look lived-in
    { tailor: "sadia", customer: customers[2], status: "delivered", designIdx: [1], fabric: "own", slotOffset: -30, pay: "card", review: 5 },
    { tailor: "sadia", customer: customers[4], status: "delivered", designIdx: [0], fabric: "store", slotOffset: -14, pay: "cod", review: 3 },
    { tailor: "nafees", customer: customers[3], status: "delivered", designIdx: [1], fabric: "own", slotOffset: -40, pay: "card", review: 0 },
    { tailor: "nafees", customer: customers[5], status: "delivered", designIdx: [2], fabric: "store", slotOffset: -22, pay: "card", review: 2 },
    { tailor: "zari", customer: customers[6], status: "delivered", designIdx: [1], fabric: "own", slotOffset: -45, pay: "card", review: 1 },
    { tailor: "rehman", customer: customers[1], status: "delivered", designIdx: [0], fabric: "store", slotOffset: -10, pay: "cod", review: 4 },
    { tailor: "rehman", customer: customers[7], status: "delivered", designIdx: [1], fabric: "store", slotOffset: -16, pay: "cod", review: 2 },
    { tailor: "amna", customer: customers[4], status: "delivered", designIdx: [0], fabric: "own", slotOffset: -19, pay: "easypaisa", review: 5 },
    { tailor: "noor", customer: customers[6], status: "delivered", designIdx: [0], fabric: "own", slotOffset: -21, pay: "cod", review: 0 },
    { tailor: "noor", customer: customers[2], status: "delivered", designIdx: [2], fabric: "own", slotOffset: -9, pay: "cod", review: 3 },
    { tailor: "bashir", customer: customers[3], status: "delivered", designIdx: [0], fabric: "own", slotOffset: -11, pay: "cod", review: 2 },
    { tailor: "hina", customer: customers[4], status: "delivered", designIdx: [0], fabric: "own", slotOffset: -13, pay: "cod", review: 1 },
    { tailor: "sherwanistudio", customer: customers[5], status: "delivered", designIdx: [0], fabric: "own", slotOffset: -35, pay: "card", review: 3 },
  ];

  const flows: Record<"own" | "store", s.OrderStatus[]> = {
    own: ["placed", "confirmed", "pickup_scheduled", "fabric_picked", "in_stitching", "ready", "out_for_delivery", "delivered"],
    store: ["placed", "confirmed", "in_stitching", "ready", "out_for_delivery", "delivered"],
  };

  const created: { plan: OrderPlan; order: typeof s.orders.$inferSelect }[] = [];
  for (const plan of plans) {
    const t = tailorIds[plan.tailor];
    const items = plan.designIdx.map((i) => t.designs[i]).filter(Boolean);
    if (!items.length) continue;
    const fab = plan.fabric === "store" ? t.fabrics : [];
    const lines = items.map((d, i) => ({ d, f: fab[i % Math.max(fab.length, 1)], price: d.price, quantity: 1, fabricPricePerMeter: fab.length ? fab[i % fab.length].pricePerMeter : null, fabricMeters: fab.length ? (d.audience === "kids" ? 2 : 3) : null }));
    const fabricSource = fab.length ? plan.fabric : "own";
    const money = priceOrder(lines, fabricSource);
    const slotDate = addDays(today, plan.slotOffset);
    const createdAt = new Date(Math.min(Date.parse(`${addDays(slotDate, -2)}T10:00:00+05:00`), Date.now() - 3 * 3600_000));
    const isAyesha = plan.customer.id === ayesha.id;
    const measurement = isAyesha ? (items[0].audience === "men" ? mFather : mAyesha) : null;
    const isDone = plan.status === "delivered";
    const [o] = await db
      .insert(s.orders)
      .values({
        number: num(),
        customerId: plan.customer.id,
        tailorId: t.id,
        status: plan.status,
        fabricSource,
        paymentMethod: plan.pay,
        paymentStatus: plan.pay === "cod" ? (isDone ? "paid" : "unpaid") : "paid",
        slotDate,
        dueDate: addDays(slotDate, Math.max(...items.map((d) => d.durationDays))),
        measurements: measurement
          ? { profileName: measurement.name, gender: measurement.gender, values: measurement.values, notes: measurement.notes }
          : { profileName: "Me", gender: items[0].audience, values: items[0].audience === "women" ? { shoulder: 14, bust: 35, waist: 29, hip: 38, shirtLength: 39, sleeveLength: 20, trouserLength: 37 } : { neck: 15.5, shoulder: 18, chest: 40, waist: 34, shirtLength: 41, sleeveLength: 24, trouserLength: 40 } },
        address: isAyesha
          ? { name: ayesha.name, phone: ayesha.phone!, line1: addr.line1, area: addr.area, city: addr.city, lat: addr.lat, lng: addr.lng }
          : { name: plan.customer.name, phone: plan.customer.phone!, line1: `House ${10 + seq}, Main Boulevard`, area: "Gulberg", city: "Lahore" },
        notes: isAyesha && plan.status === "placed" ? "Please add lace on the daman." : null,
        ...money,
        pickupRider: ["pickup_scheduled", "fabric_picked", "in_stitching", "ready", "out_for_delivery", "delivered"].includes(plan.status) && fabricSource === "own" ? { name: "Waqas (rider)", phone: "03331112233", at: createdAt.toISOString() } : null,
        deliveryRider: isDone ? { name: "Waqas (rider)", phone: "03331112233", at: createdAt.toISOString() } : null,
        deliveredAt: isDone ? new Date(Date.parse(`${addDays(slotDate, Math.max(...items.map((d) => d.durationDays)))}T16:00:00+05:00`)) : null,
        createdAt,
      })
      .returning();
    created.push({ plan, order: o });

    await db.insert(s.orderItems).values(
      lines.map((l, i) => ({
        orderId: o.id,
        designId: l.d.id,
        title: l.d.title,
        category: l.d.category,
        price: l.d.price,
        quantity: 1,
        fabricId: fabricSource === "store" ? l.f?.id ?? null : null,
        fabricName: fabricSource === "store" && l.f ? `${l.f.name} · ${l.f.colorName}` : null,
        fabricMeters: fabricSource === "store" ? l.fabricMeters : null,
        fabricPricePerMeter: fabricSource === "store" ? l.fabricPricePerMeter : null,
        lineTotal: money.lineTotals[i],
      })),
    );

    const flow = flows[fabricSource];
    const upto = flow.indexOf(plan.status);
    await db.insert(s.orderEvents).values(flow.slice(0, upto + 1).map((st, i) => ({ orderId: o.id, status: st, createdAt: new Date(createdAt.getTime() + i * 6 * 3600_000), actorId: i === 0 ? plan.customer.id : t.userId })));
    await db.insert(s.payments).values({ orderId: o.id, provider: plan.pay, amount: o.total, status: o.paymentStatus === "paid" ? "paid" : "unpaid", providerRef: plan.pay === "cod" ? null : `TEST-${o.number}` });

    if (slotDate >= addDays(today, 1) && plan.status !== "cancelled") {
      await db
        .insert(s.tailorSlotUsage)
        .values({ tailorId: t.id, day: slotDate, used: 1 })
        .onConflictDoUpdate({ target: [s.tailorSlotUsage.tailorId, s.tailorSlotUsage.day], set: { used: sql`${s.tailorSlotUsage.used} + 1` } });
    }
    if (plan.review !== undefined) {
      const [rating, comment] = REVIEW_LINES[plan.review % REVIEW_LINES.length];
      await db.insert(s.reviews).values({ orderId: o.id, customerId: plan.customer.id, tailorId: t.id, rating, comment, createdAt: new Date(createdAt.getTime() + 12 * 86400_000) });
      await db
        .update(s.tailorProfiles)
        .set({ ratingSum: sql`${s.tailorProfiles.ratingSum} + ${rating}`, ratingCount: sql`${s.tailorProfiles.ratingCount} + 1` })
        .where(sql`${s.tailorProfiles.id} = ${t.id}`);
    }
    if (isDone) await db.update(s.tailorProfiles).set({ ordersCompleted: sql`${s.tailorProfiles.ordersCompleted} + 1` }).where(sql`${s.tailorProfiles.id} = ${t.id}`);
    if (plan.chat) {
      await db.insert(s.messages).values(
        plan.chat.map(([fromCustomer, body], i) => ({ orderId: o.id, senderId: fromCustomer ? plan.customer.id : t.userId, body, createdAt: new Date(createdAt.getTime() + (i + 1) * 40 * 60_000), readAt: i < plan.chat!.length - 1 ? new Date() : null })),
      );
    }
  }

  /* Inventory for the demo tailor */
  const mj = tailorIds.masterji;
  await db.insert(s.inventoryItems).values([
    { tailorId: mj.id, name: "White thread (Gutermann 40)", category: "thread", unit: "spool", quantity: 18, lowStockAt: 6, costPerUnit: 220 },
    { tailorId: mj.id, name: "Black thread", category: "thread", unit: "spool", quantity: 4, lowStockAt: 6, costPerUnit: 220 },
    { tailorId: mj.id, name: "Navy thread", category: "thread", unit: "spool", quantity: 9, lowStockAt: 4, costPerUnit: 220 },
    { tailorId: mj.id, name: "Kameez buttons (pearl)", category: "button", unit: "pack", quantity: 2, lowStockAt: 5, costPerUnit: 180 },
    { tailorId: mj.id, name: "Waistcoat lining", category: "lining", unit: "meter", quantity: 14, lowStockAt: 5, costPerUnit: 350 },
    { tailorId: mj.id, name: "Collar interlining (buckram)", category: "cloth", unit: "meter", quantity: 22, lowStockAt: 8, costPerUnit: 160 },
    { tailorId: mj.id, name: "Shalwar naala", category: "other", unit: "piece", quantity: 40, lowStockAt: 10, costPerUnit: 30 },
    { tailorId: mj.id, name: "Machine needles #14", category: "needle", unit: "pack", quantity: 3, lowStockAt: 2, costPerUnit: 450 },
  ]);

  /* Appointments */
  await db.insert(s.appointments).values([
    { customerId: customers[2].id, tailorId: mj.id, scheduledAt: new Date(Date.parse(`${addDays(today, 1)}T17:00:00+05:00`)), type: "measurement", mode: "at_shop", status: "requested", notes: "For my son's Eid kurta" },
    { customerId: ayesha.id, tailorId: tailorIds.sadia.id, scheduledAt: new Date(Date.parse(`${addDays(today, 2)}T15:30:00+05:00`)), type: "fitting", mode: "home_visit", status: "confirmed", addressText: "House 24, Street 7, Block E, Gulberg II" },
  ]);

  /* Community forum */
  const posts = [
    { author: "masterji", title: "Best interlining for a stiff ban collar?", body: "I've been using regular buckram but it softens after a few washes. Which brand are you using for collars that stay sharp? Lahore suppliers welcome.", category: "techniques", replies: [["bashir", "Fusing interlining from Azam Cloth Market works well — iron at medium heat, not high."], ["nafees", "For formal kurtas we double the fusing at the stand. Holds after 20+ washes."]] },
    { author: "sadia", title: "گھر سے کام: اوقات کیسے سنبھالتی ہیں؟", body: "عید سے پہلے بہت زیادہ آرڈر آ جاتے ہیں۔ آپ لوگ روزانہ کتنے سلاٹ رکھتی ہیں تاکہ وقت پر ڈیلیوری ہو سکے؟", category: "business", replies: [["noor", "میں روزانہ صرف دو سلاٹ رکھتی ہوں اور عید سے دو ہفتے پہلے بکنگ بند کر دیتی ہوں۔"], ["hina", "Overrides feature se Sunday band rakhti hoon, bohat madad milti hai."]] },
    { author: "rehman", title: "Wash & wear supplier with consistent shade?", body: "Getting shade variation between rolls of the same lot. Anyone know a reliable wholesaler in Faisalabad?", category: "suppliers", replies: [] },
    { author: "zari", title: "Tip: photograph embroidery in daylight for your portfolio", body: "Our bookings went up after we re-shot designs near a window at 11am. No flash, plain wall behind. Customers can actually see the work.", category: "general", replies: [["amna", "Great tip, thank you! Trying this today."]] },
  ];
  for (const p of posts) {
    const [post] = await db
      .insert(s.forumPosts)
      .values({ authorId: tailorIds[p.author].userId, title: p.title, body: p.body, category: p.category, replyCount: p.replies.length })
      .returning();
    if (p.replies.length) await db.insert(s.forumReplies).values(p.replies.map(([a, body]) => ({ postId: post.id, authorId: tailorIds[a].userId, body })));
  }

  /* A few notifications so the bell isn't empty */
  const stitching = created.find((c) => c.plan.customer.id === ayesha.id && c.order.status === "in_stitching")!.order;
  const fresh = created.find((c) => c.plan.tailor === "masterji" && c.order.status === "placed")!;
  await db.insert(s.notifications).values([
    { userId: mj.userId, type: "order_placed", data: { number: fresh.order.number, customer: fresh.plan.customer.name, date: fresh.order.slotDate }, link: `/tailor/orders/${fresh.order.id}` },
    { userId: ayesha.id, type: "in_stitching", data: { number: stitching.number, tailor: "Master Ji Tailors" }, link: `/account/orders/${stitching.id}` },
  ]);

  console.log(`✓ Seeded: ${CUSTOMERS.length} customers, ${TAILORS.length} tailors, ${plans.length} orders`);
  console.log("  admin@dressify.pk / Admin@12345");
  console.log("  masterji@dressify.pk / Tailor@123   (tailor demo)");
  console.log("  sadia@dressify.pk / Tailor@123      (women-led home atelier)");
  console.log("  ayesha@example.com / Customer@123   (customer demo)");
  void admin;
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
