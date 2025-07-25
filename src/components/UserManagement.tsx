import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Shield, User, Users } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Checkbox } from './ui/checkbox'
import { blink } from '../blink/client'
import { User as UserType, Location } from '../types'

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [userLocations, setUserLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [formData, setFormData] = useState({
    employeeId: '',
    pin: '',
    name: '',
    email: '',
    role: 'kitchen' as 'admin' | 'manager' | 'kitchen',
    isActive: true,
    selectedLocations: [] as string[]
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersResult, locationsResult, userLocationsResult] = await Promise.all([
        blink.db.users.list({ orderBy: { name: 'asc' } }),
        blink.db.locations.list({ orderBy: { name: 'asc' } }),
        blink.db.userLocations.list()
      ])
      setUsers(usersResult)
      setLocations(locationsResult)
      setUserLocations(userLocationsResult)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.employeeId.includes(searchTerm)
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getUserLocations = (userId: string) => {
    const userLocationIds = userLocations
      .filter(ul => ul.userId === userId)
      .map(ul => ul.locationId)
    return locations.filter(loc => userLocationIds.includes(loc.id))
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      pin: '',
      name: '',
      email: '',
      role: 'kitchen',
      isActive: true,
      selectedLocations: []
    })
    setEditingUser(null)
  }

  const handleEdit = (user: UserType) => {
    setEditingUser(user)
    const userLocs = getUserLocations(user.id)
    setFormData({
      employeeId: user.employeeId,
      pin: user.pin,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: Number(user.isActive) > 0,
      selectedLocations: userLocs.map(loc => loc.id)
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const userData = {
        employeeId: formData.employeeId,
        pin: formData.pin,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive ? "1" : "0"
      }

      let userId: string

      if (editingUser) {
        await blink.db.users.update(editingUser.id, userData)
        userId = editingUser.id
        
        // Remove existing location assignments
        const existingAssignments = userLocations.filter(ul => ul.userId === userId)
        for (const assignment of existingAssignments) {
          await blink.db.userLocations.delete(assignment.id)
        }
      } else {
        userId = `user_${Date.now()}`
        await blink.db.users.create({
          id: userId,
          ...userData
        })
      }

      // Add new location assignments
      for (const locationId of formData.selectedLocations) {
        await blink.db.userLocations.create({
          id: `ul_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          locationId
        })
      }

      await loadData()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      // Remove location assignments first
      const assignments = userLocations.filter(ul => ul.userId === userId)
      for (const assignment of assignments) {
        await blink.db.userLocations.delete(assignment.id)
      }
      
      // Then delete the user
      await blink.db.users.delete(userId)
      await loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />
      case 'manager':
        return <Users className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'manager':
        return 'default'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="4-digit ID"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="4-digit PIN"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'manager' | 'kitchen') => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full Access</SelectItem>
                    <SelectItem value="manager">Manager - Multi-Location</SelectItem>
                    <SelectItem value="kitchen">Kitchen Staff - Single Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Location Access</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-3">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={location.id}
                        checked={formData.selectedLocations.includes(location.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedLocations: [...formData.selectedLocations, location.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selectedLocations: formData.selectedLocations.filter(id => id !== location.id)
                            })
                          }
                        }}
                      />
                      <Label htmlFor={location.id} className="text-sm">
                        {location.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="active">Active User</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="kitchen">Kitchen Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const userLocs = getUserLocations(user.id)
          return (
            <Card key={user.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <div className="text-sm text-gray-500 mt-1">
                      ID: {user.employeeId} | {user.email}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role}
                    </Badge>
                    {Number(user.isActive) === 0 && (
                      <Badge variant="destructive" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Location Access ({userLocs.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {userLocs.length > 0 ? (
                        userLocs.map((location) => (
                          <Badge key={location.id} variant="outline" className="text-xs">
                            {location.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No locations assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
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
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{user.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(user.id)}
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
          )
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No users found</div>
        </div>
      )}
    </div>
  )
}

export default UserManagement