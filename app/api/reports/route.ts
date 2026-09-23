import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TARGET_TYPES = ["listing", "user"] as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const targetType = (body as { targetType?: string })?.targetType;
  const targetId = (body as { targetId?: string })?.targetId;
  const reason = (body as { reason?: string })?.reason;

  if (!targetType || !TARGET_TYPES.includes(targetType as (typeof TARGET_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const exists =
    targetType === "listing"
      ? await prisma.listing.findUnique({ where: { id: targetId }, select: { id: true } })
      : await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType: targetType as (typeof TARGET_TYPES)[number],
      targetId,
      reason: reason.trim(),
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
