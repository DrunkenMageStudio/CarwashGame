import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Required fields
    const locationId = String(body.locationId ?? "");
    const score = Number(body.score);

    // Optional nickname (truncate to keep it sane)
    const nicknameRaw = body.nickname;
    const nickname =
      nicknameRaw === null || nicknameRaw === undefined
        ? null
        : String(nicknameRaw).trim().slice(0, 24);

    // Validate inputs
    if (!locationId) {
      return NextResponse.json(
        { ok: false, error: "locationId is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(score)) {
      return NextResponse.json(
        { ok: false, error: "score must be a number" },
        { status: 400 }
      );
    }

    // Basic safety bounds
    const safeScore = Math.max(0, Math.min(1_000_000, Math.floor(score)));

    const created = await prisma.score.create({
      data: {
        locationId,
        value: safeScore,
        nickname,
      },
      select: {
        id: true,
        locationId: true,
        value: true,
        nickname: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, score: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/score error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}