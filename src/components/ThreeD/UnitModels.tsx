// @ts-nocheck
import React, { useMemo } from 'react';
import { Box, Cylinder, Sphere, Cone } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
    color: string;
}

// Reuse materials/geometries if possible or keep simple JSX structures

// === 陸軍單位 ===

// 步兵 Infantry - A group of soldiers
export const InfantryModel: React.FC<ModelProps> = ({ color }) => {
    const soldiers = [-0.15, 0, 0.15];
    return (
        <group>
            {soldiers.map((offset, i) => (
                <group key={i} position={[offset, 0, (i % 2) * 0.1 - 0.05]}>
                    {/* Body */}
                    <Cylinder args={[0.06, 0.06, 0.25, 8]} position={[0, 0.125, 0]}>
                        <meshStandardMaterial color={color} />
                    </Cylinder>
                    {/* Head */}
                    <Sphere args={[0.05, 8, 8]} position={[0, 0.28, 0]}>
                        <meshStandardMaterial color="#fca5a5" />
                    </Sphere>
                    {/* Helmet */}
                    <Sphere args={[0.055, 8, 8]} position={[0, 0.3, 0]} scale={[1, 0.6, 1]}>
                        <meshStandardMaterial color="#3f4d6b" />
                    </Sphere>
                    {/* Gun */}
                    <Box args={[0.03, 0.03, 0.3]} position={[0.05, 0.18, 0.1]} rotation={[0, 0.1, 0]}>
                        <meshStandardMaterial color="#1e293b" />
                    </Box>
                </group>
            ))}
        </group>
    );
};

// 特種兵 Special Forces - Fewer but elite look (wearing beret/specs?)
export const SpecialForcesModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            <group position={[0, 0, 0]}>
                {/* Body - Slightly larger */}
                <Cylinder args={[0.08, 0.08, 0.28, 8]} position={[0, 0.14, 0]}>
                    <meshStandardMaterial color={color} />
                </Cylinder>
                {/* Backpack */}
                <Box args={[0.1, 0.15, 0.08]} position={[0, 0.16, -0.06]}>
                    <meshStandardMaterial color="#374151" />
                </Box>
                {/* Head */}
                <Sphere args={[0.06, 8, 8]} position={[0, 0.32, 0]}>
                    <meshStandardMaterial color="#fca5a5" />
                </Sphere>
                {/* Beret/Hat */}
                <Cylinder args={[0.06, 0.07, 0.02, 8]} position={[0, 0.35, 0]} rotation={[0.2, 0, 0]}>
                    <meshStandardMaterial color="black" />
                </Cylinder>
                {/* Gun - Advanced Rifle */}
                <Box args={[0.04, 0.06, 0.35]} position={[0.08, 0.18, 0.15]}>
                    <meshStandardMaterial color="#0f172a" />
                </Box>
            </group>
        </group>
    );
};

// 狙擊手 Sniper - Prone or kneeling with long rifle
export const SniperModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            {/* Body (Prone) */}
            <Box args={[0.12, 0.1, 0.3]} position={[0, 0.05, 0]}>
                <meshStandardMaterial color={color} />
            </Box>
            {/* Head */}
            <Sphere args={[0.05, 8, 8]} position={[0, 0.12, -0.1]}>
                <meshStandardMaterial color="#fca5a5" />
            </Sphere>
            {/* Hat / Ghillie */}
            <Sphere args={[0.06, 8, 8]} position={[0, 0.13, -0.1]} scale={[1, 0.7, 1]}>
                <meshStandardMaterial color="#3f6212" roughness={1} />
            </Sphere>
            {/* Long Rifle */}
            <Cylinder args={[0.015, 0.02, 0.6]} rotation={[Math.PI / 2, 0, 0]} position={[0.05, 0.05, 0.3]}>
                <meshStandardMaterial color="#0f172a" />
            </Cylinder>
            {/* Scope */}
            <Cylinder args={[0.015, 0.015, 0.1]} rotation={[Math.PI / 2, 0, 0]} position={[0.05, 0.08, 0.15]}>
                <meshStandardMaterial color="black" />
            </Cylinder>
        </group>
    );
};


