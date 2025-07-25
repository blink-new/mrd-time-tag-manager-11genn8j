export interface User {
  id: string
  employeeId: string
  pin: string
  name: string
  role: 'admin' | 'manager' | 'kitchen_staff'
  locationId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  category: string
  shelfLifeHours: number
  storageTemp?: string
  allergens?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MRDTag {
  id: string
  productId: string
  locationId: string
  employeeId: string
  madeTime: string
  readyTime?: string
  discardTime: string
  status: 'active' | 'used' | 'discarded'
  batchNumber?: string
  quantity?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // Joined data
  product?: Product
  location?: Location
  employee?: User
}

export interface AuthState {
  user: User | null
  currentLocation: Location | null
  isAuthenticated: boolean
}

export interface NotificationData {
  id: string
  type: 'warning' | 'critical'
  title: string
  message: string
  tagId?: string
  productName?: string
  locationName?: string
  timeRemaining?: string
  timestamp: string
}