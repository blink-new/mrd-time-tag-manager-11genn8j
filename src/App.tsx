import React, { useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { PinPadLogin } from './components/PinPadLogin'
import { LocationSelector } from './components/LocationSelector'
import { Dashboard } from './components/Dashboard'
import ActiveTagsDashboard from './components/ActiveTagsDashboard'
import CreateTag from './components/CreateTag'
import ProductManagement from './components/ProductManagement'
import UserManagement from './components/UserManagement'
import LocationManagement from './components/LocationManagement'
import NotificationSystem from './components/NotificationSystem'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Toaster } from './components/ui/toaster'
import { 
  LayoutDashboard, 
  Tags, 
  Plus, 
  Package, 
  Users, 
  Building, 
  LogOut,
  MapPin,
  Shield
} from 'lucide-react'
import './App.css'

type Page = 'dashboard' | 'active-tags' | 'create-tag' | 'products' | 'users' | 'locations'

const AppContent: React.FC = () => {
  const { isAuthenticated, currentLocation, user, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  if (!isAuthenticated) {
    return <PinPadLogin />
  }

  if (!currentLocation) {
    return <LocationSelector />
  }

  const navigationItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'kitchen'] },
    { id: 'active-tags' as Page, label: 'Active Tags', icon: Tags, roles: ['admin', 'manager', 'kitchen'] },
    { id: 'create-tag' as Page, label: 'Create Tag', icon: Plus, roles: ['admin', 'manager', 'kitchen'] },
    { id: 'products' as Page, label: 'Products', icon: Package, roles: ['admin'] },
    { id: 'users' as Page, label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'locations' as Page, label: 'Locations', icon: Building, roles: ['admin'] }
  ]

  const visibleNavItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || 'kitchen')
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'kitchen': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'active-tags':
        return <ActiveTagsDashboard />
      case 'create-tag':
        return <CreateTag />
      case 'products':
        return <ProductManagement />
      case 'users':
        return <UserManagement />
      case 'locations':
        return <LocationManagement />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSystem />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">MRD Time Tag Manager</h1>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{currentLocation.name}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Badge className={getRoleBadgeColor(user?.role || 'kitchen')}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
                </Badge>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderCurrentPage()}
          </div>
        </div>
      </div>
    </div>
  )
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