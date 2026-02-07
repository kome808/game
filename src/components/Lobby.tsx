import React from 'react';
import type { GameMode, Difficulty, MapId, NationId } from '../game/types';
import { NATIONS } from '../game/setup';
import { sfx } from '../game/SoundManager';

interface LobbyProps {
    onStartPvE: (difficulty: Difficulty, p1Nation: NationId, p2Nation: NationId, mapId: MapId) => void;
    onEnterOnline: () => void;
    nickname: string;
}

const Lobby: React.FC<LobbyProps> = ({ onStartPvE, onEnterOnline, nickname }) => {
    const [showRules, setShowRules] = React.useState(false);
    const [difficulty, setDifficulty] = React.useState<Difficulty>('NORMAL');
    const [selectedMapId, setSelectedMapId] = React.useState<MapId>('DEFAULT');

    // New State for Setup Modal
    const [setupMode, setSetupMode] = React.useState<GameMode | null>(null);
    const [p1Nation, setP1Nation] = React.useState<NationId>('GERMANY');
    const [p2Nation, setP2Nation] = React.useState<NationId>('USSR'); // Default P2/AI

    // Skill Preview State
    const [previewNationId, setPreviewNationId] = React.useState<NationId | null>(null);

    const handleRightClick = (e: React.MouseEvent, nationId: NationId) => {
        e.preventDefault();
        setPreviewNationId(nationId);
    };

    const handleStartPvEClick = (e: React.MouseEvent) => {
        sfx.playClick();
        if ((e.target as HTMLElement).closest('.difficulty-selector')) return;
        setSetupMode('PvE');
    };

    // Replace PvP with Online Entry
    const handleOnlineClick = () => {
        sfx.playClick();
        onEnterOnline();
    };

    const confirmStartGame = () => {
        if (setupMode === 'PvE') {
            onStartPvE(difficulty, p1Nation, p2Nation, selectedMapId);
            setSetupMode(null);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans overflow-hidden">
            {/* ... (Backgrounds) ... */}
            <div className="absolute inset-0 bg-grid-tech opacity-20 pointer-events-none"></div>
            <div className="scanline"></div>

            {/* Profile Info (Top Right) */}
            <div className="absolute top-6 right-6 flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                <div className="text-xs font-mono text-slate-300">
                    CMDR <span className="font-bold text-white uppercase">{nickname}</span>
                </div>
            </div>


            {/* Rules Button ... */}
            <button onClick={() => setShowRules(true)} className="absolute bottom-10 right-10 z-50 group flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 hover:border-yellow-500/50 hover:bg-slate-800 transition-all cursor-pointer">
                {/* ... */}
                <div className="text-right">
                    <div className="text-xs font-black text-slate-400 group-hover:text-yellow-400 tracking-widest uppercase">System Guide</div>
                    <div className="text-xl font-black text-white leading-none">戰爭典籍</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(202,138,4,0.4)] group-hover:scale-110 transition-transform">?</div>
            </button>

            {/* Nation Selection Modal (Only for PvE now) */}
            {setupMode === 'PvE' && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                                    指揮官部署 (VS AI)
                                </h2>
                                <p className="text-xs text-slate-400 font-mono mt-1">
                                    SELECT FACTION & CONFIRM STRATEGY
                                </p>
                            </div>
                            <button onClick={() => setSetupMode(null)} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 font-bold text-sm">取消</button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Player 1 Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-blue-400 font-black tracking-wider border-b border-blue-500/30 pb-2 flex justify-between">
                                        <span>PLAYER 1 (YOU)</span>
                                        <span className="text-xs bg-blue-500/20 px-2 rounded text-blue-300 self-center">BLUE TEAM</span>
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.values(NATIONS).map(nation => (
                                            <div
                                                key={nation.id}
                                                onClick={() => setP1Nation(nation.id)}
                                                onContextMenu={(e) => handleRightClick(e, nation.id)}
                                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${p1Nation === nation.id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800 border-transparent hover:bg-slate-700'}`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-white">{nation.name}</span>
                                                    {p1Nation === nation.id && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_#3b82f6]"></span>}
                                                </div>
                                                <div className="text-xs text-slate-400 mb-2">{nation.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Player 2 Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-red-400 font-black tracking-wider border-b border-red-500/30 pb-2 flex justify-between">
                                        <span>PLAYER 2 (AI)</span>
                                        <span className="text-xs bg-red-500/20 px-2 rounded text-red-300 self-center">RED TEAM</span>
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.values(NATIONS).map(nation => (
                                            <div
                                                key={nation.id}
                                                onClick={() => setP2Nation(nation.id)}
                                                onContextMenu={(e) => handleRightClick(e, nation.id)}
                                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${p2Nation === nation.id ? 'bg-red-600/20 border-red-500' : 'bg-slate-800 border-transparent hover:bg-slate-700'}`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-white">{nation.name}</span>
                                                    {p2Nation === nation.id && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_#ef4444]"></span>}
                                                </div>
                                                <div className="text-xs text-slate-400 mb-2">{nation.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-4">
                            <div className="text-xs text-slate-500 self-center font-mono">
                                MAP: {selectedMapId} | MODE: PvE
                            </div>
                            <button
                                onClick={confirmStartGame}
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all text-sm tracking-widest uppercase"
                            >
                                START OPERATION
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skill Preview Modal */}
            {previewNationId && (
                <div
                    className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200"
                    onClick={() => setPreviewNationId(null)}
                >
                    {/* ... (Kept same as old Lobby) ... */}
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border-2 border-slate-700 shadow-2xl p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <div className="text-9xl font-black text-white">{NATIONS[previewNationId].id.substring(0, 1)}</div>
                        </div>
                        <div className="mb-6 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-black text-white tracking-wider uppercase mb-1">{NATIONS[previewNationId].name}</h3>
                            <p className="text-sm text-slate-400 font-mono">TACTICAL ANALYSIS // {previewNationId}</p>
                        </div>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            {NATIONS[previewNationId].description}
                        </p>
                        <div className="mb-4 bg-slate-800/50 p-4 rounded-xl border border-yellow-500/20">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-yellow-500 bg-yellow-950/30 px-2 py-0.5 rounded border border-yellow-500/20">主動技能 (ACTIVE)</span>
                            </div>
                            <h4 className="text-lg font-black text-white mb-1">{NATIONS[previewNationId].activeSkillName}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {NATIONS[previewNationId].activeSkillDesc}
                            </p>
                        </div>
                        <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-emerald-500/20">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-emerald-500 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">被動特性 (PASSIVE)</span>
                            </div>
                            <h4 className="text-lg font-black text-white mb-1">{NATIONS[previewNationId].passiveSkillName}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {NATIONS[previewNationId].passiveSkillDesc}
                            </p>
                        </div>
                        <div className="text-center">
                            <button onClick={() => setPreviewNationId(null)} className="text-xs text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest">
                                Close Intelligence
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules Modal ... */}
            {showRules && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowRules(false)}>
                    <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border-2 border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* ... Just reusing a simplified close button for brevity ... */}
                        <div className="bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-yellow-500 tracking-wider flex items-center gap-3">
                                戰場指揮手冊
                            </h2>
                            <button onClick={() => setShowRules(false)} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors">✕</button>
                        </div>
                        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-8 text-white">
                            {/* ... Rules content similar to before, truncated for brevity ... */}
                            <section>
                                <h3 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                                    <span className="text-emerald-500">01.</span> 勝利條件
                                </h3>
                                <div className="bg-slate-950/50 p-4 rounded-lg border border-white/5 text-slate-300 text-sm leading-relaxed">
                                    戰場的唯一目標是 <strong className="text-white">摧毀敵方指揮部 (HQ)</strong>。
                                </div>
                            </section>
                            {/* ... More rules ... */}
                            <section>
                                <div className="text-center text-xs text-slate-500 mt-8">
                                    完整規則請參閱遊戲內說明
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            <div className="z-10 w-full max-w-5xl flex flex-col items-center">
                {/* Title Section */}
                <div className="mb-8 text-center">
                    <h1 className="text-[120px] font-black italic tracking-[0.1em] text-blue-500 leading-none filter drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-in slide-in-from-top duration-700">
                        現代
                    </h1>
                    <h2 className="text-[60px] font-black text-white leading-none tracking-[0.5em] -mt-4 animate-in slide-in-from-bottom duration-1000 pl-[0.2em]">
                        戰爭策略
                    </h2>
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="h-[2px] w-24 bg-gradient-to-r from-transparent to-blue-500"></div>
                        <span className="text-blue-400 font-mono tracking-[0.3em] uppercase text-xs">指揮系統 介面 v2.0 (ONLINE)</span>
                        <div className="h-[2px] w-24 bg-gradient-to-l from-transparent to-blue-500"></div>
                    </div>
                </div>

                {/* Map Selection (Only for PvE here, Online Host chooses in Lobby maybe?) */}
                {/* For simplicity we keep Map Selection Global for now */}
                <div className="w-full mb-8">
                    <h3 className="text-sm font-black text-slate-500 tracking-[0.2em] mb-4 text-center">SELECT OPERATION AREA</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'DEFAULT', name: '標準演習場', size: '8x8', desc: '標準小型戰術地圖，適合快速交戰。' },
                            { id: 'ARCHIPELAGO', name: '紛爭群島', size: '16x16', desc: '海域廣闊，需重視海軍與運輸調度。' },
                            { id: 'GOLDEN_VALLEY', name: '黃金谷', size: '24x24', desc: '大型地圖。控制中央區域可獲取額外資金。' }
                        ].map(map => (
                            <button
                                key={map.id}
                                onMouseEnter={() => sfx.playHover()}
                                onClick={() => { sfx.playClick(); setSelectedMapId(map.id as MapId); }}
                                className={`group relative p-4 rounded-xl border-2 transition-all flex flex-col items-start text-left overflow-hidden ${selectedMapId === map.id ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}
                            >
                                <div className="text-xs font-mono text-slate-500 mb-1">{map.size} SECTOR</div>
                                <div className={`text-lg font-black mb-1 ${selectedMapId === map.id ? 'text-white' : 'text-slate-300'}`}>{map.name}</div>
                                <div className="text-[10px] text-slate-400 leading-relaxed">{map.desc}</div>
                                {selectedMapId === map.id && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_#3b82f6]"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    {/* PvE Mode */}
                    <div
                        onClick={handleStartPvEClick}
                        className="group glass-morphism p-10 rounded-2xl border-blue-500/20 hover:border-blue-500/50 transition-all duration-500 hover:scale-105 relative overflow-hidden text-left cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-blue-500/50">模式::01</div>
                        <div className="mb-6 w-16 h-1 bg-blue-500 group-hover:w-full transition-all duration-700"></div>
                        <h3 className="text-3xl font-black italic mb-2 group-hover:text-blue-400 transition-colors uppercase tracking-tighter">單人戰役</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity mb-4">
                            挑戰高級指揮 AI。<br />自定義難度與陣營。
                        </p>

                        {/* Difficulty Selector */}
                        <div className="difficulty-selector relative z-20 flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/5 mb-4 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                            {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map(d => (
                                <button
                                    key={d}
                                    onMouseEnter={() => sfx.playHover()}
                                    onClick={() => { sfx.playClick(); setDifficulty(d); }}
                                    className={`flex-1 py-1 px-2 rounded text-[10px] font-black tracking-wider transition-all ${difficulty === d ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
                                >
                                    {d === 'EASY' ? '簡單' : d === 'NORMAL' ? '普通' : '困難'}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs font-black tracking-widest text-blue-500 group-hover:translate-x-2 transition-transform">
                            初始化作戰行動 <span className="text-xl">»</span>
                        </div>
                    </div>

                    {/* Online Mode */}
                    <div
                        onClick={handleOnlineClick}
                        className="group glass-morphism p-10 rounded-2xl border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 hover:scale-105 relative overflow-hidden text-left cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-emerald-500/50">模式::02</div>
                        <div className="mb-6 w-16 h-1 bg-emerald-500 group-hover:w-full transition-all duration-700"></div>
                        <h3 className="text-3xl font-black italic mb-2 group-hover:text-emerald-400 transition-colors uppercase tracking-tighter">線上對戰</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity mb-4">
                            連接全球戰術網絡。<br />與其他指揮官實時對抗。
                        </p>

                        <div className="mt-8 flex items-center gap-2 text-xs font-black tracking-widest text-emerald-500 group-hover:translate-x-2 transition-transform">
                            進入線上大廳 <span className="text-xl">»</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
