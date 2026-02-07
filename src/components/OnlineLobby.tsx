import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, NationId, MapId } from '../game/types';
import { NATIONS } from '../game/setup';

interface OnlineLobbyProps {
    playerId: string;
    onJoinGame: (roomCode: string, role: Player, nations: { [key in Player]: NationId }, mapId: MapId) => void;
    onBack: () => void;
}

interface Room {
    room_code: string;
    host_id: string;
    guest_id: string | null;
    status: 'WAITING' | 'PLAYING';
    map_id: MapId;
    host_nation: NationId;
    guest_nation: NationId;
    host: { nickname: string };
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ playerId, onJoinGame, onBack }) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [currentNation, setCurrentNation] = useState<NationId>('USA');
    const [currentMap, setCurrentMap] = useState<MapId>('DEFAULT');
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchRooms = async () => {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*, host:host_id(nickname)')
                .eq('status', 'WAITING')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRooms(data || []);
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        const subscription = supabase
            .channel('rooms_channel')
            .on('postgres_changes', { event: '*', schema: 'game1', table: 'rooms' }, () => {
                fetchRooms();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleCreateRoom = async () => {
        setCreating(true);
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        try {
            const { error } = await supabase
                .from('rooms')
                .insert({
                    room_code: roomCode,
                    host_id: playerId,
                    status: 'WAITING',
                    map_id: currentMap,
                    host_nation: currentNation,
                    guest_nation: 'GERMANY'
                });

            if (error) throw error;

            // Host enters game immediately or waits for guest? 
            // In this version, we'll enter the game and wait for guest via Realtime
            onJoinGame(roomCode, 'PLAYER1', { PLAYER1: currentNation, PLAYER2: 'GERMANY' }, currentMap);
        } catch (err) {
            console.error('Failed to create room:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleJoinRoom = async (room: Room) => {
        try {
            const { error } = await supabase
                .from('rooms')
                .update({ guest_id: playerId, status: 'PLAYING' })
                .eq('room_code', room.room_code);

            if (error) throw error;

            onJoinGame(room.room_code, 'PLAYER2', { PLAYER1: room.host_nation, PLAYER2: currentNation }, room.map_id);
        } catch (err) {
            console.error('Failed to join room:', err);
            setError('無法加入房間，請檢查訊號是否穩定。');
        }
    };

    const handleJoinByCode = async () => {
        if (!manualCode || manualCode.length < 5) {
            setError('請輸入有效的 5 位數房間編號。');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('room_code', manualCode.toUpperCase())
                .eq('status', 'WAITING')
                .single();

            if (error || !data) throw new Error('找不到該房間或戰局已開始。');

            await handleJoinRoom(data as Room);
        } catch (err: any) {
            setError(err.message || '加入失敗。');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
                <div className="text-blue-500 font-mono animate-pulse uppercase tracking-widest">正在建立數據連線...</div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-slate-950 text-white p-8 flex flex-col font-sans overflow-hidden">
            {/* Background Decor */}
            <div className="fixed inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#020617_100%)]"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-center mb-12">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 group transition-colors font-bold">
                        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> 返回基地
                    </button>
                    <div className="text-right">
                        <h2 className="text-4xl font-black italic tracking-tighter text-blue-500">戰情室</h2>
                        <p className="text-xs text-slate-500 font-bold tracking-[0.3em] uppercase">全球戰略大廳</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 overflow-hidden pb-8">
                    {/* Create Room Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col hover:border-blue-500/50 transition-all group backdrop-blur-md">
                        <div className="mb-8">
                            <div className="w-12 h-1 bg-blue-500 mb-4 transition-all group-hover:w-20"></div>
                            <h3 className="text-2xl font-bold mb-2 text-slate-100">建立戰局</h3>
                            <p className="text-sm text-slate-400">建立新的戰略連結並準備投入戰鬥。</p>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">戰略地圖</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(['DEFAULT', 'ARCHIPELAGO', 'GOLDEN_VALLEY'] as MapId[]).map(id => (
                                        <button
                                            key={id}
                                            onClick={() => setCurrentMap(id)}
                                            className={`px-4 py-3 rounded-lg text-left text-sm font-bold border transition-all ${currentMap === id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">選擇國家</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(NATIONS).map(([id, n]) => (
                                        <button
                                            key={id}
                                            onClick={() => setCurrentNation(id as NationId)}
                                            className={`p-2 rounded-lg border transition-all ${currentNation === id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                        >
                                            <div className="text-[10px] uppercase font-black truncate">{n.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateRoom}
                            disabled={creating}
                            className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-xl font-black italic tracking-tight text-xl transition-all active:scale-95 shadow-[0_8px_0_rgb(29,78,216)] active:shadow-none active:translate-y-1"
                        >
                            {creating ? '建立中...' : '發起連線'}
                        </button>

                        <div className="mt-8 pt-8 border-t border-slate-800/50">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">手動輸入編號加入</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                    maxLength={5}
                                    placeholder="編號"
                                    className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 flex-1 font-mono text-center tracking-widest focus:border-blue-500 outline-none"
                                />
                                <button
                                    onClick={handleJoinByCode}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
                                >
                                    加入
                                </button>
                            </div>
                            {error && <p className="text-[10px] text-red-500 mt-2 font-bold">{error}</p>}
                        </div>
                    </div>

                    {/* Room List Section */}
                    <div className="md:col-span-2 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                可加入的作戰頻段
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] rounded border border-green-500/50 uppercase tracking-widest animate-pulse">即時 (LIVE)</span>
                            </h3>
                            <button onClick={fetchRooms} className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase transition-colors">⟳ 重新整理</button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {rooms.length === 0 ? (
                                <div className="h-48 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600">
                                    <div className="text-4xl mb-2">📡</div>
                                    <div className="text-sm font-bold uppercase tracking-widest">目前未偵測到活動訊號</div>
                                </div>
                            ) : (
                                rooms.map(room => (
                                    <div key={room.room_code} className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex justify-between items-center group hover:border-blue-500/30 transition-all hover:bg-slate-900">
                                        <div className="flex gap-8 items-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center font-black text-2xl text-blue-500 group-hover:bg-blue-900/20 group-hover:scale-105 transition-all">
                                                {room.room_code.substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-1">訊號代號: {room.room_code}</div>
                                                <div className="text-lg font-bold group-hover:text-blue-400 transition-colors uppercase">
                                                    {room.host?.nickname || '未知指揮官'} 的戰局
                                                </div>
                                                <div className="flex gap-4 mt-2">
                                                    <span className="text-[10px] flex items-center gap-1.5 font-bold text-slate-400">
                                                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                                        國家: {NATIONS[room.host_nation].name}
                                                    </span>
                                                    <span className="text-[10px] flex items-center gap-1.5 font-bold text-slate-400">
                                                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                                        地圖: {room.map_id === 'DEFAULT' ? '標準戰區' : room.map_id === 'ARCHIPELAGO' ? '群島戰區' : '黃金峽谷'}
                                                    </span>
                                                    <span className="text-[10px] flex items-center gap-1.5 font-bold text-blue-400">
                                                        <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                                        狀態: 等待中
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleJoinRoom(room)}
                                            className="px-8 py-3 bg-blue-600/10 hover:bg-blue-600 border border-blue-600/30 text-blue-500 hover:text-white rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            投入戰鬥 (ENGAGE)
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnlineLobby;
