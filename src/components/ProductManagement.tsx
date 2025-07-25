import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Clock, Calendar, Eye, EyeOff } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { blink } from '../blink/client'
import { Product } from '../types'

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    readyTimeHours: 0,
    readyTimeMinutes: 0,
    discardTimeHours: 0,
    discardTimeMinutes: 0,
    timeType: 'hours' as 'hours' | 'start_of_day' | 'end_of_day',
    dayOffset: 0,
    storageRequirements: '',
    allergens: '',
    isActive: true,
    excludeFromDashboard: false
  })

  const loadProducts = async () => {
    try {
      setLoading(true)
      const result = await blink.db.products.list({
        orderBy: { name: 'asc' }
      })
      setProducts(result)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      readyTimeHours: 0,
      readyTimeMinutes: 0,
      discardTimeHours: 0,
      discardTimeMinutes: 0,
      timeType: 'hours',
      dayOffset: 0,
      storageRequirements: '',
      allergens: '',
      isActive: true,
      excludeFromDashboard: false
    })
    setEditingProduct(null)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      readyTimeHours: Math.floor(product.readyTimeMinutes / 60),
      readyTimeMinutes: product.readyTimeMinutes % 60,
      discardTimeHours: Math.floor(product.discardTimeMinutes / 60),
      discardTimeMinutes: product.discardTimeMinutes % 60,
      timeType: product.timeType,
      dayOffset: product.dayOffset || 0,
      storageRequirements: product.storageRequirements || '',
      allergens: product.allergens || '',
      isActive: Number(product.isActive) > 0,
      excludeFromDashboard: Number(product.excludeFromDashboard) > 0
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        readyTimeMinutes: formData.readyTimeHours * 60 + formData.readyTimeMinutes,
        discardTimeMinutes: formData.discardTimeHours * 60 + formData.discardTimeMinutes,
        timeType: formData.timeType,
        dayOffset: formData.dayOffset,
        storageRequirements: formData.storageRequirements,
        allergens: formData.allergens,
        isActive: formData.isActive ? "1" : "0",
        excludeFromDashboard: formData.excludeFromDashboard ? "1" : "0"
      }

      if (editingProduct) {
        await blink.db.products.update(editingProduct.id, productData)
      } else {
        await blink.db.products.create({
          id: `prod_${Date.now()}`,
          ...productData
        })
      }

      await loadProducts()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDelete = async (productId: string) => {
    try {
      await blink.db.products.delete(productId)
      await loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const getTimeDisplay = (product: Product) => {
    if (product.timeType === 'hours') {
      const readyHours = Math.floor(product.readyTimeMinutes / 60)
      const readyMins = product.readyTimeMinutes % 60
      const discardHours = Math.floor(product.discardTimeMinutes / 60)
      const discardMins = product.discardTimeMinutes % 60
      
      return `Ready: ${readyHours}h ${readyMins}m | Discard: ${discardHours}h ${discardMins}m`
    } else if (product.timeType === 'start_of_day') {
      const offset = product.dayOffset || 0
      return `Start of Day ${offset > 0 ? `+${offset}` : offset < 0 ? offset : ''} days`
    } else {
      const offset = product.dayOffset || 0
      return `End of Day ${offset > 0 ? `+${offset}` : offset < 0 ? offset : ''} days`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
              </div>

              <div>
                <Label>Time Configuration</Label>
                <Select
                  value={formData.timeType}
                  onValueChange={(value: 'hours' | 'start_of_day' | 'end_of_day') => 
                    setFormData({ ...formData, timeType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours/Minutes</SelectItem>
                    <SelectItem value="start_of_day">Start of Day</SelectItem>
                    <SelectItem value="end_of_day">End of Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.timeType === 'hours' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ready Time</Label>
                    <div className="flex gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={formData.readyTimeHours}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            readyTimeHours: parseInt(e.target.value) || 0 
                          })}
                          placeholder="Hours"
                        />
                        <Label className="text-xs text-gray-500">Hours</Label>
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={formData.readyTimeMinutes}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            readyTimeMinutes: parseInt(e.target.value) || 0 
                          })}
                          placeholder="Minutes"
                        />
                        <Label className="text-xs text-gray-500">Minutes</Label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Discard Time</Label>
                    <div className="flex gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={formData.discardTimeHours}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            discardTimeHours: parseInt(e.target.value) || 0 
                          })}
                          placeholder="Hours"
                        />
                        <Label className="text-xs text-gray-500">Hours</Label>
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={formData.discardTimeMinutes}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            discardTimeMinutes: parseInt(e.target.value) || 0 
                          })}
                          placeholder="Minutes"
                        />
                        <Label className="text-xs text-gray-500">Minutes</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Day Offset</Label>
                  <Input
                    type="number"
                    value={formData.dayOffset}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dayOffset: parseInt(e.target.value) || 0 
                    })}
                    placeholder="0 for same day, +1 for next day, -1 for previous day"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="storage">Storage Requirements</Label>
                <Textarea
                  id="storage"
                  value={formData.storageRequirements}
                  onChange={(e) => setFormData({ ...formData, storageRequirements: e.target.value })}
                  placeholder="e.g., Refrigerate at 40°F or below"
                />
              </div>

              <div>
                <Label htmlFor="allergens">Allergens</Label>
                <Input
                  id="allergens"
                  value={formData.allergens}
                  onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                  placeholder="e.g., Contains: Milk, Eggs, Wheat"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="exclude"
                    checked={formData.excludeFromDashboard}
                    onCheckedChange={(checked) => setFormData({ ...formData, excludeFromDashboard: checked })}
                  />
                  <Label htmlFor="exclude">Exclude from Dashboard</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {product.category}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  {Number(product.excludeFromDashboard) > 0 && (
                    <EyeOff className="w-4 h-4 text-gray-400" title="Excluded from dashboard" />
                  )}
                  {Number(product.isActive) === 0 && (
                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  {product.timeType === 'hours' ? (
                    <Clock className="w-4 h-4 mr-2" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  {getTimeDisplay(product)}
                </div>

                {product.storageRequirements && (
                  <div className="text-sm text-gray-600">
                    <strong>Storage:</strong> {product.storageRequirements}
                  </div>
                )}

                {product.allergens && (
                  <div className="text-sm text-red-600">
                    <strong>Allergens:</strong> {product.allergens}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
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
                        <AlertDialogTitle>Delete Product</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{product.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
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

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No products found</div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement