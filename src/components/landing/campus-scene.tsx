"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box, Cylinder, Float, Environment, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Suspense } from "react";

function ProfessorModel() {
    const { scene } = useGLTF("/models/professor_test_best.glb");
    const [reaction, setReaction] = useState(false);
    const bones = useMemo(() => {
        const b: any = {};
        scene.traverse((node) => {
            if (node instanceof THREE.Bone) {
                b[node.name] = node;
            }
        });
        return b;
    }, [scene]);

    useEffect(() => {
        if (bones.Hips) {
            // Hip height for sitting (Calibrated to touch ground perfectly)
            bones.Hips.position.y = 0.52;

            // SITTING POSE: 90/90 Sit for geometric precision
            if (bones.LeftUpLeg) bones.LeftUpLeg.rotation.set(1.5, 0, 0);
            if (bones.RightUpLeg) bones.RightUpLeg.rotation.set(1.5, 0, 0);
            if (bones.LeftLeg) bones.LeftLeg.rotation.set(1.5, 0, 0);
            if (bones.RightLeg) bones.RightLeg.rotation.set(1.5, 0, 0);

            // FOOT POSING: -1.5 on X counters the knee to stay perfectly parallel to floor.
            // Math.PI on Y ensures they point forward towards the desk.
            if (bones.LeftFoot) bones.LeftFoot.rotation.set(-1.5, Math.PI, 0);
            if (bones.RightFoot) bones.RightFoot.rotation.set(-1.5, Math.PI, 0);

            // Posture
            if (bones.Spine) bones.Spine.rotation.set(0.1, 0, 0);

            // ARMS: Reach towards desk surface
            if (bones.LeftArm) bones.LeftArm.rotation.set(0.7, 0, 0.4);
            if (bones.RightArm) bones.RightArm.rotation.set(0.7, 0, -0.4);
            if (bones.LeftForeArm) bones.LeftForeArm.rotation.set(0.9, 0, 0);
            if (bones.RightForeArm) bones.RightForeArm.rotation.set(0.9, 0, 0);
        }
    }, [bones]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Idle Breathing Sway (Subtle)
        if (bones.Spine) {
            bones.Spine.rotation.z = Math.sin(t * 0.5) * 0.02;
            bones.Spine.rotation.x = 0.1 + Math.sin(t * 1.5) * 0.01;
        }

        // Hand micro-movements
        if (bones.LeftHand) bones.LeftHand.rotation.y = Math.sin(t * 2) * 0.05;
        if (bones.RightHand) bones.RightHand.rotation.y = Math.cos(t * 2) * 0.05;

        // Click Reaction: Nodding
        if (reaction && bones.Neck) {
            bones.Neck.rotation.x = Math.sin(t * 10) * 0.15;
        } else if (bones.Neck) {
            // Face the student area or mouse
            const mouseX = state.mouse.x * 2;
            const mouseY = state.mouse.y;
            const target = new THREE.Vector3(1.2 + mouseX, 1.0 + mouseY, 1.3);
            bones.Neck.lookAt(target);
        }
    });

    const handleClick = () => {
        setReaction(true);
        setTimeout(() => setReaction(false), 1000);
    };

    return (
        <primitive
            object={scene}
            position={[-0.8, 0, -1.6]} // Center on chair seat
            scale={1.2}
            rotation={[0, 0, 0]} // Faces desk (+Z)
            onClick={handleClick}
        />
    );
}

