import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.projautomacao.com.br';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE3OTk1MzU2MDB9.igV-bKwXTRuW1UGWgfaIX1uMC2XOTgO1X0_odxGy2l8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
