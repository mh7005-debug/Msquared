// Storage: Postgres (Neon) when DATABASE_URL is set, in-memory otherwise (local dev/tests only).
// Sessions are stored as one JSON document per row so the schema can grow without migrations.
import { HttpError } from './http.js';

let storePromise = null;

export function getStore() {
  if (!storePromise) storePromise = createStore();
  return storePromise;
}

/** For tests: drop the cached store so env changes take effect. */
export function resetStoreForTests() {
  storePromise = null;
}

async function createStore() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) return createPgStore(url);
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    // Never silently lose research data on a deployed site.
    return null;
  }
  return createMemoryStore();
}

function createMemoryStore() {
  const sessions = new Map();
  const events = [];
  let nextId = 1;
  return {
    kind: 'memory',
    async createSession(id, data) {
      if (sessions.has(id)) return false;
      const now = new Date().toISOString();
      sessions.set(id, { session_id: id, data: { ...data }, created_at: now, updated_at: now });
      return true;
    },
    async getSession(id) {
      const s = sessions.get(id);
      return s ? { ...s.data } : null;
    },
    async saveSession(id, data) {
      const s = sessions.get(id);
      if (!s) return null;
      s.data = { ...data };
      s.updated_at = new Date().toISOString();
      return { ...s.data };
    },
    async incrementChatCalls(id) {
      const s = sessions.get(id);
      if (!s) return null;
      s.data.chat_calls = (s.data.chat_calls || 0) + 1;
      return s.data.chat_calls;
    },
    async addEvents(id, list) {
      const now = new Date().toISOString();
      for (const e of list) events.push({ id: nextId++, session_id: id, ...e, created_at: now });
      const s = sessions.get(id);
      if (s) s.data.last_activity_at = now;
    },
    async listSessions() {
      return [...sessions.values()].map((s) => ({ ...s, data: { ...s.data } }));
    },
    async listEvents() {
      return events.map((e) => ({ ...e }));
    },
    async deleteSession(id) {
      const had = sessions.delete(id);
      for (let i = events.length - 1; i >= 0; i--) if (events[i].session_id === id) events.splice(i, 1);
      return had;
    },
    async deleteAll() {
      const n = sessions.size;
      sessions.clear();
      events.length = 0;
      return n;
    },
  };
}

async function createPgStore(url) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  await sql`create table if not exists ms_sessions (
    session_id text primary key,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists ms_events (
    id bigserial primary key,
    session_id text not null references ms_sessions(session_id) on delete cascade,
    path_id smallint,
    event_name text not null,
    component_id text,
    elapsed_ms integer,
    created_at timestamptz not null default now()
  )`;
  await sql`create index if not exists ms_events_session_idx on ms_events(session_id)`;

  return {
    kind: 'postgres',
    async createSession(id, data) {
      const rows = await sql`insert into ms_sessions (session_id, data)
        values (${id}, ${JSON.stringify(data)}::jsonb)
        on conflict (session_id) do nothing returning session_id`;
      return rows.length === 1;
    },
    async getSession(id) {
      const rows = await sql`select data from ms_sessions where session_id = ${id}`;
      return rows[0] ? rows[0].data : null;
    },
    async saveSession(id, data) {
      const rows = await sql`update ms_sessions set data = ${JSON.stringify(data)}::jsonb, updated_at = now()
        where session_id = ${id} returning data`;
      return rows[0] ? rows[0].data : null;
    },
    async incrementChatCalls(id) {
      const rows = await sql`update ms_sessions
        set data = jsonb_set(data, '{chat_calls}', to_jsonb(coalesce((data->>'chat_calls')::int, 0) + 1))
        where session_id = ${id} returning (data->>'chat_calls')::int as n`;
      return rows[0] ? rows[0].n : null;
    },
    async addEvents(id, list) {
      for (const e of list) {
        await sql`insert into ms_events (session_id, path_id, event_name, component_id, elapsed_ms)
          values (${id}, ${e.path_id}, ${e.event_name}, ${e.component_id}, ${e.elapsed_ms})`;
      }
      const now = new Date().toISOString();
      await sql`update ms_sessions set data = jsonb_set(data, '{last_activity_at}', to_jsonb(${now}::text)),
        updated_at = now() where session_id = ${id}`;
    },
    async listSessions() {
      return sql`select session_id, data, created_at, updated_at from ms_sessions order by created_at`;
    },
    async listEvents() {
      return sql`select id, session_id, path_id, event_name, component_id, elapsed_ms, created_at
        from ms_events order by session_id, id`;
    },
    async deleteSession(id) {
      const rows = await sql`delete from ms_sessions where session_id = ${id} returning session_id`;
      return rows.length === 1;
    },
    async deleteAll() {
      const rows = await sql`delete from ms_sessions returning session_id`;
      return rows.length;
    },
  };
}

/** Throws 503 when storage isn't configured on a deployed site. */
export async function requireStore() {
  const store = await getStore();
  if (!store) throw new HttpError(503, 'Research storage is not set up yet. Ask the study team.');
  return store;
}
