import { useState } from 'react'
import { Home } from './pages/Home'
import { CityScene } from './game/CityScene'
import type { GithubUserData } from './services/github'

function App() {
  const [username, setUsername] = useState<string | null>(null)
  const [userData, setUserData] = useState<GithubUserData | null>(null)

  const handleGenerate = (name: string, data: GithubUserData) => {
    setUsername(name)
    setUserData(data)
    console.log('Generating city for:', name, data)
  }

  return (
    <>
      {username && userData ? (
        <CityScene
          userData={userData}
          onBack={() => {
            setUsername(null)
            setUserData(null)
          }}
        />
      ) : (
        <Home onGenerate={handleGenerate} />
      )}
    </>
  )
}

export default App
