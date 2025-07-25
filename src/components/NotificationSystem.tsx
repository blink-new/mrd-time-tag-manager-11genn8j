import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { AlertTriangle, Clock, X, CheckCircle } from 'lucide-react'
import { NotificationData } from '../types'
import { format } from 'date-fns'

interface NotificationSystemProps {
  notifications: NotificationData[]
  onDismiss: (id: string) => void
  onMarkAsHandled: (id: string) => void
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  onMarkAsHandled
}) => {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
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
      onDismiss(currentNotification.id)
      setIsVisible(false)
    }
  }

  const handleMarkAsHandled = () => {
    if (currentNotification) {
      onMarkAsHandled(currentNotification.id)
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