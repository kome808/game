// @ts-nocheck
import React, { useState, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Environment } from '@react-three/drei';
import type { GameState, Position } from '../../game/types';
import Tile3D from './Tile3D';
import Unit3D from './Unit3D';
import Explosion from './Explosion';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { UNIT_STATS } from '../../game/setup';
import { sfx } from '../../game/SoundManager';
import {
    canMoveTo,
    canAttack,
    performMove,
    performAttack,
    deployUnit,
    getUnitAt,
    isUnitVisibleTo,
    getReachableTiles,
    findUnitById
} from '../../game/logic';

interface GameBoard3DProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    onUnitInspect?: (unitId: string) => void;
}



// Helper component for Shake Effect
interface ShakeGroupHandle {
    trigger: (intensity: number) => void;
}

const ShakeGroup = forwardRef<ShakeGroupHandle, { children: React.ReactNode }>(({ children }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const intensityRef = useRef(0);

    useImperativeHandle(ref, () => ({
        trigger: (amount) => { intensityRef.current = Math.max(intensityRef.current, amount); }
    }));

    useFrame(() => {
        if (!groupRef.current) return;

        if (intensityRef.current > 0) {
            const s = intensityRef.current;
            groupRef.current.position.set(
                (Math.random() - 0.5) * s,
                (Math.random() - 0.5) * s,
                (Math.random() - 0.5) * s
            );
            intensityRef.current = Math.max(0, intensityRef.current - 0.02); // Decay factor
        } else {
            groupRef.current.position.set(0, 0, 0);
        }
    });

    return <group ref={groupRef}>{children}</group>;
});

