import "dotenv/config";

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@safeshelf.com";

const CATEGORY_NAMES = [
  "Dairy",
  "Frozen Food",
  "Snacks",
  "Canned Food",
  "Meat",
  "Seafood",
  "Baby Food",
  "Beverages",
  "Produce",
  "Bakery",
];

type SamplePantrySeed = {
  name: string;
  categoryName: string;
  brand?: string;
  quantity?: number;
  storageLocation?: string;
  notes?: string;
};

const SAMPLE_PANTRY: SamplePantrySeed[] = [
  {
    name: "Jif Peanut Butter",
    categoryName: "Snacks",
    brand: "Jif",
    notes: "Seeded pantry item — recall-search demo.",
  },
  {
    name: "Organic Spinach",
    categoryName: "Produce",
    brand: "Nature's Greens",
    quantity: 2,
    storageLocation: "Crisper drawer",
    notes: "Wash before eating.",
  },
  {
    name: "Frozen Pizza",
    categoryName: "Frozen Food",
    quantity: 1,
    storageLocation: "Freezer",
  },
  {
    name: "Canned Tuna",
    categoryName: "Canned Food",
    brand: "Safe Harbor",
    quantity: 4,
    storageLocation: "Pantry",
  },
  {
    name: "Baby Formula",
    categoryName: "Baby Food",
    brand: "Tiny Bites Nutrition",
    quantity: 3,
    storageLocation: "Pantry cupboard",
    notes: "Check batch numbers before serving.",
  },
];

async function seedUsers(): Promise<void> {
  await prisma.user.upsert({
    where: { email: "admin@safeshelf.com" },
    create: {
      name: "Admin User",
      email: "admin@safeshelf.com",
      role: UserRole.ADMIN,
    },
    update: {
      name: "Admin User",
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      name: "Demo User",
      email: DEMO_EMAIL,
      role: UserRole.USER,
    },
    update: {
      name: "Demo User",
      role: UserRole.USER,
    },
  });
}

async function seedCategories(): Promise<void> {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {}, // Leave existing rows unchanged (avoid duplicate inserts).
    });
  }
}

async function seedDemoPantryItems(): Promise<void> {
  const demoUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });

  if (!demoUser) {
    console.warn("[seed] Demo user missing; skipping pantry items.");
    return;
  }

  for (const item of SAMPLE_PANTRY) {
    const category = await prisma.category.findUnique({
      where: { name: item.categoryName },
      select: { id: true },
    });

    if (!category) {
      console.warn(
        `[seed] Category "${item.categoryName}" missing; skipping "${item.name}".`,
      );
      continue;
    }

    const existing = await prisma.pantryItem.findFirst({
      where: { userId: demoUser.id, name: item.name },
      select: { id: true },
    });

    if (existing !== null) {
      continue;
    }

    await prisma.pantryItem.create({
      data: {
        userId: demoUser.id,
        categoryId: category.id,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity ?? 1,
        storageLocation: item.storageLocation ?? null,
        notes: item.notes ?? null,
      },
    });
  }
}

async function main(): Promise<void> {
  console.log("[seed] SafeShelf starter data…");

  await seedUsers();
  await seedCategories();
  await seedDemoPantryItems();

  console.log("[seed] Done.");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
