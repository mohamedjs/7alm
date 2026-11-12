/**
 * Idempotent seed: Egypt geography with shipping prices, two categories and
 * three demo products. Run with `npm run seed:dev` (or `npm run seed` in a container).
 * Admins are not seeded here — set ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD and the api creates the first one.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const zones: Array<[city: string, en: string, ar: string, price: number]> = [
  ["Cairo", "Maadi", "المعادي", 60],
  ["Cairo", "Nasr City", "مدينة نصر", 60],
  ["Cairo", "Heliopolis", "مصر الجديدة", 60],
  ["Cairo", "New Cairo", "القاهرة الجديدة", 65],
  ["Cairo", "Downtown", "وسط البلد", 55],
  ["Cairo", "Shubra", "شبرا", 55],
  ["Cairo", "Zamalek", "الزمالك", 60],
  ["Giza", "Dokki", "الدقي", 60],
  ["Giza", "Mohandessin", "المهندسين", 60],
  ["Giza", "6th of October", "السادس من أكتوبر", 70],
  ["Giza", "Sheikh Zayed", "الشيخ زايد", 70],
  ["Giza", "Haram", "الهرم", 60],
  ["Alexandria", "Smouha", "سموحة", 75],
  ["Alexandria", "Sidi Gaber", "سيدي جابر", 75],
];

async function main() {
  const egypt = await prisma.country.upsert({ where: { name: "Egypt" }, update: {}, create: { name: "Egypt" } });
  for (const [cityName, en, ar, price] of zones) {
    const city = await prisma.city.upsert({
      where: { country_id_name: { country_id: egypt.id, name: cityName } },
      update: {},
      create: { country_id: egypt.id, name: cityName },
    });
    await prisma.zone.upsert({
      where: { city_id_english_name: { city_id: city.id, english_name: en } },
      update: { shipping_price: price, arabic_name: ar },
      create: { city_id: city.id, english_name: en, arabic_name: ar, shipping_price: price },
    });
  }

  const accessories = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: {},
    create: { slug: "accessories", name_ar: "إكسسوارات", name_en: "Accessories", sort_order: 1 },
  });
  const home = await prisma.category.upsert({
    where: { slug: "home" },
    update: {},
    create: { slug: "home", name_ar: "المنزل", name_en: "Home", sort_order: 2 },
  });

  const products = [
    {
      slug: "7alm-smart-bottle",
      name: "زجاجة حلم الذكية",
      description: "زجاجة مياه ستانلس بتحافظ على البرودة 24 ساعة وتفكرك تشرب مية.",
      price: 349,
      compare_at_price: 499,
      quantity: 120,
      category_id: home.id,
      theme_color: "#06b6d4",
      is_featured: true,
      featured_sort: 1,
      quantity_prices: [
        { min_quantity: 1, price: 349, compare_at_price: 499, label: "قطعة واحدة", is_special: false },
        { min_quantity: 2, price: 649, compare_at_price: 998, label: "قطعتين", is_special: true },
        { min_quantity: 3, price: 899, compare_at_price: 1497, label: "3 قطع", is_special: true },
      ],
    },
    {
      slug: "7alm-leather-wallet",
      name: "محفظة جلد طبيعي",
      description: "محفظة جلد طبيعي بخياطة يدوية وحماية RFID.",
      price: 299,
      compare_at_price: 420,
      quantity: 60,
      category_id: accessories.id,
      theme_color: "#f59e0b",
      is_featured: true,
      featured_sort: 2,
      quantity_prices: null,
    },
    {
      slug: "7alm-desk-lamp",
      name: "أباجورة مكتب LED",
      description: "إضاءة LED بثلاث درجات حرارة ومنفذ شحن USB-C.",
      price: 549,
      compare_at_price: 750,
      quantity: 4,
      category_id: home.id,
      theme_color: "#8b5cf6",
      is_featured: false,
      featured_sort: null,
      quantity_prices: null,
    },
  ];
  for (const p of products) {
    const stock_status = p.quantity <= 0 ? "out_of_stock" : p.quantity <= 5 ? "low_stock" : "in_stock";
    const data = {
      ...p,
      stock_status,
      main_image: `https://picsum.photos/seed/${p.slug}/900/900`,
      gallery: [1, 2, 3].map((i) => `https://picsum.photos/seed/${p.slug}-${i}/900/900`),
      quantity_prices: p.quantity_prices ?? undefined,
    };
    await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: data });
  }
  console.log(`seeded ${zones.length} zones, 2 categories, ${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
