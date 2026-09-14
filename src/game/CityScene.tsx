import React, { useMemo, useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { ArrowLeft, Database, Trophy, TrendingUp, HelpCircle, Navigation, Sun, Moon } from 'lucide-react'
import * as THREE from 'three'
import type { GithubUserData, ContributionCell } from '../services/github'
import { Car } from './Car'
import type { CollisionBox } from './Car'
import { audioManager } from '../services/audio'

interface CitySceneProps {
  userData: GithubUserData
  onBack: () => void
}

// Spacing constants for building coordinates
const SPACING_X = 2.4
const SPACING_Z = 2.0

/**
 * Maps commit counts to building attributes (height, width, depth, color)
 */
function getBuildingProps(commits: number): {
  height: number
  width: number
  depth: number
  color: string
  label: string
} {
  if (commits === 0) {
    return {
      height: 0.05,
      width: 0.9,
      depth: 0.9,
      color: '#1e293b', // Slate-800 pad for empty lot
      label: 'Empty Lot',
    }
  } else if (commits <= 3) {
    return {
      height: 1.5,
      width: 1.0,
      depth: 1.0,
      color: '#10b981', // Emerald-500
      label: 'Small Building',
    }
  } else if (commits <= 8) {
    return {
      height: 3.5,
      width: 1.1,
      depth: 1.1,
      color: '#3b82f6', // Blue-500
      label: 'Medium Building',
    }
  } else if (commits <= 15) {
    return {
      height: 7.0,
      width: 1.2,
      depth: 1.2,
      color: '#8b5cf6', // Violet-500
      label: 'Skyscraper',
    }
  } else {
    return {
      height: 14.0,
      width: 1.4,
      depth: 1.4,
      color: '#ec4899', // Pink-500
      label: 'Mega Tower',
    }
  }
}

/**
 * Animate the red warning light on top of spires (Mega Towers)
 */
const WarningBeacon: React.FC<{ posY: number }> = ({ posY }) => {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (materialRef.current) {
      // Fast blinking pulse effect
      const pulse = Math.sin(state.clock.getElapsedTime() * 9) * 0.5 + 0.5
      materialRef.current.opacity = pulse > 0.4 ? 1.0 : 0.1
    }
  })

  return (
    <mesh position={[0, posY, 0]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ef4444"
        transparent
      />
    </mesh>
  )
}

interface BuildingProps {
  cell: ContributionCell
  isNight: boolean
  windowTexture: THREE.Texture
}

/**
 * Child building mesh component with procedural variations by tier
 */
