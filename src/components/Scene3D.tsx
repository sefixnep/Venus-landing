import { useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { SimulationState } from '../types/simulation';

interface Props {
  state: SimulationState;
}

/* ─── colour utilities (mirror of canvas SKY_STOPS) ─── */

const SKY_STOPS: Array<[number, [number, number, number]]> = [
  [0,   [0.42, 0.27, 0.13]],
  [5,   [0.54, 0.35, 0.19]],
  [15,  [0.62, 0.43, 0.23]],
  [30,  [0.54, 0.40, 0.19]],
  [45,  [0.48, 0.35, 0.19]],
  [55,  [0.35, 0.25, 0.16]],
  [65,  [0.23, 0.16, 0.13]],
  [80,  [0.12, 0.08, 0.14]],
  [100, [0.06, 0.06, 0.12]],
  [130, [0.03, 0.03, 0.06]],
  [200, [0.02, 0.02, 0.03]],
];

function skyColor(altKm: number): THREE.Color {
  const stops = SKY_STOPS;
  if (altKm <= stops[0][0]) {
    const c = stops[0][1];
    return new THREE.Color(c[0], c[1], c[2]);
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const [h0, c0] = stops[i];
    const [h1, c1] = stops[i + 1];
    if (altKm >= h0 && altKm <= h1) {
      const t = (altKm - h0) / (h1 - h0);
      return new THREE.Color(
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t,
      );
    }
  }
  const c = stops[stops.length - 1][1];
  return new THREE.Color(c[0], c[1], c[2]);
}

/* ─── Sky dome shader (gradient + altitude colour) ─── */

const skyVertex = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBot;
  uniform float uHorizonGlow;
  varying vec3 vWorldPos;
  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col;
    if (h > 0.5) {
      col = mix(uMid, uTop, (h - 0.5) * 2.0);
    } else {
      col = mix(uBot, uMid, h * 2.0);
    }
    float horizon = 1.0 - abs(dir.y);
    horizon = pow(horizon, 6.0) * uHorizonGlow;
    col += vec3(1.0, 0.55, 0.25) * horizon * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyDome({ state }: { state: SimulationState }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color(0, 0, 0) },
    uMid: { value: new THREE.Color(0, 0, 0) },
    uBot: { value: new THREE.Color(0, 0, 0) },
    uHorizonGlow: { value: 0 },
  }), []);

  useFrame(() => {
    const altKm = state.altitude / 1000;
    uniforms.uTop.value.lerp(skyColor(altKm + 25), 0.08);
    uniforms.uMid.value.lerp(skyColor(altKm), 0.08);
    uniforms.uBot.value.lerp(skyColor(Math.max(0, altKm - 25)), 0.08);
    // Horizon glow strongest in cloud layer / lower atmosphere
    const target = altKm < 80 ? 1.0 - Math.min(1, Math.abs(altKm - 30) / 60) : 0;
    uniforms.uHorizonGlow.value = THREE.MathUtils.lerp(uniforms.uHorizonGlow.value, target, 0.05);
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[800, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ─── Capsule (procedural lathe) ─── */

function Capsule({ state }: { state: SimulationState }) {
  const grpRef = useRef<THREE.Group>(null);
  const shieldMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const profile = useMemo(() => {
    // Silhouette points (right half), bottom-up, units in meters-ish (scaled by group)
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0.0, -0.55));
    pts.push(new THREE.Vector2(0.85, -0.50));
    pts.push(new THREE.Vector2(1.05, -0.20));
    pts.push(new THREE.Vector2(1.05, 0.05));
    pts.push(new THREE.Vector2(0.92, 0.30));
    pts.push(new THREE.Vector2(0.55, 0.50));
    pts.push(new THREE.Vector2(0.18, 0.55));
    pts.push(new THREE.Vector2(0.0, 0.55));
    return pts;
  }, []);

  useFrame((_, dt) => {
    if (!grpRef.current) return;
    // Sway under parachute, vibrate during heavy plasma
    let rotZ = 0;
    if (state.drogueDeployed || state.mainChuteDeployed) {
      const t = state.time;
      rotZ = (Math.sin(t * 1.2) * 0.04 + Math.sin(t * 0.7) * 0.02);
    }
    if (state.heatShieldActive && state.machNumber > 5) {
      const shake = (Math.random() - 0.5) * 0.01 * Math.min(1, (state.machNumber - 5) / 15);
      rotZ += shake;
    }
    grpRef.current.rotation.z = THREE.MathUtils.damp(grpRef.current.rotation.z, rotZ, 6, dt);

    if (shieldMatRef.current) {
      const intensity = state.heatShieldActive
        ? Math.max(0, Math.min(1, (state.machNumber - 1.5) / 14))
        : 0;
      shieldMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        shieldMatRef.current.emissiveIntensity,
        intensity * 3.5,
        4,
        dt,
      );
      const c = new THREE.Color().setHSL(0.06 + (1 - intensity) * 0.05, 1, 0.5);
      shieldMatRef.current.emissive.lerp(c, 0.1);
    }
  });

  return (
    <group ref={grpRef}>
      {/* Capsule body */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 48]} />
        <meshStandardMaterial
          color="#d8d8e0"
          metalness={0.75}
          roughness={0.32}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Panel seams */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <mesh key={a} rotation={[0, a, 0]} position={[0.55, 0, 0]}>
          <boxGeometry args={[0.02, 0.9, 0.02]} />
          <meshStandardMaterial color="#404048" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}

      {/* Antenna */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
        <meshStandardMaterial color="#a0a0a8" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#c8c8d0" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Heat shield (cap below) */}
      {state.heatShieldActive && (
        <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3]} />
          <meshStandardMaterial
            ref={shieldMatRef}
            color="#3a2a18"
            roughness={0.85}
            metalness={0.05}
            emissive={'#ff6020'}
            emissiveIntensity={0}
            toneMapped
          />
        </mesh>
      )}
    </group>
  );
}

