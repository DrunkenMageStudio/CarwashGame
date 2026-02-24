import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

type RangeKey = "daily" | "weekly" | "all";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfRange(range: RangeKey): Date | null {
  if (range === "all") return null;

  const now = new Date();

  if (range === "daily") {
    // start of local day (server time)
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  // weekly: start of week (Monday) in server time
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = (day + 6) % 7; // Mon->0, Tue->1, Sun->6
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const locationId = (url.searchParams.get("locationId") ?? "").trim();
    const range = (url.searchParams.get("range") ?? "daily") as RangeKey;

    const limitRaw = Number(url.searchParams.get("limit") ?? "10");
    const limit = clampInt(Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 10, 1, 50);

    if (!locationId) {
      return NextResponse.json(
        { ok: false, error: "locationId is required" },
        { status: 400 }
      );
    }

    const safeRange: RangeKey = (["daily", "weekly", "all"] as const).includes(range)
      ? range
      : "daily";

    const start = startOfRange(safeRange);

    // Top scores within the range, per location
    // Sorting: highest score first, then earliest (ties), then id (stable)
    let rows: any[] = [];

    if (start) {
      const [result] = await pool.execute<any[]>(
        `
        SELECT
          id,
          location_id AS locationId,
          value,
          nickname,
          created_at AS createdAt
        FROM scores
        WHERE location_id = ?
          AND created_at >= ?
        ORDER BY value DESC, created_at ASC, id ASC
        LIMIT ?
        `,
        [locationId, start, limit]
      );
      rows = result;
    } else {
      const [result] = await pool.execute<any[]>(
        `
        SELECT
          id,
          location_id AS locationId,
          value,
          nickname,
          created_at AS createdAt
        FROM scores
        WHERE location_id = ?
        ORDER BY value DESC, created_at ASC, id ASC
        LIMIT ?
        `,
        [locationId, limit]
      );
      rows = result;
    }

    return NextResponse.json(
      { ok: true, locationId, range: safeRange, limit, entries: rows },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}