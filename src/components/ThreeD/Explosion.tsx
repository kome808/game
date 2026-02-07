// @ts-nocheck
import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';

interface ExplosionProps {
    position: [number, number, number];
    onComplete?: () => void;
    scale?: number;
    color?: string;
}

const Explosion: React.FC<ExplosionProps> = ({ position, onComplete, scale = 1, color = '#ef4444' }) => {
    const particlesRef = useRef<THREE.Group>(null);
    const [dead, setDead] = useState(false);

    // Create random particle data
    const particleData = useMemo(() => {
        return new Array(20).fill(0).map(() => ({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() * 5) + 2,
                (Math.random() - 0.5) * 5
            ),
            scale: Math.random() * 0.3 * scale,
            offset: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            )
        }));
    }, [scale]);

    useFrame((state, delta) => {
        if (dead || !particlesRef.current) return;

        let allDead = true;

        particlesRef.current.children.forEach((child, i) => {
            const data = particleData[i];

            // Gravity
            data.velocity.y -= 9.8 * delta;

            // Move
            child.position.addScaledVector(data.velocity, delta);

            // Scale down / fade logic simulation (visual scale)
            const currentScale = child.scale.x;
            if (currentScale > 0.01) {
                child.scale.setScalar(currentScale * 0.9); // Shrink
                allDead = false;
            }
        });

        if (allDead) {
            setDead(true);
            if (onComplete) onComplete();
        }
    });

    if (dead) return null;

    return (
        <group position={position} ref={particlesRef}>
            {particleData.map((data, i) => (
                <mesh key={i} position={data.offset} scale={data.scale}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
                </mesh>
            ))}
            {/* Flash core */}
            <mesh scale={scale * 2}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

// Needs manual useMemo import if used above, but better to put inside component or import
import { useMemo } from 'react';

export default Explosion;
