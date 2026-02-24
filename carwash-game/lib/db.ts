// lib/db.ts
import mysql from "mysql2/promise";

declare global {
  // Prevent creating multiple pools in dev (Next hot reload)
  // eslint-disable-next-line no-var
  var __mariadbPool: mysql.Pool | undefined;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const pool: mysql.Pool =
  global.__mariadbPool ??
  mysql.createPool({
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  global.__mariadbPool = pool;
}