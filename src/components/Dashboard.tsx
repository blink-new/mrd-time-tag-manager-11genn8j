import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  User,
  Package,
  Printer,
  Settings,
  LogOut
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { MRDTag, Product, NotificationData } from '../types'
import { blink } from '../blink/client'
import { format, differenceInMinutes, addHours } from 'date-fns'
import { NotificationSystem } from './NotificationSystem'

export const Dashboard: React.FC = () => {
  const { user, currentLocation, logout, setCurrentLocation } = useAuth()
  const [activeTags, setActiveTags] = useState<MRDTag[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const checkForExpiringTags = useCallback((tags?: MRDTag[]) => {
    const tagsToCheck = tags || activeTags
    const now = new Date()
    const newNotifications: NotificationData[] = []

    tagsToCheck.forEach(tag => {
      const discardTime = new Date(tag.discardTime)
      const minutesUntilDiscard = differenceInMinutes(discardTime, now)
      
      const product = products.find(p => p.id === tag.productId)
      
      if (minutesUntilDiscard <= 0) {
        // Expired
        newNotifications.push({
          id: `expired-${tag.id}`,
          type: 'critical',
          title: 'Product Expired',
          message: `${product?.name || 'Unknown Product'} has expired and must be discarded immediately!`,
          tagId: tag.id,
          productName: product?.name,
          locationName: currentLocation?.name,
          timeRemaining: 'EXPIRED',
          timestamp: new Date().toISOString()
        })
      } else if (minutesUntilDiscard <= 30) {
        // Expiring soon
        newNotifications.push({
          id: `expiring-${tag.id}`,
          type: 'warning',
          title: 'Product Expiring Soon',
          message: `${product?.name || 'Unknown Product'} will expire in ${minutesUntilDiscard} minutes.`,
          tagId: tag.id,
          productName: product?.name,
          locationName: currentLocation?.name,
          timeRemaining: `${minutesUntilDiscard} minutes`,
          timestamp: new Date().toISOString()
        })
      }
    })

    setNotifications(newNotifications)
  }, [activeTags, products, currentLocation])

  const loadData = useCallback(async () => {
    if (!currentLocation) return
    
    try {
      setIsLoading(true)
      
      // Load active tags for current location
      const tagsResult = await blink.db.mrdTags.list({
        where: { 
          locationId: currentLocation.id,
          status: 'active'
        },
        orderBy: { discardTime: 'asc' }
      })
      
      // Load products
      const productsResult = await blink.db.products.list({
        where: { isActive: "1" },
        orderBy: { name: 'asc' }
      })
      
      setActiveTags(tagsResult as MRDTag[])
      setProducts(productsResult as Product[])
      
      // Check for expiring tags immediately
      checkForExpiringTags(tagsResult as MRDTag[])
      
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentLocation, checkForExpiringTags])

  useEffect(() => {
    if (currentLocation) {
      loadData()
      // Set up interval to check for expiring tags
      const interval = setInterval(() => checkForExpiringTags(), 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [currentLocation, loadData, checkForExpiringTags])

  const getTagStatus = (tag: MRDTag) => {
    const now = new Date()
    const discardTime = new Date(tag.discardTime)
    const minutesUntilDiscard = differenceInMinutes(discardTime, now)
    
    if (minutesUntilDiscard <= 0) {
      return { status: 'expired', color: 'destructive', text: 'EXPIRED' }
    } else if (minutesUntilDiscard <= 30) {
      return { status: 'expiring', color: 'secondary', text: `${minutesUntilDiscard}m left` }
    } else {
      return { status: 'fresh', color: 'default', text: `${Math.floor(minutesUntilDiscard / 60)}h ${minutesUntilDiscard % 60}m left` }
    }
  }

  const handleNotificationDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleNotificationMarkAsHandled = async (id: string) => {
    const notification = notifications.find(n => n.id === id)
    if (notification?.tagId) {
      // Mark tag as discarded if it was expired
      if (notification.type === 'critical') {
        try {
          await blink.db.mrdTags.update(notification.tagId, {
            status: 'discarded',
            updatedAt: new Date().toISOString()
          })
          loadData() // Refresh data
        } catch (error) {
          console.error('Failed to update tag status:', error)
        }
      }
    }
    handleNotificationDismiss(id)
  }

  const stats = {
    totalActive: activeTags.length,
    expiringSoon: activeTags.filter(tag => {
      const minutesUntilDiscard = differenceInMinutes(new Date(tag.discardTime), new Date())
      return minutesUntilDiscard <= 30 && minutesUntilDiscard > 0
    }).length,
    expired: activeTags.filter(tag => {
      const minutesUntilDiscard = differenceInMinutes(new Date(tag.discardTime), new Date())
      return minutesUntilDiscard <= 0
    }).length
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSystem
        notifications={notifications}
        onDismiss={handleNotificationDismiss}
        onMarkAsHandled={handleNotificationMarkAsHandled}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">MRD Time Tag Manager</h1>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentLocation?.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {user?.name} ({user?.role})
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setCurrentLocation(null)}>
                Switch Location
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tags</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
              <p className="text-xs text-muted-foreground">Currently tracked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div>
              <p className="text-xs text-muted-foreground">Within 30 minutes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">Available items</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="active-tags" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active-tags">Active Tags</TabsTrigger>
            <TabsTrigger value="create-tag">Create Tag</TabsTrigger>
            <TabsTrigger value="print-queue">Print Queue</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active-tags" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Active Tags</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Tag
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTags.map((tag) => {
                const product = products.find(p => p.id === tag.productId)
                const tagStatus = getTagStatus(tag)
                
                return (
                  <Card key={tag.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{product?.name || 'Unknown Product'}</CardTitle>
                        <Badge variant={tagStatus.color as any}>
                          {tagStatus.text}
                        </Badge>
                      </div>
                      <CardDescription>{product?.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Made:</span>
                          <span>{format(new Date(tag.madeTime), 'MMM dd, HH:mm')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Discard:</span>
                          <span>{format(new Date(tag.discardTime), 'MMM dd, HH:mm')}</span>
                        </div>
                        {tag.quantity && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quantity:</span>
                            <span>{tag.quantity}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {activeTags.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Tags</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first MRD time tag to start tracking products.
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Tag
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="create-tag">
            <Card>
              <CardHeader>
                <CardTitle>Create New MRD Tag</CardTitle>
                <CardDescription>Generate a new time tag for product tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Tag creation form will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="print-queue">
            <Card>
              <CardHeader>
                <CardTitle>Print Queue</CardTitle>
                <CardDescription>Manage batch printing of tags</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Print queue management will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>Manage global product database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <CardDescription>{product.category}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shelf Life:</span>
                            <span>{product.shelfLifeHours}h</span>
                          </div>
                          {product.storageTemp && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Storage:</span>
                              <span className="text-xs">{product.storageTemp}</span>
                            </div>
                          )}
                          {product.allergens && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Allergens:</span>
                              <span className="text-xs">{product.allergens}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}