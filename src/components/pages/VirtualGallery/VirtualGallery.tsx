// src/components/pages/VirtualGallery/VirtualGallery.tsx
import { Suspense, useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, useTexture, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import "./VirtualGallery.css";


const ROOM_WIDTH = 10;
const ROOM_DEPTH = 10;
const ROOM_HEIGHT = 4.2;
const DOORWAY_WIDTH = 2.4;
const DOORWAY_HEIGHT = 3;
const ART_HEIGHT = 1.6;
const MAX_ROOMS = 8;
const WALL_THICKNESS = 0.16; // real depth, not a flat plane

// Every room continues straight back from the one before it — a single
// corridor of connected rooms, same as before. (The turning/apartment
// layout was tried and rolled back; this keeps the math generic in case
// turns are wanted again later, just with every turn set to "straight".)
const TURN_PATTERN: ('straight' | 'left' | 'right')[] = ['straight'];

interface ArtworkData {
  image: string;
  title?: string;
  wallId?: string;
}

interface WallSetting {
  id: string;
  color: string;
  contentType: 'artOnly' | 'textOnly' | 'both';
  wallText: string;
  maxArtworks: number;
  textPosition?: 'top' | 'center' | 'bottom';
  textSize?: number; // exact point size, not a preset
  textFont?: 'inter' | 'playfair' | 'merriweather' | 'mono';
}

// Each choice maps to a real, verified font file — troika-three-text
// (which drei's <Text> uses) needs an actual font URL, not a CSS name.
const FONT_URLS: Record<string, string> = {
  inter: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff',
  playfair: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.20/files/playfair-display-latin-400-normal.woff',
  merriweather: 'https://cdn.jsdelivr.net/npm/@fontsource/merriweather@5.0.13/files/merriweather-latin-400-normal.woff',
  mono: 'https://cdn.jsdelivr.net/npm/@fontsource/roboto-mono@5.0.18/files/roboto-mono-latin-400-normal.woff',
};

// A genuine bold weight for the exhibition title — real signage
// contrasts the title against the body copy by WEIGHT, not just size.
const FONT_URLS_BOLD: Record<string, string> = {
  inter: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff',
  playfair: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.20/files/playfair-display-latin-700-normal.woff',
  merriweather: 'https://cdn.jsdelivr.net/npm/@fontsource/merriweather@5.0.13/files/merriweather-latin-700-normal.woff',
  mono: 'https://cdn.jsdelivr.net/npm/@fontsource/roboto-mono@5.0.18/files/roboto-mono-latin-700-normal.woff',
};

// Picks readable dark-charcoal or light-ivory text depending on the
// wall's own brightness — real museum signage is always high-contrast
// against its wall, never a fixed colour regardless of the wall behind it.
function getTextColors(wallHex: string): { title: string; body: string } {
  const hex = wallHex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5
    ? { title: '#1A1815', body: '#4A453E' } // dark charcoal on light walls
    : { title: '#F5F2EA', body: '#C9C4B8' }; // warm ivory on dark walls
}

interface RoomData {
  id: string;
  walls: (WallSetting & { slot: 'far' | 'left' | 'right' })[];
}

interface Exhibition {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  artworks?: ArtworkData[];
  rooms?: RoomData[]; // the proper hierarchy — new exhibitions save this
  wallSettings?: WallSetting[]; // legacy flat array — older exhibitions only
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const FALLBACK_WALL: WallSetting = {
  id: 'wall-fallback',
  color: '#F5F3EE',
  contentType: 'artOnly',
  wallText: '',
  maxArtworks: 6,
  textPosition: 'top',
  textSize: 24,
  textFont: 'inter',
};

// --------------------------------------------------------------------------
// Room transforms — where each room sits in world space and which way it
// faces, computed by walking the chain and turning at each doorway.
// --------------------------------------------------------------------------

interface RoomTransform {
  position: THREE.Vector3;
  angle: number; // yaw, radians
}

function getRoomTransforms(roomCount: number): RoomTransform[] {
  const transforms: RoomTransform[] = [];
  let pos = new THREE.Vector3(0, 0, 0);
  let angle = 0;

  for (let i = 0; i < roomCount; i++) {
    transforms.push({ position: pos.clone(), angle });

    const turn = TURN_PATTERN[i % TURN_PATTERN.length];
    let nextAngle = angle;
    if (turn === 'right') nextAngle = angle - Math.PI / 2;
    else if (turn === 'left') nextAngle = angle + Math.PI / 2;

    const forward = new THREE.Vector3(0, 0, -ROOM_DEPTH).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    pos = pos.clone().add(forward);
    angle = nextAngle;
  }

  return transforms;
}

function localToWorld(local: [number, number, number], room: RoomTransform): [number, number, number] {
  const v = new THREE.Vector3(local[0], local[1], local[2])
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), room.angle)
    .add(room.position);
  return [v.x, v.y, v.z];
}

