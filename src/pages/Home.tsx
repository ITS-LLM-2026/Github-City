import React, { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Play, AlertCircle, Database, Trophy, TrendingUp } from 'lucide-react'
import * as THREE from 'three'
import { fetchGithubData } from '../services/github'
import type { GithubUserData } from '../services/github'

// Custom GitHub SVG Icon to avoid package dependency resolution differences
const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

// 3D Background Component using React Three Fiber
function BackgroundCity() {
  const groupRef = useRef<THREE.Group>(null)

  // Slowly rotate the city grid in the background
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.03
    }
  })

  // Generate a random procedural city grid for background ambiance
  const buildings = useMemo(() => {
    const items = []
    const gridSize = 10
    const spacing = 2.5
    for (let x = -gridSize / 2; x < gridSize / 2; x++) {
      for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        // Leave some open spaces for streets/natural look
        if (Math.random() > 0.45) {
          const height = Math.random() * 5 + 1.5
          items.push({
            id: `${x}-${z}`,
            position: [x * spacing, height / 2 - 3, z * spacing] as [number, number, number],
            args: [1.2, height, 1.2] as [number, number, number],
            color: Math.random() > 0.5 ? '#6366f1' : '#a855f7', // Indigo or Purple
          })
        }
      }
    }
    return items
  }, [])

  return (
    <group ref={groupRef}>
      {buildings.map((b) => (
        <mesh key={b.id} position={b.position}>
          <boxGeometry args={b.args} />
          <meshStandardMaterial
            color={b.color}
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
      ))}
      <gridHelper args={[40, 40, '#4f46e5', '#0f172a']} position={[0, -3, 0]} />
    </group>
  )
}

interface HomeProps {
  onGenerate: (username: string, data: GithubUserData) => void
}

