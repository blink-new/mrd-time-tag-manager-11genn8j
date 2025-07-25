import React, { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { AlertTriangle, Clock, X, CheckCircle } from 'lucide-react'
import { format, differenceInMinutes, isAfter } from 'date-fns'

interface NotificationData {
  id: string
  type: 'critical' | 'warning'
  title: string
  message: string
  productName?: string
  locationName?: string
  timeRemaining?: string
  timestamp: string
}

const NotificationSystem: React.FC = () => {
  const { user, selectedLocation } = useAuth()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }

  const checkForExpiringTags = useCallback(async () => {
    try {
      // Load active tags
      let tagsData = await blink.db.mrdTags.list({
        where: { status: 'active' },
        orderBy: { discardTime: 'asc' }
      })

      // Filter based on user role and location access
      if (user?.role === 'kitchen' && selectedLocation) {
        tagsData = tagsData.filter(tag => tag.locationId === selectedLocation.id)
      }

      const now = new Date()
      const newNotifications: NotificationData[] = []

      tagsData.forEach(tag => {
        const discardTime = new Date(tag.discardTime)
        const minutesToDiscard = differenceInMinutes(discardTime, now)

        if (isAfter(now, discardTime)) {
          // Expired
          newNotifications.push({
            id: `expired_${tag.id}`,
            type: 'critical',
            title: 'PRODUCT EXPIRED',
            message: `${tag.productName} has expired and must be discarded immediately!`,
            productName: tag.productName,
            locationName: tag.locationName,
            timeRemaining: 'EXPIRED',
            timestamp: new Date().toISOString()
          })
        } else if (minutesToDiscard <= 30) {
          // Expiring soon
          newNotifications.push({
            id: `expiring_${tag.id}`,
            type: 'warning',
            title: 'PRODUCT EXPIRING SOON',
            message: `${tag.productName} will expire in ${minutesToDiscard} minutes.`,
            productName: tag.productName,
            locationName: tag.locationName,
            timeRemaining: `${minutesToDiscard} minutes`,
            timestamp: new Date().toISOString()
          })
        }
      })

      setNotifications(newNotifications)
    } catch (error) {
      console.error('Error checking for expiring tags:', error)
    }
  }, [user, selectedLocation])

  useEffect(() => {
    if (user && selectedLocation) {
      // Check immediately
      checkForExpiringTags()
      
      // Then check every 30 seconds
      const interval = setInterval(checkForExpiringTags, 30000)
      
      return () => clearInterval(interval)
    }
  }, [user, selectedLocation, checkForExpiringTags])

  useEffect(() => {
    // Show the most critical notification
    const criticalNotifications = notifications.filter(n => n.type === 'critical')
    const warningNotifications = notifications.filter(n => n.type === 'warning')
    
    const nextNotification = criticalNotifications[0] || warningNotifications[0]
    
    if (nextNotification && nextNotification.id !== currentNotification?.id) {
      setCurrentNotification(nextNotification)
      setIsVisible(true)
      
      // Play notification sound for critical alerts
      if (nextNotification.type === 'critical') {
        playNotificationSound()
      }
    } else if (!nextNotification) {
      setIsVisible(false)
      setCurrentNotification(null)
    }
  }, [notifications, currentNotification])

  const handleDismiss = () => {
    if (currentNotification) {
      setNotifications(prev => prev.filter(n => n.id !== currentNotification.id))
      setIsVisible(false)
    }
  }

  const handleMarkAsHandled = () => {
    if (currentNotification) {
      setNotifications(prev => prev.filter(n => n.id !== currentNotification.id))
      setIsVisible(false)
    }
  }

  if (!isVisible || !currentNotification) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className={`w-full max-w-lg border-4 ${
        currentNotification.type === 'critical' 
          ? 'border-red-500 bg-red-50' 
          : 'border-amber-500 bg-amber-50'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-3 text-xl ${
              currentNotification.type === 'critical' ? 'text-red-800' : 'text-amber-800'
            }`}>
              {currentNotification.type === 'critical' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
              {currentNotification.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Badge 
            variant={currentNotification.type === 'critical' ? 'destructive' : 'secondary'}
            className="w-fit"
          >
            {currentNotification.type === 'critical' ? 'CRITICAL ALERT' : 'WARNING'}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className={`text-lg font-medium ${
            currentNotification.type === 'critical' ? 'text-red-800' : 'text-amber-800'
          }`}>
            {currentNotification.message}
          </div>
          
          {currentNotification.productName && (
            <div className="bg-white/70 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-700">Product Details:</div>
              <div className="text-gray-900">{currentNotification.productName}</div>
              {currentNotification.locationName && (
                <div className="text-sm text-gray-600">Location: {currentNotification.locationName}</div>
              )}
              {currentNotification.timeRemaining && (
                <div className="text-sm text-gray-600">Time Remaining: {currentNotification.timeRemaining}</div>
              )}
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            Alert Time: {format(new Date(currentNotification.timestamp), 'MMM dd, yyyy HH:mm:ss')}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleMarkAsHandled}
              className="flex-1"
              variant={currentNotification.type === 'critical' ? 'destructive' : 'default'}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Handled
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationSystem