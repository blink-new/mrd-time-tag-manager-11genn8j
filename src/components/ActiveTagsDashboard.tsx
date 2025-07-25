import React, { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { MRDTag, Location, Product } from '../types'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Clock, Search, Filter, Printer, AlertTriangle, CheckCircle, XCircle, Tags } from 'lucide-react'
import { toast } from '../hooks/use-toast'
import { format, differenceInMinutes, isAfter, isBefore } from 'date-fns'

export default function ActiveTagsDashboard() {
  const { user, selectedLocation } = useAuth()
  const [tags, setTags] = useState<MRDTag[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>(selectedLocation?.id || 'all')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load active tags
      let tagsData = await blink.db.mrdTags.list({
        where: { status: 'active' },
        orderBy: { discardTime: 'asc' }
      })

      // Filter based on user role and location access
      if (user?.role === 'kitchen' && selectedLocation) {
        tagsData = tagsData.filter(tag => tag.locationId === selectedLocation.id)
      }

      setTags(tagsData)

      // Load locations based on user access
      let locationsData: Location[] = []
      if (user?.role === 'admin') {
        locationsData = await blink.db.locations.list({
          orderBy: { name: 'asc' }
        })
      } else if (selectedLocation) {
        locationsData = [selectedLocation]
      }

      setLocations(locationsData)

      // Load products (not excluded from dashboard)
      const productsData = await blink.db.products.list({
        where: { isExcludedFromDashboard: "0" },
        orderBy: { name: 'asc' }
      })
      setProducts(productsData)

    } catch (error) {
      console.error('Error loading active tags data:', error)
      toast({
        title: "Error",
        description: "Failed to load active tags",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [user, selectedLocation])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getTagStatus = (tag: MRDTag) => {
    const now = new Date()
    const discardTime = new Date(tag.discardTime)
    const readyTime = new Date(tag.readyTime)
    const minutesToDiscard = differenceInMinutes(discardTime, now)

    if (isAfter(now, discardTime)) {
      return { status: 'expired', label: 'EXPIRED', color: 'destructive' }
    } else if (minutesToDiscard <= 30) {
      return { status: 'expiring', label: 'EXPIRING SOON', color: 'secondary' }
    } else if (isBefore(now, readyTime)) {
      return { status: 'preparing', label: 'PREPARING', color: 'outline' }
    } else {
      return { status: 'ready', label: 'READY', color: 'default' }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <XCircle className="h-4 w-4" />
      case 'expiring':
        return <AlertTriangle className="h-4 w-4" />
      case 'ready':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const tagStatus = getTagStatus(tag)
    const matchesStatus = statusFilter === 'all' || tagStatus.status === statusFilter
    
    const matchesLocation = locationFilter === 'all' || tag.locationId === locationFilter

    return matchesSearch && matchesStatus && matchesLocation
  })

  const getStatusCounts = () => {
    const counts = {
      total: tags.length,
      ready: 0,
      preparing: 0,
      expiring: 0,
      expired: 0
    }

    tags.forEach(tag => {
      const status = getTagStatus(tag)
      counts[status.status as keyof typeof counts]++
    })

    return counts
  }

  const statusCounts = getStatusCounts()

  const handlePrintTag = (tag: MRDTag) => {
    // TODO: Implement print functionality
    console.log('Printing tag:', tag)
    toast({
      title: "Print",
      description: "Print functionality will be implemented soon"
    })
  }

  const handleDiscardTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to discard this tag?')) return

    try {
      await blink.db.mrdTags.update(tagId, {
        status: 'discarded',
        updatedAt: new Date().toISOString()
      })
      
      toast({
        title: "Success",
        description: "Tag discarded successfully"
      })
      
      loadData()
    } catch (error) {
      console.error('Error discarding tag:', error)
      toast({
        title: "Error",
        description: "Failed to discard tag",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading active tags...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Time Tags</h2>
          <p className="text-gray-600">Track and manage all active MRD tags</p>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tags className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Ready</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.ready}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Preparing</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.preparing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by product, location, or batch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {(user?.role === 'admin' || user?.role === 'manager') && locations.length > 1 && (
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tags ({filteredTags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Tags Found</h3>
              <p className="text-gray-500">
                {tags.length === 0 
                  ? "No active tags in the system. Create your first tag to get started."
                  : "No tags match your current filters. Try adjusting your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Made Time</TableHead>
                    <TableHead>Ready Time</TableHead>
                    <TableHead>Discard Time</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTags.map((tag) => {
                    const tagStatus = getTagStatus(tag)
                    const discardTime = new Date(tag.discardTime)
                    const minutesToDiscard = differenceInMinutes(discardTime, new Date())
                    
                    return (
                      <TableRow key={tag.id} className={tagStatus.status === 'expired' ? 'bg-red-50' : ''}>
                        <TableCell>
                          <Badge 
                            variant={tagStatus.color as any}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getStatusIcon(tagStatus.status)}
                            {tagStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tag.productName}</p>
                            {tag.batchNumber && (
                              <p className="text-sm text-gray-500">Batch: {tag.batchNumber}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tag.locationName}</TableCell>
                        <TableCell>{tag.quantity}</TableCell>
                        <TableCell>{format(new Date(tag.madeTime), 'MMM dd, HH:mm')}</TableCell>
                        <TableCell>{format(new Date(tag.readyTime), 'MMM dd, HH:mm')}</TableCell>
                        <TableCell>{format(discardTime, 'MMM dd, HH:mm')}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            minutesToDiscard <= 0 ? 'text-red-600' :
                            minutesToDiscard <= 30 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {minutesToDiscard <= 0 ? 'EXPIRED' : 
                             minutesToDiscard < 60 ? `${minutesToDiscard}m` :
                             `${Math.floor(minutesToDiscard / 60)}h ${minutesToDiscard % 60}m`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintTag(tag)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDiscardTag(tag.id)}
                            >
                              Discard
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}