/* ─── Plasma trail ─── */

const PLASMA_COUNT = 600;

function PlasmaTrail({ state }: { state: SimulationState }) {
  const ref = useRef<THREE.Points>(null);
  const dataRef = useRef({
    positions: new Float32Array(PLASMA_COUNT * 3),
    sizes: new Float32Array(PLASMA_COUNT),
    life: new Float32Array(PLASMA_COUNT),
    seed: 0,
  });

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dataRef.current.positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(dataRef.current.sizes, 1));
    g.setAttribute('aLife', new THREE.BufferAttribute(dataRef.current.life, 1));
    return g;
  }, []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uIntensity: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aLife;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (180.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uIntensity;
      varying float vLife;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vLife * uIntensity;
        vec3 hot = vec3(1.0, 0.95, 0.7);
        vec3 cool = vec3(1.0, 0.25, 0.05);
        vec3 col = mix(cool, hot, vLife);
        gl_FragColor = vec4(col, a);
      }
    `,
  }), []);

  useFrame((_, dt) => {
    const intensity = state.heatShieldActive
      ? Math.max(0, Math.min(1, (state.machNumber - 1.5) / 14))
      : 0;
    mat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      mat.uniforms.uIntensity.value, intensity, 0.1,
    );

    const data = dataRef.current;
    const speed = 6 + state.machNumber * 0.3;

    for (let i = 0; i < PLASMA_COUNT; i++) {
      data.life[i] -= dt * 1.2;
      if (data.life[i] <= 0 && intensity > 0.05) {
        // Respawn at heat shield
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.9;
        data.positions[i * 3 + 0] = Math.cos(ang) * r;
        data.positions[i * 3 + 1] = -0.6 + Math.random() * 0.1;
        data.positions[i * 3 + 2] = Math.sin(ang) * r;
        data.sizes[i] = 0.05 + Math.random() * 0.12;
        data.life[i] = 0.3 + Math.random() * 0.7;
      } else {
        // Stream backward (down-back relative to capsule motion = +Y here since capsule moves down)
        data.positions[i * 3 + 1] -= dt * speed;
        // Fan outward
        const dx = data.positions[i * 3 + 0] * (1 + dt * 0.4);
        const dz = data.positions[i * 3 + 2] * (1 + dt * 0.4);
        data.positions[i * 3 + 0] = dx;
        data.positions[i * 3 + 2] = dz;
      }
    }

    geom.attributes.position.needsUpdate = true;
    geom.attributes.aSize.needsUpdate = true;
    geom.attributes.aLife.needsUpdate = true;
  });

  // points are positioned below capsule along Y axis (capsule moving "down" = -Y)
  return <points ref={ref} geometry={geom} material={mat} position={[0, 0, 0]} />;
}

/* ─── Parachute ─── */

function Parachute({ state, kind }: { state: SimulationState; kind: 'drogue' | 'main' }) {
  const visible = kind === 'drogue'
    ? state.drogueDeployed && !state.mainChuteDeployed
    : state.mainChuteDeployed;

  const meshRef = useRef<THREE.Mesh>(null);
  const grpRef = useRef<THREE.Group>(null);

  const opts = kind === 'drogue'
    ? { radius: 0.6, lineLen: 1.2, color: '#e88030', stripe: '#ffffff' }
    : { radius: 1.4, lineLen: 2.0, color: '#e88030', stripe: '#ffffff' };

  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(opts.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    // Bake a vertex-color stripe for visual interest
    const colors = new Float32Array(g.attributes.position.count * 3);
    const baseColor = new THREE.Color(opts.color);
    const stripeColor = new THREE.Color(opts.stripe);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const ang = Math.atan2(z, x);
      const seg = Math.floor((ang + Math.PI) / (Math.PI * 2) * 8);
      const c = seg % 2 === 0 ? baseColor : stripeColor;
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [opts.radius, opts.color, opts.stripe]);

  // Suspension lines geometry (computed unconditionally to satisfy hook rules)
  const lineCount = kind === 'drogue' ? 6 : 10;
  const lineGeom = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const a = (i / lineCount) * Math.PI * 2;
      const tx = Math.cos(a) * opts.radius * 0.85;
      const tz = Math.sin(a) * opts.radius * 0.85;
      const ax = Math.cos(a) * 0.15;
      const az = Math.sin(a) * 0.15;
      positions.push(ax, 0, az);
      positions.push(tx, opts.lineLen, tz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [lineCount, opts.lineLen, opts.radius]);

  useFrame((_, dt) => {
    if (!visible || !meshRef.current || !grpRef.current) return;
    const t = state.time;
    const billow = 1 + Math.sin(t * 2.2) * 0.04 + Math.sin(t * 1.3) * 0.025;
    meshRef.current.scale.setScalar(billow);
    grpRef.current.rotation.x = Math.sin(t * 1.0) * 0.05;
    grpRef.current.rotation.z = Math.sin(t * 0.6 + 1) * 0.06;
    void dt;
  });

  if (!visible) return null;

  return (
    <group ref={grpRef} position={[0, 0.6, 0]}>
      <lineSegments geometry={lineGeom}>
        <lineBasicMaterial color="#cccccc" transparent opacity={0.65} />
      </lineSegments>
      <mesh ref={meshRef} position={[0, opts.lineLen, 0]} geometry={geom}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.7}
          metalness={0}
          emissive={'#3a1808'}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

/* ─── Engine flame ─── */

function EngineFlame({ state }: { state: SimulationState }) {
  const grpRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const on = state.engineRunning && state.fuel > 0;
    const target = on ? 1 : 0;
    const k = 0.2;
    if (grpRef.current) {
      const cur = grpRef.current.scale.y;
      const next = cur + (target - cur) * k;
      grpRef.current.scale.set(1, next, 1);
      grpRef.current.visible = next > 0.02;
    }
    if (lightRef.current) {
      lightRef.current.intensity = on ? 6 + Math.sin(state.time * 30) * 1.5 : 0;
    }
    // Flicker
    if (innerRef.current) {
      const f = 1 + (Math.sin(state.time * 35) + Math.sin(state.time * 53)) * 0.06;
      innerRef.current.scale.set(f, f, f);
    }
    if (outerRef.current) {
      const f = 1 + (Math.sin(state.time * 22) + Math.sin(state.time * 31)) * 0.08;
      outerRef.current.scale.set(f, 1, f);
    }
  });

  return (
    <group ref={grpRef} position={[0, -0.6, 0]} scale={[1, 0, 1]}>
      <mesh ref={outerRef} position={[0, -0.7, 0]}>
        <coneGeometry args={[0.45, 1.6, 24, 1, true]} />
        <meshBasicMaterial
          color={'#ff7030'}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={innerRef} position={[0, -0.55, 0]}>
        <coneGeometry args={[0.22, 1.1, 24, 1, true]} />
        <meshBasicMaterial
          color={'#fff5cc'}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight ref={lightRef} color={'#ffaa55'} intensity={0} distance={6} decay={2} />
    </group>
  );
}

/* ─── Cloud layers (instanced billboards) ─── */

const CLOUD_LAYERS: Array<{ alt: number; count: number; alpha: number; color: string; size: number }> = [
  { alt: 68, count: 60, alpha: 0.25, color: '#d4b878', size: 18 },
  { alt: 60, count: 80, alpha: 0.40, color: '#c8a860', size: 22 },
  { alt: 52, count: 70, alpha: 0.45, color: '#b89850', size: 24 },
  { alt: 46, count: 40, alpha: 0.30, color: '#a88840', size: 18 },
];

function CloudLayer({ state, layer }: { state: SimulationState; layer: typeof CLOUD_LAYERS[number] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const seeds = useMemo(() => {
    const arr: Array<{ x: number; z: number; phase: number; sx: number; sz: number }> = [];
    let s = layer.alt * 137 + 7;
    const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < layer.count; i++) {
      arr.push({
        x: (rng() - 0.5) * 400,
        z: (rng() - 0.5) * 400,
        phase: rng() * 100,
        sx: 0.7 + rng() * 0.7,
        sz: 0.7 + rng() * 0.7,
      });
    }
    return arr;
  }, [layer.alt, layer.count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || !matRef.current) return;
    const altKm = state.altitude / 1000;
    const dy = (layer.alt - altKm) * 1.0; // 1 unit = 1 km
    const dist = Math.abs(altKm - layer.alt);
    const fade = Math.max(0, Math.min(1, 1 - dist / 35));
    matRef.current.opacity = layer.alpha * fade;
    meshRef.current.visible = fade > 0.01;

    if (!meshRef.current.visible) return;

    const drift = state.time * (1.0 + (70 - layer.alt) * 0.04);
    for (let i = 0; i < seeds.length; i++) {
      const sd = seeds[i];
      let x = sd.x + drift * 2 + sd.phase;
      // Wrap horizontally
      const span = 400;
      x = ((x + span * 0.5) % span) - span * 0.5;
      const z = sd.z;
      dummy.position.set(x, dy, z);
      dummy.scale.set(layer.size * sd.sx, layer.size * 0.45, layer.size * sd.sz);
      dummy.rotation.y = sd.phase;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, layer.count]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial
        ref={matRef}
        color={layer.color}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function Clouds({ state }: { state: SimulationState }) {
  return (
    <>
      {CLOUD_LAYERS.map((l) => (
        <CloudLayer key={l.alt} state={state} layer={l} />
      ))}
    </>
  );
}

/* ─── Surface ─── */

function Surface({ state }: { state: SimulationState }) {
  const grpRef = useRef<THREE.Group>(null);
  const altKm = state.altitude / 1000;

  // Procedural rock-like detail near the ground
  const rocks = useMemo(() => {
    let s = 99991;
    const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    return Array.from({ length: 50 }, () => ({
      x: (rng() - 0.5) * 60,
      z: (rng() - 0.5) * 60,
      r: 0.3 + rng() * 1.4,
      h: 0.2 + rng() * 0.8,
      rot: rng() * Math.PI,
      shade: 0.35 + rng() * 0.25,
    }));
  }, []);

  useFrame(() => {
    if (!grpRef.current) return;
    const dy = -altKm; // surface sits at world y = -altKm relative to capsule (km units)
    grpRef.current.position.y = dy;
    grpRef.current.visible = altKm < 60;
  });

  return (
    <group ref={grpRef}>
      {/* Main flat plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[400, 64]} />
        <meshStandardMaterial color="#6a4825" roughness={0.95} metalness={0} />
      </mesh>

      {/* Inner higher-detail patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0, 80, 64]} />
        <meshStandardMaterial color="#7a5530" roughness={0.95} />
      </mesh>

      {/* Horizon glow */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[120, 1.4, 8, 64]} />
        <meshBasicMaterial color="#ffa860" transparent opacity={0.35} />
      </mesh>

      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.h * 0.3, r.z]} rotation={[0, r.rot, 0]} castShadow>
          <dodecahedronGeometry args={[r.r, 0]} />
          <meshStandardMaterial color={new THREE.Color(r.shade, r.shade * 0.7, r.shade * 0.4)} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Camera rig ─── */

function CameraRig({ state }: { state: SimulationState }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const speed = Math.abs(state.velocity);
    const altKm = state.altitude / 1000;

    // Choose camera offset based on phase
    let off: [number, number, number];
    if (altKm > 80) {
      // Wide arc shot from above-behind during entry
      off = [3.5, 1.5, 5.0];
    } else if (state.heatShieldActive && state.machNumber > 2) {
      // Side-rear during plasma
      const t = state.time;
      off = [4.0 + Math.sin(t * 0.3) * 0.6, 0.8, 4.5];
    } else if (state.mainChuteDeployed || state.drogueDeployed) {
      // Side, slight dolly
      const t = state.time;
      off = [4.5 + Math.sin(t * 0.2) * 0.8, 1.2, 3.5 + Math.cos(t * 0.15) * 0.4];
    } else if (altKm < 6) {
      // Low dramatic angle for landing
      off = [3.8, -0.6, 3.2];
    } else {
      off = [4.0, 0.6, 4.0];
    }

    desired.set(off[0], off[1], off[2]);
    const k = 1.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, k, dt);

    // Look at capsule (origin), with slight downward bias near ground
    target.set(0, altKm < 6 ? -0.2 : 0.05, 0);
    camera.lookAt(target);

    // Subtle shake at high G
    if (state.gForce > 4) {
      const amp = Math.min(0.04, (state.gForce - 4) * 0.005);
      camera.position.x += (Math.random() - 0.5) * amp;
      camera.position.y += (Math.random() - 0.5) * amp;
    }
    void speed;
  });

  return null;
}

/* ─── Lighting ─── */

function SceneLighting({ state }: { state: SimulationState }) {
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const plasmaLight = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const altKm = state.altitude / 1000;
    const sky = skyColor(altKm);
    if (ambRef.current) {
      ambRef.current.color.lerp(sky, 0.05);
      ambRef.current.intensity = altKm > 70 ? 0.35 : 0.55;
    }
    if (dirRef.current) {
      // Sun gets dimmer in deep atmosphere
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity,
        altKm < 30 ? 0.35 : altKm < 70 ? 0.7 : 1.0,
        0.05,
      );
    }
    if (plasmaLight.current) {
      const intensity = state.heatShieldActive
        ? Math.max(0, Math.min(1, (state.machNumber - 1.5) / 14))
        : 0;
      plasmaLight.current.intensity = intensity * 8;
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.5} color={'#aa8866'} />
      <directionalLight
        ref={dirRef}
        position={[8, 12, 6]}
        intensity={0.8}
        color={'#fff0d8'}
        castShadow
      />
      <pointLight ref={plasmaLight} position={[0, -1.2, 0]} color={'#ff5020'} intensity={0} distance={6} decay={2} />
    </>
  );
}

/* ─── Top-level component ─── */

export default function Scene3D({ state }: Props) {
  const initialAlt = state.altitude / 1000;
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 0.1, far: 2000, position: [4, 1, 4] }}
      shadows
    >
      <Suspense fallback={null}>
        <SkyDome state={state} />
        <Stars radius={500} depth={100} count={1500} factor={4} fade speed={0.3} />
        <SceneLighting state={state} />

        <Capsule state={state} />
        <PlasmaTrail state={state} />
        <Parachute state={state} kind="drogue" />
        <Parachute state={state} kind="main" />
        <EngineFlame state={state} />

        <Clouds state={state} />
        <Surface state={state} />

        <CameraRig state={state} />

        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.4} mipmapBlur />
          <ChromaticAberration
            offset={[0.0006, 0.0008]}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.7} />
        </EffectComposer>
      </Suspense>

      {/* Suppress unused warning for initialAlt — kept for future seeding */}
      <group visible={false} position={[0, initialAlt * 0, 0]} />
    </Canvas>
  );
}
