import React, { useRef } from 'react';
import { Sphere, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Unit as UnitType } from '../../game/types';
import * as THREE from 'three';
import { UNIT_STATS } from '../../game/setup';

import {
    InfantryModel, SpecialForcesModel, SniperModel,
    TankModel, AntiTankModel, ArtilleryModel, AntiAirModel,
    AirUnitModel,
    SeaUnitModel, TransportModel, SubmarineModel, CarrierModel
} from './UnitModels';

interface Unit3DProps {
    unit: UnitType;
    isSelected: boolean;
    onClick: () => void;
    onContextMenu?: () => void;
}

const Unit3D: React.FC<Unit3DProps> = ({ unit, isSelected, onClick, onContextMenu }) => {
    const meshRef = useRef<THREE.Group>(null);

    // 基礎動畫：輕微浮動
    useFrame((state) => {
        if (meshRef.current) {
            // 空軍浮動幅度較大
            const floatScale = unit.category === 'AIR' ? 0.1 : 0.02;
            const floatBase = unit.category === 'AIR' ? 1.5 : 0.8;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * floatScale + floatBase;

            // 船隻輕微搖晃
            if (unit.category === 'SEA') {
                meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1) * 0.05;
                meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
            }
        }
    });

    const playerColor = unit.player === 'PLAYER1' ? '#ef4444' : '#3b82f6';
    const actionColor = (unit.hasMoved && unit.hasAttacked) ? '#475569' : playerColor;

    // 根據類別選擇形狀
    const renderModel = () => {
        switch (unit.type) {
            // LAND
            case 'INFANTRY': return <InfantryModel color={actionColor} />;
            case 'SPECIAL_FORCES': return <SpecialForcesModel color={actionColor} />;
            case 'SNIPER': return <SniperModel color={actionColor} />;
            case 'TANK': return <TankModel color={actionColor} />;
            case 'ANTI_TANK': return <AntiTankModel color={actionColor} />;
            case 'MORTAR': return <ArtilleryModel color={actionColor} />;
            case 'ANTI_AIR': return <AntiAirModel color={actionColor} />;

            // AIR
            case 'FIGHTER': return <AirUnitModel color={actionColor} type="FIGHTER" />;
            case 'BOMBER': return <AirUnitModel color={actionColor} type="BOMBER" />;

            case 'PARATROOPER': return <InfantryModel color={actionColor} />; // Paratrooper looks like Infantry 

            // SEA

            case 'CRUISER': return <SeaUnitModel color={actionColor} />;
            case 'SUBMARINE': return <SubmarineModel color={actionColor} />;
            case 'TRANSPORT': return <TransportModel color={actionColor} />;
            case 'CARRIER':
                return (
                    <group>
                        <CarrierModel color={actionColor} />
                        {unit.transportedUnits?.map((u, i) => {
                            const zOffset = -0.4 + (i * 0.25);
                            if (i > 3) return null;
                            return (
                                <group key={u.id} position={[0, 0.25, zOffset]} scale={0.4}>
                                    <AirUnitModel
                                        color={u.player === 'PLAYER1' ? '#ef4444' : '#3b82f6'}
                                        type={u.type === 'BOMBER' ? 'BOMBER' : 'FIGHTER'}
                                    />
                                </group>
                            );
                        })}
                    </group>
                );

            default:
                // Fallback by category if type specific missing
                if (unit.category === 'LAND') return <InfantryModel color={actionColor} />;
                if (unit.category === 'AIR') return <AirUnitModel color={actionColor} />;
                if (unit.category === 'SEA') return <SeaUnitModel color={actionColor} />;
                return <Sphere args={[0.3, 16, 16]}><meshStandardMaterial color={actionColor} /></Sphere>;
        }
    };

    return (
        <group
            position={[unit.position.x, 0.8, unit.position.y]}
            rotation={[0, unit.rotation || 0, 0]}
            ref={meshRef}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onContextMenu={(e) => {
                e.stopPropagation();
                if (onContextMenu) onContextMenu();
            }}
        >
            {/* 單位主體 */}
            {renderModel()}

            {/* 選中高亮環 */}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
                    <ringGeometry args={[0.5, 0.6, 32]} />
                    <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* 單位類型文字與 HP 條 */}
            <Billboard position={[0, 1.2, 0]}>
                <Text
                    fontSize={0.15}
                    color="white"
                    anchorX="center"
                    anchorY="bottom"
                    position={[0, 0.2, 0]}
                    outlineWidth={0.02}
                    outlineColor="#000000"
                >
                    {UNIT_STATS[unit.type].name}
                </Text>

                {/* HP Bar Background */}
                <mesh position={[0, 0.1, 0]}>
                    <planeGeometry args={[0.8, 0.1]} />
                    <meshBasicMaterial color="#000" />
                </mesh>

                {/* HP Bar Fill */}
                <mesh position={[(-0.4 + (0.4 * (unit.hp / unit.maxHp))), 0.1, 0.01]}>
                    <planeGeometry args={[0.8 * (unit.hp / unit.maxHp), 0.08]} />
                    <meshBasicMaterial color={unit.hp / unit.maxHp > 0.3 ? "#22c55e" : "#ef4444"} />
                </mesh>
            </Billboard>
        </group>
    );
};

export default Unit3D;
