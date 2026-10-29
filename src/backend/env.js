/**
 * Supabase connection. Leave both values empty to run TaskFlow in local mode (no accounts, data in
 * this browser only). Fill them in to turn on sign-in, workspaces and live sync between teammates.
 *
 * Find them in the Supabase dashboard under Connect or Project Settings -> API Keys. The anon or
 * publishable key is meant to be public: every table is protected by the Row Level Security
 * policies in supabase/schema.sql.
 * Never put the service_role or secret key here.
 */
export const SUPABASE_URL = 'https://qyetgcvlyhdtllfsgzpy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_xJxJTNGRmHZ2gLE_reLwHg_aodDEsZV';

/** Pinned build of the official client, loaded only when the values above are set. */
export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';

export const cloudEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
