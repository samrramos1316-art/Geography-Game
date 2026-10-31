// Records quiz activity from the game: a "start" when a quiz begins and an "end" when it
// finishes, is quit, or the tab is closed mid-quiz.
const { sql, ensureSchema } = require('./_db');

const KINDS = ['shape', 'location', 'capital', 'flag', 'population', 'government', 'language', 'currency'];
const STATUSES = ['finished', 'quit', 'abandoned'];
const DEVICES = ['phone', 'tablet', 'desktop'];
const ID = /^[A-Za-z0-9-]{8,64}$/;
const COUNTRY = /^[A-Z]{3}$/;

const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Body must be JSON' });
    }
  }
  if (!body || !ID.test(body.id || '')) return res.status(400).json({ error: 'Missing quiz id' });

  try {
    await ensureSchema();
    if (body.type === 'start') {
      const topics = (Array.isArray(body.topics) ? body.topics : []).filter((t) => KINDS.includes(t));
      if (!topics.length) return res.status(400).json({ error: 'No topics' });
      await sql(
        `INSERT INTO quizzes (id, topics, scope, countries, questions, device)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [
          body.id,
          topics,
          String(body.scope || 'Whole world').slice(0, 120),
          int(body.countries, 198),
          int(body.questions, 198 * KINDS.length),
          DEVICES.includes(body.device) ? body.device : null,
        ]
      );
    } else if (body.type === 'end') {
      const results = (Array.isArray(body.results) ? body.results : [])
        .slice(0, 198 * KINDS.length)
        .filter((r) => Array.isArray(r) && COUNTRY.test(r[0]) && KINDS.includes(r[1]));
      const correct = results.filter((r) => r[2]).length;
      const updated = await sql(
        `UPDATE quizzes SET status = $2, ended_at = now(), answered = $3, correct = $4,
           best_streak = $5, duration_s = $6
         WHERE id = $1 AND status = 'started' RETURNING id`,
        [
          body.id,
          STATUSES.includes(body.status) ? body.status : 'quit',
          results.length,
          correct,
          int(body.bestStreak, 2000),
          int(body.durationS, 86400),
        ]
      );
      if (updated.length && results.length) {
        await sql(
          `INSERT INTO answers (quiz_id, country, kind, correct)
           SELECT $1, * FROM unnest($2::text[], $3::text[], $4::boolean[])
           ON CONFLICT DO NOTHING`,
          [body.id, results.map((r) => r[0]), results.map((r) => r[1]), results.map((r) => !!r[2])]
        );
      }
    } else {
      return res.status(400).json({ error: 'Unknown event type' });
    }
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save' });
  }
};
