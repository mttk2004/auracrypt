import { createClient } from '@supabase/supabase-js';

// NOTE: In a real app, these come from process.env.
// For this demo to work immediately, the user MUST replace these placeholders.
// If process.env is not available in this sandbox, we fallback to empty strings which will cause an error UI.
const SUPABASE_URL = 'https://rlqeltblqblzahcfjrbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscWVsdGJscWJsemFoY2ZqcmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzUyMTksImV4cCI6MjA3OTIxMTIxOX0.0cQ_91LX4iyFx1eeWBWxGnkTzzzXeEfmEyRtagCl9kU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
