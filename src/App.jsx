import { useState } from 'react'
import Landing from './pages/Landing'
import AppShell from './AppShell'

export default function App() {
  const [view, setView] = useState('landing')

  if (view === 'app') return <AppShell />
  return <Landing onStart={() => setView('app')} />
}
