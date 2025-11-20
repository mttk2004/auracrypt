import { createClient } from '@supabase/supabase-js';

// NOTE: In a real app, these come from process.env.
// For this demo to work immediately, the user MUST replace these placeholders.
// If process.env is not available in this sandbox, we fallback to empty strings which will cause an error UI.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
