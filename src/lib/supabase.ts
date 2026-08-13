import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oaktfvcndyxypsdjaik.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L4Fv8dUncTj_Ic5YmcycTA_U-XIs1r_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