const Building: React.FC<BuildingProps> = ({ cell, isNight, windowTexture }) => {
  // Deterministic pseudo-random value based on cell coordinates
  const rand = useMemo(() => {
    const val = Math.sin(cell.x * 12.9898 + cell.z * 78.233) * 43758.5453
    return val - Math.floor(val)
  }, [cell.x, cell.z])

  const { height: baseHeight, width, depth, color } = getBuildingProps(cell.commits)

  // Position Calculation:
  // X columns spaced by SPACING_X (streets between weeks)
  const posX = (cell.x - 26) * SPACING_X
  // Z days: split by road between Day 2 and Day 3 (Block A vs Block B)
  const posZ = cell.z <= 2 ? cell.z * SPACING_Z - 7.0 : cell.z * SPACING_Z - 5.0

  const isPad = cell.commits === 0

  // Apply deterministic height variation (+/- 15%) for active buildings
  const height = isPad ? baseHeight : baseHeight * (0.85 + rand * 0.3)
  const posY = 0.08 + height / 2 // Sit on top of the sidewalk pad

  // Create a customized instance of the window texture tiled for this building's proportions
  const tiledTexture = useMemo(() => {
    if (isPad) return null
    const tex = windowTexture.clone()
    tex.repeat.set(Math.max(1, Math.round(width * 2.5)), Math.max(1, Math.round(height * 0.8)))
    tex.needsUpdate = true
    return tex
  }, [windowTexture, width, height, isPad])

  const renderBuildingMesh = () => {
    if (isPad) return null

    // Mega Tower (Setback tiers, antenna, blinking beacon)
    if (cell.commits > 15) {
      const bottomHeight = height * 0.65
      const topHeight = height * 0.35
      const topWidth = width * 0.7
      const topDepth = depth * 0.7

      const bottomY = 0.08 + bottomHeight / 2
      const topY = 0.08 + bottomHeight + topHeight / 2
      const spireHeight = 2.0
      const spireY = 0.08 + bottomHeight + topHeight + spireHeight / 2
      const beaconY = spireHeight / 2

      return (
        <group>
          {/* Bottom structure */}
          <mesh position={[posX, bottomY, posZ]} castShadow receiveShadow>
            <boxGeometry args={[width, bottomHeight, depth]} />
            <meshStandardMaterial
              color={color}
              roughness={0.15}
              metalness={0.85}
              emissiveMap={tiledTexture || undefined}
              emissive={isNight ? '#ffeaa7' : '#000000'}
              emissiveIntensity={isNight ? 1.5 : 0.0}
            />
          </mesh>
          {/* Top setback tier */}
          <mesh position={[posX, topY, posZ]} castShadow receiveShadow>
            <boxGeometry args={[topWidth, topHeight, topDepth]} />
            <meshStandardMaterial
              color={color}
              roughness={0.15}
              metalness={0.85}
              emissiveMap={tiledTexture || undefined}
              emissive={isNight ? '#ffeaa7' : '#000000'}
              emissiveIntensity={isNight ? 1.5 : 0.0}
            />
          </mesh>
          {/* Spire */}
          <mesh position={[posX, spireY, posZ]} castShadow>
            <cylinderGeometry args={[0.015, 0.03, spireHeight, 8]} />
            <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.9} />
          </mesh>
          {/* Blinking Warning Beacon */}
          <group position={[posX, spireY, posZ]}>
            <WarningBeacon posY={beaconY} />
          </group>
        </group>
      )
    }

    // Skyscraper (Setback top, vertical neon facades)
    if (cell.commits >= 9) {
      const bottomHeight = height * 0.75
      const topHeight = height * 0.25
      const topWidth = width * 0.75
      const topDepth = depth * 0.75

      const bottomY = 0.08 + bottomHeight / 2
      const topY = 0.08 + bottomHeight + topHeight / 2

      return (
        <group>
          <mesh position={[posX, bottomY, posZ]} castShadow receiveShadow>
            <boxGeometry args={[width, bottomHeight, depth]} />
            <meshStandardMaterial
              color={color}
              roughness={0.15}
              metalness={0.85}
              emissiveMap={tiledTexture || undefined}
              emissive={isNight ? '#ffeaa7' : '#000000'}
              emissiveIntensity={isNight ? 1.5 : 0.0}
            />
          </mesh>
          <mesh position={[posX, topY, posZ]} castShadow receiveShadow>
            <boxGeometry args={[topWidth, topHeight, topDepth]} />
            <meshStandardMaterial
              color={color}
              roughness={0.15}
              metalness={0.85}
              emissiveMap={tiledTexture || undefined}
              emissive={isNight ? '#ffeaa7' : '#000000'}
              emissiveIntensity={isNight ? 1.5 : 0.0}
            />
          </mesh>
          {/* Facade stripes */}
          <mesh position={[posX, bottomY, posZ + depth / 2 + 0.01]}>
            <boxGeometry args={[0.08, bottomHeight * 0.7, 0.01]} />
            <meshBasicMaterial color={isNight ? "#38bdf8" : "#0284c7"} />
          </mesh>
          <mesh position={[posX, bottomY, posZ - depth / 2 - 0.01]}>
            <boxGeometry args={[0.08, bottomHeight * 0.7, 0.01]} />
            <meshBasicMaterial color={isNight ? "#38bdf8" : "#0284c7"} />
          </mesh>
        </group>
      )
    }

    // Medium Building (Rooftop HVAC systems / detail rims)
    if (cell.commits >= 4) {
      const hvacX = posX + (rand * 0.2 - 0.1)
      const hvacZ = posZ + (rand * 0.2 - 0.1)
      
      return (
        <group>
          <mesh position={[posX, posY, posZ]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
              color={color}
              roughness={0.2}
              metalness={0.8}
              emissiveMap={tiledTexture || undefined}
              emissive={isNight ? '#ffeaa7' : '#000000'}
              emissiveIntensity={isNight ? 1.5 : 0.0}
            />
          </mesh>
          {rand > 0.4 ? (
            <mesh position={[hvacX, posY + height / 2 + 0.15, hvacZ]} castShadow>
              <boxGeometry args={[0.3, 0.25, 0.3]} />
              <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.4} />
            </mesh>
          ) : (
            <mesh position={[posX, posY + height / 2 + 0.05, posZ]}>
              <boxGeometry args={[width * 0.85, 0.1, depth * 0.85]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
          )}
        </group>
      )
    }

    // Small Building (Clean structures)
    return (
      <mesh position={[posX, posY, posZ]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.75}
          emissiveMap={tiledTexture || undefined}
          emissive={isNight ? '#ffeaa7' : '#000000'}
          emissiveIntensity={isNight ? 1.5 : 0.0}
        />
      </mesh>
    )
  }

  return (
    <group>
      {/* Sidewalk Slab */}
      <mesh position={[posX, 0.04, posZ]} receiveShadow>
        <boxGeometry args={[1.4, 0.08, 1.4]} />
        <meshStandardMaterial
          color={isPad ? '#1e293b' : '#334155'}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      {/* Procedural Building Mesh */}
      {renderBuildingMesh()}
    </group>
  )
}

