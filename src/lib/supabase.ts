import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oaktfvcndyxypsdjaik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ha3RmdmNuZHl4eWxwc2RqYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MDk5MTIsImV4cCI6MjEwMjE4NTkxMn0.XEktFlHv1CHJRZJS2CHl0mvoJZ943m2d5WenVlxA6W8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

