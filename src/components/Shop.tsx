import React, { useState } from 'react';
import type { GameState, UnitType, UnitCategory } from '../game/types';
import { UNIT_STATS } from '../game/setup';

interface ShopProps {
    gameState: GameState;
    onSelectUnit: (type: UnitType) => void;
    onCancelDeployment: () => void;
}

const Shop: React.FC<ShopProps> = ({ gameState, onSelectUnit, onCancelDeployment }) => {
    const [activeTab, setActiveTab] = useState<UnitCategory>('LAND');
    const localPlayer = gameState.localPlayer || 'PLAYER1';
    const playerMoney = gameState.money[localPlayer];

    const units = Object.values(UNIT_STATS).filter(u => u.category === activeTab);

    return (
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="p-6 bg-slate-800/50 border-b border-slate-700">
                <h2 className="text-xl font-black tracking-tighter text-blue-400 italic">ARMORY CORE</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-mono text-green-500 font-bold">${playerMoney} AVAILABLE</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900/50">
                {(['LAND', 'SEA', 'AIR'] as UnitCategory[]).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`flex-1 py-3 text-xs font-bold tracking-widest transition-all ${activeTab === cat
                                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Unit List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-grid-tech space-y-3">
                {units.map(unit => {
                    const canAfford = playerMoney >= unit.cost;
                    const isPending = gameState.isPlacementMode && gameState.pendingPlacementType === unit.type;

                    return (
                        <div
                            key={unit.type}
                            className={`p-4 rounded-xl border transition-all group ${isPending
                                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
                                } ${!canAfford ? 'opacity-50 grayscale' : 'cursor-pointer'}`}
                            onClick={() => canAfford && onSelectUnit(unit.type)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-100 group-hover:text-blue-300 transition-colors uppercase tracking-tight">{unit.name}</h3>
                                    <span className="text-[10px] text-slate-500 font-mono italic">{unit.type}</span>
                                </div>
                                <span className={`font-mono font-bold ${canAfford ? 'text-green-500' : 'text-red-500'}`}>
                                    ${unit.cost}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <div className="text-center bg-slate-900/60 p-1 rounded border border-slate-700/50">
                                    <div className="text-[8px] text-slate-500 uppercase font-bold">ATK</div>
                                    <div className="text-xs font-bold text-red-400">{unit.atk}</div>
                                </div>
                                <div className="text-center bg-slate-900/60 p-1 rounded border border-slate-700/50">
                                    <div className="text-[8px] text-slate-500 uppercase font-bold">HP</div>
                                    <div className="text-xs font-bold text-blue-400">{unit.hp}</div>
                                </div>
                                <div className="text-center bg-slate-900/60 p-1 rounded border border-slate-700/50">
                                    <div className="text-[8px] text-slate-500 uppercase font-bold">MOV</div>
                                    <div className="text-xs font-bold text-yellow-400">{unit.mov}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Cancel Deployment */}
            {gameState.isPlacementMode && (
                <div className="p-4 bg-blue-900/30 border-t border-blue-500/50 animate-pulse">
                    <p className="text-[10px] text-blue-400 font-bold text-center mb-2 tracking-widest uppercase">Select deployment zone on map</p>
                    <button
                        onClick={onCancelDeployment}
                        className="w-full py-2 bg-red-600/80 hover:bg-red-500 text-xs font-black rounded uppercase tracking-tighter transition-colors"
                    >
                        Abort Deployment
                    </button>
                </div>
            )}
        </div>
    );
};

export default Shop;
