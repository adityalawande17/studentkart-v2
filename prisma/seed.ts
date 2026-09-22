import "dotenv/config";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Savitribai Phule Pune University main campus, Ganeshkhind, Pune.
// This is the reference point the whole "5km radius" product claim is built around.
const CAMPUS_LAT = 18.5535;
const CAMPUS_LNG = 73.8143;

const SELLER_COUNT = 50;
const LISTING_COUNT = 5000;
const BATCH_SIZE = 1000;
const SEED_PASSWORD = "password123";

const CATEGORIES = ["furniture", "appliances", "textbooks", "electronics", "other"] as const;
const CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;
const ROLES = ["student", "tenant", "hostel_owner", "mess_owner"] as const;

function randomOffset(lat: number, lng: number, distanceKm: number) {
  const bearing = faker.number.float({ min: 0, max: 2 * Math.PI });
  const latRad = (lat * Math.PI) / 180;
  const deltaLat = (distanceKm / 111.32) * Math.cos(bearing);
  const deltaLng = (distanceKm / (111.32 * Math.cos(latRad))) * Math.sin(bearing);
  return { lat: lat + deltaLat, lng: lng + deltaLng };
}

// Realistic distance mix: most listings are genuinely local, a chunk sits
// just outside the 5km radius (the boundary cases the benchmark cares about),
// and a small tail is scattered further out as background noise.
function randomDistanceKm() {
  const r = Math.random();
  if (r < 0.6) return faker.number.float({ min: 0, max: 5 });
  if (r < 0.85) return faker.number.float({ min: 5, max: 15 });
  return faker.number.float({ min: 15, max: 60 });
}

async function seedSellers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const sellers = Array.from({ length: SELLER_COUNT }, (_, i) => ({
    email: `seed-seller-${i}@studentkart.seed`,
    passwordHash,
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(ROLES),
  }));

  await prisma.user.createMany({ data: sellers, skipDuplicates: true });

  return prisma.user.findMany({
    where: { email: { startsWith: "seed-seller-" } },
    select: { id: true },
  });
}

async function seedListings(sellerIds: string[]) {
  let created = 0;

  for (let batchStart = 0; batchStart < LISTING_COUNT; batchStart += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, LISTING_COUNT - batchStart);
    const rows = Array.from({ length: batchSize }, () => {
      const { lat, lng } = randomOffset(CAMPUS_LAT, CAMPUS_LNG, randomDistanceKm());
      return {
        sellerId: faker.helpers.arrayElement(sellerIds),
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 100, max: 15000, dec: 0 }),
        category: faker.helpers.arrayElement(CATEGORIES),
        condition: faker.helpers.arrayElement(CONDITIONS),
        isGraduatingSoon: Math.random() < 0.1,
        lat,
        lng,
      };
    });

    await prisma.listing.createMany({ data: rows });
    created += rows.length;
    console.log(`Seeded ${created}/${LISTING_COUNT} listings`);
  }
}

async function main() {
  console.log("Seeding sellers...");
  const sellers = await seedSellers();
  console.log(`${sellers.length} seed sellers ready`);

  console.log("Seeding listings...");
  await seedListings(sellers.map((s) => s.id));

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