function StudentModel() {
    const { scene } = useGLTF("/models/student_masculine_final.glb");
    const [reaction, setReaction] = useState(false);
    const bones = useMemo(() => {
        const b: any = {};
        scene.traverse((node) => {
            if (node instanceof THREE.Bone) {
                b[node.name] = node;
            }
        });
        return b;
    }, [scene]);

    useEffect(() => {
        if (bones.Hips) {
            // Hip height for student sitting
            bones.Hips.position.y = 0.50; // Calibrated for ground contact

            // Pose: 90/90 Sit
            if (bones.LeftUpLeg) bones.LeftUpLeg.rotation.set(1.5, 0, 0);
            if (bones.RightUpLeg) bones.RightUpLeg.rotation.set(1.5, 0, 0);
            if (bones.LeftLeg) bones.LeftLeg.rotation.set(1.5, 0, 0);
            if (bones.RightLeg) bones.RightLeg.rotation.set(1.5, 0, 0);

            // Foot: Parallel and Forward
            if (bones.LeftFoot) bones.LeftFoot.rotation.set(-1.5, Math.PI, 0);
            if (bones.RightFoot) bones.RightFoot.rotation.set(-1.5, Math.PI, 0);

            if (bones.Spine) bones.Spine.rotation.set(0.1, 0, 0);

            // STUDENT ARMS: Reach towards desk surface
            if (bones.LeftArm) bones.LeftArm.rotation.set(0.8, 0, 0.2);
            if (bones.RightArm) bones.RightArm.rotation.set(0.8, 0, -0.2);
            if (bones.LeftForeArm) bones.LeftForeArm.rotation.set(0.8, 0, 0);
            if (bones.RightForeArm) bones.RightForeArm.rotation.set(0.8, 0, 0);
        }
    }, [bones]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Student Idle Sway
        if (bones.Spine) {
            bones.Spine.rotation.z = Math.sin(t * 0.6) * 0.03;
            bones.Spine.rotation.x = 0.1 + Math.cos(t * 1.2) * 0.015;
        }

        // Click Reaction
        if (reaction && bones.Neck) {
            bones.Neck.rotation.y = Math.sin(t * 15) * 0.2; // Quick shake
        } else if (bones.Neck) {
            // Face the professor or mouse
            const mouseX = state.mouse.x * 1.5;
            const mouseY = state.mouse.y * 0.5;
            const target = new THREE.Vector3(-0.8 + mouseX, 1.0 + mouseY, -1.6);
            bones.Neck.lookAt(target);
        }
    });

    const handleClick = () => {
        setReaction(true);
        setTimeout(() => setReaction(false), 800);
    };

    return (
        <primitive
            object={scene}
            position={[1.2, 0, 1.25]} // Reversed to original orientation
            scale={1.1}
            rotation={[0, Math.PI, 0]} // Faces desk (-Z)
            onClick={handleClick}
        />
    );
}



