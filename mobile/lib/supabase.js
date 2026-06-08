import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Web uygulamasıyla AYNI Supabase projesi
const SUPABASE_URL = "https://ywbbozrsdidburulqygn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3YmJvenJzZGlkYnVydWxxeWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzI3ODcsImV4cCI6MjA5NjA0ODc4N30.uCM_VTaxciHhayLuq7fE-HgX4xKMD8sglFLiuKxQzSA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Oturumu telefonda kalıcı sakla
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Mobilde URL'den oturum okuma yok
    detectSessionInUrl: false,
  },
});
