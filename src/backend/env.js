/**
 * Supabase connection. Leave both values empty to run TaskFlow in local mode (no accounts, data in
 * this browser only). Fill them in to turn on sign-in, workspaces and live sync between teammates.
 *
 * Find them in the Supabase dashboard under Project Settings -> API. The anon key is meant to be
 * public: every table is protected by the Row Level Security policies in supabase/schema.sql.
 * Never put the service_role key here.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

/** Pinned build of the official client, loaded only when the values above are set. */
export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

export const cloudEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