// 坦克 Tank
export const TankModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group castShadow>
            {/* Chassis */}
            <Box args={[0.3, 0.15, 0.55]} position={[0, 0.15, 0]}>
                <meshStandardMaterial color={color} roughness={0.6} />
                {/* Detail stripes */}
                <meshStandardMaterial color="#1f2937" attach="material-1" /> {/* Attempt multi-material or logic sim */}
            </Box>
            {/* Tracks */}
            <Box args={[0.08, 0.15, 0.5]} position={[0.19, 0.08, 0]}>
                <meshStandardMaterial color="#111827" /> // Dark track
            </Box>
            <Box args={[0.08, 0.15, 0.5]} position={[-0.19, 0.08, 0]}>
                <meshStandardMaterial color="#111827" /> // Dark track
            </Box>
            {/* Turret */}
            <group position={[0, 0.28, -0.05]}>
                <Box args={[0.22, 0.12, 0.3]}>
                    <meshStandardMaterial color={color} />
                </Box>
                {/* Barrel */}
                <Cylinder args={[0.03, 0.04, 0.5, 8]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.35]}>
                    <meshStandardMaterial color="#374151" />
                </Cylinder>
                {/* Barrel End */}
                <Cylinder args={[0.04, 0.04, 0.05, 8]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.6]}>
                    <meshStandardMaterial color="#1f2937" />
                </Cylinder>
            </group>
        </group>
    );
};

// 自走砲 Artillery - Larger, angled barrel
export const ArtilleryModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group castShadow>
            {/* Chassis - similar to tank but bulkier back */}
            <Box args={[0.32, 0.18, 0.5]} position={[0, 0.15, 0]}>
                <meshStandardMaterial color={color} roughness={0.7} />
            </Box>
            {/* Tracks */}
            <Box args={[0.1, 0.16, 0.48]} position={[0.21, 0.08, 0]}>
                <meshStandardMaterial color="#111827" />
            </Box>
            <Box args={[0.1, 0.16, 0.48]} position={[-0.21, 0.08, 0]}>
                <meshStandardMaterial color="#111827" />
            </Box>
            {/* Turret - Rear mounted */}
            <group position={[0, 0.3, -0.1]}>
                <Box args={[0.25, 0.15, 0.25]}>
                    <meshStandardMaterial color={color} />
                </Box>
                {/* Long Barrel Angled Up */}
                <Cylinder args={[0.03, 0.04, 0.7, 8]} rotation={[Math.PI / 2 - 0.5, 0, 0]} position={[0, 0.2, 0.3]}>
                    <meshStandardMaterial color="#334155" />
                </Cylinder>
            </group>
        </group>
    );
};

// 反坦克 Anti-Tank - Wheeled or smaller, big gun
export const AntiTankModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            {/* Shield */}
            <Box args={[0.4, 0.25, 0.05]} position={[0, 0.2, 0.2]}>
                <meshStandardMaterial color={color} />
            </Box>
            {/* Wheels */}
            <Cylinder args={[0.1, 0.1, 0.05, 12]} rotation={[0, 0, Math.PI / 2]} position={[0.22, 0.1, 0]}>
                <meshStandardMaterial color="black" />
            </Cylinder>
            <Cylinder args={[0.1, 0.1, 0.05, 12]} rotation={[0, 0, Math.PI / 2]} position={[-0.22, 0.1, 0]}>
                <meshStandardMaterial color="black" />
            </Cylinder>
            {/* Long Barrel */}
            <Cylinder args={[0.025, 0.03, 0.7]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.25, 0.3]}>
                <meshStandardMaterial color="#475569" />
            </Cylinder>
        </group>
    );
};

// 防空車 Anit-Air - Radar/Missiles
export const AntiAirModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            {/* Truck Body */}
            <Box args={[0.28, 0.15, 0.5]} position={[0, 0.15, 0]}>
                <meshStandardMaterial color={color} />
            </Box>
            {/* Turret */}
            <group position={[0, 0.3, -0.1]}>
                {/* Radar Dish */}
                <Box args={[0.2, 0.2, 0.02]} rotation={[-0.4, 0, 0]} position={[0, 0.15, -0.1]}>
                    <meshStandardMaterial color="#94a3b8" />
                </Box>
                {/* Quad Guns */}
                <Cylinder args={[0.01, 0.01, 0.4]} rotation={[Math.PI / 2 - 0.4, 0, 0]} position={[0.05, 0.1, 0.2]}>
                    <meshStandardMaterial color="#1e293b" />
                </Cylinder>
                <Cylinder args={[0.01, 0.01, 0.4]} rotation={[Math.PI / 2 - 0.4, 0, 0]} position={[-0.05, 0.1, 0.2]}>
                    <meshStandardMaterial color="#1e293b" />
                </Cylinder>
            </group>
        </group>
    );
};


