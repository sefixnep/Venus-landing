import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

function Venus() {
  const grpRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (grpRef.current) grpRef.current.rotation.y += dt * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.06;
  });

  return (
    <group ref={grpRef} position={[1.6, -0.4, 0]}>
      {/* Surface */}
      <mesh>
        <sphereGeometry args={[2.4, 96, 96]} />
        <meshStandardMaterial
          color={'#c08050'}
          roughness={0.85}
          metalness={0}
          emissive={'#3a1808'}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Cloud layer */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[2.5, 96, 96]} />
        <meshStandardMaterial
          color={'#e8c890'}
          transparent
          opacity={0.55}
          roughness={1}
        />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.75, 64, 64]} />
        <meshBasicMaterial
          color={'#ffa860'}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.0, 64, 64]} />
        <meshBasicMaterial
          color={'#ff7030'}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function VenusBackground() {
  return (
    <div className="venus-bg" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        camera={{ fov: 40, position: [0, 0, 7] }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#06050b']} />
          <ambientLight intensity={0.35} color={'#aa7050'} />
          <directionalLight position={[-5, 3, 4]} intensity={1.4} color={'#fff0d8'} />
          <Stars radius={120} depth={60} count={1200} factor={3} fade speed={0.2} />
          <Venus />
          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.6} mipmapBlur />
            <Vignette eskil={false} offset={0.3} darkness={0.85} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