interface StreetlightProps {
  posX: number
  posZ: number
  isNorthSide: boolean
  isNight: boolean
}

/**
 * Illuminated Streetlight component with localized PointLights
 */
const Streetlight: React.FC<StreetlightProps> = ({
  posX,
  posZ,
  isNorthSide,
  isNight,
}) => {
  const rotationY = isNorthSide ? 0 : Math.PI

  return (
    <group position={[posX, 0.08, posZ]} rotation={[0, rotationY, 0]}>
      {/* Pole */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 2.7, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Arm extension */}
      <mesh position={[0.2, 2.7, 0]}>
        <boxGeometry args={[0.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0.4, 2.65, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Bulb */}
      <mesh position={[0.4, 2.6, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={isNight ? "#fef08a" : "#64748b"} />
      </mesh>
      {/* Localized illumination block (Fast, non-shadow-casting PointLight) */}
      <pointLight
        position={[0.4, 2.5, 0]}
        intensity={isNight ? 0.8 : 0.0}
        distance={7}
        color="#fef08a"
        castShadow={false}
      />
    </group>
  )
}

/**
 * Sleek performance overlay tracking FPS in a standard HTML overlay using requestAnimationFrame
 */
const FPSCounter: React.FC = () => {
  const [fps, setFps] = useState(60)

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let frameId: number

    const tick = () => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)))
        frameCount = 0
        lastTime = now
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="absolute bottom-6 right-6 z-10 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 shadow-md backdrop-blur-md flex items-center gap-1.5 text-xs font-mono select-none pointer-events-auto">
      <div className={`w-2 h-2 rounded-full ${fps >= 55 ? 'bg-emerald-500' : fps >= 30 ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`} />
      <span className="text-slate-400">FPS:</span>
      <span className="font-bold text-white">{fps}</span>
    </div>
  )
}

/**
 * Custom-shaded gradient sky sphere that surrounds the scene and transitions colors
 */
const SkyGradient: React.FC<{ isNight: boolean }> = ({ isNight }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null)

  const dayHorizon = useMemo(() => new THREE.Color('#e0f2fe'), []) // Light cyan sky blue
  const dayMid = useMemo(() => new THREE.Color('#7dd3fc'), [])     // Soft sky blue
  const dayZenith = useMemo(() => new THREE.Color('#0284c7'), [])  // Deeper blue

  const nightHorizon = useMemo(() => new THREE.Color('#020617'), []) // Darkest blue/black
  const nightMid = useMemo(() => new THREE.Color('#0f172a'), [])     // Midnight blue
  const nightZenith = useMemo(() => new THREE.Color('#1e293b'), [])  // Slate dark blue

  const uniforms = useMemo(() => ({
    colorHorizon: { value: new THREE.Color(isNight ? '#020617' : '#e0f2fe') },
    colorMid: { value: new THREE.Color(isNight ? '#0f172a' : '#7dd3fc') },
    colorZenith: { value: new THREE.Color(isNight ? '#1e293b' : '#0284c7') }
  }), [])

  useFrame((_, delta) => {
    if (shaderRef.current) {
      const dt = Math.min(delta, 0.1)
      const targetHorizon = isNight ? nightHorizon : dayHorizon
      const targetMid = isNight ? nightMid : dayMid
      const targetZenith = isNight ? nightZenith : dayZenith

      shaderRef.current.uniforms.colorHorizon.value.lerp(targetHorizon, 4.0 * dt)
      shaderRef.current.uniforms.colorMid.value.lerp(targetMid, 4.0 * dt)
      shaderRef.current.uniforms.colorZenith.value.lerp(targetZenith, 4.0 * dt)
    }
  })

  return (
    <mesh scale={[180, 180, 180]}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={shaderRef}
        side={THREE.BackSide}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 colorHorizon;
          uniform vec3 colorMid;
          uniform vec3 colorZenith;
          varying vec3 vPosition;
          void main() {
            float h = normalize(vPosition).y;
            vec3 finalColor;
            if (h < 0.0) {
              finalColor = colorHorizon;
            } else if (h < 0.4) {
              float t = h / 0.4;
              finalColor = mix(colorHorizon, colorMid, t);
            } else {
              float t = clamp((h - 0.4) / 0.6, 0.0, 1.0);
              finalColor = mix(colorMid, colorZenith, t);
            }
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  )
}

