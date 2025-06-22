'use client'

import { useState, useEffect } from "react"
import { AlertTriangle, Bell, Plane, Settings, Wrench } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Alert {
  id: number
  component: string
  risk: 'critical' | 'moderate'
  message: string
  timestamp: string
  flightImpact: string
}

interface SubsystemPrediction {
  subsystem: string
  rul: number
  risk_level: 'safe' | 'warning' | 'danger'
  status: string
  cycle?: number
  timestamp?: number
}

interface SimulationData {
  isSimulating: boolean
  alertLevel: 'safe' | 'warning' | 'danger'
  currentSpeed: number
  simulationTime: number
  rulValue?: number
  subsystemPredictions?: SubsystemPrediction[]
}

export function AviationSidebar() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [simulationData, setSimulationData] = useState<SimulationData>({
    isSimulating: false,
    alertLevel: 'safe',
    currentSpeed: 0,
    simulationTime: 0
  })

  // Listen for simulation events
  useEffect(() => {
    const handleSimulationUpdate = (event: CustomEvent) => {
      const newData = event.detail as SimulationData
      setSimulationData(newData)
      
      // Generate alerts based on simulation state
      if (newData.isSimulating) {
        const newAlerts: Alert[] = []
        
        // Engine RUL alerts
        if (newData.rulValue !== undefined) {
          if (newData.rulValue < 30) {
            newAlerts.push({
              id: Date.now() + 1,
              component: "🔥 Engine Critical",
              risk: "critical",
              message: `Engine RUL: ${newData.rulValue.toFixed(0)} cycles - IMMEDIATE ACTION REQUIRED`,
              timestamp: `${newData.simulationTime}s`,
              flightImpact: "⚠️ ABORT TAKEOFF"
            })
          } else if (newData.rulValue < 80) {
            newAlerts.push({
              id: Date.now() + 1,
              component: "⚡ Engine Warning",
              risk: "moderate",
              message: `Engine RUL: ${newData.rulValue.toFixed(0)} cycles - Enhanced monitoring required`,
              timestamp: `${newData.simulationTime}s`,
              flightImpact: "🔍 Monitor takeoff closely"
            })
          }
        }
        
        // Subsystem alerts
        if (newData.subsystemPredictions) {
          newData.subsystemPredictions.forEach((subsystem, index) => {
            const subsystemNames = {
              hydraulic: "💧 Hydraulic System",
              electrical: "⚡ Electrical System", 
              control_surface: "🛩️ Control Surfaces",
              cabin: "🏠 Cabin System",
              altimeter: "📊 Altimeter"
            }
            
            if (subsystem.rul < 30) {
              newAlerts.push({
                id: Date.now() + index + 10,
                component: subsystemNames[subsystem.subsystem as keyof typeof subsystemNames] || subsystem.subsystem,
                risk: "critical",
                message: `${subsystem.subsystem.toUpperCase()} RUL: ${subsystem.rul.toFixed(0)} cycles - CRITICAL FAILURE RISK`,
                timestamp: `${newData.simulationTime}s`,
                flightImpact: "⚠️ SYSTEM FAILURE IMMINENT"
              })
            } else if (subsystem.rul < 80) {
              newAlerts.push({
                id: Date.now() + index + 10,
                component: subsystemNames[subsystem.subsystem as keyof typeof subsystemNames] || subsystem.subsystem,
                risk: "moderate",
                message: `${subsystem.subsystem.toUpperCase()} RUL: ${subsystem.rul.toFixed(0)} cycles - Degraded performance`,
                timestamp: `${newData.simulationTime}s`,
                flightImpact: "🔧 Schedule maintenance"
              })
            }
          })
        }
        
        setAlerts(newAlerts)
      } else if (!newData.isSimulating) {
        // Clear alerts when simulation stops
        setAlerts([])
      }
    }

    window.addEventListener('simulationUpdate', handleSimulationUpdate as EventListener)
    
    return () => {
      window.removeEventListener('simulationUpdate', handleSimulationUpdate as EventListener)
    }
  }, [])

  const criticalAlerts = alerts.filter(alert => alert.risk === 'critical')
  const moderateAlerts = alerts.filter(alert => alert.risk === 'moderate')

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Flight Alert System</h2>
            <p className="text-sm text-gray-500">Aircraft ID: N747BA</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 space-y-4">
        {/* Show status when no alerts */}
        {alerts.length === 0 && (
          <div className="text-center py-8">
            <div className="text-green-600 mb-2">
              <Plane className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-600">
              {simulationData.isSimulating ? 
                "Monitoring engine health..." : 
                "All systems normal"
              }
            </p>
            {simulationData.isSimulating && (
              <p className="text-xs text-gray-500 mt-1">
                Simulation: {simulationData.simulationTime}s | Speed: {simulationData.currentSpeed.toFixed(0)} kts
              </p>
            )}
          </div>
        )}

        {/* Critical Alerts - Only show when they exist */}
        {criticalAlerts.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-red-700 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Critical Alerts
              <Badge variant="destructive" className="ml-auto animate-pulse">
                {criticalAlerts.length}
              </Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2">
              {criticalAlerts.map((alert) => (
                <Card key={alert.id} className="border-red-200 bg-red-50 animate-pulse">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-800">{alert.component}</CardTitle>
                    <CardDescription className="text-xs text-red-600">{alert.timestamp}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-red-700 mb-2">{alert.message}</p>
                    <Badge variant="destructive" className="text-xs">
                      {alert.flightImpact}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Moderate Risk Alerts - Only show when they exist */}
        {moderateAlerts.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-yellow-700 font-semibold">
              <Bell className="h-4 w-4" />
              Moderate Risk
              <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-800">
                {moderateAlerts.length}
              </Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2">
              {moderateAlerts.map((alert) => (
                <Card key={alert.id} className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-800">{alert.component}</CardTitle>
                    <CardDescription className="text-xs text-yellow-600">{alert.timestamp}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-yellow-700 mb-2">{alert.message}</p>
                    <Badge className="text-xs bg-yellow-200 text-yellow-800 hover:bg-yellow-200">
                      {alert.flightImpact}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Alert Notifications - Always visible */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-700 font-semibold">Alert Notifications</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3">
              {/* Engine RUL Display */}
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">🔧 Engine System</span>
                  <Badge variant={simulationData.rulValue !== undefined ? (simulationData.rulValue < 30 ? "destructive" : simulationData.rulValue < 80 ? "secondary" : "default") : "outline"}>
                    {simulationData.rulValue !== undefined ? 
                      `${simulationData.rulValue.toFixed(0)} cycles` : 
                      "Monitoring..."}
                  </Badge>
                </div>
                <p className="text-xs text-blue-700">
                  Remaining Useful Life: {simulationData.rulValue !== undefined ? 
                    `${simulationData.rulValue.toFixed(0)} cycles (~${(simulationData.rulValue * 1.5).toFixed(0)} flight hours)` : 
                    "Awaiting prediction"}
                </p>
              </div>
              
              {/* Subsystem RUL Display */}
              {simulationData.subsystemPredictions && simulationData.subsystemPredictions.length > 0 ? (
                simulationData.subsystemPredictions.map((subsystem) => {
                  const subsystemInfo = {
                    hydraulic: { icon: "💧", name: "Hydraulic System", color: "indigo" },
                    electrical: { icon: "⚡", name: "Electrical System", color: "yellow" },
                    control_surface: { icon: "🛩️", name: "Control Surfaces", color: "green" },
                    cabin: { icon: "🏠", name: "Cabin System", color: "purple" },
                    altimeter: { icon: "📊", name: "Altimeter", color: "gray" }
                  }
                  
                  const info = subsystemInfo[subsystem.subsystem as keyof typeof subsystemInfo] || 
                              { icon: "⚙️", name: subsystem.subsystem, color: "gray" }
                  
                  return (
                    <div key={subsystem.subsystem} className={`p-3 border rounded-lg bg-${info.color}-50`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium text-${info.color}-900`}>
                          {info.icon} {info.name}
                        </span>
                        <Badge variant={subsystem.risk_level === 'danger' ? "destructive" : 
                                       subsystem.risk_level === 'warning' ? "secondary" : "default"}>
                          {subsystem.rul} cycles
                        </Badge>
                      </div>
                      <p className={`text-xs text-${info.color}-700`}>
                        Status: {subsystem.status} (RUL: {subsystem.rul} cycles)
                      </p>
                      {subsystem.cycle && (
                        <p className={`text-xs text-${info.color}-600 mt-1`}>
                          ⏱️ Updated at T:{subsystem.cycle}s {subsystem.timestamp && `• ${new Date(subsystem.timestamp).toLocaleTimeString()}`}
                        </p>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">⚙️ Subsystems</span>
                    <Badge variant="outline">Monitoring...</Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    {simulationData.isSimulating ? 
                      "Analyzing hydraulic, electrical, control surface, cabin, and altimeter systems..." :
                      "Start simulation to monitor subsystem health"}
                  </p>
                </div>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
