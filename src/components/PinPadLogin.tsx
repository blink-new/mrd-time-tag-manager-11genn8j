import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, User, Lock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const PinPadLogin: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (employeeId.length !== 4 || pin.length !== 4) {
      setError('Employee ID and PIN must be exactly 4 digits')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const success = await login(employeeId, pin)
      if (!success) {
        setError('Invalid Employee ID or PIN')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNumberPad = (digit: string) => {
    if (employeeId.length < 4) {
      setEmployeeId(prev => prev + digit)
    } else if (pin.length < 4) {
      setPin(prev => prev + digit)
    }
  }

  const handleClear = () => {
    if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1))
    } else if (employeeId.length > 0) {
      setEmployeeId(prev => prev.slice(0, -1))
    }
  }

  const handleReset = () => {
    setEmployeeId('')
    setPin('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">MRD Time Tag Manager</CardTitle>
          <CardDescription>Enter your Employee ID and PIN to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Employee ID (4 digits)
              </Label>
              <Input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
                maxLength={4}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                PIN (4 digits)
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
                maxLength={4}
                autoComplete="off"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || employeeId.length !== 4 || pin.length !== 4}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-12 text-lg font-semibold"
                onClick={() => handleNumberPad(digit.toString())}
                type="button"
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={handleReset}
              type="button"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={() => handleNumberPad('0')}
              type="button"
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={handleClear}
              type="button"
            >
              ⌫
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Sample Credentials:</p>
            <p>Admin: ID 1001, PIN 1234</p>
            <p>Manager: ID 2001, PIN 5678</p>
            <p>Kitchen: ID 3001, PIN 3456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}