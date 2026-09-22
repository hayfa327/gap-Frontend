// src/components/pages/VirtualGallery/VirtualGallery.tsx
import { Suspense, useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, useTexture, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import './VirtualGallery.css';

const ROOM_WIDTH = 10;
const ROOM_DEPTH = 10;
const ROOM_HEIGHT = 4.2;
const DOORWAY_WIDTH = 2.4;
const DOORWAY_HEIGHT = 3;
const ART_HEIGHT = 1.6;
const MAX_ROOMS = 8;

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
  textSize?: 'small' | 'medium' | 'large';
}

interface Exhibition {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  artworks?: ArtworkData[];
  wallSettings?: WallSetting[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const FALLBACK_WALL: WallSetting = {
  id: 'wall-fallback',
  color: '#EDEAE1',
  contentType: 'artOnly',
  wallText: '',
  maxArtworks: 6,
  textPosition: 'top',
  textSize: 'medium',
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
    ctx.fillStyle = '#C7C3B8';
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
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.05)`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 2.5);
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
      const v = 122 + Math.random() * 12;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 2.5);
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
  const farMat = (
    <meshStandardMaterial color={group.far.color} roughnessMap={wallGrain} bumpMap={wallBump} bumpScale={0.006} roughness={0.92} />
  );
  const leftMat = (
    <meshStandardMaterial color={group.left.color} roughnessMap={wallGrain} bumpMap={wallBump} bumpScale={0.006} roughness={0.92} />
  );
  const rightMat = (
    <meshStandardMaterial color={group.right.color} roughnessMap={wallGrain} bumpMap={wallBump} bumpScale={0.006} roughness={0.92} />
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial map={floorTexture} bumpMap={floorBump} bumpScale={0.012} roughness={0.5} metalness={0.02} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#F2F2F0" roughness={0.95} />
      </mesh>

      {!hasNextRoom ? (
        <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH]}>
          <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
          {farMat}
        </mesh>
      ) : (
        (() => {
          const sideWidth = (ROOM_WIDTH - DOORWAY_WIDTH) / 2;
          const doorTopHeight = ROOM_HEIGHT - DOORWAY_HEIGHT;
          return (
            <>
              <mesh position={[-(DOORWAY_WIDTH / 2 + sideWidth / 2), ROOM_HEIGHT / 2, -ROOM_DEPTH]}>
                <planeGeometry args={[sideWidth, ROOM_HEIGHT]} />
                {farMat}
              </mesh>
              <mesh position={[DOORWAY_WIDTH / 2 + sideWidth / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH]}>
                <planeGeometry args={[sideWidth, ROOM_HEIGHT]} />
                {farMat}
              </mesh>
              <mesh position={[0, ROOM_HEIGHT - doorTopHeight / 2, -ROOM_DEPTH]}>
                <planeGeometry args={[DOORWAY_WIDTH, doorTopHeight]} />
                {farMat}
              </mesh>
            </>
          );
        })()
      )}

      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {leftMat}
      </mesh>

      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {rightMat}
      </mesh>

      <mesh position={[0, 0.06, -ROOM_DEPTH + 0.02]}>
        <planeGeometry args={[ROOM_WIDTH, 0.12]} />
        <meshStandardMaterial color="#1A1A18" roughness={0.6} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_WIDTH / 2 + 0.02, 0.06, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_DEPTH, 0.12]} />
        <meshStandardMaterial color="#1A1A18" roughness={0.6} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_WIDTH / 2 - 0.02, 0.06, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_DEPTH, 0.12]} />
        <meshStandardMaterial color="#1A1A18" roughness={0.6} />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT - 0.03, -ROOM_DEPTH + 0.35]}>
        <planeGeometry args={[ROOM_WIDTH - 0.6, 0.12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFF8E8" emissiveIntensity={1.4} />
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
  const frameThickness = 0.05;

  return (
    <group position={adjustedPosition} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[artWidth + frameThickness * 2, artHeight + frameThickness * 2]} />
        <meshStandardMaterial color="#1C1C1A" roughness={0.4} metalness={0.2} />
      </mesh>

      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ position, rotationY });
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <planeGeometry args={[artWidth, artHeight]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.35}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.05 : 0}
        />
      </mesh>

      {title && (
        <Text position={[0, -artHeight / 2 - 0.18, 0]} fontSize={0.09} color="white" anchorX="center" anchorY="top" maxWidth={artWidth} font="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff">
          {title}
        </Text>
      )}

      <spotLight position={[0, 1.4, 1.4]} target-position={[0, 0, 0]} angle={0.65} penumbra={0.9} intensity={6} distance={5} />
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
  textSize = 'medium',
}: {
  heading: string;
  body?: string;
  slot: 'far' | 'left' | 'right';
  hasDoorway: boolean;
  textPosition?: 'top' | 'center' | 'bottom';
  textSize?: 'small' | 'medium' | 'large';
}) {
  let x: number;
  let z: number;
  let rotationY: number;
  let widthBudget = 2.6; // how wide the text block is allowed to run

  if (slot === 'far') {
    const sideWidth = (ROOM_WIDTH - DOORWAY_WIDTH) / 2;
    if (hasDoorway) {
      // Centred in its own half of the wall, sized to genuinely match
      // the artwork on the other half — a real 50/50 split, not a small
      // label off to the side.
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

  // On the split entrance wall, vertically centre the text at the same
  // height as the artwork opposite it, so the two halves read as equals
  // side by side — the admin's textPosition still applies elsewhere.
  const yByPosition = { top: ROOM_HEIGHT / 2 + 0.3, center: ART_HEIGHT + 0.2, bottom: 0.9 };
  const y = hasDoorway ? ART_HEIGHT + 0.3 : yByPosition[textPosition];
  const scaleBySize = { small: 0.7, medium: 0.9, large: 1.2 };
  const scale = scaleBySize[textSize];
  const hasHeading = heading.length > 0;
  const textOriginX = hasDoorway ? -widthBudget / 2 : 0;
  const anchorX = hasDoorway ? 'left' : 'left';

  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[textOriginX - 0.12, -0.15 * scale, -0.01]}>
        <planeGeometry args={[0.025, 0.75 * scale]} />
        <meshBasicMaterial color="#1A1A18" />
      </mesh>

      {hasHeading && (
        <Text
          position={[textOriginX, 0.45 * scale, 0]}
          fontSize={0.24 * scale}
          color="white"
          anchorX={anchorX}
          anchorY="bottom"
          maxWidth={widthBudget}
          lineHeight={1.15}
          outlineWidth={0.006}
          outlineColor="#000000"
          font="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff"
        >
          {heading}
        </Text>
      )}
      {body && (
        <Text
          position={[textOriginX, hasHeading ? 0.22 * scale : 0.45 * scale, 0]}
          fontSize={0.13 * scale}
          color="#F0EEE6"
          anchorX={anchorX}
          anchorY={hasHeading ? 'top' : 'bottom'}
          maxWidth={widthBudget}
          lineHeight={1.5}
          outlineWidth={0.004}
          outlineColor="#000000"
          font="https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff"
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

  const wallSettings = exhibition.wallSettings && exhibition.wallSettings.length > 0 ? exhibition.wallSettings : [FALLBACK_WALL];
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

      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.6, 6], fov: 60 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.15} />
          <hemisphereLight args={['#FFFFFF', '#6B675E', 0.65]} />
          <directionalLight position={[5, 9, 3]} intensity={0.5} castShadow shadow-mapSize={[512, 512]} />
          {roomTransforms.map((t, i) => {
            const worldCenter = new THREE.Vector3(0, ROOM_HEIGHT - 0.3, -ROOM_DEPTH / 2)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), t.angle)
              .add(t.position);
            return <pointLight key={i} position={worldCenter.toArray()} intensity={5} distance={12} decay={2} />;
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