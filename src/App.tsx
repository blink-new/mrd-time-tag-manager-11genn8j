import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { PinPadLogin } from './components/PinPadLogin'
import { LocationSelector } from './components/LocationSelector'
import { Dashboard } from './components/Dashboard'
import { Toaster } from './components/ui/toaster'
import './App.css'

const AppContent: React.FC = () => {
  const { isAuthenticated, currentLocation } = useAuth()

  if (!isAuthenticated) {
    return <PinPadLogin />
  }

  if (!currentLocation) {
    return <LocationSelector />
  }

  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  )
}

export default App