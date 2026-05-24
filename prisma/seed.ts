// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "Delhi, NCR" },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Tech Park", location: "Bangalore, Karnataka" },
  });

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Wireless Earbuds Pro",
        description:
          "Premium noise-cancelling earbuds with 30hr battery life and Hi-Fi audio.",
        imageUrl:
          "https://images.unsplash.com/photo-1590658165737-15a047b7aca4?w=400",
        price: 299900,
      },
    }),
    prisma.product.create({
      data: {
        name: "Smart Watch Ultra",
        description:
          "Health & fitness tracker with GPS, sleep monitoring, and 7-day battery.",
        imageUrl:
          "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400",
        price: 499900,
      },
    }),
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard TKL",
        description:
          "Tenkeyless mechanical keyboard with Cherry MX switches and RGB backlighting.",
        imageUrl:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
        price: 189900,
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C Hub 7-in-1",
        description:
          "Connect everything — HDMI 4K, 3x USB-A, SD card, PD charging, Ethernet.",
        imageUrl:
          "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400",
        price: 79900,
      },
    }),
    prisma.product.create({
      data: {
        name: "Portable SSD 1TB",
        description:
          "NVMe portable SSD with 1050MB/s read speeds and shock-resistant casing.",
        imageUrl:
          "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=400",
        price: 899900,
      },
    }),
  ]);

  // Stock levels per product per warehouse
  const stockData = [
    // Earbuds
    { productId: products[0].id, warehouseId: mumbai.id, totalUnits: 50 },
    { productId: products[0].id, warehouseId: delhi.id, totalUnits: 30 },
    { productId: products[0].id, warehouseId: bangalore.id, totalUnits: 20 },
    // Smart Watch
    { productId: products[1].id, warehouseId: mumbai.id, totalUnits: 15 },
    { productId: products[1].id, warehouseId: delhi.id, totalUnits: 10 },
    { productId: products[1].id, warehouseId: bangalore.id, totalUnits: 5 },
    // Keyboard
    { productId: products[2].id, warehouseId: mumbai.id, totalUnits: 25 },
    { productId: products[2].id, warehouseId: delhi.id, totalUnits: 2 }, // low stock
    { productId: products[2].id, warehouseId: bangalore.id, totalUnits: 18 },
    // USB Hub
    { productId: products[3].id, warehouseId: mumbai.id, totalUnits: 100 },
    { productId: products[3].id, warehouseId: delhi.id, totalUnits: 80 },
    { productId: products[3].id, warehouseId: bangalore.id, totalUnits: 60 },
    // SSD
    { productId: products[4].id, warehouseId: mumbai.id, totalUnits: 1 }, // very low!
    { productId: products[4].id, warehouseId: delhi.id, totalUnits: 8 },
    { productId: products[4].id, warehouseId: bangalore.id, totalUnits: 12 },
  ];

  await prisma.stockLevel.createMany({ data: stockData });

  console.log("✅ Seed complete!");
  console.log(`   ${3} warehouses`);
  console.log(`   ${products.length} products`);
  console.log(`   ${stockData.length} stock entries`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
