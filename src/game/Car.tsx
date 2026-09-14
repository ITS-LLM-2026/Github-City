import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export interface CollisionBox {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height?: number
}

interface CarProps {
  collisionBoxes: CollisionBox[]
  isActive: boolean
  isNight?: boolean
}

// Physics & Tuning Constants
const MAX_SPEED = 12.0
const MAX_REVERSE_SPEED = -4.5
const ACCELERATION = 8.5
const DECELERATION = 5.0 // natural friction
const BRAKE_DECELERATION = 20.0
const TURN_SPEED = 2.4
const CAR_RADIUS = 0.45 // Bounding circle radius of car for collisions

export const Car: React.FC<CarProps> = ({ collisionBoxes, isActive, isNight = true }) => {
  const carRef = useRef<THREE.Group>(null)
  const { gl } = useThree()

  // Mobile device detection state
  const [isMobile, setIsMobile] = useState(false)
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0, transition: 'none' })

  // Kinematic state tracked in refs for 60fps performance without react re-renders
  const speed = useRef(0)
  const angle = useRef(Math.PI / 2) // Orient initially facing East along the Avenue
  const carPosition = useRef(new THREE.Vector3(0, 0.22, -1.0)) // Place on the main avenue

  // Camera controls state tracked in refs
  const yawOffset = useRef(0)
  const pitch = useRef(0.45) // elevation angle in radians (~26 degrees)
  const distance = useRef(5.5) // camera follow distance
  const lastInputTime = useRef(0)

  // Keyboard controls state
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
  })

  // Mobile detection hook
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 1024
      setIsMobile(hasTouch && isSmallScreen)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Touch event states and handlers for virtual joystick
  const joystickTouchId = useRef<number | null>(null)
  const joystickStart = useRef({ x: 0, y: 0 })
  const joystickZoneRef = useRef<HTMLDivElement>(null)

  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0]
    joystickTouchId.current = touch.identifier
    joystickStart.current = { x: touch.clientX, y: touch.clientY }
    setJoystickPos({ x: 0, y: 0, transition: 'none' })
  }

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current === null) return
    
    let activeTouch: React.Touch | null = null
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchId.current) {
        activeTouch = e.touches[i]
        break
      }
    }
    
    if (!activeTouch) return

    const deltaX = activeTouch.clientX - joystickStart.current.x
    const deltaY = activeTouch.clientY - joystickStart.current.y
    
    const maxRadius = 40 // Maximum displacement of knob in pixels
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    let moveX = deltaX
    let moveY = deltaY
    
    if (distance > maxRadius) {
      moveX = (deltaX / distance) * maxRadius
      moveY = (deltaY / distance) * maxRadius
    }
    
    setJoystickPos({ x: moveX, y: moveY, transition: 'none' })
    
    // Normalize mapping to [-1, 1]
    const normX = moveX / maxRadius
    const normY = moveY / maxRadius
    
    // Steer left/right
    if (normX < -0.2) {
      keys.current.left = true
      keys.current.right = false
    } else if (normX > 0.2) {
      keys.current.right = true
      keys.current.left = false
    } else {
      keys.current.left = false
      keys.current.right = false
    }
    
    // Accelerate forward/backward
    if (normY < -0.2) {
      keys.current.forward = true
      keys.current.backward = false
    } else if (normY > 0.2) {
      keys.current.backward = true
      keys.current.forward = false
    } else {
      keys.current.forward = false
      keys.current.backward = false
    }
  }

  const handleJoystickEnd = () => {
    joystickTouchId.current = null
    setJoystickPos({ x: 0, y: 0, transition: 'transform 0.15s ease-out' })
    
    // Reset keys refs
    keys.current.forward = false
    keys.current.backward = false
    keys.current.left = false
    keys.current.right = false
  }

  const handleBrakeStart = () => {
    keys.current.brake = true
  }

  const handleBrakeEnd = () => {
    keys.current.brake = false
  }

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code
      if (code === 'KeyW' || code === 'ArrowUp') keys.current.forward = true
      if (code === 'KeyS' || code === 'ArrowDown') keys.current.backward = true
      if (code === 'KeyA' || code === 'ArrowLeft') keys.current.left = true
      if (code === 'KeyD' || code === 'ArrowRight') keys.current.right = true
      if (code === 'Space') keys.current.brake = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code
      if (code === 'KeyW' || code === 'ArrowUp') keys.current.forward = false
      if (code === 'KeyS' || code === 'ArrowDown') keys.current.backward = false
      if (code === 'KeyA' || code === 'ArrowLeft') keys.current.left = false
      if (code === 'KeyD' || code === 'ArrowRight') keys.current.right = false
      if (code === 'Space') keys.current.brake = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Camera pointer drag and wheel zoom listeners
  useEffect(() => {
    if (!isActive) return

    const dom = gl.domElement
    let isDragging = false
    let prevPointerX = 0
    let prevPointerY = 0

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return // Only drag on left click
      isDragging = true
      prevPointerX = e.clientX
      prevPointerY = e.clientY
      dom.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevPointerX
      const dy = e.clientY - prevPointerY
      
      prevPointerX = e.clientX
      prevPointerY = e.clientY

      const sensitivity = 0.005
      yawOffset.current -= dx * sensitivity
      pitch.current = Math.max(0.05, Math.min(1.2, pitch.current + dy * sensitivity))
      lastInputTime.current = performance.now()
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (isDragging) {
        isDragging = false
        dom.releasePointerCapture(e.pointerId)
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomSensitivity = 0.005
      distance.current = Math.max(3.0, Math.min(15.0, distance.current + e.deltaY * zoomSensitivity))
      lastInputTime.current = performance.now()
    }

    dom.addEventListener('pointerdown', handlePointerDown)
    dom.addEventListener('pointermove', handlePointerMove)
    dom.addEventListener('pointerup', handlePointerUp)
    dom.addEventListener('pointercancel', handlePointerUp)
    dom.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown)
      dom.removeEventListener('pointermove', handlePointerMove)
      dom.removeEventListener('pointerup', handlePointerUp)
      dom.removeEventListener('pointercancel', handlePointerUp)
      dom.removeEventListener('wheel', handleWheel)
    }
  }, [isActive, gl])

  // Bounding circle vs Bounding box collision checker
  const checkCollisionAt = (x: number, z: number): boolean => {
    for (let i = 0; i < collisionBoxes.length; i++) {
      const box = collisionBoxes[i]
      
      // Find closest point on the building AABB to the car circle center
      const closestX = Math.max(box.minX, Math.min(x, box.maxX))
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ))
      
      const dx = x - closestX
      const dz = z - closestZ
      const distSq = dx * dx + dz * dz

      if (distSq < CAR_RADIUS * CAR_RADIUS) {
        return true
      }
    }
    return false
  }

  // Camera-building collision detection
  const checkCameraCollision = (x: number, y: number, z: number): boolean => {
    const cameraBuffer = 0.2
    for (let i = 0; i < collisionBoxes.length; i++) {
      const box = collisionBoxes[i]
      const boxHeight = box.height || 10.0
      
      if (y > boxHeight + cameraBuffer) continue

      if (
        x > box.minX - cameraBuffer &&
        x < box.maxX + cameraBuffer &&
        z > box.minZ - cameraBuffer &&
        z < box.maxZ + cameraBuffer
      ) {
        return true
      }
    }
    return false
  }

  // Front wheels ref for rotation and steering animation
  const frontLeftWheelRef = useRef<THREE.Group>(null)
  const frontRightWheelRef = useRef<THREE.Group>(null)
  const rearLeftWheelRef = useRef<THREE.Group>(null)
  const rearRightWheelRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!carRef.current) return

    // Limit delta to prevent massive jumps on stutter
    const dt = Math.min(delta, 0.1)

    if (isActive) {
      // 1. Process Acceleration & Braking
      if (keys.current.forward) {
        speed.current = Math.min(speed.current + ACCELERATION * dt, MAX_SPEED)
      } else if (keys.current.backward) {
        speed.current = Math.max(speed.current - ACCELERATION * dt, MAX_REVERSE_SPEED)
      } else {
        // Friction deceleration
        if (speed.current > 0) {
          speed.current = Math.max(speed.current - DECELERATION * dt, 0)
        } else if (speed.current < 0) {
          speed.current = Math.min(speed.current + DECELERATION * dt, 0)
        }
      }

      if (keys.current.brake) {
        if (speed.current > 0) {
          speed.current = Math.max(speed.current - BRAKE_DECELERATION * dt, 0)
        } else if (speed.current < 0) {
          speed.current = Math.min(speed.current + BRAKE_DECELERATION * dt, 0)
        }
      }

      // 2. Process Steering (only allowed while moving, steering reverses in backward)
      const isMoving = Math.abs(speed.current) > 0.05
      if (isMoving) {
        // Scaling turn speed slightly at lower speeds
        const turnScale = Math.min(Math.abs(speed.current) / 4.0, 1.0)
        const steerDir = speed.current >= 0 ? 1 : -1

        if (keys.current.left) {
          angle.current += TURN_SPEED * turnScale * steerDir * dt
        }
        if (keys.current.right) {
          angle.current -= TURN_SPEED * turnScale * steerDir * dt
        }
      }

      // 3. Movement with Sliding Collision Detection and Boundary Constraints
      const dirX = Math.sin(angle.current)
      const dirZ = Math.cos(angle.current)

      // Test motions
      let nextX = carPosition.current.x + dirX * speed.current * dt
      let nextZ = carPosition.current.z + dirZ * speed.current * dt

      // Platform boundaries (platform size is 160x160, so bounds are -80 to +80)
      // We apply a safety margin of 4.0 units to keep the vehicle safely on the platform.
      const BOUND_LIMIT = 76.0

      // Slide collision & boundary: check X motion independently
      const collidesX = checkCollisionAt(nextX, carPosition.current.z)
      const outOfBoundsX = nextX < -BOUND_LIMIT || nextX > BOUND_LIMIT
      if (collidesX || outOfBoundsX) {
        nextX = carPosition.current.x // block X
        speed.current *= 0.65 // absorb impact energy
      }

      // Slide collision & boundary: check Z motion independently
      const collidesZ = checkCollisionAt(carPosition.current.x, nextZ)
      const outOfBoundsZ = nextZ < -BOUND_LIMIT || nextZ > BOUND_LIMIT
      if (collidesZ || outOfBoundsZ) {
        nextZ = carPosition.current.z // block Z
        speed.current *= 0.65
      }

      // Fallback combined collision and boundary check (handles corners)
      const collidesCombined = checkCollisionAt(nextX, nextZ)
      const outOfBoundsCombined = nextX < -BOUND_LIMIT || nextX > BOUND_LIMIT || nextZ < -BOUND_LIMIT || nextZ > BOUND_LIMIT
      if (collidesCombined || outOfBoundsCombined) {
        nextX = carPosition.current.x
        nextZ = carPosition.current.z
        speed.current = 0
      }

      // Set new position
      carPosition.current.set(nextX, carPosition.current.y, nextZ)

      // 4. Camera Follow Logic with Drag and Zoom Controls
      const now = performance.now()
      const idleTime = now - lastInputTime.current
      const isMovingFast = Math.abs(speed.current) > 0.5
      if (idleTime > 1500 && isMovingFast) {
        const angleNorm = Math.atan2(Math.sin(yawOffset.current), Math.cos(yawOffset.current))
        yawOffset.current = THREE.MathUtils.lerp(angleNorm, 0, 1.5 * dt)
        pitch.current = THREE.MathUtils.lerp(pitch.current, 0.45, 1.5 * dt)
      }

      const finalYaw = angle.current + Math.PI + yawOffset.current
      const dHorizontal = distance.current * Math.cos(pitch.current)
      const dVertical = distance.current * Math.sin(pitch.current)

      const targetCamX = carPosition.current.x + dHorizontal * Math.sin(finalYaw)
      const targetCamZ = carPosition.current.z + dHorizontal * Math.cos(finalYaw)
      const targetCamY = carPosition.current.y + dVertical

      let safeCamX = targetCamX
      let safeCamY = targetCamY
      let safeCamZ = targetCamZ

      const steps = 10
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const testX = THREE.MathUtils.lerp(carPosition.current.x, targetCamX, t)
        const testY = THREE.MathUtils.lerp(carPosition.current.y + 0.6, targetCamY, t)
        const testZ = THREE.MathUtils.lerp(carPosition.current.z, targetCamZ, t)

        if (checkCameraCollision(testX, testY, testZ)) {
          const safeT = Math.max(0.15, (i - 1) / steps)
          safeCamX = THREE.MathUtils.lerp(carPosition.current.x, targetCamX, safeT)
          safeCamY = THREE.MathUtils.lerp(carPosition.current.y + 0.6, targetCamY, safeT)
          safeCamZ = THREE.MathUtils.lerp(carPosition.current.z, targetCamZ, safeT)
          break
        }
      }

      state.camera.position.lerp(new THREE.Vector3(safeCamX, safeCamY, safeCamZ), 0.1)
      state.camera.lookAt(carPosition.current.x, carPosition.current.y + 0.6, carPosition.current.z)
    }

    // Update car mesh group position & rotation
    carRef.current.position.copy(carPosition.current)
    carRef.current.rotation.y = angle.current

    // 5. Wheel Rotation & Steering Animation
    const wheelRotAmt = (speed.current / 0.3) * dt // wheel angular roll
    if (rearLeftWheelRef.current) rearLeftWheelRef.current.rotation.x += wheelRotAmt
    if (rearRightWheelRef.current) rearRightWheelRef.current.rotation.x += wheelRotAmt

    // Front wheels roll and steer around Y
    let steeringYaw = 0
    if (keys.current.left) steeringYaw = 0.38
    if (keys.current.right) steeringYaw = -0.38

    if (frontLeftWheelRef.current) {
      frontLeftWheelRef.current.rotation.x += wheelRotAmt
      frontLeftWheelRef.current.rotation.y = steeringYaw
    }
    if (frontRightWheelRef.current) {
      frontRightWheelRef.current.rotation.x += wheelRotAmt
      frontRightWheelRef.current.rotation.y = steeringYaw
    }
  })

  // Headlight targets pointing forward in local coordinates (positive Z)
  const headlightTargetLeft = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(-0.25, 0, 10.0) // front left pointing forward
    return obj
  }, [])

  const headlightTargetRight = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0.25, 0, 10.0) // front right pointing forward
    return obj
  }, [])

  // Append headlight targets to group
  useEffect(() => {
    if (carRef.current) {
      carRef.current.add(headlightTargetLeft)
      carRef.current.add(headlightTargetRight)
    }
    return () => {
      if (carRef.current) {
        carRef.current.remove(headlightTargetLeft)
        carRef.current.remove(headlightTargetRight)
      }
    }
  }, [headlightTargetLeft, headlightTargetRight])

  return (
    <group ref={carRef}>
      {/* Low-Poly Car Chassis */}
      {/* Lower Body */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.22, 1.2]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.1} metalness={0.9} /> {/* Cyberpunk Red */}
      </mesh>

      {/* Cabin Roof */}
      <mesh position={[0, 0.28, -0.08]} castShadow>
        <boxGeometry args={[0.58, 0.2, 0.65]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.7} />
      </mesh>

      {/* Glass Windows */}
      <mesh position={[0, 0.26, 0.22]}>
        <boxGeometry args={[0.56, 0.14, 0.04]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} />
      </mesh>

      {/* Headlights */}
      <mesh position={[-0.23, 0.08, 0.6]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={isNight ? "#fef08a" : "#64748b"} />
      </mesh>
      <mesh position={[0.23, 0.08, 0.6]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={isNight ? "#fef08a" : "#64748b"} />
      </mesh>

      {/* Spotlights for headlights cast forward */}
      <spotLight
        position={[-0.23, 0.08, 0.6]}
        angle={Math.PI / 5}
        penumbra={0.5}
        intensity={isNight ? 3.5 : 0.0}
        distance={20}
        color="#fef08a"
        target={headlightTargetLeft}
      />
      <spotLight
        position={[0.23, 0.08, 0.6]}
        angle={Math.PI / 5}
        penumbra={0.5}
        intensity={isNight ? 3.5 : 0.0}
        distance={20}
        color="#fef08a"
        target={headlightTargetRight}
      />

      {/* Tail Lights */}
      <mesh position={[-0.23, 0.08, -0.6]}>
        <boxGeometry args={[0.08, 0.05, 0.02]} />
        <meshBasicMaterial color={isNight ? "#ef4444" : "#7f1d1d"} />
      </mesh>
      <mesh position={[0.23, 0.08, -0.6]}>
        <boxGeometry args={[0.08, 0.05, 0.02]} />
        <meshBasicMaterial color={isNight ? "#ef4444" : "#7f1d1d"} />
      </mesh>

      {/* Wheels */}
      {/* Rear Left */}
      <group ref={rearLeftWheelRef} position={[-0.37, 0.0, -0.38]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>
      {/* Rear Right */}
      <group ref={rearRightWheelRef} position={[0.37, 0.0, -0.38]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>
      {/* Front Left */}
      <group ref={frontLeftWheelRef} position={[-0.37, 0.0, 0.38]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>
      {/* Front Right */}
      <group ref={frontRightWheelRef} position={[0.37, 0.0, 0.38]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>

      {/* Mobile Joystick & Controls Overlay */}
      {isMobile && isActive && (
        <Html fullscreen pointerEvents="none">
          <div className="absolute inset-0 select-none pointer-events-none font-sans z-50">
            {/* Joystick (Bottom Left) */}
            <div className="absolute bottom-8 left-8 w-32 h-32 flex items-center justify-center pointer-events-auto">
              <div
                ref={joystickZoneRef}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                className="w-24 h-24 rounded-full bg-slate-900/60 border-2 border-indigo-500/30 backdrop-blur-md flex items-center justify-center shadow-xl active:border-indigo-400/50 transition-colors"
                style={{ touchAction: 'none' }}
              >
                <div
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 border border-white/20 shadow-md"
                  style={{
                    transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                    transition: joystickPos.transition,
                    touchAction: 'none'
                  }}
                />
              </div>
            </div>

            {/* Brake Button (Bottom Right) */}
            <div className="absolute bottom-10 right-10 pointer-events-auto">
              <button
                onTouchStart={handleBrakeStart}
                onTouchEnd={handleBrakeEnd}
                className="w-20 h-20 rounded-full bg-pink-600/30 active:bg-pink-600/60 border-2 border-pink-500/40 active:border-pink-400 backdrop-blur-md text-white font-bold text-[11px] shadow-lg flex items-center justify-center uppercase tracking-wider select-none cursor-pointer"
                style={{ touchAction: 'none' }}
              >
                Brake
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