interface CloudData {
  id: number
  x: number
  y: number
  z: number
  scale: number
  speed: number
}

const Cloud: React.FC<{ data: CloudData; isNight: boolean }> = ({ data, isNight }) => {
  const ref = useRef<THREE.Group>(null)
  const posX = useRef(data.x)
  const currentOpacity = useRef(isNight ? 0.05 : 0.85)

  useFrame((_, delta) => {
    if (!ref.current) return
    const dt = Math.min(delta, 0.1)

    // Slow drifting animation
    posX.current += data.speed * dt
    if (posX.current > 85) {
      posX.current = -85
    }
    ref.current.position.x = posX.current

    // Smooth day/night opacity transition
    const targetOpacity = isNight ? 0.05 : 0.85
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 4.0 * dt)

    ref.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        if (mat) {
          mat.opacity = currentOpacity.current
        }
      }
    })
  })

  const initialOpacity = isNight ? 0.05 : 0.85

  return (
    <group ref={ref} position={[data.x, data.y, data.z]} scale={[data.scale, data.scale, data.scale]}>
      {/* Central puff */}
      <mesh castShadow>
        <boxGeometry args={[4.5, 1.0, 3.2]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.95}
          metalness={0.0}
          transparent
          opacity={initialOpacity}
        />
      </mesh>
      {/* Left bump */}
      <mesh position={[-2.0, -0.1, 0.2]} castShadow>
        <boxGeometry args={[2.8, 0.8, 2.4]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.95}
          metalness={0.0}
          transparent
          opacity={initialOpacity}
        />
      </mesh>
      {/* Right bump */}
      <mesh position={[2.0, -0.15, -0.2]} castShadow>
        <boxGeometry args={[2.4, 0.7, 2.0]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.95}
          metalness={0.0}
          transparent
          opacity={initialOpacity}
        />
      </mesh>
    </group>
  )
}

const Clouds: React.FC<{ isNight: boolean }> = ({ isNight }) => {
  const cloudList = useMemo<CloudData[]>(() => {
    const list: CloudData[] = []
    const count = 12
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: Math.random() * 160 - 80,
        y: 22 + Math.random() * 12,
        z: Math.random() * 160 - 80,
        scale: 0.7 + Math.random() * 1.5,
        speed: 0.3 + Math.random() * 0.9,
      })
    }
    return list
  }, [])

  return (
    <group>
      {cloudList.map((data) => (
        <Cloud key={data.id} data={data} isNight={isNight} />
      ))}
    </group>
  )
}

/**
 * Procedural Star Field component that distributes stars randomly on a dome,
 * with soft circular glowing points, varied colors, and low-frequency twinkling.
 */
const ProceduralStars: React.FC<{ isNight: boolean; visible: boolean }> = ({ isNight, visible }) => {
  const pointsRef = useRef<THREE.Points>(null)

  // Circular glowing star texture created on a 32x32 canvas
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)')
      gradient.addColorStop(0.5, 'rgba(224, 242, 254, 0.4)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 32, 32)
    }
    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])

  const [positions, colors] = useMemo(() => {
    const count = 1000
    const pos = new Float32Array(count * 3)
    const cols = new Float32Array(count * 3)

    const palette = [
      new THREE.Color('#ffffff'), // Bright white
      new THREE.Color('#e0f2fe'), // Soft icy blue
      new THREE.Color('#fef08a'), // Warm gold
      new THREE.Color('#c7d2fe'), // Soft indigo/violet
    ]

    for (let i = 0; i < count; i++) {
      // Uniform random distribution on upper hemisphere
      const theta = Math.random() * 2.0 * Math.PI
      const phi = Math.random() * (Math.PI * 0.45) // 0 to ~81 degrees elevation
      const r = 140 + Math.random() * 15 // radius 140-155, inside the 180 sky gradient

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi) // Above the horizon (0 to r)
      const z = r * Math.sin(phi) * Math.sin(theta)

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      // Pick color from palette and modulate brightness
      const baseColor = palette[Math.floor(Math.random() * palette.length)]
      const brightness = 0.6 + Math.random() * 0.4
      cols[i * 3] = baseColor.r * brightness
      cols[i * 3 + 1] = baseColor.g * brightness
      cols[i * 3 + 2] = baseColor.b * brightness
    }

    return [pos, cols]
  }, [])

  useFrame((state) => {
    if (!pointsRef.current || !isNight || !visible) return
    const time = state.clock.getElapsedTime()
    const material = pointsRef.current.material as THREE.PointsMaterial
    // Twinkle: smooth modulation of points opacity
    material.opacity = 0.75 + Math.sin(time * 1.8) * 0.2
  })

  return (
    <points ref={pointsRef} visible={isNight && visible}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={starTexture}
        size={2.8}
        sizeAttenuation={true}
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </points>
  )
}

