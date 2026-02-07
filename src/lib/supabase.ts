import { createClient } from '@supabase/supabase-js';

// 取得環境變數
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Key is missing. Check .env file.');
}

// 初始化 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: {
        schema: 'game1' // 指定使用 game1 schema
    },
    auth: {
        persistSession: true, // 雖然是街機模式，但若未來要擴充可保留
        autoRefreshToken: true,
    },
    realtime: {
        params: {
            eventsPerSecond: 20 // 限制頻率以減輕負載
        }
    }
});
