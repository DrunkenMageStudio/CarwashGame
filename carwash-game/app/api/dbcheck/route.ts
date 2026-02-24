import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    return NextResponse.json({ ok: true, rows });
  } catch (err: any) {
    // Return useful error details (safe enough for local dev)
    return NextResponse.json(
      {
        ok: false,
        name: err?.name,
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        message: err?.message,
      },
      { status: 500 }
    );
  }
}