export const Home: React.FC<HomeProps> = ({ onGenerate }) => {
  const [username, setUsername] = useState('')
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('real')
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [githubData, setGithubData] = useState<GithubUserData | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setGithubData(null)

    // Clean username input
    const cleanedUsername = username.trim()

    if (dataSource === 'real') {
      if (!cleanedUsername) {
        setError('GitHub username is required.')
        return
      }

      // GitHub username validation rules
      const githubUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
      if (!githubUsernameRegex.test(cleanedUsername)) {
        setError('Please enter a valid GitHub username.')
        return
      }
    }

    const finalUsername = cleanedUsername || 'DemoUser'

    setIsGenerating(true)
    
    try {
      const data = await fetchGithubData(finalUsername, dataSource)
      setGithubData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contribution data.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Filter coordinate grid items based on active days toggle
  const filteredGrid = useMemo(() => {
    if (!githubData) return []
    if (showActiveOnly) {
      return githubData.grid.filter((cell) => cell.commits > 0)
    }
    return githubData.grid
  }, [githubData, showActiveOnly])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-white flex items-center justify-center font-sans">
      {/* Three.js Background Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 6, 15], fov: 55 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 15, 10]} intensity={1.5} />
          <BackgroundCity />
        </Canvas>
        {/* Vignette & Ambient Glow */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
      </div>

      {/* Main Overlay UI */}
      <div className="relative z-10 w-full max-h-screen overflow-y-auto py-8 flex justify-center">
        <div className={`w-full ${githubData ? 'max-w-3xl' : 'max-w-lg'} px-6 transition-all duration-500`}>
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center">
            
            {/* Logo & Header */}
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 mb-6 shadow-lg shadow-indigo-500/30">
              <GithubIcon className="w-8 h-8 text-white" />
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 blur opacity-30 -z-10 animate-pulse" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-md">
              GitHub City
            </h1>

            <p className="text-sm md:text-base text-slate-400 text-center mb-8 max-w-sm leading-relaxed">
              Enter a GitHub username to procedurally generate and explore a custom 3D city built from code contribution history.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              {/* Data Source Selection */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
                  Data Source
                </span>
                <div className="flex gap-6 px-1">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-300 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="dataSource"
                      value="real"
                      checked={dataSource === 'real'}
                      onChange={() => {
                        setDataSource('real')
                        if (error) setError(null)
                      }}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    <span>Real GitHub Data</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-300 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="dataSource"
                      value="demo"
                      checked={dataSource === 'demo'}
                      onChange={() => {
                        setDataSource('demo')
                        if (error) setError(null)
                      }}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    <span>Demo Data</span>
                  </label>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">
                  GitHub Username {dataSource === 'demo' && <span className="text-[10px] text-slate-500 lowercase font-normal italic">(optional)</span>}
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder={dataSource === 'demo' ? 'e.g. demouser (optional)' : 'e.g. torvalds'}
                    disabled={isGenerating}
                    className="w-full h-12 pl-11 pr-4 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 font-medium text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <GithubIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-950/40 border border-red-900/50 p-3 rounded-xl animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="relative w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed overflow-hidden group"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Fetching Data...</span>
                  </div>
                ) : (
                  <>
                    <span>{githubData ? 'Refresh Data' : 'Fetch & Generate Data'}</span>
                    <Play className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Dashboard & Table Section (Renders when githubData is loaded) */}
            {githubData && (
              <div className="w-full mt-8 pt-8 border-t border-slate-800 space-y-6 animate-fade-in">
                {/* Status indicator */}
                <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs font-semibold">
                  <span className="text-slate-400">Data Source:</span>
                  {githubData.isMock ? (
                    <span className="text-amber-400 flex items-center gap-1.5 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      Using Demo Data
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Using Real GitHub Data
                    </span>
                  )}
                </div>

                {/* Stats Dashboard Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Commits */}
                  <div className="bg-slate-950/30 border border-slate-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Database className="w-5 h-5 text-indigo-400 mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Commits</span>
                    <span className="text-2xl font-black mt-1 text-white">{githubData.totalContributions}</span>
                  </div>
                  {/* Current Streak */}
                  <div className="bg-slate-950/30 border border-slate-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400 mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Streak</span>
                    <span className="text-2xl font-black mt-1 text-white">
                      {githubData.currentStreak} <span className="text-xs font-normal text-slate-400">days</span>
                    </span>
                  </div>
                  {/* Longest Streak */}
                  <div className="bg-slate-950/30 border border-slate-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Trophy className="w-5 h-5 text-amber-400 mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Longest Streak</span>
                    <span className="text-2xl font-black mt-1 text-white">
                      {githubData.longestStreak} <span className="text-xs font-normal text-slate-400">days</span>
                    </span>
                  </div>
                </div>

                {/* Raw Coordinate Data Table */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-bold tracking-wide text-slate-300">
                      Converted Contribution Coordinates
                    </h3>
                    {/* Toggle Button */}
                    <button
                      onClick={() => setShowActiveOnly(!showActiveOnly)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
                    >
                      {showActiveOnly ? 'Show All Days' : 'Show Active Days Only'}
                    </button>
                  </div>

                  <div className="w-full max-h-60 overflow-y-auto border border-slate-800 bg-slate-950/60 rounded-xl scrollbar-thin scrollbar-thumb-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2 text-center">Week (X)</th>
                          <th className="px-4 py-2 text-center">Day (Z)</th>
                          <th className="px-4 py-2 text-right">Commits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 font-medium text-slate-300">
                        {filteredGrid.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                              No active contribution coordinates found in this period.
                            </td>
                          </tr>
                        ) : (
                          filteredGrid.map((cell) => (
                            <tr
                              key={cell.date}
                              className={`hover:bg-slate-800/30 transition-colors ${
                                cell.commits > 0 ? 'bg-emerald-950/10 text-emerald-400 font-semibold' : ''
                              }`}
                            >
                              <td className="px-4 py-2.5 font-mono">{cell.date}</td>
                              <td className="px-4 py-2.5 text-center font-mono">{cell.x}</td>
                              <td className="px-4 py-2.5 text-center font-mono">{cell.z}</td>
                              <td className="px-4 py-2.5 text-right font-mono pr-6">
                                {cell.commits > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    {cell.commits}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 pr-1">
                    Showing {filteredGrid.length} of {githubData.grid.length} coordinates
                  </div>
                </div>

                {/* Primary Proceed Button */}
                <button
                  onClick={() => onGenerate(githubData.username, githubData)}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:shadow-emerald-500/30 active:scale-[0.98] mt-4"
                >
                  <span>Generate & Enter 3D City</span>
                  <Play className="w-4 h-4 fill-white" />
                </button>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-8 text-xs text-slate-500 flex items-center gap-1">
              <span>Powered by Three.js & React Three Fiber</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
