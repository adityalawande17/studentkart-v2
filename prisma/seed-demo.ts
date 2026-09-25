import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { CAMPUS_LAT, CAMPUS_LNG } from "../lib/campus";

// Curated, hand-written demo data for reviewers browsing the deployed app —
// distinct from prisma/seed.ts, which generates the 5,000-listing synthetic
// dataset that /benchmark measures against. This script tells a small,
// believable story: real-sounding listings, a graduating-soon bulk post,
// an in-progress chat, a completed deal with mutual reviews, and one
// flagged listing + one report so the admin queue isn't empty either.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL_SUFFIX = "@studentkart.demo";
const DEMO_PASSWORD = "Demo@1234";

function nearCampus(distanceKm: number, bearingDeg: number) {
  const bearing = (bearingDeg * Math.PI) / 180;
  const latRad = (CAMPUS_LAT * Math.PI) / 180;
  const deltaLat = (distanceKm / 111.32) * Math.cos(bearing);
  const deltaLng = (distanceKm / (111.32 * Math.cos(latRad))) * Math.sin(bearing);
  return { lat: CAMPUS_LAT + deltaLat, lng: CAMPUS_LNG + deltaLng };
}

function photo(slug: string, n: number) {
  return Array.from({ length: n }, (_, i) => ({ url: `https://picsum.photos/seed/studentkart-${slug}-${i}/640/640` }));
}