/**
 * Procedural Cinematic Camera component that sweeps through the city on smooth drone-style paths.
 */
const CinematicCamera: React.FC = () => {
  const { camera } = useThree()
  const currentLookTarget = useRef<THREE.Vector3 | null>(null)

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    const pathDuration = 12 // 12 seconds per path
    const pathIdx = Math.floor(time / pathDuration) % 3
    const localTime = time % pathDuration
    const dt = Math.min(delta, 0.1)

    const targetPos = new THREE.Vector3()
    const targetLook = new THREE.Vector3()

    if (pathIdx === 0) {
      // Path 0: Main Street Avenue Glide (camera slides along the avenue, looking ahead)
      const progress = localTime / pathDuration
      const startX = -65
      const endX = 65
      const x = startX + progress * (endX - startX)
      targetPos.set(x, 4.5, 6.5)
      targetLook.set(x + 18, 1.8, -1.0)
    } else if (pathIdx === 1) {
      // Path 1: Panoramic Orbital Sweep (slow rotation around the city center)
      const angle = localTime * 0.18
      const radiusX = 65
      const radiusZ = 38
      const x = Math.sin(angle) * radiusX
      const z = Math.cos(angle) * radiusZ
      targetPos.set(x, 20.0, z)
      targetLook.set(0, 3.0, 0)
    } else {
      // Path 2: Skyline Diagonal Showcase (sweeping view showing mega towers)
      const progress = localTime / pathDuration
      const startX = 55
      const endX = -55
      const x = startX + progress * (endX - startX)
      const z = 26 - Math.sin(progress * Math.PI) * 10
      targetPos.set(x, 16.0 + Math.cos(progress * Math.PI) * 4.0, z)
      targetLook.set(x - 12, 3.5, -3.5)
    }

    // Lerp both camera position and target looking vector to prevent sudden jumps
    camera.position.lerp(targetPos, 2.5 * dt)

    if (!currentLookTarget.current) {
      currentLookTarget.current = targetLook.clone()
    } else {
      currentLookTarget.current.lerp(targetLook, 2.5 * dt)
    }
    camera.lookAt(currentLookTarget.current)
  })

  return null
}

