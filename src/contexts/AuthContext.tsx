import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Location, AuthState } from '../types'
import { blink } from '../blink/client'

interface AuthContextType extends AuthState {
  login: (employeeId: string, pin: string) => Promise<boolean>
  logout: () => void
  setCurrentLocation: (location: Location | null) => void
  locations: Location[]
  refreshLocations: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const setCurrentLocation = (location: Location | null) => {
    setCurrentLocationState(location)
  }

  const refreshLocations = async () => {
    try {
      const result = await blink.db.locations.list({
        where: { isActive: "1" },
        orderBy: { name: 'asc' }
      })
      setLocations(result)
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const login = async (employeeId: string, pin: string): Promise<boolean> => {
    try {
      const users = await blink.db.users.list({
        where: { 
          employeeId: employeeId,
          pin: pin,
          isActive: "1"
        }
      })

      if (users.length === 1) {
        const authenticatedUser = users[0] as User
        setUser(authenticatedUser)
        setIsAuthenticated(true)
        
        // If user has a specific location, set it as current
        if (authenticatedUser.locationId) {
          const userLocation = locations.find(loc => loc.id === authenticatedUser.locationId)
          if (userLocation) {
            setCurrentLocation(userLocation)
          }
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setCurrentLocation(null)
    setIsAuthenticated(false)
  }

  useEffect(() => {
    refreshLocations()
  }, [])

  const value: AuthContextType = {
    user,
    currentLocation,
    isAuthenticated,
    locations,
    login,
    logout,
    setCurrentLocation,
    refreshLocations
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }