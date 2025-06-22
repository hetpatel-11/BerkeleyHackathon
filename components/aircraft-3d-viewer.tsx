'use client'

import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'

interface SubsystemPrediction {
  subsystem: string
  rul: number
  risk_level: 'safe' | 'warning' | 'danger'
  status: string
  failure_probability?: number
  cycle?: number
  sensor_data?: any
}

interface AircraftViewerProps {
  alertLevel: 'safe' | 'warning' | 'danger'
  isSimulating: boolean
  currentSpeed: number
  simulationTime: number
  rulValue?: number
  subsystemPredictions?: SubsystemPrediction[]
}

// Engine glow effect component
function EngineGlow({ position, alertLevel, isSimulating, rulValue }: { 
  position: [number, number, number], 
  alertLevel: 'safe' | 'warning' | 'danger',
  isSimulating: boolean,
  rulValue?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && isSimulating && alertLevel !== 'safe') {
      // Pulsing animation for warnings/danger
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.7
      meshRef.current.scale.setScalar(pulse)
    }
  })

  // Only show engine glow when:
  // 1. Simulation is running
  // 2. Alert level indicates risk (warning or danger)
  if (!isSimulating || alertLevel === 'safe') {
    return null // No glow when safe or not simulating
  }

  // Adjust glow size and intensity based on alert level - make more visible
  const glowSize = alertLevel === 'danger' ? 0.8 : 0.6
  const glowOpacity = alertLevel === 'danger' ? 0.9 : 0.7
  const glowColor = alertLevel === 'danger' ? '#ff0000' : '#ff8800'

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[glowSize, 16, 16]} />
      <meshBasicMaterial 
        color={glowColor} 
        transparent 
        opacity={glowOpacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Subsystem glow component for non-engine systems
function SubsystemGlow({ position, subsystem, isSimulating, subsystemPredictions }: {
  position: [number, number, number],
  subsystem: string,
  isSimulating: boolean,
  subsystemPredictions?: SubsystemPrediction[]
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Find the prediction for this subsystem
  const prediction = subsystemPredictions?.find(p => p.subsystem === subsystem)
  
  // Debug logging
  useEffect(() => {
    if (isSimulating && subsystemPredictions) {
      console.log(`3D Glow ${subsystem}:`, prediction ? `RUL=${prediction.rul} risk=${prediction.risk_level}` : 'No prediction')
    }
  }, [subsystem, prediction, isSimulating, subsystemPredictions])
  
  useFrame((state) => {
    if (meshRef.current && isSimulating && prediction && prediction.risk_level !== 'safe') {
      // Pulsing animation for warnings/danger
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.8
      meshRef.current.scale.setScalar(pulse)
    }
  })

  // Show glow when simulation is running and there's a risk
  // For debugging: also show a small indicator when simulation is running even if safe
  if (!isSimulating) {
    return null
  }
  
  // If no prediction data or safe, show a small debug indicator
  if (!prediction || prediction.risk_level === 'safe') {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial 
          color="#00ff00" 
          transparent 
          opacity={0.3}
          wireframe
        />
      </mesh>
    )
  }

  // Adjust glow based on risk level - make more visible
  const glowSize = prediction.risk_level === 'danger' ? 0.8 : 0.6
  const glowOpacity = prediction.risk_level === 'danger' ? 0.9 : 0.7
  const glowColor = prediction.risk_level === 'danger' ? '#ff0000' : '#ff8800'

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[glowSize, 16, 16]} />
      <meshBasicMaterial 
        color={glowColor} 
        transparent 
        opacity={glowOpacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Aircraft model component
function AircraftModel({ alertLevel, isSimulating, currentSpeed, rulValue, subsystemPredictions }: {
  alertLevel: 'safe' | 'warning' | 'danger',
  isSimulating: boolean,
  currentSpeed: number,
  rulValue?: number,
  subsystemPredictions?: SubsystemPrediction[]
}) {
  const modelRef = useRef<THREE.Group>(null)
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [aircraftParts, setAircraftParts] = useState<{[key: string]: THREE.Mesh[]}>({})
  
  // Load the OBJ model and identify parts
  useEffect(() => {
    const loader = new OBJLoader()
    loader.load(
      '/3d-model.obj',
      (object) => {
        // Scale and position the model for optimal flight operator view
        object.scale.setScalar(0.03)  // Slightly larger for better visibility
        // Fix orientation - try different rotation to get aircraft horizontal
        object.rotation.x = 0
        object.rotation.y = 0  // Start with no rotation
        object.rotation.z = 0
        object.position.set(0, 1, 0)  // Raise aircraft slightly above ground
        
        // Identify and categorize aircraft parts
        const parts: {[key: string]: THREE.Mesh[]} = {
          engines: [],
          fuselage: [],
          wings: [],
          tail: [],
          landing_gear: []
        }
        
        // Apply materials and categorize parts
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Create base material
            child.material = new THREE.MeshStandardMaterial({
              color: '#e0e0e0',
              metalness: 0.7,
              roughness: 0.3,
            })
            child.castShadow = true
            child.receiveShadow = true
            
            // Categorize parts based on position (rough approximation)
            const pos = child.position
            if (pos.x > 1.5 || pos.x < -1.5) {
              parts.engines.push(child) // Side-mounted engines
            } else if (pos.z < -1) {
              parts.tail.push(child) // Tail section
            } else if (pos.y < 0) {
              parts.landing_gear.push(child) // Bottom parts
            } else if (Math.abs(pos.x) > 0.5) {
              parts.wings.push(child) // Wing sections
            } else {
              parts.fuselage.push(child) // Main body
            }
          }
        })
        
        console.log('Aircraft parts categorized:', {
          engines: parts.engines.length,
          fuselage: parts.fuselage.length,
          wings: parts.wings.length,
          tail: parts.tail.length,
          landing_gear: parts.landing_gear.length
        })
        
        setAircraftParts(parts)
        setModel(object)
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
      },
      (error) => {
        console.error('Error loading model:', error)
        // Create fallback geometry if model fails to load
        const fallbackGeometry = new THREE.BoxGeometry(4, 0.5, 1)
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: '#cccccc' })
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial)
        const fallbackGroup = new THREE.Group()
        fallbackGroup.add(fallbackMesh)
        setModel(fallbackGroup)
      }
    )
  }, [])

  // Update aircraft part colors based on subsystem alerts
  useEffect(() => {
    if (!isSimulating || !aircraftParts || Object.keys(aircraftParts).length === 0) {
      // Reset all parts to normal color when not simulating
      Object.values(aircraftParts).flat().forEach(part => {
        if (part.material instanceof THREE.MeshStandardMaterial) {
          part.material.color.setHex(0xe0e0e0)
          part.material.emissive.setHex(0x000000)
        }
      })
      return
    }

    // Apply colors based on subsystem alerts
    subsystemPredictions?.forEach(prediction => {
      let targetParts: THREE.Mesh[] = []
      
      // Map subsystems to aircraft parts
      switch (prediction.subsystem) {
        case 'hydraulic':
          targetParts = [...aircraftParts.landing_gear, ...aircraftParts.wings] // Hydraulics control landing gear and control surfaces
          break
        case 'electrical':
          targetParts = [...aircraftParts.tail, ...aircraftParts.fuselage] // Electrical systems in tail and fuselage
          break
        case 'control_surface':
          targetParts = aircraftParts.wings // Control surfaces on wings
          break
        case 'cabin':
          targetParts = aircraftParts.fuselage // Cabin pressure in main fuselage
          break
        case 'altimeter':
          targetParts = aircraftParts.fuselage.slice(0, 2) // Cockpit area (front fuselage parts)
          break
        default:
          return
      }

      // Always log highlighting for debugging
      console.log(`🎨 3D Highlighting ${prediction.subsystem}: RUL=${prediction.rul}, risk=${prediction.risk_level}, parts=${targetParts.length}`)

      // Apply warning/danger colors to the parts with enhanced visibility
      targetParts.forEach(part => {
        if (part.material instanceof THREE.MeshStandardMaterial) {
          if (prediction.risk_level === 'danger') {
            part.material.color.setHex(0xff0000) // Bright red
            part.material.emissive.setHex(0x660000) // Stronger red glow
            part.material.emissiveIntensity = 0.3 // Add emissive intensity
          } else if (prediction.risk_level === 'warning') {
            part.material.color.setHex(0xff8800) // Bright orange
            part.material.emissive.setHex(0x663300) // Stronger orange glow
            part.material.emissiveIntensity = 0.2 // Add emissive intensity
          } else {
            part.material.color.setHex(0xe0e0e0) // Normal gray
            part.material.emissive.setHex(0x000000) // No glow
            part.material.emissiveIntensity = 0 // Reset intensity
          }
        }
      })
    })

    // Handle engine alerts separately with enhanced visibility
    console.log(`🎨 3D Engine highlighting: alertLevel=${alertLevel}, engines=${aircraftParts.engines?.length || 0}`)
    
    if (alertLevel !== 'safe') {
      aircraftParts.engines?.forEach(engine => {
        if (engine.material instanceof THREE.MeshStandardMaterial) {
          if (alertLevel === 'danger') {
            engine.material.color.setHex(0xff0000) // Bright red
            engine.material.emissive.setHex(0x660000) // Stronger red glow
            engine.material.emissiveIntensity = 0.4 // Strong emissive intensity
          } else if (alertLevel === 'warning') {
            engine.material.color.setHex(0xff8800) // Orange
            engine.material.emissive.setHex(0x663300) // Stronger orange glow
            engine.material.emissiveIntensity = 0.3 // Moderate emissive intensity
          }
        }
      })
    } else {
      // Reset engine colors when safe
      aircraftParts.engines?.forEach(engine => {
        if (engine.material instanceof THREE.MeshStandardMaterial) {
          engine.material.color.setHex(0xe0e0e0)
          engine.material.emissive.setHex(0x000000)
          engine.material.emissiveIntensity = 0
        }
      })
    }
  }, [isSimulating, subsystemPredictions, alertLevel, aircraftParts])

  // Keep aircraft stable - no unnecessary movement
  useFrame(() => {
    if (modelRef.current) {
      // Ensure aircraft stays in proper position
      modelRef.current.position.set(0, 1, 0)
      modelRef.current.rotation.x = 0
      modelRef.current.rotation.y = 0
      modelRef.current.rotation.z = 0
    }
  })

  return (
    <group ref={modelRef}>
      {model && <primitive object={model} />}
      
      {/* Debug info - can be removed later */}
      {isSimulating && subsystemPredictions && subsystemPredictions.length > 0 && (
        <mesh position={[4, 2, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
    </group>
  )
}

// Flight operator camera setup - Fixed position for professional view
function FlightOperatorCamera() {
  return (
    <PerspectiveCamera
      makeDefault
      position={[25, 12, 25]}  // Much further back for full aircraft view
      fov={50}                 // Wider field of view for better overview
    />
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading Aircraft Model...</p>
      </div>
    </div>
  )
}

export function Aircraft3DViewer({ 
  alertLevel, 
  isSimulating, 
  currentSpeed, 
  simulationTime,
  rulValue,
  subsystemPredictions 
}: AircraftViewerProps) {
  // Debug log to see what subsystem data we're receiving
  useEffect(() => {
    if (isSimulating && subsystemPredictions && subsystemPredictions.length > 0) {
      console.log('3D Viewer received subsystem predictions:', subsystemPredictions)
    }
  }, [isSimulating, subsystemPredictions])
  return (
    <div className="w-full h-64 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden border border-gray-200">
      <Canvas 
        shadows 
        gl={{ 
          antialias: true, 
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <Suspense fallback={null}>
          {/* Professional hangar lighting setup */}
          <ambientLight intensity={0.6} color="#f8fafc" />
          
          {/* Main overhead lighting */}
          <directionalLight
            position={[0, 20, 0]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          
          {/* Side lighting for professional visibility */}
          <pointLight position={[15, 8, 15]} intensity={0.4} color="#ffffff" />
          <pointLight position={[-15, 8, -15]} intensity={0.4} color="#ffffff" />
          
          {/* Environment for professional aircraft hangar */}
          <Environment preset="warehouse" />
          
          {/* Flight operator camera */}
          <FlightOperatorCamera />
          
          {/* Aircraft model with engine vulnerability visualization */}
                    <AircraftModel
            alertLevel={alertLevel}
            isSimulating={isSimulating}
            currentSpeed={currentSpeed}
            rulValue={rulValue}
            subsystemPredictions={subsystemPredictions}
          />
          
          {/* Camera controls - always enabled for flight operator interaction */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={15}
            maxDistance={40}
            target={[0, 0, 0]}
          />
          
          {/* Professional grid floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial 
              color="#f8fafc" 
              transparent 
              opacity={0.8}
              roughness={0.1}
              metalness={0.1}
            />
          </mesh>
          
          {/* Grid lines for professional hangar look */}
          <gridHelper 
            args={[30, 30, '#e2e8f0', '#f1f5f9']} 
            position={[0, -2.9, 0]} 
          />
        </Suspense>
      </Canvas>
      
      {/* Flight operator overlay information */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
        <div>Aircraft: Commercial Jet</div>
        <div>View: Flight Operator</div>
        {isSimulating && (
          <>
            <div>Time: {simulationTime}s</div>
            <div>Speed: {currentSpeed.toFixed(0)} kts</div>
            {rulValue && <div>RUL: {rulValue.toFixed(0)} cycles</div>}
          </>
        )}
      </div>
      
      {/* Engine status indicator */}
      {isSimulating && alertLevel !== 'safe' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <div className={`font-bold ${alertLevel === 'danger' ? 'text-red-400' : 'text-yellow-400'}`}>
            ⚠️ ENGINE ALERT
          </div>
          <div>Status: {alertLevel.toUpperCase()}</div>
          {rulValue && <div>RUL: {rulValue.toFixed(0)} cycles</div>}
        </div>
      )}
    </div>
  )
} 