import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, MapPin, Phone, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { blink } from '../blink/client'
import { Location } from '../types'

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    managerName: '',
    managerEmail: '',
    operatingHours: '',
    timezone: '',
    isActive: true
  })

  const loadLocations = async () => {
    try {
      setLoading(true)
      const result = await blink.db.locations.list({
        orderBy: { name: 'asc' }
      })
      setLocations(result)
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [])

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.managerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      managerName: '',
      managerEmail: '',
      operatingHours: '',
      timezone: '',
      isActive: true
    })
    setEditingLocation(null)
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address || '',
      phone: location.phone || '',
      managerName: location.managerName || '',
      managerEmail: location.managerEmail || '',
      operatingHours: location.operatingHours || '',
      timezone: location.timezone || '',
      isActive: Number(location.isActive) > 0
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const locationData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        managerName: formData.managerName,
        managerEmail: formData.managerEmail,
        operatingHours: formData.operatingHours,
        timezone: formData.timezone,
        isActive: formData.isActive ? "1" : "0"
      }

      if (editingLocation) {
        await blink.db.locations.update(editingLocation.id, locationData)
      } else {
        await blink.db.locations.create({
          id: `loc_${Date.now()}`,
          ...locationData
        })
      }

      await loadLocations()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving location:', error)
    }
  }

  const handleDelete = async (locationId: string) => {
    try {
      await blink.db.locations.delete(locationId)
      await loadLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading locations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Location Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter location name"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    placeholder="America/New_York"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="managerName">Manager Name</Label>
                  <Input
                    id="managerName"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="Enter manager name"
                  />
                </div>
                <div>
                  <Label htmlFor="managerEmail">Manager Email</Label>
                  <Input
                    id="managerEmail"
                    type="email"
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                    placeholder="manager@restaurant.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="operatingHours">Operating Hours</Label>
                <Input
                  id="operatingHours"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                  placeholder="Mon-Sun: 6:00 AM - 10:00 PM"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="active">Active Location</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Location
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((location) => (
          <Card key={location.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                  {Number(location.isActive) === 0 && (
                    <Badge variant="destructive" className="text-xs mt-1">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {location.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{location.address}</span>
                  </div>
                )}

                {location.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {location.phone}
                  </div>
                )}

                {location.operatingHours && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {location.operatingHours}
                  </div>
                )}

                {location.managerName && (
                  <div className="text-sm">
                    <strong>Manager:</strong> {location.managerName}
                    {location.managerEmail && (
                      <div className="text-gray-600">{location.managerEmail}</div>
                    )}
                  </div>
                )}

                {location.timezone && (
                  <div className="text-sm text-gray-600">
                    <strong>Timezone:</strong> {location.timezone}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(location)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Location</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{location.name}"? This action cannot be undone and will affect all associated users and tags.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(location.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No locations found</div>
        </div>
      )}
    </div>
  )
}

export default LocationManagement