const GameBoard3D: React.FC<GameBoard3DProps> = ({ gameState, setGameState, onUnitInspect }) => {
    // const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null); // Removed local state
    const { selectedUnitId } = gameState; // Use global state
    const [targetMode, setTargetMode] = useState<'MOVE' | 'ATTACK' | null>(null);

    // Visual Effects State
    // Visual Effects State
    const [explosions, setExplosions] = useState<{ id: number; position: [number, number, number]; scale: number }[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number; position: [number, number, number]; text: string; color: string }[]>([]);
    const shakeRef = useRef<ShakeGroupHandle>(null);

    // Listen for game events
    React.useEffect(() => {
        if (!gameState.latestEffect) return;
        const effect = gameState.latestEffect;

        // Ensure we handle each unique event only once (timestamp check is simple but might miss rapid same-frame, 
        // effectively handled by React re-render cycle usually sufficient for turn-based)
        // Better: use a ref to store last processed timestamp

        // Trigger Visuals
        const pos: [number, number, number] = [effect.location.x, 0.5, effect.location.y];
        const id = Date.now() + Math.random();

        if (effect.type === 'ATTACK' || effect.type === 'EXPLOSION') {
            setExplosions(prev => [...prev, { id, position: pos, scale: effect.type === 'EXPLOSION' ? 2 : 1 }]);

            // Trigger Sound
            if (effect.type === 'EXPLOSION') {
                sfx.playExplosion();
            } else {
                // Determine attack sound based on damage or random providing variety if we don't know unit
                // Ideally we'd know the attacker type. For now, generic or localized.
                // Let's rely on visual feedback mostly, but add a generic 'boom' or distinct sound.
                // If damage is high (>100?), cannon. Else gun.
                // Or simply play a generic impact.
                // To be precise:
                // sfx.playAttack('GUN');
                // But wait, if this effect is synced, we want to hear it.
                // Let's use 'CANNON' for big hits, 'GUN' for small.
                // Actually logic.ts doesn't pass Attacker ID in effect (yet).
                // We will assume standard combat.
                sfx.playAttack('GUN'); // Default
            }

            // Trigger Shake
            shakeRef.current?.trigger(effect.type === 'EXPLOSION' ? 0.5 : 0.2);

            if (effect.damage !== undefined) {
                setFloatingTexts(prev => [...prev, {
                    id,
                    position: [pos[0], pos[1] + 2, pos[2]],
                    text: `-${effect.damage}`,
                    color: '#ef4444'
                }]);
            }
        }
    }, [gameState.latestEffect]);

    // Removed direct useFrame usage here to prevent crash (useFrame must be inside Canvas)

    // Handle Camera Shake decay


    const observer = useMemo(() => {
        if (gameState.gameMode === 'ONLINE') return gameState.localPlayer || 'PLAYER1';
        return gameState.gameMode === 'PvE' ? 'PLAYER1' : gameState.currentPlayer;
    }, [gameState.gameMode, gameState.localPlayer, gameState.currentPlayer]);

    const visibleTiles = useMemo(() => {
        return gameState.visibleTiles[observer];
    }, [gameState.visibleTiles, observer]);

    const mapWidth = gameState.map[0].length;
    const mapHeight = gameState.map.length;

    // Dynamic camera positioning based on map size
    const zoomFactor = Math.max(mapWidth, mapHeight) / 8;
    // Increase viewing distance/height for larger maps so they fit
    const camY = 10 * zoomFactor;
    const camZOffset = 8 * zoomFactor;

    // Adjust fog and view distance based on map size
    const viewDistance = Math.max(30, mapHeight * 3);
    const maxZoom = Math.max(30, mapHeight * 4);

    const handleTileClick = (pos: Position) => {
        const x = pos.x;
        const y = pos.y;

        if (gameState.isPlacementMode && gameState.pendingPlacementType) {
            const stats = UNIT_STATS[gameState.pendingPlacementType];
            const tile = gameState.map[y][x];

            const unitAtPos = getUnitAt(gameState.units, { x, y });
            const isFriendlyCarrier = unitAtPos?.type === 'CARRIER' && unitAtPos?.player === gameState.currentPlayer;
            const isFriendlyTransport = unitAtPos?.type === 'TRANSPORT' && unitAtPos?.player === gameState.currentPlayer;

            const isDeployingOnCarrier = isFriendlyCarrier && stats.category === 'AIR';
            const isDeployingOnTransport = isFriendlyTransport && stats.category === 'LAND';

            let canDeploy = stats.type === 'PARATROOPER' ? true : (
                // 若部署在航空母艦或運輸艦上，忽略地形與領土檢查
                isDeployingOnCarrier || isDeployingOnTransport ||
                (tile.owner === gameState.currentPlayer && (
                    stats.category === 'AIR' ? tile.terrain === 'HELIPAD' : (
                        stats.category === 'SEA' ? tile.terrain === 'SEA' : tile.terrain !== 'SEA'
                    )
                ))
            );

            // 允許佔用檢查例外：若是部署在容器中
            if (canDeploy && (!unitAtPos || isDeployingOnCarrier || isDeployingOnTransport)) {
                sfx.playDeploy();
                setGameState(prev => deployUnit(prev, gameState.currentPlayer, gameState.pendingPlacementType!, { x, y }));
            } else {
                sfx.playDeny();
                setGameState(prev => ({ ...prev, isPlacementMode: false, pendingPlacementType: undefined }));
            }
            return;
        }

        if (selectedUnitId && targetMode) {
            const unitInfo = findUnitById(gameState.units, selectedUnitId);
            const unit = unitInfo?.unit;
            if (!unit) return;

            if (targetMode === 'MOVE' && canMoveTo(unit, { x, y }, gameState).canMove) {
                sfx.playMove(); // Mechanical sound
                setGameState(prev => performMove(prev, selectedUnitId, { x, y }));
                setTargetMode(null);
                return;
            } else if (targetMode === 'ATTACK' && canAttack(unit, { x, y }, gameState).canAttack) {
                // Sound handled by effect sync... but local feedback is instantaneous
                // We'll let the effect sync handle it to avoid double sound?
                // Actually performAttack triggers effect. Effect triggers sound. Correct.
                setGameState(prev => performAttack(prev, selectedUnitId, { x, y }));
                setTargetMode(null);
                setGameState(prev => ({ ...prev, selectedUnitId: undefined }));
                return;
            }
        }

        const clickedUnit = getUnitAt(gameState.units, { x, y });
        if (clickedUnit && clickedUnit.player === gameState.currentPlayer) {
            sfx.playSelect();
            setGameState(prev => ({ ...prev, selectedUnitId: clickedUnit.id }));
            setTargetMode(null);
        } else {
            // Clicked empty ground or enemy -> Deselect
            if (selectedUnitId) {
                // Maybe play deselect sound?
            }
            setGameState(prev => ({ ...prev, selectedUnitId: undefined }));
            setTargetMode(null);
        }
    };

    const selectedUnitInfo = selectedUnitId ? findUnitById(gameState.units, selectedUnitId) : null;
    const selectedUnit = selectedUnitInfo?.unit;

    // 當選取單位來自航空母艦 (Launch Mode)，自動進入移動模式
    React.useEffect(() => {
        if (selectedUnitInfo?.carrierId) {
            setTargetMode('MOVE');
        }
    }, [selectedUnitId, selectedUnitInfo?.carrierId]);

    // 當進入部署模式時，清除選取狀態
    React.useEffect(() => {
        if (gameState.isPlacementMode) {
            setGameState(prev => ({ ...prev, selectedUnitId: undefined }));
            setTargetMode(null);
        }
    }, [gameState.isPlacementMode, setGameState]);
    const highlightedTiles = useMemo(() => {
        const highlights = new Map<string, string>();

        // 1. Placement Mode Highlights (Show where you can build)
        if (gameState.isPlacementMode && gameState.pendingPlacementType) {
            const stats = UNIT_STATS[gameState.pendingPlacementType];
            const isParatrooper = gameState.pendingPlacementType === 'PARATROOPER';

            gameState.map.forEach((row, y) => {
                row.forEach((tile, x) => {
                    // Check ownership (must be own territory unless Paratrooper)
                    // Note: Carriers/Transport logic handled in click handler, here we just show map tiles
                    const isOwnTerritory = tile.owner === gameState.currentPlayer;

                    let isValidTerrain = false;
                    if (stats.category === 'AIR') isValidTerrain = tile.terrain === 'HELIPAD';
                    else if (stats.category === 'SEA') isValidTerrain = tile.terrain === 'SEA';
                    else if (stats.category === 'LAND') isValidTerrain = tile.terrain !== 'SEA';

                    if ((isOwnTerritory || isParatrooper) && isValidTerrain) {
                        // Check if occupied (simplistic check, accurate one in logic)
                        const unitAt = gameState.units.find(u => u.position.x === x && u.position.y === y && u.hp > 0);
                        if (!unitAt) {
                            highlights.set(`${x},${y}`, '#22c55e'); // Green for buildable
                        }
                    }
                });
            });
            return highlights;
        }

        // 2. Unit Action Highlights (Move/Attack)
        if (selectedUnitId && targetMode) {
            const unitInfo = findUnitById(gameState.units, selectedUnitId);
            const unit = unitInfo?.unit;
            if (!unit) return highlights;

            // 處理 Launch，需取得 Carrier 位置
            let startPosOverride: Position | undefined;
            if (unitInfo.carrierId) {
                const carrier = gameState.units.find(u => u.id === unitInfo.carrierId);
                startPosOverride = carrier?.position;
            }

            if (targetMode === 'MOVE') {
                // 優化：只計算一次 BFS
                const reachable = getReachableTiles(unit, gameState, startPosOverride);
                reachable.forEach((_, key) => {
                    highlights.set(key, 'rgba(59, 130, 246, 0.8)');
                });
            } else if (targetMode === 'ATTACK') {
                gameState.map.forEach((row, y) => {
                    row.forEach((_, x) => {
                        if (canAttack(unit, { x, y }, gameState).canAttack) {
                            highlights.set(`${x},${y}`, 'rgba(239, 68, 68, 0.8)');
                        }
                    });
                });
            }
        }

        // 3. Special Map Features (e.g. Golden Valley center) - Low priority, implicit highlight
        if (gameState.mapId === 'GOLDEN_VALLEY') {
            const centers = ['11,11', '11,12', '12,11', '12,12'];
            centers.forEach(key => {
                if (!highlights.has(key)) {
                    highlights.set(key, '#fbbf24'); // Amber/Gold color
                }
            });
        }

        return highlights;
    }, [selectedUnitId, targetMode, gameState]);

    return (
        <div className="w-full h-full bg-slate-950 relative">
            {/* 3D 場景 */}
            <Canvas shadows camera={{ position: [mapWidth / 2, camY, mapHeight + camZOffset], fov: 45, far: viewDistance * 2 }}>

                {/* Shake Wrapper */}
                <ShakeGroup ref={shakeRef}>
                    <OrbitControls
                        target={[mapWidth / 2, 0, mapHeight / 2]}
                        maxPolarAngle={Math.PI / 2.1}
                        minDistance={3}
                        maxDistance={maxZoom}
                    />

                    <fog attach="fog" args={['#020617', 5, viewDistance]} />

                    <Sky sunPosition={[100, 20, 100]} />
                    <Environment preset="night" />
                    <ambientLight intensity={0.5} />
                    <directionalLight
                        position={[10, 20, 10]}
                        intensity={1.5}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                        shadow-camera-left={-mapWidth}
                        shadow-camera-right={mapWidth}
                        shadow-camera-top={mapHeight}
                        shadow-camera-bottom={-mapHeight}
                    />

                    {/* 無限地平線地基 */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mapWidth / 2, -0.1, mapHeight / 2]} receiveShadow>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
                    </mesh>

                    {/* 繪製地圖 */}
                    <group position={[0.5, 0, 0.5]}>
                        {gameState.map.map((row, y) =>
                            row.map((tile, x) => (
                                <Tile3D
                                    key={`${x}-${y}`}
                                    position={[x, 0, y]}
                                    terrain={tile.terrain}
                                    owner={tile.owner}
                                    isVisible={visibleTiles.has(`${x},${y}`)}
                                    isHighlighted={highlightedTiles.has(`${x},${y}`)}
                                    highlightColor={highlightedTiles.get(`${x},${y}`)}
                                    onClick={() => handleTileClick({ x, y })}
                                    isSpecialZone={gameState.mapId === 'GOLDEN_VALLEY' && x >= 11 && x <= 12 && y >= 11 && y <= 12}
                                />
                            ))
                        )}

                        {/* 繪製單位 */}
                        {gameState.units.map(unit => {
                            if (unit.hp <= 0) return null;
                            const isVisible = isUnitVisibleTo(unit, observer, gameState);
                            if (!isVisible) return null;

                            return (
                                <Unit3D
                                    key={unit.id}
                                    unit={unit}
                                    isSelected={selectedUnitId === unit.id}
                                    onClick={() => handleTileClick(unit.position)}
                                    onContextMenu={() => onUnitInspect && onUnitInspect(unit.id)}
                                />
                            );
                        })}
                        {/* Effects Overlay */}
                        {explosions.map(ex => (
                            <Explosion
                                key={ex.id}
                                position={ex.position}
                                scale={ex.scale}
                                onComplete={() => setExplosions(prev => prev.filter(e => e.id !== ex.id))}
                            />
                        ))}

                        {floatingTexts.map(ft => (
                            <FloatingText
                                key={ft.id}
                                position={ft.position}
                                text={ft.text}
                                color={ft.color}
                                onComplete={() => setFloatingTexts(prev => prev.filter(t => t.id !== ft.id))}
                            />
                        ))}
                    </group>
                </ShakeGroup> {/* End Shake Group */}

                <ContactShadows position={[mapWidth / 2, 0, mapHeight / 2]} opacity={0.4} scale={20} blur={2.4} far={4.5} />
            </Canvas>

            {/* 控制 Overlay */}
            {selectedUnit && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-20">
                    {!selectedUnit.hasMoved && (
                        <button
                            onClick={() => { sfx.playClick(); setTargetMode('MOVE'); }}
                            className={`px-10 py-4 rounded-full font-black tracking-[0.2em] transition-all border-b-4 shadow-2xl ${targetMode === 'MOVE' ? 'bg-blue-600 text-white border-blue-900 scale-110 shadow-[0_0_30px_rgba(37,99,235,0.6)]' : 'bg-slate-900/80 text-slate-400 border-slate-950 hover:text-white hover:bg-slate-800'}`}
                        >
                            移動行動
                        </button>
                    )}
                    {!selectedUnit.hasAttacked && !selectedUnitInfo?.carrierId && (
                        <button
                            onClick={() => { sfx.playClick(); setTargetMode('ATTACK'); }}
                            className={`px-10 py-4 rounded-full font-black tracking-[0.2em] transition-all border-b-4 shadow-2xl ${targetMode === 'ATTACK' ? 'bg-red-600 text-white border-red-900 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-slate-900/80 text-slate-400 border-slate-950 hover:text-white hover:bg-slate-800'}`}
                        >
                            發起攻擊
                        </button>
                    )}
                </div>
            )}

            {/* 幫助提示 */}
            <div className="absolute top-16 left-6 font-mono text-[10px] text-slate-500 bg-black/60 px-3 py-2 rounded-lg border border-white/5 pointer-events-none tracking-wider">
                <span className="text-blue-400 mr-2">視角指南:</span> 右鍵拖曳旋轉 · 滾輪縮放鏡頭
            </div>
        </div>
    );
};

const FloatingText = ({ position, text, color, onComplete }: { position: [number, number, number], text: string, color: string, onComplete: () => void }) => {
    const [pos, setPos] = useState(position);
    const [opacity, setOpacity] = useState(1);

    useFrame(() => {
        setPos(p => [p[0], p[1] + 0.05, p[2]]); // Float up
        setOpacity(o => o - 0.02); // Fade out
        if (opacity <= 0) onComplete();
    });

    return (
        <Text
            position={pos}
            fontSize={1.5}
            color={color}
            anchorX="center"
            anchorY="middle"
            fillOpacity={opacity}
            outlineWidth={0.1}
            outlineColor="#000000"
            userData={{}} // Must include userData to satisfy TS if strict, though usually optional
        >
            {text}
        </Text>
    );
};

export default GameBoard3D;
