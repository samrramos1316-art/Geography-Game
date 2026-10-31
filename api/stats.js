// Owner-only statistics for the dashboard at /owner. Requires the OWNER_PASSWORD
// environment variable, sent as "Authorization: Bearer <password>".
const crypto = require('crypto');
const { sql, ensureSchema } = require('./_db');

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

function authorized(req) {
  const expected = process.env.OWNER_PASSWORD;
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return !!expected && !!given && crypto.timingSafeEqual(digest(expected), digest(given));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.OWNER_PASSWORD) return res.status(500).json({ error: 'OWNER_PASSWORD is not set on the server' });
  if (!authorized(req)) return res.status(401).json({ error: 'Wrong password' });

  const days = Math.max(1, Math.min(3650, parseInt(req.query.days, 10) || 30));
  const since = `q.started_at > now() - make_interval(days => $1)`;
  try {
    await ensureSchema();
    const [totals, daily, topics, accuracy, scopes, devices, hardest, popular, recent] = await Promise.all([
      sql(
        `SELECT count(*)::int AS started,
                count(*) FILTER (WHERE status = 'finished')::int AS finished,
                count(*) FILTER (WHERE status = 'quit')::int AS quit,
                count(*) FILTER (WHERE status IN ('started', 'abandoned'))::int AS unfinished,
                coalesce(sum(answered), 0)::int AS answered,
                coalesce(sum(correct), 0)::int AS correct,
                round(avg(correct::numeric / nullif(answered, 0)) FILTER (WHERE status = 'finished') * 100)::int AS avg_score,
                round(avg(duration_s) FILTER (WHERE status = 'finished'))::int AS avg_duration
         FROM quizzes q WHERE ${since}`,
        [days]
      ),
      sql(
        `SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
                count(*)::int AS started,
                count(*) FILTER (WHERE status = 'finished')::int AS finished
         FROM quizzes q WHERE ${since} GROUP BY 1 ORDER BY 1`,
        [days]
      ),
      sql(`SELECT t AS topic, count(*)::int AS quizzes FROM quizzes q, unnest(q.topics) t WHERE ${since} GROUP BY t`, [days]),
      sql(
        `SELECT a.kind AS topic, count(*)::int AS answered, sum(a.correct::int)::int AS correct
         FROM answers a JOIN quizzes q ON q.id = a.quiz_id WHERE ${since} GROUP BY a.kind`,
        [days]
      ),
      sql(`SELECT scope, count(*)::int AS quizzes FROM quizzes q WHERE ${since} GROUP BY scope ORDER BY 2 DESC LIMIT 12`, [days]),
      sql(`SELECT coalesce(device, 'unknown') AS device, count(*)::int AS quizzes FROM quizzes q WHERE ${since} GROUP BY 1 ORDER BY 2 DESC`, [days]),
      sql(
        `SELECT a.country, count(*)::int AS answered, sum(a.correct::int)::int AS correct
         FROM answers a JOIN quizzes q ON q.id = a.quiz_id WHERE ${since}
         GROUP BY a.country HAVING count(*) >= 3
         ORDER BY sum(a.correct::int)::numeric / count(*), count(*) DESC LIMIT 10`,
        [days]
      ),
      sql(
        `SELECT a.country, count(DISTINCT a.quiz_id)::int AS quizzes
         FROM answers a JOIN quizzes q ON q.id = a.quiz_id WHERE ${since}
         GROUP BY a.country ORDER BY 2 DESC LIMIT 10`,
        [days]
      ),
      sql(
        `SELECT id, started_at, status, topics, scope, countries, questions, answered, correct, duration_s, device
         FROM quizzes q WHERE ${since} ORDER BY started_at DESC LIMIT 40`,
        [days]
      ),
    ]);
    res.status(200).json({ days, totals: totals[0], daily, topics, accuracy, scopes, devices, hardest, popular, recent });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load stats' });
  }
};
