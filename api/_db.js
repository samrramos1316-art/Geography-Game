// Minimal client for Neon's HTTP SQL endpoint (the same protocol @neondatabase/serverless
// uses), so the API needs no npm dependencies and the site keeps a zero-install deploy.
const CONNECTION = process.env.DATABASE_URL;

async function sql(query, params = []) {
  if (!CONNECTION) throw new Error('DATABASE_URL is not set');
  const host = new URL(CONNECTION).hostname;
  const res = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': CONNECTION,
      'Neon-Raw-Text-Output': 'false',
      'Neon-Array-Mode': 'false',
    },
    body: JSON.stringify({ query, params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Database error ${res.status}`);
  return body.rows;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS quizzes (
     id text PRIMARY KEY,
     started_at timestamptz NOT NULL DEFAULT now(),
     ended_at timestamptz,
     status text NOT NULL DEFAULT 'started',
     topics text[] NOT NULL,
     scope text NOT NULL,
     countries int NOT NULL,
     questions int NOT NULL,
     answered int NOT NULL DEFAULT 0,
     correct int NOT NULL DEFAULT 0,
     best_streak int NOT NULL DEFAULT 0,
     duration_s int,
     device text
   )`,
  `CREATE TABLE IF NOT EXISTS answers (
     quiz_id text NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
     country text NOT NULL,
     kind text NOT NULL,
     correct boolean NOT NULL,
     PRIMARY KEY (quiz_id, country, kind)
   )`,
  `CREATE INDEX IF NOT EXISTS quizzes_started_idx ON quizzes (started_at DESC)`,
];

let ready;
const ensureSchema = () => (ready ||= (async () => { for (const q of SCHEMA) await sql(q); })());

module.exports = { sql, ensureSchema };