export const CityScene: React.FC<CitySceneProps> = ({ userData, onBack }) => {
  const [cameraMode, setCameraMode] = useState<'drive' | 'orbit' | 'cinematic'>('drive')
  const [isNight, setIsNight] = useState(true)
  const [cloudsVisible, setCloudsVisible] = useState(true)
  const [fogEnabled, setFogEnabled] = useState(true)
  const [starsVisible, setStarsVisible] = useState(true)
  const [uiHidden, setUiHidden] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [isMuted, setIsMuted] = useState(() => audioManager.getMuted())

  useEffect(() => {
    audioManager.init('/music.mp3')
    audioManager.play()

    const timer = setTimeout(() => {
      setShowIntro(false)
    }, 6000)

    return () => {
      clearTimeout(timer)
      audioManager.pause()
    }
  }, [])

  const toggleMute = () => {
    const nextMute = !isMuted
    audioManager.setMute(nextMute)
    setIsMuted(nextMute)
  }


  // Shared 64x64 window grid texture generated on Canvas
  const windowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, 64, 64)
      
      ctx.fillStyle = '#ffffff'
      const size = 6
      const gap = 6
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.fillRect(gap + c * (size + gap), gap + r * (size + gap), size, size)
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

  // Generate list of week columns that will get streetlights (every 4 weeks)
  const streetlightPositions = useMemo(() => {
    const list = []
    for (let x = 0; x <= 52; x += 4) {
      list.push((x - 26) * SPACING_X)
    }
    return list
  }, [])

  // Compile AABB bounding boxes of all buildings for collision detection
  const collisionBoxes = useMemo<CollisionBox[]>(() => {
    const boxes: CollisionBox[] = []
    userData.grid.forEach((cell) => {
      // 0 commits (empty lot pads) do not collide
      if (cell.commits === 0) return

      const { height: baseHeight, width, depth } = getBuildingProps(cell.commits)
      const posX = (cell.x - 26) * SPACING_X
      const posZ = cell.z <= 2 ? cell.z * SPACING_Z - 7.0 : cell.z * SPACING_Z - 5.0

      // Recreate rand for height calculation
      const val = Math.sin(cell.x * 12.9898 + cell.z * 78.233) * 43758.5453
      const rand = val - Math.floor(val)
      const height = baseHeight * (0.85 + rand * 0.3) + 0.08 // including sidewalk pad height

      boxes.push({
        minX: posX - width / 2,
        maxX: posX + width / 2,
        minZ: posZ - depth / 2,
        maxZ: posZ + depth / 2,
        height: height,
      })
    })
    return boxes
  }, [userData.grid])

  const takeScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `github-city-${userData.username}-${timestamp}.png`

      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to take screenshot:', err)
    }
  }

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* 3D R3F Canvas */}
      <div className="w-full h-full z-0">
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true }}
          camera={{ position: [35, 30, 45], fov: 50 }}
        >
          {/* Background color matching the fog */}
          <color attach="background" args={[isNight ? '#020617' : '#94a3b8']} />

          {/* Atmospheric Fog */}
          {fogEnabled && (
            <fog attach="fog" args={[isNight ? '#020617' : '#94a3b8', isNight ? 20 : 25, isNight ? 85 : 95]} />
          )}

          {/* Ambient Lighting */}
          <ambientLight intensity={isNight ? 0.15 : 0.75} color={isNight ? '#93c5fd' : '#ffffff'} />

          {/* Directional Sun/Moon Light designed to cast long shadows */}
          <directionalLight
            castShadow
            position={[45, 55, 20]}
            intensity={isNight ? 0.15 : 1.3}
            color={isNight ? '#93c5fd' : '#fffbeb'}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={200}
            shadow-camera-left={-75}
            shadow-camera-right={75}
            shadow-camera-top={35}
            shadow-camera-bottom={-35}
            shadow-bias={-0.0004}
          />

          {/* Point lights for colored ambient reflection */}
          <pointLight position={[0, 18, 0]} intensity={isNight ? 0.75 : 0.1} color="#8b5cf6" />
          <pointLight position={[-35, 18, 15]} intensity={isNight ? 0.6 : 0.08} color="#3b82f6" />
          <pointLight position={[35, 18, -15]} intensity={isNight ? 0.6 : 0.08} color="#ec4899" />

          {/* Custom Skybox Gradient */}
          <SkyGradient isNight={isNight} />

          {/* Drifting Clouds */}
          {cloudsVisible && (
            <Clouds isNight={isNight} />
          )}

          {/* Starfield in Night Mode */}
          {isNight && (
            <ProceduralStars isNight={isNight} visible={starsVisible} />
          )}

          {/* PBR Reflection Environment Map */}
          <Suspense fallback={null}>
            <Environment preset={isNight ? 'night' : 'sunset'} />
          </Suspense>

          {/* Buildings Grid */}
          <group>
            {userData.grid.map((cell) => (
              <Building key={cell.date} cell={cell} isNight={isNight} windowTexture={windowTexture} />
            ))}
          </group>

          {/* Streetlights lining the main avenue */}
          <group>
            {streetlightPositions.map((posX, idx) => (
              <React.Fragment key={idx}>
                {/* North side of avenue */}
                <Streetlight posX={posX} posZ={-2.2} isNorthSide={true} isNight={isNight} />
                {/* South side of avenue */}
                <Streetlight posX={posX} posZ={0.2} isNorthSide={false} isNight={isNight} />
              </React.Fragment>
            ))}
          </group>

          {/* Drivable Vehicle Mesh */}
          <Car collisionBoxes={collisionBoxes} isActive={cameraMode === 'drive' && !showIntro} isNight={isNight} />

          {/* Ground Plane */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[160, 160]} />
            <meshStandardMaterial
              color="#020617" // matching fog background
              roughness={0.9}
              metalness={0.1}
            />
          </mesh>

          {/* Grid Helper overlay for street blocks visual */}
          <gridHelper
            args={[160, 80, '#4f46e5', '#1e293b']}
            position={[0, 0.01, 0]}
          />

          {/* Orbit Controls (Only active in free camera mode) */}
          {cameraMode === 'orbit' && !showIntro && (
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              maxPolarAngle={Math.PI / 2 - 0.05} // prevent going underground
              minDistance={8}
              maxDistance={120}
            />
          )}

          {/* Cinematic Camera Path controller */}
          {(cameraMode === 'cinematic' || showIntro) && (
            <CinematicCamera />
          )}
        </Canvas>
      </div>

      {uiHidden ? (
        <button
          onClick={() => setUiHidden(false)}
          className="absolute top-6 right-6 z-20 pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-slate-800 backdrop-blur-md active:scale-95 shadow-lg shadow-slate-950/30 cursor-pointer"
        >
          <span>👁 Show UI</span>
        </button>
      ) : (
        <>
          {/* Top Navigation HUD */}
          <div className="absolute top-0 inset-x-0 z-10 p-6 pointer-events-none flex justify-between items-start">
            
            {/* Back Button and Sound Toggle */}
            <div className="pointer-events-auto flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-slate-800 backdrop-blur-md active:scale-95 shadow-lg shadow-slate-950/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Exit City</span>
              </button>

              <button
                onClick={toggleMute}
                className="flex items-center justify-center w-10 h-10 bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all hover:bg-slate-800 backdrop-blur-md active:scale-95 shadow-lg shadow-slate-950/20 cursor-pointer"
                title={isMuted ? "Unmute Music" : "Mute Music"}
              >
                {isMuted ? (
                  <span className="text-base select-none">🔇</span>
                ) : (
                  <span className="text-base select-none animate-pulse">🔊</span>
                )}
              </button>
            </div>

            {/* City Information HUD Card */}
            <div className="pointer-events-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md max-w-sm w-80 flex flex-col gap-3">
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Procedural 3D Experience</span>
                <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">
                  @{userData.username}'s City
                </h2>
              </div>

              {/* Stats Rows */}
              <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-800 py-3 text-center">
                <div className="flex flex-col items-center">
                  <Database className="w-4 h-4 text-indigo-400 mb-1" />
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Commits</span>
                  <span className="text-sm font-bold text-white mt-0.5">{userData.totalContributions}</span>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Streak</span>
                  <span className="text-sm font-bold text-white mt-0.5">{userData.currentStreak}d</span>
                </div>
                <div className="flex flex-col items-center">
                  <Trophy className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Longest</span>
                  <span className="text-sm font-bold text-white mt-0.5">{userData.longestStreak}d</span>
                </div>
              </div>

              {/* Controls toggle buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCameraMode(cameraMode === 'drive' ? 'orbit' : 'drive')}
                  className={`h-9 rounded-xl text-[11px] font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1 pointer-events-auto cursor-pointer ${
                    cameraMode === 'drive'
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Navigation className={`w-3.5 h-3.5 ${cameraMode === 'drive' ? 'rotate-45' : ''} transition-transform`} />
                  <span>{cameraMode === 'drive' ? 'Free Cam' : 'Drive'}</span>
                </button>

                <button
                  onClick={() => setIsNight(!isNight)}
                  className="h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-bold border border-slate-700 transition-all shadow-md active:scale-98 flex items-center justify-center gap-1 pointer-events-auto cursor-pointer"
                >
                  {isNight ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Day Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Night Mode</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[10px] text-slate-400 flex items-start gap-1.5 border-t border-slate-800/60 pt-2.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  {cameraMode === 'drive'
                    ? 'Use WASD / Arrows to drive. Space to brake. Camera follows car.'
                    : cameraMode === 'orbit'
                    ? 'Drag left-click to rotate, right-click to pan, scroll to zoom.'
                    : 'Cinematic tour active. Enjoy the city view! Click Cinematic again to exit.'}
                </span>
              </div>

              {/* Quick Settings Panel */}
              <div className="border-t border-slate-800/60 pt-2.5 flex flex-col gap-2">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest px-0.5">Display Settings</span>
                
                {/* Toggles Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold">
                  {/* Music Toggle */}
                  <button
                    onClick={toggleMute}
                    className={`h-7 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      !isMuted
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white hover:bg-indigo-600/40'
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-400 hover:bg-slate-800/20'
                    }`}
                  >
                    <span>{!isMuted ? '🔊 Music' : '🔇 Music'}</span>
                    <span className="text-[7px] font-black">{!isMuted ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Clouds Toggle */}
                  <button
                    onClick={() => setCloudsVisible(!cloudsVisible)}
                    className={`h-7 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      cloudsVisible
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white hover:bg-indigo-600/40'
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-400 hover:bg-slate-800/20'
                    }`}
                  >
                    <span>☁ Clouds</span>
                    <span className="text-[7px] font-black">{cloudsVisible ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Fog Toggle */}
                  <button
                    onClick={() => setFogEnabled(!fogEnabled)}
                    className={`h-7 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      fogEnabled
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white hover:bg-indigo-600/40'
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-400 hover:bg-slate-800/20'
                    }`}
                  >
                    <span>🌫 Fog</span>
                    <span className="text-[7px] font-black">{fogEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Stars Toggle */}
                  <button
                    onClick={() => setStarsVisible(!starsVisible)}
                    className={`h-7 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      starsVisible
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white hover:bg-indigo-600/40'
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-400 hover:bg-slate-800/20'
                    }`}
                  >
                    <span>⭐ Stars</span>
                    <span className="text-[7px] font-black">{starsVisible ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold">
                  {/* Cinematic Toggle */}
                  <button
                    onClick={() => setCameraMode(cameraMode === 'cinematic' ? 'drive' : 'cinematic')}
                    className={`h-7 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      cameraMode === 'cinematic'
                        ? 'bg-pink-600/30 border border-pink-500/40 text-white hover:bg-pink-600/40 animate-pulse'
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-300 hover:bg-slate-800/20'
                    }`}
                  >
                    <span>🎥 Cinematic</span>
                  </button>

                  {/* Screenshot Action */}
                  <button
                    onClick={takeScreenshot}
                    className="h-7 rounded-lg flex items-center justify-center gap-1 bg-slate-950/40 border border-slate-800/60 text-slate-300 hover:bg-slate-800/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>📸 Capture</span>
                  </button>

                  {/* Hide UI Action */}
                  <button
                    onClick={() => setUiHidden(true)}
                    className="h-7 rounded-lg flex items-center justify-center gap-1 bg-slate-950/40 border border-slate-800/60 text-slate-300 hover:bg-slate-800/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>👁 Hide UI</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Building Type Legend Panel */}
          <div className="absolute bottom-6 left-6 z-10 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md hidden md:flex flex-col gap-2 max-w-xs pointer-events-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-1.5">
              Building Class Scale
            </h3>
            <div className="flex flex-col gap-1.5 text-[11px] font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#1e293b] border border-slate-700" />
                <span className="text-slate-400">Empty Lot (0 commits)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#10b981]" />
                <span className="text-slate-400">Small Building (1–3 commits)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#3b82f6]" />
                <span className="text-slate-400">Medium Building (4–8 commits)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#8b5cf6]" />
                <span className="text-slate-400">Skyscraper (9–15 commits)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#ec4899]" />
                <span className="text-slate-400">Mega Tower (15+ commits)</span>
              </div>
            </div>
          </div>

          {/* R3F FPS Counter HUD */}
          <FPSCounter />
        </>
      )}

      {/* Intro Logo Overlay */}
      {showIntro && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none select-none"
          style={{
            animation: 'backdropIntro 6s cubic-bezier(0.25, 1, 0.5, 1) forwards'
          }}
        >
          <style>{`
            @keyframes logoIntro {
              0% {
                opacity: 0;
                transform: scale(0.85);
                filter: blur(10px);
              }
              8.33% { /* 0.5s */
                opacity: 0;
                transform: scale(0.85);
                filter: blur(10px);
              }
              41.67% { /* 2.5s */
                opacity: 0.85;
                transform: scale(1.0);
                filter: blur(0px) drop-shadow(0 0 35px rgba(99, 102, 241, 0.5));
              }
              83.33% { /* 5.0s */
                opacity: 0.85;
                transform: scale(1.02);
                filter: blur(0px) drop-shadow(0 0 35px rgba(99, 102, 241, 0.5));
              }
              100% { /* 6.0s */
                opacity: 0;
                transform: scale(1.06);
                filter: blur(8px);
              }
            }

            @keyframes backdropIntro {
              0% {
                background-color: rgba(2, 6, 23, 1.0);
              }
              41.67% { /* 2.5s */
                background-color: rgba(2, 6, 23, 1.0);
              }
              83.33% { /* 5.0s */
                background-color: rgba(2, 6, 23, 0.35);
              }
              100% { /* 6.0s */
                background-color: rgba(2, 6, 23, 0.0);
              }
            }
          `}</style>
          
          <img 
            src="/Logo/GITHUB CITY.png" 
            alt="GitHub City Logo" 
            className="max-w-md w-4/5 md:w-3/5 object-contain"
            style={{
              animation: 'logoIntro 6s cubic-bezier(0.25, 1, 0.5, 1) forwards'
            }}
          />
        </div>
      )}

    </div>
  )
}
