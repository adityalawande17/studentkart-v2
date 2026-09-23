import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const reports = await prisma.report.findMany({
    where: status ? { status: status as "open" | "actioned" | "dismissed" } : undefined,
    include: { reporter: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}
