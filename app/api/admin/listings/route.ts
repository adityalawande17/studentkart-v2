import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const listings = await prisma.listing.findMany({
    where: { moderationStatus: "pending" },
    include: { seller: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ listings });
}