function LowPolyRoom() {
    return (
        <group dispose={null}>
            {/* Floor */}
            <Box args={[5, 0.2, 5]} position={[0, -0.1, 0]}>
                <meshStandardMaterial color="#0f172a" />
            </Box>

            {/* Back Wall */}
            <Box args={[5, 3, 0.2]} position={[0, 1.4, -2.4]}>
                <meshStandardMaterial color="#1e293b" />
            </Box>

            {/* Side Wall */}
            <Box args={[0.2, 3, 5]} position={[-2.4, 1.4, 0]}>
                <meshStandardMaterial color="#1e293b" />
            </Box>

            {/* Whiteboard */}
            <Box args={[2.8, 1.2, 0.05]} position={[0.2, 1.6, -2.25]}>
                <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
            </Box>

            {/* Smart IoT Device on Wall (next to whiteboard) */}
            <group position={[-1.6, 1.5, -2.25]}>
                <Box args={[0.3, 0.5, 0.1]}>
                    <meshStandardMaterial color="#334155" />
                </Box>
                {/* Glowing LED on Device */}
                <Box args={[0.2, 0.1, 0.12]} position={[0, 0.1, 0]}>
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} toneMapped={false} />
                </Box>
            </group>

            {/* Professor's Desk */}
            <group position={[-0.8, 0, -1.0]}>
                <Box args={[1.6, 0.1, 0.8]} position={[0, 0.8, 0]}>
                    <meshStandardMaterial color="#475569" />
                </Box>
                <Cylinder args={[0.04, 0.04, 0.8]} position={[-0.7, 0.4, -0.3]}><meshStandardMaterial color="#94a3b8" /></Cylinder>
                <Cylinder args={[0.04, 0.04, 0.8]} position={[0.7, 0.4, -0.3]}><meshStandardMaterial color="#94a3b8" /></Cylinder>
                <Cylinder args={[0.04, 0.04, 0.8]} position={[-0.7, 0.4, 0.3]}><meshStandardMaterial color="#94a3b8" /></Cylinder>
                <Cylinder args={[0.04, 0.04, 0.8]} position={[0.7, 0.4, 0.3]}><meshStandardMaterial color="#94a3b8" /></Cylinder>

                {/* Laptop - Rotated to face the Professor */}
                <group position={[0, 0.87, -0.05]} rotation={[0, Math.PI, 0]}>
                    <Box args={[0.5, 0.04, 0.35]}>
                        <meshStandardMaterial color="#cbd5e1" />
                    </Box>
                    {/* Screen - Angle adjusted to face viewer (+Z) after group rotation */}
                    <Box args={[0.5, 0.35, 0.02]} position={[0, 0.18, -0.175]} rotation={[-0.4, 0, 0]}>
                        <meshStandardMaterial color="#0f172a" emissive="#1e293b" emissiveIntensity={0.5} />
                    </Box>
                </group>

                {/* Teacher's Briefcase - Resized to match laptop width (0.5) */}
                <group position={[0.5, 0.9, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
                    <Box args={[0.5, 0.3, 0.1]}>
                        <meshStandardMaterial color="#422006" />
                    </Box>
                    {/* Briefcase Handle */}
                    <Box args={[0.15, 0.03, 0.03]} position={[0, 0.16, 0]}>
                        <meshStandardMaterial color="#271103" />
                    </Box>
                    {/* Clasps */}
                    <Box args={[0.04, 0.06, 0.02]} position={[-0.1, 0.05, 0.055]}><meshStandardMaterial color="#a1a1aa" metalness={1} /></Box>
                    <Box args={[0.04, 0.06, 0.02]} position={[0.1, 0.05, 0.055]}><meshStandardMaterial color="#a1a1aa" metalness={1} /></Box>
                </group>

                {/* Professor's Chair - Behind the desk */}
                <group position={[0, 0, -0.6]} rotation={[0, 0, 0]}>
                    <Box args={[0.5, 0.05, 0.5]} position={[0, 0.45, 0]}><meshStandardMaterial color="#1e293b" /></Box>
                    <Box args={[0.5, 0.5, 0.05]} position={[0, 0.7, -0.25]}><meshStandardMaterial color="#1e293b" /></Box>
                    <Cylinder args={[0.03, 0.03, 0.45]} position={[-0.2, 0.225, -0.2]}><meshStandardMaterial color="#475569" /></Cylinder>
                    <Cylinder args={[0.03, 0.03, 0.45]} position={[0.2, 0.225, -0.2]}><meshStandardMaterial color="#475569" /></Cylinder>
                    <Cylinder args={[0.03, 0.03, 0.45]} position={[-0.2, 0.225, 0.2]}><meshStandardMaterial color="#475569" /></Cylinder>
                    <Cylinder args={[0.03, 0.03, 0.45]} position={[0.2, 0.225, 0.2]}><meshStandardMaterial color="#475569" /></Cylinder>
                </group>
            </group>

            <Suspense fallback={<Box args={[0.4, 1.8, 0.4]} position={[-0.8, 0.9, -1.6]}><meshStandardMaterial color="#475569" wireframe /></Box>}>
                <ProfessorModel />
            </Suspense>

            {/* Student's Desk */}
            <group position={[1.2, 0, 0.8]} rotation={[0, -0.1, 0]}>
                <Box args={[1.2, 0.1, 0.6]} position={[0, 0.75, 0]}>
                    <meshStandardMaterial color="#334155" />
                </Box>
                <Cylinder args={[0.04, 0.04, 0.75]} position={[-0.5, 0.375, -0.2]}><meshStandardMaterial color="#64748b" /></Cylinder>
                <Cylinder args={[0.04, 0.04, 0.75]} position={[0.5, 0.375, -0.2]}><meshStandardMaterial color="#64748b" /></Cylinder>
                <Cylinder args={[0.04, 0.04, 0.75]} position={[-0.5, 0.375, 0.2]}><meshStandardMaterial color="#64748b" /></Cylinder>
                <Cylinder args={[0.04, 0.04, 0.75]} position={[0.5, 0.375, 0.2]}><meshStandardMaterial color="#64748b" /></Cylinder>

                {/* Notebook (Student) - Adjusted Y to sit on desk top (0.80) */}
                <group position={[-0.2, 0.81, 0]} rotation={[0, 0.1, 0]}>
                    <Box args={[0.25, 0.015, 0.35]}>
                        <meshStandardMaterial color="#f8fafc" />
                    </Box>
                    {/* Spiral/Spine detail */}
                    <Box args={[0.02, 0.02, 0.35]} position={[-0.12, 0, 0]}>
                        <meshStandardMaterial color="#334155" />
                    </Box>
                </group>

                {/* Pen - Adjusted Y to sit on desk top (0.80) */}
                <Box args={[0.15, 0.015, 0.015]} position={[-0.05, 0.81, 0.1]} rotation={[0, 0.5, 0]}>
                    <meshStandardMaterial color="#1e40af" />
                </Box>

                {/* Student's Chair - Facing Desk */}
                <group position={[0, 0, 0.5]} rotation={[0, Math.PI, 0]}>
                    <Box args={[0.4, 0.05, 0.4]} position={[0, 0.45, 0]}><meshStandardMaterial color="#0f172a" /></Box>
                    <Box args={[0.4, 0.4, 0.05]} position={[0, 0.65, -0.2]}><meshStandardMaterial color="#0f172a" /></Box>
                    <Cylinder args={[0.02, 0.02, 0.45]} position={[-0.15, 0.225, -0.15]}><meshStandardMaterial color="#475569" /></Cylinder>
                    <Cylinder args={[0.02, 0.02, 0.45]} position={[0.15, 0.225, -0.15]}><meshStandardMaterial color="#475569" /></Cylinder>
                    <Cylinder args={[0.02, 0.02, 0.45]} position={[-0.15, 0.225, 0.15]}><meshStandardMaterial color="#475569" /></Cylinder>
                    <Cylinder args={[0.02, 0.02, 0.45]} position={[0.15, 0.225, 0.15]}><meshStandardMaterial color="#475569" /></Cylinder>
                </group>
            </group>

            <Suspense fallback={<Box args={[0.3, 1.6, 0.3]} position={[1.2, 0.8, 1.3]}><meshStandardMaterial color="#0f172a" wireframe /></Box>}>
                <StudentModel />
            </Suspense>

            {/* Floating Holographic ID Card / Data Nodes */}
            <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1} position={[-0.8, 1.8, -1.0]}>
                {/* Abstract Card Shape */}
                <Box args={[0.5, 0.3, 0.02]} rotation={[0, Math.PI / 4, 0]}>
                    <meshStandardMaterial
                        color="#3b82f6"
                        emissive="#1d4ed8"
                        emissiveIntensity={1}
                        transparent
                        opacity={0.6}
                        wireframe={true}
                    />
                </Box>
                <Box args={[0.1, 0.1, 0.05]} position={[-0.15, 0, 0.02]} rotation={[0, Math.PI / 4, 0]}>
                    <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} />
                </Box>
            </Float>

            {/* Another floating data node */}
            <Float speed={4} rotationIntensity={1} floatIntensity={2} position={[1.5, 1.5, 0.8]}>
                <Cylinder args={[0.1, 0, 0.2, 4]} rotation={[Math.PI, 0, 0]}>
                    <meshStandardMaterial color="#a855f7" emissive="#9333ea" emissiveIntensity={1} wireframe={true} />
                </Cylinder>
            </Float>

        </group>
    );
}

export function CampusScene() {
    return (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-auto cursor-grab active:cursor-grabbing">
            <Canvas camera={{ position: [6, 5, 8], fov: 40 }}>
                {/* Lighting - Enhanced to compensate for removed Environment */}
                <ambientLight intensity={1.5} />
                <directionalLight position={[10, 15, 10]} intensity={3.5} castShadow />
                <pointLight position={[-1.6, 1.5, -2.0]} color="#3b82f6" intensity={6} distance={8} />

                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
                    <LowPolyRoom />
                </Float>

                {/* Ground Shadow/Reflection */}
                <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />

                {/* Interactive Controls */}
                <OrbitControls
                    enableZoom={true}
                    minDistance={4}
                    maxDistance={15}
                    autoRotate
                    autoRotateSpeed={0.8}
                    maxPolarAngle={Math.PI / 2.1}
                    minPolarAngle={Math.PI / 6}
                    enablePan={true}
                />
            </Canvas>
        </div>
    );
}