// === 空軍單位 ===

export const AirUnitModel: React.FC<ModelProps & { type?: 'FIGHTER' | 'BOMBER' }> = ({ color, type = 'FIGHTER' }) => {
    const isBomber = type === 'BOMBER';

    if (isBomber) {
        // Bomber - Large Wings, Heavy
        return (
            <group position={[0, 0.5, 0]}>
                {/* Fuselage */}
                <Cylinder args={[0.12, 0.15, 0.9, 12]} rotation={[Math.PI / 2, 0, 0]}>
                    <meshStandardMaterial color={color} roughness={0.4} />
                </Cylinder>
                {/* Cockpit Glass */}
                <Sphere args={[0.11]} position={[0, 0.05, 0.3]} scale={[0.8, 0.5, 1.2]}>
                    <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} />
                </Sphere>
                {/* Main Wings */}
                <Box args={[1.8, 0.04, 0.35]} position={[0, 0, 0.1]}>
                    <meshStandardMaterial color={color} />
                </Box>
                {/* Engines on wings */}
                <Cylinder args={[0.06, 0.06, 0.3]} rotation={[Math.PI / 2, 0, 0]} position={[0.5, -0.05, 0.1]}>
                    <meshStandardMaterial color="#334155" />
                </Cylinder>
                <Cylinder args={[0.06, 0.06, 0.3]} rotation={[Math.PI / 2, 0, 0]} position={[-0.5, -0.05, 0.1]}>
                    <meshStandardMaterial color="#334155" />
                </Cylinder>
                {/* Tail */}
                <Box args={[0.6, 0.04, 0.2]} position={[0, 0.05, -0.4]}>
                    <meshStandardMaterial color={color} />
                </Box>
                <Box args={[0.04, 0.3, 0.2]} position={[0, 0.15, -0.4]}>
                    <meshStandardMaterial color={color} />
                </Box>
            </group>
        );
    }

    // Fighter - Sleek
    return (
        <group position={[0, 0.5, 0]}>
            {/* Fuselage */}
            <Cone args={[0.1, 0.8, 16]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </Cone>
            {/* Cockpit */}
            <Box args={[0.1, 0.08, 0.3]} position={[0, 0.05, 0]}>
                <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} />
            </Box>
            {/* Wings - Delta shape approx */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.1]}>
                <planeGeometry args={[1.0, 0.5]} />
                <meshStandardMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
            {/* Tail Vertical */}
            <Box args={[0.02, 0.2, 0.15]} position={[0, 0.1, -0.3]}>
                <meshStandardMaterial color={color} />
            </Box>
            {/* Missiles */}
            <Cylinder args={[0.01, 0.01, 0.3]} rotation={[Math.PI / 2, 0, 0]} position={[0.4, -0.05, 0]}>
                <meshStandardMaterial color="white" />
            </Cylinder>
            <Cylinder args={[0.01, 0.01, 0.3]} rotation={[Math.PI / 2, 0, 0]} position={[-0.4, -0.05, 0]}>
                <meshStandardMaterial color="white" />
            </Cylinder>
        </group>
    );
};

// 直昇機 Helicopter
export const HelicopterModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group position={[0, 0.5, 0]}>
            {/* Body */}
            <Sphere args={[0.2]} position={[0, 0, 0]} scale={[0.8, 1, 1.5]}>
                <meshStandardMaterial color={color} />
            </Sphere>
            {/* Tail Boom */}
            <Cylinder args={[0.05, 0.02, 0.6]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, -0.3]}>
                <meshStandardMaterial color={color} />
            </Cylinder>
            {/* Main Rotor */}
            <Box args={[1.2, 0.01, 0.05]} position={[0, 0.22, 0]}>
                <meshStandardMaterial color="#0f172a" />
            </Box>
            <Box args={[0.05, 0.01, 1.2]} position={[0, 0.22, 0]}>
                <meshStandardMaterial color="#0f172a" />
            </Box>
            {/* Tail Rotor */}
            <Box args={[0.3, 0.01, 0.05]} position={[0.05, 0.1, -0.6]} rotation={[0, 0, Math.PI / 2]}>
                <meshStandardMaterial color="#0f172a" />
            </Box>
            {/* Skids */}
            <Cylinder args={[0.01, 0.01, 0.6]} rotation={[Math.PI / 2, 0, 0]} position={[0.15, -0.2, 0]}>
                <meshStandardMaterial color="#334155" />
            </Cylinder>
            <Cylinder args={[0.01, 0.01, 0.6]} rotation={[Math.PI / 2, 0, 0]} position={[-0.15, -0.2, 0]}>
                <meshStandardMaterial color="#334155" />
            </Cylinder>
        </group>
    );
};


