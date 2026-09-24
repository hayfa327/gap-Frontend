// src/components/pages/TestGalleryRoom/TestGalleryRoom.tsx
//
// ISOLATED test bed — still completely separate from VirtualGallery.tsx
// and the real exhibition data. This pass restructures the room into
// clear pieces (GalleryRoom → Walls/Floor/Ceiling/Lighting, and
// ArtworkFrame → Frame/Surface/Shadow) and fixes the concrete visual
// problems identified from the last screenshot: a blotchy floor, a
// thick grey mat around each piece, and warm/brown side walls caused by
// the environment preset.
import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './TestGalleryRoom.css';

// Real physically-based environment lighting — built with the actual
// Three.js technique (PMREMGenerator baking a RoomEnvironment into a
// reflection/irradiance map) rather than an external HDRI preset. This
// is what gives MeshStandardMaterial a believable, soft "there is a
// bright room around this" response without cranking ambientLight.
function usePhysicalEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.42;
    return () => {
      envTexture.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

const ROOM_WIDTH = 8;
const ROOM_DEPTH = 6.5;
const ROOM_HEIGHT = 3.4;

const TEST_ARTWORKS = [
  { url: 'https://picsum.photos/id/1015/1000/1400', title: 'River Valley', meta: 'Studio placeholder · 2024' },
  { url: 'https://picsum.photos/id/1025/1400/1000', title: 'Quiet Companion', meta: 'Studio placeholder · 2023' },
  { url: 'https://picsum.photos/id/1039/1000/1300', title: 'North Ridge', meta: 'Studio placeholder · 2024' },
];

function useSharpTexture(url: string) {
  const texture = useTexture(url);
  const { gl } = useThree();
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
  }, [texture, gl]);
  return texture;
}

// --------------------------------------------------------------------------
// GalleryRoom — Floor
// --------------------------------------------------------------------------

function useFloorTexture() {
  const [tex] = useState(() => {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#C8C4BC';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = Math.random() > 0.5 ? 'rgba(255,255,252,0.035)' : 'rgba(70,68,62,0.035)';
      ctx.fillStyle = v;
      ctx.fillRect(x, y, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1.6);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return tex;
}

function GalleryFloor({ tex }: { tex: THREE.Texture }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROOM_DEPTH / 2]} receiveShadow>
      <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
      <meshStandardMaterial map={tex} roughness={0.62} metalness={0.015} />
    </mesh>
  );
}

// --------------------------------------------------------------------------
// GalleryRoom — Walls + Ceiling
// --------------------------------------------------------------------------

