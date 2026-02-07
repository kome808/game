import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { sfx } from '../game/SoundManager';

interface ArcadeLoginProps {
    onLogin: (playerId: string, nickname: string) => void;
}

const ArcadeLogin: React.FC<ArcadeLoginProps> = ({ onLogin }) => {
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-login disabled for debugging
    // useEffect(() => {
    //     const storedId = localStorage.getItem('arcade_player_id');
    //     const storedName = localStorage.getItem('arcade_nickname');

    //     if (storedId && storedName) {
    //         // supabase.from('players').update({ last_seen: new Date().toISOString() }).eq('id', storedId).then(() => { });
    //         // onLogin(storedId, storedName);
    //     }
    // }, [onLogin]);

    const handleEnter = async () => {
        if (!nickname.trim()) return;
        setLoading(true);
        setError(null);
        sfx.playClick();

        try {
            // Create new player record
            // Trigger will handle UUID generation if we omit ID? No, client should probably handle or let DB return it.
            // Let's Insert and select.
            const { data, error } = await supabase
                .from('players')
                .insert([{ nickname: nickname.trim() }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                localStorage.setItem('arcade_player_id', data.id);
                localStorage.setItem('arcade_nickname', data.nickname);
                onLogin(data.id, data.nickname);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            console.error('Login error:', err);
            // Detect specific connection errors or paused project
            if (err.message && (err.message.includes('fetch failed') || err.message.includes('503'))) {
                setError('無法連線至資料庫 (可能專案已暫停)，請檢查 Supabase Dashboard');
            } else if (err.code === '42P01') {
                setError('資料庫尚未初始化 (缺少表格)，請執行 SQL Setup');
            } else {
                setError('連線錯誤: ' + (err.message || '請檢查網路狀態'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white font-sans overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-tech opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900/50 to-slate-900/80 pointer-events-none"></div>

            <div className="z-10 w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black italic tracking-tighter text-blue-500 mb-2">IDENTIFICATION</h1>
                    <p className="text-xs text-slate-400 font-mono tracking-widest">請輸入代號以存取指揮系統</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
                            placeholder="輸入暱稱 / CODENAME"
                            maxLength={12}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-4 text-center font-bold text-xl tracking-wider text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs text-center font-bold animate-pulse">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        onClick={handleEnter}
                        disabled={loading || !nickname.trim()}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all tracking-[0.2em] relative overflow-hidden group"
                        onMouseEnter={() => sfx.playHover()}
                    >
                        {loading ? '連線中...' : '確認身分 // CONFIRM'}
                    </button>

                    <div className="text-[10px] text-slate-600 text-center font-mono">
                        SECURE CONNECTION :: MILITARY GRADE ENCRYPTION
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArcadeLogin;