// --------------------------------------------------------------------------
// Procedural materials — created once, shared by every room
// --------------------------------------------------------------------------

function useConcreteFloorTexture() {
  const [texture] = useState(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#C2BEB4'; // light-to-medium concrete grey
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 40 + Math.random() * 90;
      const lighter = Math.random() > 0.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, lighter ? 'rgba(255,255,250,0.06)' : 'rgba(90,85,75,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(60,55,45,${(Math.random() * 0.05).toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(ROOM_WIDTH / 4, ROOM_DEPTH / 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useConcreteBumpTexture() {
  const [texture] = useState(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = 118 + Math.random() * 20;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(ROOM_WIDTH / 4, ROOM_DEPTH / 4);
    return tex;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useWallGrainTexture() {
  const [texture] = useState(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = 115 + Math.random() * 30;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.16)`;
      ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 3);
    return tex;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useWallBumpTexture() {
  const [texture] = useState(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = 90 + Math.random() * 75;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 3);
    return tex;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useSharpTexture(url: string) {
  const texture = useTexture(url);
  const { gl } = useThree();
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture, gl]);
  return texture;
}

// --------------------------------------------------------------------------
// Wall grouping — every 3 walls form one room
// --------------------------------------------------------------------------

interface RoomGroup {
  far: WallSetting;
  left: WallSetting;
  right: WallSetting;
  wallIndexOffset: number;
}

// Flattens the new rooms→walls hierarchy back into the same flat,
// ordered array the rest of the renderer already expects (far, left,
// right, far, left, right, ...) — this is the ONLY place that needs to
// know about the new data shape; everything below is unchanged.
function flattenRoomsData(rooms: RoomData[]): WallSetting[] {
  return rooms.slice(0, MAX_ROOMS).flatMap((room) => {
    const far = room.walls.find((w) => w.slot === 'far') || FALLBACK_WALL;
    const left = room.walls.find((w) => w.slot === 'left') || FALLBACK_WALL;
    const right = room.walls.find((w) => w.slot === 'right') || FALLBACK_WALL;
    return [far, left, right];
  });
}

function groupWallsIntoRooms(wallSettings: WallSetting[]): RoomGroup[] {
  const rooms: RoomGroup[] = [];
  for (let i = 0; i < wallSettings.length && rooms.length < MAX_ROOMS; i += 3) {
    rooms.push({
      far: wallSettings[i] || FALLBACK_WALL,
      left: wallSettings[i + 1] || FALLBACK_WALL,
      right: wallSettings[i + 2] || FALLBACK_WALL,
      wallIndexOffset: i,
    });
  }
  return rooms.length > 0 ? rooms : [{ far: FALLBACK_WALL, left: FALLBACK_WALL, right: FALLBACK_WALL, wallIndexOffset: 0 }];
}

// --------------------------------------------------------------------------
// One room's physical geometry — authored entirely in LOCAL space
// (origin at the room's entry threshold, forward = -Z). The parent group
// applies that room's world position + rotation, which is what lets the
// whole chain bend into an apartment-style layout.
// --------------------------------------------------------------------------

function RoomUnit({
  isFirst,
  group,
  hasNextRoom,
  floorTexture,
  floorBump,
  wallGrain,
  wallBump,
}: {
  isFirst: boolean;
  group: RoomGroup;
  hasNextRoom: boolean;
  floorTexture: THREE.Texture;
  floorBump: THREE.Texture;
  wallGrain: THREE.Texture;
  wallBump: THREE.Texture;
}) {
  // Explicit metalness={0} — painted plaster/concrete has essentially
  // zero metallic response; leaving it implicit invited inconsistent
  // defaults across Three.js versions.
  const farMat = (
    <meshStandardMaterial color={group.far.color} roughnessMap={wallGrain} bumpMap={wallBump} bumpScale={0.035} roughness={0.92} metalness={0} />
  );
  const leftMat = (
    <meshStandardMaterial color={group.left.color} roughnessMap={wallGrain} bumpMap={wallBump} bumpScale={0.035} roughness={0.92} metalness={0} />
  );
  const rightMat = (
    <meshStandardMaterial color={group.right.color} roughnessMap={wallGrain} bumpMap={wallBump} bumpScale={0.035} roughness={0.92} metalness={0} />
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial map={floorTexture} bumpMap={floorBump} bumpScale={0.012} roughness={0.5} metalness={0.02} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#FAF9F6" roughness={0.95} />
      </mesh>

      {/* Far wall — a real box with thickness. Its INNER face (facing
          into the room) sits exactly where the old flat plane used to,
          so every artwork/text position computed against that surface
          is unaffected — only the wall itself now has visible depth. */}
      {!hasNextRoom ? (
        <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH - WALL_THICKNESS / 2]} receiveShadow>
          <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
          {farMat}
        </mesh>
      ) : (
        (() => {
          const sideWidth = (ROOM_WIDTH - DOORWAY_WIDTH) / 2;
          const doorTopHeight = ROOM_HEIGHT - DOORWAY_HEIGHT;
          const farZ = -ROOM_DEPTH - WALL_THICKNESS / 2;
          return (
            <>
              <mesh position={[-(DOORWAY_WIDTH / 2 + sideWidth / 2), ROOM_HEIGHT / 2, farZ]} receiveShadow>
                <boxGeometry args={[sideWidth, ROOM_HEIGHT, WALL_THICKNESS]} />
                {farMat}
              </mesh>
              <mesh position={[DOORWAY_WIDTH / 2 + sideWidth / 2, ROOM_HEIGHT / 2, farZ]} receiveShadow>
                <boxGeometry args={[sideWidth, ROOM_HEIGHT, WALL_THICKNESS]} />
                {farMat}
              </mesh>
              <mesh position={[0, ROOM_HEIGHT - doorTopHeight / 2, farZ]} receiveShadow>
                <boxGeometry args={[DOORWAY_WIDTH, doorTopHeight, WALL_THICKNESS]} />
                {farMat}
              </mesh>
            </>
          );
        })()
      )}

      <mesh position={[-ROOM_WIDTH / 2 - WALL_THICKNESS / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
        {leftMat}
      </mesh>

      <mesh position={[ROOM_WIDTH / 2 + WALL_THICKNESS / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
        {rightMat}
      </mesh>

      {/* Black baseboard trim removed entirely — it was reading as a
          thick game-like outline framing the whole room. */}

      {/* Ceiling cove trim — a plain, non-emissive physical strip now.
          The glow/hotspot came from this being a light source itself;
          the actual illumination comes from the real ceiling spotlights
          below, this is just the architectural fixture they're mounted
          near. */}
      <mesh position={[0, ROOM_HEIGHT - 0.03, -ROOM_DEPTH + 0.35]}>
        <planeGeometry args={[ROOM_WIDTH - 0.6, 0.1]} />
        <meshStandardMaterial color="#EDEAE1" roughness={0.7} />
      </mesh>

      {isFirst && (
        <ContactShadows position={[0, 0.01, -ROOM_DEPTH / 2]} opacity={0.4} scale={ROOM_WIDTH} blur={2.5} far={4} />
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Artwork frame
// --------------------------------------------------------------------------

function ArtworkFrame({
  imageUrl,
  title,
  position,
  rotationY,
  maxSize,
  selected,
  onSelect,
}: {
  imageUrl: string;
  title?: string;
  position: [number, number, number];
  rotationY: number;
  maxSize: number;
  selected: boolean;
  onSelect: (info: { position: [number, number, number]; rotationY: number }) => void;
}) {
  const texture = useSharpTexture(imageUrl);
  const image = texture.image as HTMLImageElement | undefined;
  const naturalRatio = image?.width && image?.height ? image.width / image.height : 1.4;
  let artWidth = maxSize;
  let artHeight = artWidth / naturalRatio;
  if (artHeight > maxSize) {
    artHeight = maxSize;
    artWidth = artHeight * naturalRatio;
  }

  const safeY = Math.max(position[1], artHeight / 2 + 0.5);
  const adjustedPosition: [number, number, number] = [position[0], safeY, position[2]];
  const frameBorder = 0.05;
  const frameDepth = 0.03;

  // A real physical gap between the wall and the mounted piece — the
  // whole assembly (shadow + frame + artwork) stands proud of the wall
  // surface, rather than sitting flush against it.
  const wallGap = 0.05;

  return (
    <group position={adjustedPosition} rotation={[0, rotationY, 0]}>
      {/* A static soft shadow cast onto the wall behind the piece.
          Deliberately NOT a real shadow-casting light — dynamic shadows
          per artwork were the exact cause of the earlier GPU crash with
          several pieces on screen at once. This is a cheap, always-on
          approximation that gives the same "it's mounted with a gap"
          read without that cost. */}
      <mesh position={[0.03, -0.04, -wallGap + 0.002]}>
        <planeGeometry args={[artWidth + frameBorder * 2 + 0.14, artHeight + frameBorder * 2 + 0.14]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} />
      </mesh>

      {/* The frame — a real box with depth, not a flat backing plane */}
      <mesh position={[0, 0, -wallGap + frameDepth / 2]}>
        <boxGeometry args={[artWidth + frameBorder * 2, artHeight + frameBorder * 2, frameDepth]} />
        <meshStandardMaterial color="#1C1C1A" roughness={0.4} metalness={0.25} />
      </mesh>

      {/* The artwork itself, seated just in front of the frame's face */}
      <mesh
        position={[0, 0, -wallGap + frameDepth + 0.004]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ position, rotationY });
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {/* A thin box instead of a flat plane — the canvas has a real
            edge visible at an angle, like an actual stretched-canvas
            piece, not a poster stuck to the wall. */}
        <boxGeometry args={[artWidth, artHeight, 0.018]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.35}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.05 : 0}
        />
      </mesh>

      {title && (
        <Text position={[0, -artHeight / 2 - 0.18, -wallGap + frameDepth]} fontSize={0.09} color="white" anchorX="center" anchorY="top" maxWidth={artWidth} font="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff">
          {title}
        </Text>
      )}

      <spotLight
        position={[0, 1.4, 1.2]}
        target-position={[0, 0, 0]}
        angle={0.45}
        penumbra={0.7}
        intensity={11}
        distance={4}
        decay={2}
        color="#FFF4E0"
      />
    </group>
  );
}

// --------------------------------------------------------------------------
// Wall text panel — authored in local room space, same as artwork frames
// --------------------------------------------------------------------------

function WallTextPanel({
  heading,
  body,
  slot,
  hasDoorway,
  textPosition = 'top',
  textSize = 24,
  textFont = 'inter',
  wallColor,
}: {
  heading: string;
  body?: string;
  slot: 'far' | 'left' | 'right';
  hasDoorway: boolean;
  textPosition?: 'top' | 'center' | 'bottom';
  textSize?: number;
  textFont?: 'inter' | 'playfair' | 'merriweather' | 'mono';
  wallColor: string;
}) {
  let x: number;
  let z: number;
  let rotationY: number;
  let widthBudget = 2.6;

  if (slot === 'far') {
    const sideWidth = (ROOM_WIDTH - DOORWAY_WIDTH) / 2;
    if (hasDoorway) {
      x = -(DOORWAY_WIDTH / 2 + sideWidth / 2);
      widthBudget = sideWidth - 0.7;
    } else {
      x = -ROOM_WIDTH / 2 + 1.6;
    }
    z = -ROOM_DEPTH + 0.03;
    rotationY = 0;
  } else if (slot === 'left') {
    x = -ROOM_WIDTH / 2 + 0.03;
    z = -ROOM_DEPTH / 2 - 1.5;
    rotationY = Math.PI / 2;
  } else {
    x = ROOM_WIDTH / 2 - 0.03;
    z = -ROOM_DEPTH / 2 - 1.5;
    rotationY = -Math.PI / 2;
  }

  const yByPosition = { top: ROOM_HEIGHT / 2 + 0.3, center: ART_HEIGHT + 0.2, bottom: 0.9 };
  // Always respect the admin's textPosition choice — it was being
  // silently overridden on any wall with a doorway, which is why
  // changing the setting appeared to have no effect.
  const y = yByPosition[textPosition];

  // Stronger size contrast between title and body — the title should
  // read as clearly dominant, not just "slightly bigger" than the copy.
  // Stronger default scale and hierarchy — the title reads clearly as
  // "EXHIBITION TITLE" against the smaller supporting text, per real
  // museum signage conventions.
  const headingSize = (textSize / 100) * 1.35;
  const bodySize = (textSize / 100) * 0.48;
  const hasHeading = heading.length > 0;
  const textOriginX = hasDoorway ? -widthBudget / 2 : 0;
  const regularFontUrl = FONT_URLS[textFont] || FONT_URLS.inter;
  const boldFontUrl = FONT_URLS_BOLD[textFont] || FONT_URLS_BOLD.inter;
  const { title: titleColor, body: bodyColor } = getTextColors(wallColor);

  // Standing slightly off the wall — like a printed panel mounted a few
  // millimetres proud of the surface, not a decal glued flat onto it.
  const standoff = 0.06;

  return (
    <group position={[x, y, z + (rotationY === 0 ? standoff : 0)]} rotation={[0, rotationY, 0]}>
      {/* A thin rule under the title — common in real exhibition
          signage to separate the title from the body copy. No glow,
          no transparency: a plain, solid, editorial line. */}
      <mesh position={[textOriginX, hasHeading ? -0.08 : -0.08, 0]}>
        <planeGeometry args={[widthBudget * 0.5, 0.012]} />
        <meshBasicMaterial color={titleColor} />
      </mesh>

      {hasHeading && (
        <Text
          position={[textOriginX, 0.45 * (headingSize / 0.24), 0]}
          fontSize={headingSize}
          color={titleColor}
          anchorX="left"
          anchorY="bottom"
          maxWidth={widthBudget}
          lineHeight={1.15}
          font={boldFontUrl}
          letterSpacing={0.01}
        >
          {heading}
        </Text>
      )}
      {body && (
        <Text
          position={[textOriginX, hasHeading ? -0.2 : 0.1, 0]}
          fontSize={bodySize}
          color={bodyColor}
          anchorX="left"
          anchorY={hasHeading ? 'top' : 'bottom'}
          maxWidth={widthBudget}
          lineHeight={1.6}
          font={regularFontUrl}
        >
          {body}
        </Text>
      )}
    </group>
  );
}

// --------------------------------------------------------------------------
// Shared scene
// --------------------------------------------------------------------------

function GalleryScene({
  wallSettings,
  artworks,
  exhibitionTitle,
  exhibitionDescription,
  zoomed,
  setZoomed,
  roomTransforms,
}: {
  wallSettings: WallSetting[];
  artworks: ArtworkData[];
  exhibitionTitle: string;
  exhibitionDescription?: string;
  zoomed: { position: [number, number, number]; rotationY: number } | null;
  setZoomed: (v: { position: [number, number, number]; rotationY: number } | null) => void;
  roomTransforms: RoomTransform[];
}) {
  const floorTexture = useConcreteFloorTexture();
  const floorBump = useConcreteBumpTexture();
  const wallGrain = useWallGrainTexture();
  const wallBump = useWallBumpTexture();

  const rooms = groupWallsIntoRooms(wallSettings);
  const wallIdToFlatIndex = new Map(wallSettings.map((w, i) => [w.id, i]));

  return (
    <>
      {rooms.map((room, roomIdx) => {
        const transform = roomTransforms[roomIdx];
        const hasNextRoom = roomIdx < rooms.length - 1;

        const localPlacements: { image: string; title?: string; local: [number, number, number]; localRotationY: number; maxSize: number }[] = [];

        (['far', 'left', 'right'] as const).forEach((slot) => {
          const wall = room[slot];
          const flatIndex = room.wallIndexOffset + (slot === 'far' ? 0 : slot === 'left' ? 1 : 2);
          const artOnThisWall = artworks.filter((a) => wallIdToFlatIndex.get(a.wallId || '') === flatIndex).slice(0, wall.maxArtworks);
          if (wall.contentType === 'textOnly' || artOnThisWall.length === 0) return;

          const hasDoorway = slot === 'far' && hasNextRoom;
          const count = artOnThisWall.length;
          const rawSize = count === 1 ? 3.6 : count === 2 ? 2.7 : count === 3 ? 2.2 : 1.8;
          const sideWidth = (ROOM_WIDTH - DOORWAY_WIDTH) / 2;
          const maxSize = slot === 'far' && hasDoorway ? Math.min(rawSize, sideWidth - 0.6) : rawSize;
          const gap = 0.5;
          const totalWidth = count * maxSize + (count - 1) * gap;
          const start = -totalWidth / 2 + maxSize / 2;

          artOnThisWall.forEach((art, i) => {
            const offset = start + i * (maxSize + gap);
            if (slot === 'far') {
              const x = hasDoorway ? (DOORWAY_WIDTH / 2 + sideWidth / 2) + offset : offset;
              localPlacements.push({ image: art.image, title: art.title, local: [x, ART_HEIGHT, -ROOM_DEPTH + 0.03], localRotationY: 0, maxSize });
            } else if (slot === 'left') {
              const z = -ROOM_DEPTH / 2 + offset;
              localPlacements.push({ image: art.image, title: art.title, local: [-ROOM_WIDTH / 2 + 0.03, ART_HEIGHT, z], localRotationY: Math.PI / 2, maxSize });
            } else {
              const z = -ROOM_DEPTH / 2 + offset;
              localPlacements.push({ image: art.image, title: art.title, local: [ROOM_WIDTH / 2 - 0.03, ART_HEIGHT, z], localRotationY: -Math.PI / 2, maxSize });
            }
          });
        });

        return (
          <group key={roomIdx} position={transform.position} rotation={[0, transform.angle, 0]}>
            <RoomUnit
              isFirst={roomIdx === 0}
              group={room}
              hasNextRoom={hasNextRoom}
              floorTexture={floorTexture}
              floorBump={floorBump}
              wallGrain={wallGrain}
              wallBump={wallBump}
            />

            {(['far', 'left', 'right'] as const).map((slot) => {
              const wall = room[slot];
              if (wall.contentType === 'artOnly') return null;
              const hasDoorway = slot === 'far' && hasNextRoom;
              const isTitleWall = roomIdx === 0 && slot === 'far';
              const heading = isTitleWall ? exhibitionTitle : '';
              const body = isTitleWall ? (wall.wallText || exhibitionDescription) : wall.wallText;
              return (
                <WallTextPanel
                  key={slot}
                  heading={heading}
                  body={body}
                  slot={slot}
                  hasDoorway={hasDoorway}
                  textPosition={wall.textPosition}
                  textSize={wall.textSize}
                  textFont={wall.textFont}
                  wallColor={wall.color}
                />
              );
            })}

            {localPlacements.map((p, i) => (
              <ArtworkFrame
                key={i}
                imageUrl={p.image}
                title={p.title}
                position={p.local}
                rotationY={p.localRotationY}
                maxSize={p.maxSize}
                selected={zoomed?.position === p.local}
                onSelect={(info) => {
                  const worldPos = localToWorld(info.position, transform);
                  setZoomed({ position: worldPos, rotationY: transform.angle + info.rotationY });
                }}
              />
            ))}
          </group>
        );
      })}
    </>
  );
}

// --------------------------------------------------------------------------
// Walking controls
// --------------------------------------------------------------------------

function worldToLocal(world: THREE.Vector3, room: RoomTransform): THREE.Vector3 {
  return world.clone().sub(room.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), -room.angle);
}

// No fuzzy overlap on the far (-Z) boundary here — that overlap was the
// bug that trapped the walker at every doorway: it let the PREVIOUS room
// keep claiming a point that had actually already crossed into the next
// one, so the movement clamp kept re-snapping back to the same threshold
// every frame instead of ever fully entering the new room.
function findCurrentRoom(world: THREE.Vector3, roomTransforms: RoomTransform[], margin: number): number {
  for (let i = 0; i < roomTransforms.length; i++) {
    const local = worldToLocal(world, roomTransforms[i]);
    if (local.x >= -ROOM_WIDTH / 2 - margin && local.x <= ROOM_WIDTH / 2 + margin && local.z <= margin && local.z >= -ROOM_DEPTH) {
      return i;
    }
  }
  return 0;
}

function WalkControls({ enabled, roomTransforms }: { enabled: boolean; roomTransforms: RoomTransform[] }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const speed = 4;
  const margin = 0.6;

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, delta) => {
    if (!enabled) return;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const move = new THREE.Vector3();
    if (keys.current['KeyW'] || keys.current['ArrowUp']) move.add(forward);
    if (keys.current['KeyS'] || keys.current['ArrowDown']) move.sub(forward);
    if (keys.current['KeyD'] || keys.current['ArrowRight']) move.add(right);
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta);
      const proposed = camera.position.clone().add(move);

      const roomIdx = findCurrentRoom(camera.position, roomTransforms, margin);
      const room = roomTransforms[roomIdx];
      const local = worldToLocal(proposed, room);

      local.x = Math.max(-ROOM_WIDTH / 2 + margin, Math.min(ROOM_WIDTH / 2 - margin, local.x));

      const inDoorwayX = Math.abs(local.x) < DOORWAY_WIDTH / 2 - margin;
      const hasNext = roomIdx < roomTransforms.length - 1;

      if (local.z > margin) local.z = margin;
      if (local.z < -ROOM_DEPTH - margin) local.z = -ROOM_DEPTH - margin;
      if (local.z < -ROOM_DEPTH + margin && !(inDoorwayX && hasNext)) {
        local.z = -ROOM_DEPTH + margin;
      }

      const worldNext = new THREE.Vector3(local.x, 1.6, local.z)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), room.angle)
        .add(room.position);

      camera.position.copy(worldNext);
    }
  });

  return <PointerLockControls />;
}

function ZoomRig({ target }: { target: { position: [number, number, number]; rotationY: number } | null }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!target) return;
    const forwardOffset = new THREE.Vector3(0, 0, 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), target.rotationY);
    const desired = new THREE.Vector3(...target.position).add(forwardOffset);
    desired.y = ART_HEIGHT;
    camera.position.lerp(desired, 0.08);
    camera.lookAt(new THREE.Vector3(...target.position));
  });

  return null;
}

function SceneJumper({ target }: { target: { position: THREE.Vector3; angle: number } | null }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!target) return;
    const worldCenter = new THREE.Vector3(0, 1.6, -ROOM_DEPTH / 2)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), target.angle)
      .add(target.position);
    camera.position.copy(worldCenter);
  }, [target, camera]);
  return null;
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function VirtualGallery() {
  const { id } = useParams<{ id: string }>();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomed, setZoomed] = useState<{ position: [number, number, number]; rotationY: number } | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [jumpTarget, setJumpTarget] = useState<{ position: THREE.Vector3; angle: number } | null>(null);

  useEffect(() => {
    const fetchExhibition = async () => {
      try {
        const res = await fetch(`${API_BASE}/exhibitions/exhibitions/${id}`);
        if (!res.ok) throw new Error('Exhibition not found');
        const data = await res.json();
        setExhibition(data.exhibition || data);
      } catch (err) {
        console.error(err);
        setError('Could not load this exhibition for the 3D gallery.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchExhibition();
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setZoomed(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) return <div className="galleryLoading">Loading gallery...</div>;

  if (error || !exhibition) {
    return (
      <div className="galleryLoading">
        <p>{error || 'Exhibition not found.'}</p>
        <Link to="/exhibitions" className="galleryBackLink">← All exhibitions</Link>
      </div>
    );
  }

  // New exhibitions store the proper rooms→walls hierarchy (exhibition.rooms).
  // Older ones, saved before this migration, only have the flat
  // wallSettings array — both are supported so nothing existing breaks.
  const wallSettings = exhibition.rooms?.length
    ? flattenRoomsData(exhibition.rooms)
    : exhibition.wallSettings && exhibition.wallSettings.length > 0
      ? exhibition.wallSettings
      : [FALLBACK_WALL];
  const rooms = groupWallsIntoRooms(wallSettings);
  const totalRooms = rooms.length;
  const roomTransforms = getRoomTransforms(totalRooms);

  const artworks: ArtworkData[] = [
    ...(exhibition.image ? [{ image: exhibition.image, title: exhibition.title, wallId: wallSettings[0]?.id }] : []),
    ...(exhibition.artworks?.filter((a) => a.image) || []),
  ];

  return (
    <div className="galleryViewport">
      <Link to={`/exhibitions/${exhibition._id}`} className="galleryExitBtn">← Exit gallery</Link>

      {zoomed && (
        <button className="galleryZoomOutBtn" onClick={() => setZoomed(null)}>← Step back</button>
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.6, 6], fov: 60 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <Suspense fallback={null}>
          {/* Ambient: only enough to keep unlit corners from going pure
              black — it must NOT be the room's main light source. */}
          <ambientLight intensity={0.58} />
          <hemisphereLight args={['#FFFFFF', '#3A3830', 0.4]} />

          {/* A single soft directional fill, standing in for daylight
              through a gallery skylight — gentle, not a spotlight. */}
          <directionalLight position={[5, 9, 3]} intensity={0.42} castShadow shadow-mapSize={[1024, 1024]} />

          {/* Ceiling gallery spotlights — two per room, aimed down from
              the ceiling (physically tied to the architecture, not a
              floating point light), giving pools of brighter light with
              real falloff instead of one flat glow across the room. */}
          {roomTransforms.map((t, i) => {
            const mk = (localX: number, localZ: number) => {
              const p = new THREE.Vector3(localX, ROOM_HEIGHT - 0.15, localZ)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), t.angle)
                .add(t.position);
              const target = new THREE.Vector3(localX, 0, localZ)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), t.angle)
                .add(t.position);
              return { p, target };
            };
            const a = mk(-2, -ROOM_DEPTH * 0.3);
            const b = mk(2, -ROOM_DEPTH * 0.7);
            return (
              <group key={i}>
                <spotLight position={a.p.toArray()} target-position={a.target.toArray()} angle={0.68} penumbra={0.7} intensity={22} distance={10} decay={1.8} color="#FFF6E8" />
                <spotLight position={b.p.toArray()} target-position={b.target.toArray()} angle={0.68} penumbra={0.7} intensity={22} distance={10} decay={1.8} color="#FFF6E8" />
              </group>
            );
          })}

          <GalleryScene
            wallSettings={wallSettings}
            artworks={artworks}
            exhibitionTitle={exhibition.title}
            exhibitionDescription={exhibition.description}
            zoomed={zoomed}
            setZoomed={setZoomed}
            roomTransforms={roomTransforms}
          />

          <WalkControls enabled={!zoomed} roomTransforms={roomTransforms} />
          <ZoomRig target={zoomed} />
          <SceneJumper target={jumpTarget} />
        </Suspense>
      </Canvas>

      <div className="galleryHint">
        {exhibition.title} · {artworks.length} artwork{artworks.length === 1 ? '' : 's'}
        {totalRooms > 1 ? ` · ${totalRooms} rooms` : ''}
      </div>

      <div className="galleryWalkHint">
        {zoomed ? 'Press Esc or "Step back" to return' : 'Click to walk in · WASD to move · Click an artwork to zoom · Esc to release'}
      </div>

      {totalRooms > 1 && !zoomed && (
        <div className="sceneNav">
          <button
            className="sceneNavArrow"
            disabled={sceneIndex === 0}
            onClick={() => {
              const next = sceneIndex - 1;
              setSceneIndex(next);
              setJumpTarget(roomTransforms[next]);
              setTimeout(() => setJumpTarget(null), 50);
            }}
          >
            ‹
          </button>
          <span className="sceneNavLabel">Scene {sceneIndex + 1} of {totalRooms}</span>
          <button
            className="sceneNavArrow"
            disabled={sceneIndex === totalRooms - 1}
            onClick={() => {
              const next = sceneIndex + 1;
              setSceneIndex(next);
              setJumpTarget(roomTransforms[next]);
              setTimeout(() => setJumpTarget(null), 50);
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}