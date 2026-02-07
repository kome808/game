// @ts-nocheck
import React, { useMemo } from 'react';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import type { TerrainType, Player } from '../../game/types';
import * as THREE from 'three';

interface Tile3DProps {
    position: [number, number, number];
    terrain: TerrainType;
    owner?: Player;
    isHighlighted?: boolean;
    highlightColor?: string;
    onClick: () => void;
    isVisible: boolean;
    isSpecialZone?: boolean;
}

// Reuse geometries/materials for performance?
// React Three Fiber handles instances well, but for simple primitives creating new ones is okay.

const Tree: React.FC<{ position: [number, number, number], scale?: number }> = ({ position, scale = 1 }) => (
    <group position={position} scale={scale}>
        {/* Trunk */}
        <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.4, 6]} />
            <meshStandardMaterial color="#5d4037" />
        </mesh>
        {/* Leaves */}
        <mesh position={[0, 0.6, 0]}>
            <coneGeometry args={[0.25, 0.6, 6]} />
            <meshStandardMaterial color="#15803d" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
            <coneGeometry args={[0.35, 0.6, 6]} />
            <meshStandardMaterial color="#166534" />
        </mesh>
    </group>
);

const Rock: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <mesh position={position} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#64748b" />
    </mesh>
);

const BaseBuilding: React.FC<{ owner?: Player }> = ({ owner }) => {
    const color = owner === 'PLAYER1' ? '#dc2626' : (owner === 'PLAYER2' ? '#2563eb' : '#334155');
    return (
        <group>
            {/* Main Bunker */}
            <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.6, 0.6, 0.6]} />
                <meshStandardMaterial color={color} roughness={0.3} />
            </mesh>
            {/* Top Turret/Antenna Base */}
            <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.2, 0.25, 0.2, 8]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Flag Pole */}
            <mesh position={[0.2, 0.8, 0.2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
        </group>
    );
};

const HelipadMarking = () => (
    <group position={[0, 0.01, 0]}>
        {/* Circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.3, 32]} />
            <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        {/* H */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[0.25, 0.25]} />
            {/* Use a texture in real prod, but here simpler primitive shape combination or just a box for H */}
            <meshStandardMaterial color="#e2e8f0" attach="material" transparent opacity={0} /> {/* Invisible plane just to center */}
        </mesh>
        <mesh position={[-0.08, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.05, 0.25, 0.01]} />
            <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <mesh position={[0.08, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.05, 0.25, 0.01]} />
            <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.16, 0.05, 0.01]} />
            <meshStandardMaterial color="#e2e8f0" />
        </mesh>
    </group>
);

const Tile3D: React.FC<Tile3DProps> = ({
    position,
    terrain,
    owner,
    isHighlighted,
    highlightColor = 'yellow',
    onClick,
    isVisible,
    isSpecialZone
}) => {
    // Deterministic random decoration based on position
    const decorations = useMemo(() => {
        if (!isVisible) return null;
        if (terrain !== 'LAND') return null;

        const seed = position[0] * 100 + position[2];
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const items: React.ReactNode[] = [];
        const count = Math.floor(pseudoRandom(0) * 3); // 0 to 2 items

        for (let i = 0; i < count; i++) {
            const type = pseudoRandom(i + 1) > 0.7 ? 'rock' : 'tree';
            const offsetX = (pseudoRandom(i + 10) - 0.5) * 0.6;
            const offsetZ = (pseudoRandom(i + 20) - 0.5) * 0.6;
            const pos: [number, number, number] = [offsetX, 0.5, offsetZ]; // 0.5 is approx surface height
            const scale = 0.5 + pseudoRandom(i + 30) * 0.5;

            if (type === 'tree') {
                items.push(<Tree key={i} position={pos} scale={scale} />);
            } else {
                items.push(<Rock key={i} position={[offsetX, 0.25, offsetZ]} />); // Rock lower
            }
        }
        return items;
    }, [terrain, position, isVisible]);

    const config = {
        SEA: { color: '#0ea5e9', height: 0.15, transparent: true, opacity: 0.8 },
        LAND: { color: '#4ade80', height: 0.5 },
        HELIPAD: { color: '#475569', height: 0.55 },
        BASE: { color: '#334155', height: 0.6 } // Base floor, actual building is separate
    };

    const conf = config[terrain];

    // 戰爭迷霧處理
    const baseColor = isVisible ? conf.color : '#0f172a';
    const baseOpacity = isVisible ? (conf.opacity ?? 1) : 0.6;

    return (
        <group position={position}>
            {/* Tile Base */}
            <Box
                args={[0.95, conf.height, 0.95]}
                position={[0, conf.height / 2, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
            >
                <meshStandardMaterial
                    color={baseColor}
                    transparent={conf.transparent || !isVisible}
                    opacity={baseOpacity}
                    roughness={terrain === 'SEA' ? 0.1 : 0.8}
                    metalness={terrain === 'SEA' ? 0.1 : 0}
                    emissive={isHighlighted ? highlightColor : 'black'}
                    emissiveIntensity={isHighlighted ? 0.3 : 0}
                />
            </Box>

            {/* Decorations */}
            {isVisible && terrain === 'LAND' && decorations}

            {/* Structures */}
            {isVisible && terrain === 'BASE' && (
                <group position={[0, conf.height, 0]}>
                    <BaseBuilding owner={owner} />
                </group>
            )}

            {isVisible && terrain === 'HELIPAD' && (
                <group position={[0, conf.height + 0.01, 0]}>
                    <HelipadMarking />
                </group>
            )}

            {/* Decoration highlight ring if selected */}
            {isHighlighted && (
                <group position={[0, conf.height + 0.05, 0]}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.35, 0.45, 32]} />
                        <meshBasicMaterial color={highlightColor} opacity={0.8} transparent />
                    </mesh>
                </group>
            )}

            {/* Special Zone Indicator */}
            {isSpecialZone && isVisible && (
                <group position={[0, conf.height + 0.3, 0]}>
                    {/* Floating Coin/Ring */}
                    <mesh position={[0, 0, 0]}>
                        <torusGeometry args={[0.25, 0.05, 16, 32]} />
                        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} roughness={0.1} metalness={0.8} />
                    </mesh>
                    {/* Rotating Inner ? Maybe just static for now for performance */}
                    <mesh scale={0.2} position={[0, 0, 0]}>
                        <octahedronGeometry />
                        <meshStandardMaterial color="#f59e0b" wireframe />
                    </mesh>

                    {/* Ground Glow */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
                        <ringGeometry args={[0.3, 0.5, 32]} />
                        <meshBasicMaterial color="#fbbf24" transparent opacity={0.2} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

export default Tile3D;