function useWallGrain() {
  const [tex] = useState(() => {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = 118 + Math.random() * 24;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.1)`;
      ctx.fillRect(x, y, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    return t;
  });
  return tex;
}

function GalleryWalls({ grain }: { grain: THREE.Texture }) {
  const wallMat = (
    <meshStandardMaterial color="#F3F1EC" roughnessMap={grain} roughness={0.85} metalness={0} />
  );
  return (
    <>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        {wallMat}
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {wallMat}
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {wallMat}
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#FAF9F6" roughness={0.95} />
      </mesh>
    </>
  );
}

function GalleryRoom() {
  const wallGrain = useWallGrain();
  const floorTex = useFloorTexture();
  return (
    <>
      <GalleryWalls grain={wallGrain} />
      <GalleryFloor tex={floorTex} />
      <ContactShadows position={[0, 0.008, -ROOM_DEPTH / 2]} opacity={0.28} scale={ROOM_WIDTH} blur={2.4} far={2.5} />
    </>
  );
}

// --------------------------------------------------------------------------
// GalleryRoom — Lighting
// --------------------------------------------------------------------------

function GalleryLighting() {
  usePhysicalEnvironment();

  return (
    <>
      {/* A small safety-net ambient only — NOT the room's main brightness
          source. Its job is just to stop shadow-mapped areas from
          reading as pure black; the actual "bright gallery" feeling
          comes from the environment map above plus the soft ceiling
          wash lights below. */}
      <ambientLight intensity={0.12} />

      {/* Soft general ceiling wash — several wide, gentle sources spread
          around the room so walls/ceiling/corners stay bright and warm
          everywhere, not just directly under one light. This is what
          keeps the room itself "naturally bright" independent of the
          artwork spotlights. */}
      {/* Pulled back significantly — these were flooding the whole wall
          evenly, which is exactly what erased any visible gradient
          around the artworks. Their job now is just to keep the room
          from reading dim in general, not to be the dominant light. */}
      <spotLight position={[-2, ROOM_HEIGHT - 0.15, -1]} target-position={[-2, 0, -ROOM_DEPTH]} angle={0.85} penumbra={1} intensity={2.8} distance={8} decay={1.7} color="#FFF9EE" />
      <spotLight position={[2, ROOM_HEIGHT - 0.15, -1]} target-position={[2, 0, -ROOM_DEPTH]} angle={0.85} penumbra={1} intensity={2.8} distance={8} decay={1.7} color="#FFF9EE" />
      <spotLight position={[0, ROOM_HEIGHT - 0.15, -ROOM_DEPTH + 1]} target-position={[0, 0.5, -ROOM_DEPTH]} angle={0.85} penumbra={1} intensity={2.2} distance={8} decay={1.7} color="#FFF9EE" />

      {/* One soft directional fill so the room still has a gentle sense
          of direction/shape, not just even flat light. */}
      <directionalLight position={[3, 6, 4]} intensity={0.18} castShadow shadow-mapSize={[1024, 1024]} shadow-radius={4} />
    </>
  );
}

// --------------------------------------------------------------------------
// ArtworkFrame → Frame + Surface + Shadow
// --------------------------------------------------------------------------

// Now a minor supporting touch, not the primary shadow mechanism — the
// REAL shadow comes from the spotlight's castShadow onto the receiveShadow
// wall, driven by the artwork's actual physical depth/gap.
function ArtworkShadow({ width, height }: { width: number; height: number }) {
  // Slightly more visible than before — now that the general room
  // lighting is calmer, this soft offset shadow should read clearly as
  // "the frame is a few centimetres off the wall."
  return (
    <mesh position={[0.02, -0.025, 0.001]}>
      <planeGeometry args={[width + 0.14, height + 0.14]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.08} />
    </mesh>
  );
}

function ArtworkFrameGeometry({ width, height, gap }: { width: number; height: number; gap: number }) {
  // Chunkier than before — thin enough to be elegant, but with a
  // depth that actually reads as a real moulding when viewed at an
  // angle, not a razor-thin edge.
  const border = 0.035;
  const depth = 0.055;
  return (
    <mesh position={[0, 0, -gap + depth / 2]} castShadow>
      <boxGeometry args={[width + border * 2, height + border * 2, depth]} />
      <meshStandardMaterial
        color="#15130F"
        roughness={0.7}
        metalness={0.08}
        envMapIntensity={0.12}
      />
    </mesh>
  );
}

function ArtworkSurface({
  texture,
  width,
  height,
  gap,
  selected,
}: {
  texture: THREE.Texture;
  width: number;
  height: number;
  gap: number;
  selected?: boolean;
}) {
  const depth = 0.055; // must match ArtworkFrameGeometry's depth
  return (
    <mesh position={[0, 0, -gap + depth + 0.012]} castShadow>
      <boxGeometry args={[width, height, 0.014]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.42}
        emissive={selected ? '#ffffff' : '#000000'}
        emissiveIntensity={selected ? 0.05 : 0}
      />
    </mesh>
  );
}

function ArtworkFrame({
  data,
  position,
}: {
  data: (typeof TEST_ARTWORKS)[number];
  position: [number, number, number];
}) {
  const texture = useSharpTexture(data.url);
  const image = texture.image as HTMLImageElement | undefined;
  const ratio = image?.width && image?.height ? image.width / image.height : 1.2;

  // Height derived from the wall itself, not an arbitrary multiplier:
  // ~60% of usable wall height (ROOM_HEIGHT minus a margin top/bottom).
  const height = ROOM_HEIGHT * 0.6;
  const width = height * ratio;
  const gap = 0.06;

  return (
    <group position={position}>
      <ArtworkShadow width={width} height={height} />
      <ArtworkFrameGeometry width={width} height={height} gap={gap} />
      <ArtworkSurface texture={texture} width={width} height={height} gap={gap} />

      <Text
        position={[-width / 2, -height / 2 - 0.15, -gap + 0.03]}
        fontSize={0.052}
        color="#1A1815"
        anchorX="left"
        anchorY="top"
        font="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff"
      >
        {data.title}
      </Text>
      <Text
        position={[-width / 2, -height / 2 - 0.25, -gap + 0.03]}
        fontSize={0.038}
        color="#6B665C"
        anchorX="left"
        anchorY="top"
        font="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff"
      >
        {data.meta}
      </Text>

      {/* Repositioned to sit high and close to the wall, like a real
          ceiling-mounted museum track fixture aimed steeply down —
          rather than a light floating in front of the piece. This
          angle is what actually produces the believable "brightest near
          the top of the artwork, softening down the wall" gradient,
          independent of raw intensity. */}
      <spotLight
        position={[0, 1.75, 0.55]}
        target-position={[0, 0, 0]}
        angle={0.5}
        penumbra={1}
        intensity={16}
        distance={4}
        decay={1.7}
        color="#FFF6E8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0015}
        shadow-radius={6}
      />
    </group>
  );
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

function Scene() {
  return (
    <>
      <GalleryRoom />
      <GalleryLighting />

      {/* Scaled WAY down per the new strategy: one wall, one artwork,
          one light. Get this single piece looking genuinely right
          before duplicating the setup. The other two are commented out,
          not deleted — easy to bring back once this one is correct. */}
      {/* Tight, curated spacing — the pieces should feel like one
          composed wall, not three images spread thin across it. Centre
          height fixed at real museum eye-level (~1.6m). */}
      <ArtworkFrame data={TEST_ARTWORKS[0]} position={[-2.15, 1.6, -ROOM_DEPTH + 0.02]} />
      <ArtworkFrame data={TEST_ARTWORKS[1]} position={[0.15, 1.6, -ROOM_DEPTH + 0.02]} />
      <ArtworkFrame data={TEST_ARTWORKS[2]} position={[2.35, 1.6, -ROOM_DEPTH + 0.02]} />
    </>
  );
}

export default function TestGalleryRoom() {
  return (
    <div className="testRoomViewport">
      <div className="testRoomHint">Test room — isolated from real exhibitions · drag to orbit · scroll to zoom</div>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        // Natural museum-visitor eye height (~1.65m), moderate FOV (not
        // a wide-angle distortion), and close enough that the artwork
        // wall fills most of the frame while still showing some floor.
        camera={{ position: [0, 1.65, 2.9], fov: 40 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <Suspense fallback={null}>
          <Scene />
          <OrbitControls
            target={[0, 1.6, -ROOM_DEPTH + 0.9]}
            minDistance={1.8}
            maxDistance={5}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}