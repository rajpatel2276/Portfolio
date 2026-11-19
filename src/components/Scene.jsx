import { Stars, Float } from '@react-three/drei'

export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <Stars radius={100} depth={60} count={4000} factor={4} fade speed={1} />

      {/* Placeholder: will be replaced by the hanging ID card in Step 2 */}
      <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
        <mesh>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial color="#7c5cff" wireframe />
        </mesh>
      </Float>
    </>
  )
}