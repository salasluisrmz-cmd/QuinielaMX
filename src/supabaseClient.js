import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qennyxeehbnzgbhgyzkz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3atsH6xM4taOmuiOJNnKfQ_Cf5Wng3P";

// sessionStorage: la sesión se cierra al cerrar el navegador/pestaña
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: typeof window !== "undefined" ? window.sessionStorage : undefined },
});