async function resetDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true },
  });
  const userIds = demoUsers.map((u) => u.id);
  if (userIds.length === 0) return;

  const demoListings = await prisma.listing.findMany({
    where: { sellerId: { in: userIds } },
    select: { id: true },
  });
  const listingIds = demoListings.map((l) => l.id);

  await prisma.review.deleteMany({ where: { OR: [{ raterId: { in: userIds } }, { listingId: { in: listingIds } }] } });
  await prisma.report.deleteMany({ where: { reporterId: { in: userIds } } });
  await prisma.message.deleteMany({ where: { senderId: { in: userIds } } });
  await prisma.conversation.deleteMany({ where: { OR: [{ buyerId: { in: userIds } }, { listingId: { in: listingIds } }] } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [
    { key: "ananya", email: `ananya.deshmukh${DEMO_EMAIL_SUFFIX}`, name: "Ananya Deshmukh", role: "student" as const },
    { key: "rohan", email: `rohan.kulkarni${DEMO_EMAIL_SUFFIX}`, name: "Rohan Kulkarni", role: "student" as const },
    { key: "priya", email: `priya.sharma${DEMO_EMAIL_SUFFIX}`, name: "Priya Sharma", role: "student" as const },
    { key: "aditya", email: `aditya.patil${DEMO_EMAIL_SUFFIX}`, name: "Aditya Patil", role: "student" as const },
    { key: "suresh", email: `suresh.joshi${DEMO_EMAIL_SUFFIX}`, name: "Suresh Joshi", role: "hostel_owner" as const },
    { key: "meera", email: `meera.iyer${DEMO_EMAIL_SUFFIX}`, name: "Meera Iyer", role: "mess_owner" as const },
    { key: "kunal", email: `kunal.shah${DEMO_EMAIL_SUFFIX}`, name: "Kunal Shah", role: "tenant" as const },
    { key: "admin", email: `admin${DEMO_EMAIL_SUFFIX}`, name: "StudentKart Admin", role: "student" as const, isAdmin: true },
  ];

  const created: Record<string, string> = {};
  for (const u of users) {
    const row = await prisma.user.create({
      data: { email: u.email, passwordHash, name: u.name, role: u.role, isAdmin: u.isAdmin ?? false },
    });
    created[u.key] = row.id;
  }
  return created;
}

async function seedListings(u: Record<string, string>) {
  const listings: Record<string, string> = {};

  async function make(
    key: string,
    sellerId: string,
    data: {
      title: string;
      description: string;
      price: number;
      category: "furniture" | "appliances" | "textbooks" | "electronics" | "other";
      condition: "new" | "like_new" | "good" | "fair" | "poor";
      distanceKm: number;
      bearingDeg: number;
      isGraduatingSoon?: boolean;
      moderationStatus?: "approved" | "pending" | "rejected";
      moderationReason?: string;
      photos?: number;
    }
  ) {
    const { lat, lng } = nearCampus(data.distanceKm, data.bearingDeg);
    const row = await prisma.listing.create({
      data: {
        sellerId,
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        condition: data.condition,
        isGraduatingSoon: data.isGraduatingSoon ?? false,
        lat,
        lng,
        moderationStatus: data.moderationStatus ?? "approved",
        moderationReason: data.moderationReason,
        photos: { create: photo(key, data.photos ?? 2) },
      },
    });
    listings[key] = row.id;
  }

  // Regular listings, spread across sellers and categories.
  await make("study-table", u.ananya, {
    title: "Study table with attached bookshelf",
    description: "Sturdy engineered-wood study table, 6 months old. Attached 3-shelf bookrack, no scratches or wobble.",
    price: 1800,
    category: "furniture",
    condition: "good",
    distanceKm: 1.2,
    bearingDeg: 30,
  });
  await make("helmet", u.ananya, {
    title: "ISI-marked scooter helmet, full face",
    description: "Barely used, bought for a Fascino, fits medium head size. No dents or cracks.",
    price: 650,
    category: "other",
    condition: "like_new",
    distanceKm: 1.4,
    bearingDeg: 40,
  });
  await make("laptop", u.rohan, {
    title: "Dell Inspiron 15, i5 11th gen, 8GB RAM",
    description: "Daily driver for 2 years, still runs VS Code and Chrome with 10+ tabs fine. Battery holds ~3.5 hrs. Charger included.",
    price: 28000,
    category: "electronics",
    condition: "good",
    distanceKm: 2.1,
    bearingDeg: 100,
  });
  await make("mechanics-textbooks", u.rohan, {
    title: "Engineering Mechanics + Thermodynamics textbook set (SPPU syllabus)",
    description: "Both books for 2nd year mechanical/civil, minor highlighting in first few chapters only.",
    price: 450,
    category: "textbooks",
    condition: "good",
    distanceKm: 2.3,
    bearingDeg: 110,
  });
  await make("mini-fridge", u.priya, {
    title: "Single-door mini fridge, 45L",
    description: "Perfect for a hostel room, low power draw. Selling because I'm moving to a PG with a shared fridge.",
    price: 4200,
    category: "appliances",
    condition: "good",
    distanceKm: 0.8,
    bearingDeg: 200,
  });
  await make("lamp-organizer", u.priya, {
    title: "Table lamp + study organizer combo",
    description: "Warm-white LED lamp with a 4-compartment desk organizer, used for one semester only.",
    price: 500,
    category: "furniture",
    condition: "like_new",
    distanceKm: 0.9,
    bearingDeg: 210,
  });
  await make("steel-cupboard", u.suresh, {
    title: "Steel cupboard, 3-shelf, barely used",
    description: "Spare cupboard from a hostel room refit. Two working locks, keys included.",
    price: 2200,
    category: "furniture",
    condition: "like_new",
    distanceKm: 1.7,
    bearingDeg: 260,
  });
  await make("induction-cooktop", u.meera, {
    title: "Induction cooktop, 2000W",
    description: "Spare unit from the mess kitchen, works perfectly, comes with the original box.",
    price: 1100,
    category: "appliances",
    condition: "good",
    distanceKm: 1.1,
    bearingDeg: 300,
  });
  await make("badminton-set", u.kunal, {
    title: "Badminton racket set + shuttlecocks",
    description: "2 rackets (Yonex knockoff, still sturdy) and a tube of 6 nylon shuttlecocks.",
    price: 700,
    category: "other",
    condition: "good",
    distanceKm: 1.9,
    bearingDeg: 330,
  });
  await make("dsa-notes", u.kunal, {
    title: "CLRS (Data Structures) + DBMS handwritten notes",
    description: "The Cormen textbook plus a full notebook of DBMS notes that got me through the semester.",
    price: 350,
    category: "textbooks",
    condition: "fair",
    distanceKm: 2.0,
    bearingDeg: 340,
  });

  // Aditya's bulk "moving out" post — all graduating-soon, same seller.
  await make("hostel-setup", u.aditya, {
    title: "Complete hostel room setup — mattress, study chair, table",
    description: "Graduating this year, selling my full room setup together or separately. All in daily-use condition.",
    price: 3500,
    category: "furniture",
    condition: "good",
    distanceKm: 1.0,
    bearingDeg: 60,
    isGraduatingSoon: true,
  });
  await make("led-tv", u.aditya, {
    title: "Samsung 32-inch LED TV",
    description: "3 years old, no dead pixels, remote included. Moving abroad so it has to go.",
    price: 7500,
    category: "electronics",
    condition: "good",
    distanceKm: 1.0,
    bearingDeg: 65,
    isGraduatingSoon: true,
  });
  await make("microwave", u.aditya, {
    title: "Microwave oven, 20L",
    description: "Solo/grill microwave, used mostly for reheating. Works fine, slight scuff on the door handle.",
    price: 2800,
    category: "appliances",
    condition: "good",
    distanceKm: 1.0,
    bearingDeg: 70,
    isGraduatingSoon: true,
  });
  await make("cs-textbook-set", u.aditya, {
    title: "Full 3rd-year CS textbook set (7 books)",
    description: "Everything from DBMS to Computer Networks, SPPU syllabus. Would rather sell as one set.",
    price: 1200,
    category: "textbooks",
    condition: "good",
    distanceKm: 1.0,
    bearingDeg: 75,
    isGraduatingSoon: true,
  });
  await make("bicycle", u.aditya, {
    title: "Bicycle — Hero Sprint, well maintained",
    description: "Serviced 2 months ago, new brake pads. Great for campus commutes.",
    price: 2500,
    category: "other",
    condition: "good",
    distanceKm: 1.0,
    bearingDeg: 80,
    isGraduatingSoon: true,
  });

  // One AI-flagged listing, to populate the admin review queue.
  await make("flagged-iphone", u.kunal, {
    title: "iPhone 15 Pro, urgent sale, cash only!!",
    description: "Need cash urgently, selling today only. No questions, no returns, cash only.",
    price: 8000,
    category: "electronics",
    condition: "like_new",
    distanceKm: 2.2,
    bearingDeg: 350,
    moderationStatus: "pending",
    moderationReason:
      "Implausible price for the stated item combined with urgency language ('urgent', 'today only', 'cash only') — flagged for manual review before publishing.",
    photos: 1,
  });

  return listings;
}

async function seedReport(u: Record<string, string>, listings: Record<string, string>) {
  await prisma.report.create({
    data: {
      reporterId: u.priya,
      targetType: "listing",
      targetId: listings.laptop,
      reason: "Seller asked me to pay through a UPI link outside the app before agreeing to meet. Felt off.",
      status: "open",
    },
  });
}

async function seedConversations(u: Record<string, string>, listings: Record<string, string>) {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000);

  // Active, in-progress negotiation — last message left unread.
  const activeConvo = await prisma.conversation.create({
    data: { listingId: listings["study-table"], buyerId: u.rohan, sellerId: u.ananya, createdAt: hoursAgo(30) },
  });
  const activeMessages: { senderId: string; body: string; hours: number; read: boolean }[] = [
    { senderId: u.rohan, body: "Hi, is the study table still available?", hours: 30, read: true },
    { senderId: u.ananya, body: "Yes! It's in great condition, barely 6 months old.", hours: 29, read: true },
    { senderId: u.rohan, body: "Nice. Would you take ₹1500 for it?", hours: 28, read: true },
    { senderId: u.ananya, body: "I can do ₹1650, that's my final price.", hours: 27, read: true },
    { senderId: u.rohan, body: "Deal. When can I pick it up?", hours: 5, read: true },
    { senderId: u.ananya, body: "Anytime after 5pm today works for me.", hours: 1, read: false },
  ];
  for (const m of activeMessages) {
    await prisma.message.create({
      data: {
        conversationId: activeConvo.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: hoursAgo(m.hours),
        readAt: m.read ? hoursAgo(m.hours - 0.1) : null,
      },
    });
  }

  // Completed deal — mutual confirmation + reviews.
  const dealConvo = await prisma.conversation.create({
    data: {
      listingId: listings["cs-textbook-set"],
      buyerId: u.priya,
      sellerId: u.aditya,
      createdAt: hoursAgo(96),
      buyerConfirmedDeal: true,
      sellerConfirmedDeal: true,
      dealConfirmedAt: hoursAgo(72),
    },
  });
  const dealMessages: { senderId: string; body: string; hours: number }[] = [
    { senderId: u.priya, body: "Hey, are the CS textbooks still up for grabs?", hours: 96 },
    { senderId: u.aditya, body: "Yes, all 7 books together, ₹1200 for the set.", hours: 95 },
    { senderId: u.priya, body: "I'll take it. Can we meet near the CS department tomorrow?", hours: 94 },
    { senderId: u.aditya, body: "Works for me, 11am outside the department gate?", hours: 93 },
    { senderId: u.priya, body: "Perfect, see you then!", hours: 92 },
    { senderId: u.aditya, body: "Just handed them over, thanks for buying the whole set!", hours: 73 },
  ];
  for (const m of dealMessages) {
    await prisma.message.create({
      data: { conversationId: dealConvo.id, senderId: m.senderId, body: m.body, createdAt: hoursAgo(m.hours), readAt: hoursAgo(m.hours - 0.1) },
    });
  }

  await prisma.review.create({
    data: {
      listingId: listings["cs-textbook-set"],
      raterId: u.priya,
      rateeId: u.aditya,
      rating: 5,
      comment: "Books were exactly as described, smooth handover. Would buy from Aditya again!",
      createdAt: hoursAgo(72),
    },
  });
  await prisma.review.create({
    data: {
      listingId: listings["cs-textbook-set"],
      raterId: u.aditya,
      rateeId: u.priya,
      rating: 5,
      comment: "Quick payment, easy to coordinate with. Great buyer.",
      createdAt: hoursAgo(72),
    },
  });
}

async function main() {
  console.log("Resetting any existing demo data...");
  await resetDemoData();

  console.log("Seeding demo users...");
  const u = await seedUsers();

  console.log("Seeding demo listings...");
  const listings = await seedListings(u);

  console.log("Seeding a report on the admin queue...");
  await seedReport(u, listings);

  console.log("Seeding conversations, messages, and reviews...");
  await seedConversations(u, listings);

  console.log(`Done. Demo accounts use password "${DEMO_PASSWORD}", e.g. ananya.deshmukh${DEMO_EMAIL_SUFFIX}`);
  console.log(`Admin account: admin${DEMO_EMAIL_SUFFIX}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
