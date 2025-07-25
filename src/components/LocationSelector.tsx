import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { MapPin, Users, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Location } from '../types'

export const LocationSelector: React.FC = () => {
  const { user, locations, setCurrentLocation, logout } = useAuth()

  const handleLocationSelect = (location: Location) => {
    setCurrentLocation(location)
  }

  const canAccessLocation = (location: Location) => {
    if (user?.role === 'admin') return true
    if (user?.role === 'manager') return true
    return user?.locationId === location.id
  }

  const filteredLocations = locations.filter(canAccessLocation)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Select Location</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.name}! Choose a location to continue.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              {user?.role === 'admin' ? 'Administrator' : 
               user?.role === 'manager' ? 'Manager' : 'Kitchen Staff'}
            </Badge>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((location) => (
            <Card 
              key={location.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300"
              onClick={() => handleLocationSelect(location)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    {location.name}
                  </CardTitle>
                  {user?.locationId === location.id && (
                    <Badge variant="default">Your Location</Badge>
                  )}
                </div>
                <CardDescription>{location.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Active Staff: 3</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Active Tags: 12</span>
                  </div>
                  {location.phone && (
                    <div className="text-sm text-gray-600">
                      📞 {location.phone}
                    </div>
                  )}
                </div>
                <Button className="w-full mt-4">
                  Select Location
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLocations.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Locations Available</h3>
              <p className="text-gray-600">
                You don't have access to any locations. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}