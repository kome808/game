import { useRef, useEffect, useState, useMemo } from 'react';
import type { GameState } from '../game/types';
import { canMoveTo, canAttack, performMove, performAttack, deployUnit, getUnitAt, isUnitVisibleTo, getReachableTiles } from '../game/logic';
import { UNIT_STATS } from '../game/setup';

const CELL_SIZE = 60;
const PADDING = 20;

interface GameBoardProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, setGameState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [targetMode, setTargetMode] = useState<'MOVE' | 'ATTACK' | null>(null);
    const [menuPos, setMenuPos] = useState<{ x: number, y: number, screenX: number, screenY: number } | null>(null);
    const [statusUnitId, setStatusUnitId] = useState<string | null>(null);

    const mapWidth = gameState.map[0].length;
    const mapHeight = gameState.map.length;

    const visibleTiles = useMemo(() => {
        if (gameState.gameMode === 'PvE') {
            return gameState.visibleTiles['PLAYER1'];
        }
        return gameState.visibleTiles[gameState.currentPlayer];
    }, [gameState.visibleTiles, gameState.currentPlayer, gameState.gameMode]);

    useEffect(() => {
        draw();
    }, [gameState, selectedUnitId, targetMode, gameState.isPlacementMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const draw = () => {
        // ... (drawing logic remains mostly same, maybe add some highlights)
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製地形
        gameState.map.forEach((row, y) => {
            row.forEach((tile, x) => {
                const screenX = PADDING + x * CELL_SIZE;
                const screenY = PADDING + y * CELL_SIZE;
                const isVisible = visibleTiles.has(`${x},${y}`);

                if (tile.terrain === 'SEA') ctx.fillStyle = '#1e3a8a';
                else if (tile.terrain === 'LAND') ctx.fillStyle = '#3f6212';
                else if (tile.terrain === 'HELIPAD') ctx.fillStyle = '#6b7280'; // Concrete Gray
                else if (tile.terrain === 'BASE') ctx.fillStyle = tile.owner === 'PLAYER1' ? '#dc2626' : '#2563eb'; // Brighter Red / Blue

                ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);

                if (gameState.isPlacementMode && gameState.pendingPlacementType) {
                    const stats = UNIT_STATS[gameState.pendingPlacementType];
                    let canDeployHere = false;
                    if (stats.type === 'PARATROOPER') canDeployHere = true;
                    else if (tile.owner === gameState.currentPlayer) {
                        if (stats.category === 'AIR') canDeployHere = tile.terrain === 'HELIPAD';
                        else if (stats.category === 'SEA') canDeployHere = tile.terrain === 'SEA';
                        else canDeployHere = tile.terrain !== 'SEA';
                    }
                    if (canDeployHere && !getUnitAt(gameState.units, { x, y })) {
                        ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(screenX + 2, screenY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                        ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
                        ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
                    }
                }

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeRect(screenX, screenY, CELL_SIZE, CELL_SIZE);

                if (tile.terrain === 'BASE') {
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('HQ', screenX + CELL_SIZE / 2, screenY + CELL_SIZE / 2 + 5);
                } else if (tile.terrain === 'HELIPAD') {
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('H', screenX + CELL_SIZE / 2, screenY + CELL_SIZE / 2 + 6);
                }

                if (!isVisible) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
                }
            });
        });

        // 4. 繪製單位
        gameState.units.forEach(unit => {
            if (unit.hp <= 0) return;

            // 隱身與戰爭迷霧過濾：使用「當前渲染視野」作為觀察者基準
            const observer = gameState.gameMode === 'PvE' ? 'PLAYER1' : gameState.currentPlayer;
            if (!isUnitVisibleTo(unit, observer, gameState)) return;

            const screenX = PADDING + unit.position.x * CELL_SIZE;
            const screenY = PADDING + unit.position.y * CELL_SIZE;

            ctx.fillStyle = unit.player === 'PLAYER1' ? '#ef4444' : '#3b82f6';
            ctx.beginPath();
            ctx.roundRect(screenX + 5, screenY + 5, CELL_SIZE - 10, CELL_SIZE - 10, 8);
            ctx.fill();

            if (unit.hasMoved && unit.hasAttacked) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fill();
            }

            if (selectedUnitId === unit.id) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(unit.type.substring(0, 4), screenX + CELL_SIZE / 2, screenY + CELL_SIZE / 2 + 4);

            const hpRatio = unit.hp / unit.maxHp;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(screenX + 10, screenY + CELL_SIZE - 12, CELL_SIZE - 20, 4);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(screenX + 10, screenY + CELL_SIZE - 12, (CELL_SIZE - 20) * hpRatio, 4);
        });

        // 5. 繪製行動提示
        if (selectedUnitId && targetMode) {
            const unit = gameState.units.find(u => u.id === selectedUnitId)!;
            gameState.map.forEach((row, y) => {
                row.forEach((_, x) => {
                    const pos = { x, y };
                    let valid = false;
                    if (targetMode === 'MOVE') {
                        const reachable = getReachableTiles(unit, gameState);
                        valid = reachable.has(`${x},${y}`);
                    }
                    else if (targetMode === 'ATTACK') valid = canAttack(unit, pos, gameState).canAttack;

                    if (valid) {
                        const screenX = PADDING + x * CELL_SIZE;
                        const screenY = PADDING + y * CELL_SIZE;
                        ctx.fillStyle = targetMode === 'MOVE' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                        ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
                    }
                });
            });
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = Math.floor((e.clientX - rect.left - PADDING) / CELL_SIZE);
        const y = Math.floor((e.clientY - rect.top - PADDING) / CELL_SIZE);

        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
            setMenuPos(null);
            setSelectedUnitId(null);
            setTargetMode(null);
            return;
        }

        const clickedPos = { x, y };

        if (gameState.isPlacementMode && gameState.pendingPlacementType) {
            const stats = UNIT_STATS[gameState.pendingPlacementType];
            const tile = gameState.map[y][x];
            let canDeploy = stats.type === 'PARATROOPER' ? true : (tile.owner === gameState.currentPlayer && (stats.category === 'AIR' ? tile.terrain === 'HELIPAD' : (stats.category === 'SEA' ? tile.terrain === 'SEA' : tile.terrain !== 'SEA')));
            if (canDeploy && !getUnitAt(gameState.units, clickedPos)) {
                setGameState(prev => deployUnit(prev, gameState.currentPlayer, gameState.pendingPlacementType!, clickedPos));
            } else {
                setGameState(prev => ({ ...prev, isPlacementMode: false, pendingPlacementType: undefined }));
            }
            return;
        }

        const clickedUnit = getUnitAt(gameState.units, clickedPos);

        if (selectedUnitId && targetMode) {
            const unit = gameState.units.find(u => u.id === selectedUnitId)!;
            if (targetMode === 'MOVE' && canMoveTo(unit, clickedPos, gameState).canMove) {
                setGameState(prev => performMove(prev, selectedUnitId, clickedPos));
                // 移動後不立即關閉選單，也不重置 targetMode，除非行動力用光
                const updatedUnit = gameState.units.find(u => u.id === selectedUnitId)!;
                if (updatedUnit.remainingMov <= 0) {
                    setTargetMode(null);
                    setMenuPos(null);
                } else {
                    // 更新圓圈位置
                    setMenuPos({ x: clickedPos.x, y: clickedPos.y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
                }
                return;
            } else if (targetMode === 'ATTACK' && canAttack(unit, clickedPos, gameState).canAttack) {
                setGameState(prev => performAttack(prev, selectedUnitId, clickedPos));
                setTargetMode(null);
                setSelectedUnitId(null); // 攻擊後通常結束該單位回合
                setMenuPos(null);
                return;
            }
        }

        if (clickedUnit && clickedUnit.player === gameState.currentPlayer) {
            setSelectedUnitId(clickedUnit.id);
            setTargetMode(null);
            setMenuPos({ x, y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
        } else {
            setSelectedUnitId(null);
            setTargetMode(null);
            setMenuPos(null);
        }
    };

    const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = Math.floor((e.clientX - rect.left - PADDING) / CELL_SIZE);
        const y = Math.floor((e.clientY - rect.top - PADDING) / CELL_SIZE);

        const unit = getUnitAt(gameState.units, { x, y });
        if (unit) {
            setStatusUnitId(unit.id);
        }
    };

    const selectedUnit = gameState.units.find(u => u.id === selectedUnitId);
    const statusUnit = gameState.units.find(u => u.id === statusUnitId);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative bg-slate-900 p-2 rounded-xl shadow-2xl border-4 border-slate-700">
                <canvas
                    ref={canvasRef}
                    width={mapWidth * CELL_SIZE + PADDING * 2}
                    height={mapHeight * CELL_SIZE + PADDING * 2}
                    onClick={handleCanvasClick}
                    onContextMenu={handleCanvasContextMenu}
                    className="cursor-crosshair"
                />

                {/* 互動選單 (Move/Attack Circles) */}
                {menuPos && selectedUnit && !targetMode && (
                    <div
                        className="absolute pointer-events-none"
                        style={{ left: menuPos.screenX, top: menuPos.screenY }}
                    >
                        {/* 移動圓圈 */}
                        {selectedUnit.remainingMov > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setTargetMode('MOVE'); }}
                                className="pointer-events-auto absolute -left-12 -top-12 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:bg-blue-500 transition border-2 border-white scale-110 active:scale-90"
                            >
                                移
                            </button>
                        )}
                        {/* 攻擊圓圈 */}
                        {!selectedUnit.hasAttacked && (selectedUnit.category !== 'LAND' || gameState.map[selectedUnit.position.y][selectedUnit.position.x].terrain !== 'SEA') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setTargetMode('ATTACK'); }}
                                className="pointer-events-auto absolute -right-12 -top-12 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:bg-red-500 transition border-2 border-white scale-110 active:scale-90"
                            >
                                攻
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 狀態檢視 Overlay */}
            {statusUnit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setStatusUnitId(null)}>
                    <div className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-600 shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-2xl font-black ${statusUnit.player === 'PLAYER1' ? 'text-red-400' : 'text-blue-400'}`}>
                                {statusUnit.type}
                            </h3>
                            <button onClick={() => setStatusUnitId(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-700 p-2 rounded-lg">
                                <p className="text-xs text-slate-400">血量</p>
                                <p className="text-lg font-bold text-green-400">{statusUnit.hp} / {statusUnit.maxHp}</p>
                            </div>
                            <div className="bg-slate-700 p-2 rounded-lg">
                                <p className="text-xs text-slate-400">攻擊力</p>
                                <p className="text-lg font-bold text-yellow-400">{UNIT_STATS[statusUnit.type].atk}</p>
                            </div>
                            <div className="bg-slate-700 p-2 rounded-lg">
                                <p className="text-xs text-slate-400">射程</p>
                                <p className="text-sm font-bold">{UNIT_STATS[statusUnit.type].rangeMin} - {UNIT_STATS[statusUnit.type].rangeMax}</p>
                            </div>
                            <div className="bg-slate-700 p-2 rounded-lg">
                                <p className="text-xs text-slate-400">移動力</p>
                                <p className="text-sm font-bold">{UNIT_STATS[statusUnit.type].mov}</p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{UNIT_STATS[statusUnit.type].description}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameBoard;