// === 海軍單位 ===

// 潛艦 Submarine
export const SubmarineModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group position={[0, -0.1, 0]}>
            {/* Hull */}
            <Cylinder args={[0.12, 0.12, 0.8, 16]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#0f172a" roughness={0.3} />
            </Cylinder>
            {/* Conning Tower */}
            <Box args={[0.1, 0.15, 0.2]} position={[0, 0.15, 0.1]}>
                <meshStandardMaterial color="#0f172a" />
            </Box>
            {/* Periscope */}
            <Cylinder args={[0.01, 0.01, 0.1]} position={[0, 0.25, 0.15]}>
                <meshStandardMaterial color="#94a3b8" />
            </Cylinder>
        </group>
    );
};


// 巡洋艦 Cruiser/Destroyer
export const SeaUnitModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            {/* Hull */}
            <Box args={[0.25, 0.12, 0.9]} position={[0, 0.06, 0]}>
                <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.1} />
            </Box>
            {/* Deck Color Stripe */}
            <Box args={[0.26, 0.05, 0.8]} position={[0, 0.1, 0]}>
                <meshStandardMaterial color={color} />
            </Box>
            {/* Superstructure */}
            <Box args={[0.15, 0.15, 0.3]} position={[0, 0.2, -0.1]}>
                <meshStandardMaterial color="#cbd5e1" />
            </Box>
            {/* Guns */}
            <Cylinder args={[0.04, 0.05, 0.15]} position={[0, 0.15, 0.3]}>
                <meshStandardMaterial color="#475569" />
            </Cylinder>
            <Cylinder args={[0.015, 0.015, 0.2]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.18, 0.35]}>
                <meshStandardMaterial color="#1e293b" />
            </Cylinder>
        </group>
    );
};

// 運輸艦 Transport
export const TransportModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            {/* Hull */}
            <Box args={[0.3, 0.15, 0.8]} position={[0, 0.08, 0]}>
                <meshStandardMaterial color="#475569" />
            </Box>
            {/* Flat Deck mostly empty */}
            <Box args={[0.28, 0.05, 0.7]} position={[0, 0.16, 0]}>
                <meshStandardMaterial color="#94a3b8" />
            </Box>
            {/* Bridge at far back */}
            <Box args={[0.25, 0.15, 0.1]} position={[0, 0.25, -0.3]}>
                <meshStandardMaterial color={color} />
            </Box>
        </group>
    );
};

// 航空母艦 Carrier
export const CarrierModel: React.FC<ModelProps> = ({ color }) => {
    return (
        <group>
            {/* Hull */}
            <Box args={[0.4, 0.2, 1.1]} position={[0, 0.1, 0]}>
                <meshStandardMaterial color="#334155" />
            </Box>
            {/* Flight Deck */}
            <Box args={[0.5, 0.02, 1.15]} position={[0, 0.21, 0]}>
                <meshStandardMaterial color="#1e293b" />
            </Box>
            {/* Runway Stripes */}
            <Box args={[0.04, 0.025, 1.0]} position={[-0.1, 0.21, 0]}>
                <meshStandardMaterial color="#eab308" /> // Dashed yellow line visual
            </Box>
            {/* Island (Tower) */}
            <Box args={[0.08, 0.15, 0.2]} position={[0.2, 0.3, -0.1]}>
                <meshStandardMaterial color={color} />
            </Box>
            {/* Radar on Island */}
            <Box args={[0.05, 0.05, 0.01]} position={[0.2, 0.4, -0.1]} rotation={[0.2, 0, 0]}>
                <meshStandardMaterial color="#94a3b8" />
            </Box>
        </group>
    );
};
