import React, { useState, useEffect } from 'react'
import { Save, Clock, Calendar, Printer, QrCode } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { format, addHours, addMinutes, addDays, startOfDay, endOfDay } from 'date-fns'
import { blink } from '../blink/client'
import { useAuth } from '../hooks/useAuth'
import { Product, Location, MRDTag } from '../types'

const CreateTag: React.FC = () => {
  const { user, selectedLocation } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewTag, setPreviewTag] = useState<MRDTag | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [formData, setFormData] = useState({
    productId: '',
    locationId: selectedLocation?.id || '',
    quantity: 1,
    batchNumber: '',
    notes: '',
    madeTime: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsResult, locationsResult] = await Promise.all([
        blink.db.products.list({
          where: { isActive: "1" },
          orderBy: { name: 'asc' }
        }),
        blink.db.locations.list({
          where: { isActive: "1" },
          orderBy: { name: 'asc' }
        })
      ])
      setProducts(productsResult)
      setLocations(locationsResult)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedLocation) {
      setFormData(prev => ({ ...prev, locationId: selectedLocation.id }))
    }
  }, [selectedLocation])

  const selectedProduct = products.find(p => p.id === formData.productId)

  const calculateTimes = () => {
    if (!selectedProduct) return { readyTime: null, discardTime: null }

    const madeTime = new Date(formData.madeTime)

    if (selectedProduct.timeType === 'hours') {
      const readyTime = addMinutes(madeTime, selectedProduct.readyTimeMinutes)
      const discardTime = addMinutes(madeTime, selectedProduct.discardTimeMinutes)
      return { readyTime, discardTime }
    } else if (selectedProduct.timeType === 'start_of_day') {
      const targetDay = addDays(madeTime, selectedProduct.dayOffset || 0)
      const readyTime = startOfDay(targetDay)
      const discardTime = startOfDay(targetDay)
      return { readyTime, discardTime }
    } else if (selectedProduct.timeType === 'end_of_day') {
      const targetDay = addDays(madeTime, selectedProduct.dayOffset || 0)
      const readyTime = endOfDay(targetDay)
      const discardTime = endOfDay(targetDay)
      return { readyTime, discardTime }
    }

    return { readyTime: null, discardTime: null }
  }

  const { readyTime, discardTime } = calculateTimes()

  const handleSave = async () => {
    if (!selectedProduct || !readyTime || !discardTime) return

    try {
      setSaving(true)
      
      const tagId = `tag_${Date.now()}`
      const tagData = {
        id: tagId,
        productId: formData.productId,
        locationId: formData.locationId,
        userId: user?.id || '',
        quantity: formData.quantity,
        batchNumber: formData.batchNumber,
        notes: formData.notes,
        madeTime: formData.madeTime,
        readyTime: readyTime.toISOString(),
        discardTime: discardTime.toISOString(),
        status: 'active',
        isPrinted: "0"
      }

      await blink.db.mrdTags.create(tagData)

      // Create preview tag for printing
      const location = locations.find(l => l.id === formData.locationId)
      setPreviewTag({
        ...tagData,
        product: selectedProduct,
        location: location || null,
        user: user || null
      })
      setIsPreviewOpen(true)

      // Reset form
      setFormData({
        productId: '',
        locationId: selectedLocation?.id || '',
        quantity: 1,
        batchNumber: '',
        notes: '',
        madeTime: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
      })
    } catch (error) {
      console.error('Error creating tag:', error)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    if (!previewTag) return

    try {
      // Mark as printed
      await blink.db.mrdTags.update(previewTag.id, { isPrinted: "1" })
      
      // Print the tag (this would integrate with a printer)
      window.print()
      
      setIsPreviewOpen(false)
      setPreviewTag(null)
    } catch (error) {
      console.error('Error printing tag:', error)
    }
  }

  const getStatusColor = () => {
    if (!readyTime || !discardTime) return 'gray'
    
    const now = new Date()
    if (now < readyTime) return 'blue'
    if (now >= readyTime && now < discardTime) return 'green'
    return 'red'
  }

  const getStatusText = () => {
    if (!readyTime || !discardTime) return 'Invalid'
    
    const now = new Date()
    if (now < readyTime) return 'Preparing'
    if (now >= readyTime && now < discardTime) return 'Ready'
    return 'Expired'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create MRD Tag</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Tag Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product">Product</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user?.role === 'admin' && (
              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    quantity: parseInt(e.target.value) || 1 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="batch">Batch Number</Label>
                <Input
                  id="batch"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="madeTime">Made Time</Label>
              <Input
                id="madeTime"
                type="datetime-local"
                value={formData.madeTime}
                onChange={(e) => setFormData({ ...formData, madeTime: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={!formData.productId || !formData.locationId || saving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Creating Tag...' : 'Create Tag'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Tag Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProduct && readyTime && discardTime ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-white">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">{selectedProduct.name}</div>
                    <Badge variant="secondary">{selectedProduct.category}</Badge>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <div className="font-semibold">Made:</div>
                        <div>{format(new Date(formData.madeTime), 'MMM dd, yyyy HH:mm')}</div>
                      </div>
                      <div>
                        <div className="font-semibold">Quantity:</div>
                        <div>{formData.quantity}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <div className="font-semibold text-green-600">Ready:</div>
                        <div>{format(readyTime, 'MMM dd, yyyy HH:mm')}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-red-600">Discard:</div>
                        <div>{format(discardTime, 'MMM dd, yyyy HH:mm')}</div>
                      </div>
                    </div>

                    {formData.batchNumber && (
                      <div className="text-sm">
                        <div className="font-semibold">Batch:</div>
                        <div>{formData.batchNumber}</div>
                      </div>
                    )}

                    <div className="flex items-center justify-center mt-4">
                      <Badge 
                        variant={getStatusColor() === 'green' ? 'default' : 
                                getStatusColor() === 'blue' ? 'secondary' : 'destructive'}
                      >
                        {getStatusText()}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-center mt-4">
                      <QrCode className="w-16 h-16 text-gray-400" />
                    </div>
                  </div>
                </div>

                {selectedProduct.storageRequirements && (
                  <div className="text-sm text-gray-600">
                    <strong>Storage:</strong> {selectedProduct.storageRequirements}
                  </div>
                )}

                {selectedProduct.allergens && (
                  <div className="text-sm text-red-600">
                    <strong>Allergens:</strong> {selectedProduct.allergens}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select a product to see preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Tag</DialogTitle>
          </DialogHeader>
          
          {previewTag && (
            <div className="space-y-4">
              <div className="border-2 border-black p-4 bg-white print:border-black print:shadow-none">
                <div className="text-center space-y-2">
                  <div className="text-xl font-bold">{previewTag.product?.name}</div>
                  <div className="text-sm">{previewTag.product?.category}</div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <div className="font-semibold">Made:</div>
                      <div>{format(new Date(previewTag.madeTime), 'MM/dd HH:mm')}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Qty:</div>
                      <div>{previewTag.quantity}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <div className="font-semibold text-green-600">Ready:</div>
                      <div>{format(new Date(previewTag.readyTime), 'MM/dd HH:mm')}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-600">Discard:</div>
                      <div>{format(new Date(previewTag.discardTime), 'MM/dd HH:mm')}</div>
                    </div>
                  </div>

                  {previewTag.batchNumber && (
                    <div className="text-xs mt-2">
                      <div className="font-semibold">Batch: {previewTag.batchNumber}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-center mt-3">
                    <div className="w-12 h-12 border-2 border-black flex items-center justify-center text-xs">
                      QR
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 mt-2">
                    {previewTag.location?.name}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Tag
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreateTag