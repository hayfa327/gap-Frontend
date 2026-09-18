// src/components/pages/VirtualGallery/VirtualGallery.tsx
import { Suspense, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import './VirtualGallery.css';

// A bigger room reads as an actual gallery hall rather than a small box.
const ROOM_WIDTH = 18;
const ROOM_DEPTH = 18;
const ROOM_HEIGHT = 5.5;

interface Artwork {
  image: string;
  title?: string;
}

interface Exhibition {
  _id: string;
  title: string;
  image?: string;
  artworks?: Artwork[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function Room() {
  return (
    <group>
      {/* Polished concrete-style floor — slightly reflective via low roughness */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#D8D4C8" roughness={0.55} metalness={0.05} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </mesh>

      {/* True gallery-white walls */}
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.95} />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.95} />
      </mesh>

      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.95} />
      </mesh>

      {/* Soft contact shadow under the room's centre, grounds objects visually */}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={ROOM_WIDTH} blur={2.5} far={4} />
    </group>
  );
}

// Sharpens a loaded texture: correct colour space, no blurry mipmaps,
// and anisotropic filtering so the image stays crisp even at an angle.
function useSharpTexture(url: string) {
  const texture = useTexture(url);
  const { gl } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture, gl]);

  return texture;
}

function ArtworkFrame({
  imageUrl,
  position,
  rotationY,
}: {
  imageUrl: string;
  position: [number, number, number];
  rotationY: number;
}) {
  const texture = useSharpTexture(imageUrl);
  const artWidth = 2.4;
  const artHeight = 1.7;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[artWidth + 0.16, artHeight + 0.16]} />
        <meshStandardMaterial color="#232323" roughness={0.6} />
      </mesh>

      {/* Artwork */}
      <mesh>
        <planeGeometry args={[artWidth, artHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} />
      </mesh>

      {/* Small gallery spotlight, angled down onto the piece — this is
          what makes it read as "lit art" instead of a flat poster. */}
      <spotLight
        position={[0, 1.6, 1.2]}
        target-position={[0, 0, 0]}
        angle={0.5}
        penumbra={0.6}
        intensity={12}
        distance={6}
        castShadow
      />
    </group>
  );
}

function distributeOnWalls(images: string[]) {
  const wallZ = -ROOM_DEPTH / 2 + 0.03;
  const wallX = ROOM_WIDTH / 2 - 0.03;
  const y = ROOM_HEIGHT / 2;

  const perWall = Math.ceil(images.length / 3) || 1;
  const spacing = ROOM_WIDTH / (perWall + 1);

  return images.map((imageUrl, i) => {
    const wallIndex = Math.floor(i / perWall);
    const slot = (i % perWall) + 1;

    if (wallIndex === 0) {
      const x = -ROOM_WIDTH / 2 + spacing * slot;
      return { imageUrl, position: [x, y, wallZ] as [number, number, number], rotationY: 0 };
    }
    if (wallIndex === 1) {
      const z = -ROOM_DEPTH / 2 + spacing * slot;
      return { imageUrl, position: [-wallX, y, z] as [number, number, number], rotationY: Math.PI / 2 };
    }
    const z = -ROOM_DEPTH / 2 + spacing * slot;
    return { imageUrl, position: [wallX, y, z] as [number, number, number], rotationY: -Math.PI / 2 };
  });
}

export default function VirtualGallery() {
  const { id } = useParams<{ id: string }>();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="galleryLoading">Loading gallery...</div>;
  }

  if (error || !exhibition) {
    return (
      <div className="galleryLoading">
        <p>{error || 'Exhibition not found.'}</p>
        <Link to="/exhibitions" className="galleryBackLink">← All exhibitions</Link>
      </div>
    );
  }

  const images = [
    ...(exhibition.image ? [exhibition.image] : []),
    ...(exhibition.artworks?.map((a) => a.image).filter(Boolean) || []),
  ];
  const placements = distributeOnWalls(images);

  return (
    <div className="galleryViewport">
      <Link to={`/exhibitions/${exhibition._id}`} className="galleryExitBtn">← Exit gallery</Link>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.6, 5], fov: 55 }}>
        <Suspense fallback={null}>
          {/* Bright, even gallery lighting — a real gallery is lit throughout,
              not just at the artworks */}
          <ambientLight intensity={0.9} />
          <hemisphereLight args={['#FFFFFF', '#EAE6DC', 0.6]} />
          <directionalLight position={[6, 10, 4]} intensity={0.5} castShadow />
          <directionalLight position={[-6, 10, -4]} intensity={0.3} />

          <Room />

          {placements.map((p, i) => (
            <ArtworkFrame key={i} imageUrl={p.imageUrl} position={p.position} rotationY={p.rotationY} />
          ))}

          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={12}
            maxPolarAngle={Math.PI / 1.9}
          />
        </Suspense>
      </Canvas>

      <div className="galleryHint">
        {exhibition.title} · {images.length} artwork{images.length === 1 ? '' : 's'} · Drag to look around
      </div>
    </div>
  );
}