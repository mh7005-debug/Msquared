// Researcher command line for the deployed site.
//   MSQ_URL=https://your-app.vercel.app EXPORT_PASSWORD=... npm run export          -> saves both CSVs here
//   MSQ_URL=... EXPORT_PASSWORD=... npm run delete-session -- abcd-efgh-ijkm        -> deletes one session
//   MSQ_URL=... EXPORT_PASSWORD=... npm run delete-session -- ALL                   -> deletes everything
import { writeFile } from 'node:fs/promises';

const [cmd, arg] = process.argv.slice(2);
const base = (process.env.MSQ_URL || 'http://localhost:3000').replace(/\/$/, '');
const pw = process.env.EXPORT_PASSWORD;
if (!pw) {
  console.error('Set EXPORT_PASSWORD (and MSQ_URL for the deployed site).');
  process.exit(1);
}
const headers = { authorization: `Bearer ${pw}` };

if (cmd === 'export') {
  const stamp = new Date().toISOString().slice(0, 10);
  for (const type of ['sessions', 'events']) {
    const r = await fetch(`${base}/api/export?type=${type}`, { headers });
    if (!r.ok) {
      console.error(`${type}: ${r.status} ${await r.text()}`);
      process.exit(1);
    }
    const file = `msquared-${type}-${stamp}.csv`;
    await writeFile(file, await r.text());
    console.log(`Saved ${file}`);
  }
} else if (cmd === 'delete') {
  if (!arg) {
    console.error('Give a session code, or ALL.');
    process.exit(1);
  }
  const q = arg === 'ALL' ? 'all=true&confirm=DELETE-ALL' : `session_id=${encodeURIComponent(arg)}`;
  const r = await fetch(`${base}/api/admin?${q}`, { method: 'DELETE', headers });
  console.log(r.status, await r.text());
} else {
  console.error('Usage: node scripts/admin.js export | delete <code|ALL>');
  process.exit(1);
}
