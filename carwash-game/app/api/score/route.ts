import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const locationId = String(body.locationId ?? "").trim();
    const token = String(body.token ?? "").trim();
    const scoreRaw = body.score;

    const nicknameRaw = body.nickname;
    const nickname =
      nicknameRaw === null || nicknameRaw === undefined
        ? null
        : String(nicknameRaw).trim().slice(0, 24);

    if (!locationId) {
      return NextResponse.json(
        { ok: false, error: "locationId is required" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "token is required" },
        { status: 400 }
      );
    }

    const scoreNum =
      typeof scoreRaw === "number" ? scoreRaw : Number(String(scoreRaw ?? ""));
    if (!Number.isFinite(scoreNum)) {
      return NextResponse.json(
        { ok: false, error: "score must be a number" },
        { status: 400 }
      );
    }

    const safeScore = Math.max(0, Math.min(1_000_000, Math.floor(scoreNum)));

    // Validate session token
    const [sessRows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT id, used_at AS usedAt, expires_at AS expiresAt
      FROM wash_sessions
      WHERE token = ? AND location_id = ?
      LIMIT 1
      `,
      [token, locationId]
    );

    const sess = sessRows[0];

    if (!sess) {
      return NextResponse.json(
        { ok: false, error: "Invalid session token" },
        { status: 403 }
      );
    }

    if (sess.usedAt) {
      return NextResponse.json(
        { ok: false, error: "Session already used" },
        { status: 403 }
      );
    }

    if (new Date(sess.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Session expired" },
        { status: 403 }
      );
    }

    // Insert score
    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO scores (location_id, value, nickname)
      VALUES (?, ?, ?)
      `,
      [locationId, safeScore, nickname]
    );

    const insertId = result.insertId;

    // Mark session as used
    await pool.execute(
      `UPDATE wash_sessions SET used_at = NOW() WHERE id = ?`,
      [sess.id]
    );

    // Return created score
    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT id,
             location_id AS locationId,
             value,
             nickname,
             created_at AS createdAt
      FROM scores
      WHERE id = ?
      `,
      [insertId]
    );

    return NextResponse.json(
      { ok: true, score: rows[0] ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/score error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Server error", detail: msg },
      { status: 500 }
    );
  }
}