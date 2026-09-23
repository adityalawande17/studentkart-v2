import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const DECISIONS = ["approved", "rejected"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = (body as { status?: string })?.status;
  if (!status || !DECISIONS.includes(status as (typeof DECISIONS)[number])) {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const listing = await prisma.listing.update({
    where: { id },
    data: {
      moderationStatus: status as (typeof DECISIONS)[number],
      moderationReason: status === "approved" ? null : existing.moderationReason,
    },
  });

  return NextResponse.json({ listing });
}
