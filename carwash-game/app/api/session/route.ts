import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const locationId = String(body.locationId ?? "").trim();

    if (!locationId) {
      return NextResponse.json({ ok: false, error: "locationId is required" }, { status: 400 });
    }

    const token = uuidv4();
    const ttlSeconds = 10 * 60; // 10 minutes
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await pool.execute(
      `
      INSERT INTO wash_sessions (location_id, token, expires_at)
      VALUES (?, ?, ?)
      `,
      [locationId, token, expiresAt]
    );

    return NextResponse.json({ ok: true, token, expiresAt }, { status: 201 });
  } catch (err) {
    console.error("POST /api/session error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "Server error", detail: msg }, { status: 500 });
  }
}