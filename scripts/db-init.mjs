/**
 * Applies db/schema.sql to Neon. Requires DATABASE_URL in the environment.
 * Usage: npm run db:init
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL (use .env.local with npm run db:init)");
  process.exit(1);
}

const sql = neon(url);
const ddl = readFileSync(join(__dirname, "../db/schema.sql"), "utf8");

/** Drop leading `--` comment lines so a chunk like `-- note\nCREATE TABLE ...` is not skipped. */
function stripLeadingLineComments(chunk) {
  let t = chunk.trim();
  while (t.startsWith("--")) {
    const nl = t.indexOf("\n");
    if (nl === -1) return "";
    t = t.slice(nl + 1).trim();
  }
  return t;
}

const statements = ddl
  .split(";")
  .map((s) => stripLeadingLineComments(s))
  .filter((s) => s.length > 0);
for (const statement of statements) {
  await sql.query(statement + ";", []);
}
console.log("OK: db/schema.sql applied.");
