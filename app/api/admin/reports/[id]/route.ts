import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const STATUSES = ["open", "actioned", "dismissed"] as const;

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
  if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { status: status as (typeof STATUSES)[number] },
  });

  // Acting on a listing report actually hides the listing — this is what
  // makes a report "actionable" rather than just a row nobody reads.
  if (status === "actioned" && report.targetType === "listing") {
    await prisma.listing.update({
      where: { id: report.targetId },
      data: { moderationStatus: "rejected", moderationReason: `Reported: ${report.reason}` },
    });
  }

  return NextResponse.json({ report: updated });
}
