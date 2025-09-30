import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { 
  Globe, 
  Gamepad2, 
  Network, 
  Settings, 
  Play, 
  Pause, 
  Square, 
  Zap,
  Brain,
  Coins,
  Users,
  BarChart3,
  Map,
  Cpu,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import './App.css'
import { 
  ApiKeyManager, 
  SubscriptionManager, 
  MarketplaceBrowser, 
  ItemUploadDialog, 
  AnalyticsDashboard 
} from './components/MarketplaceComponents.jsx'
import {
  PayPalSubscriptionUpgrade,
  PayPalMarketplacePayout,
  PayPalTransactions,
  PayPalRevenueDashboard
} from './components/PayPalComponents.jsx'

// API-Konfiguration
const API_CONFIG = {
  worldGenerator: 'http://localhost:5002/api',
  gameEngine: 'http://localhost:5241/api/GameEngine',
  networkSim: 'http://localhost:5005/api' // Placeholder für C++ Service
}

// Hauptnavigation
function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/world-editor', label: 'Welt-Editor', icon: Globe },
    { path: '/game-engine', label: 'Spiel-Engine', icon: Gamepad2 },
    { path: '/network-sim', label: 'Netzwerk-Sim', icon: Network },
    { path: '/marketplace', label: 'Marktplatz', icon: Coins },
    { path: '/collective', label: 'Kollektives Denken', icon: Brain }
  ]

  return (
    <nav className="bg-card border-b border-border p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">OmniVerse</h1>
        </div>
        
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant={isActive ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// Service-Status-Komponente
function ServiceStatus({ name, url, icon: Icon }) {
  const [status, setStatus] = useState('checking')
  const [data, setData] = useState(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${url}/health`)
        if (response.ok) {
          const result = await response.json()
          setStatus('online')
          setData(result)
        } else {
          setStatus('offline')
        }
      } catch (error) {
        setStatus('offline')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [url])

  const getStatusIcon = () => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'offline': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-sm">{name}</CardTitle>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent>
        <Badge variant={status === 'online' ? 'default' : 'destructive'}>
          {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Prüfung...'}
        </Badge>
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Service: {data.service || 'Unknown'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Dashboard-Komponente
function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Übersicht über alle OmniVerse-Services</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Activity className="h-4 w-4 mr-1" />
          System aktiv
        </Badge>
      </div>

      {/* Service-Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ServiceStatus 
          name="Weltgenerator" 
          url={API_CONFIG.worldGenerator} 
          icon={Globe} 
        />
        <ServiceStatus 
          name="Spiel-Engine" 
          url={API_CONFIG.gameEngine} 
          icon={Gamepad2} 
        />
        <ServiceStatus 
          name="Netzwerk-Simulation" 
          url={API_CONFIG.networkSim} 
          icon={Network} 
        />
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktive Welten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 seit gestern</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Benutzer Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">847</div>
            <p className="text-xs text-muted-foreground">+15% diese Woche</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API-Aufrufe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5K</div>
            <p className="text-xs text-muted-foreground">Heute</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Umsatz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€2,847</div>
            <p className="text-xs text-muted-foreground">Diesen Monat</p>
          </CardContent>
        </Card>
      </div>

      {/* Schnellaktionen */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
          <CardDescription>Häufig verwendete Funktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/world-editor">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Globe className="h-6 w-6" />
                <span className="text-sm">Neue Welt</span>
              </Button>
            </Link>
            
            <Link to="/game-engine">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Gamepad2 className="h-6 w-6" />
                <span className="text-sm">Spiel starten</span>
              </Button>
            </Link>
            
            <Link to="/marketplace">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Coins className="h-6 w-6" />
                <span className="text-sm">Marktplatz</span>
              </Button>
            </Link>
            
            <Link to="/collective">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Brain className="h-6 w-6" />
                <span className="text-sm">KI-Kollektiv</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Welt-Editor-Komponente
function WorldEditor() {
  const [worldConfig, setWorldConfig] = useState({
    chunkSize: 16,
    seed: 12345,
    scale: 0.01,
    octaves: 4
  })
  const [generatedChunk, setGeneratedChunk] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const initializeGenerator = async () => {
    try {
      const response = await fetch(`${API_CONFIG.worldGenerator}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunk_size: worldConfig.chunkSize,
          seed: worldConfig.seed
        })
      })
      
      if (response.ok) {
        setIsInitialized(true)
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren:', error)
    }
  }

  const generateChunk = async () => {
    if (!isInitialized) {
      await initializeGenerator()
    }
    
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_CONFIG.worldGenerator}/generate_chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_x: 0,
          world_y: 0
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setGeneratedChunk(result.chunk)
      }
    } catch (error) {
      console.error('Fehler beim Generieren:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Welt-Editor</h2>
        <p className="text-muted-foreground">Erstelle und konfiguriere prozedurale Welten</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Konfiguration */}
        <Card>
          <CardHeader>
            <CardTitle>Weltgenerierung konfigurieren</CardTitle>
            <CardDescription>Parameter für die prozedurale Weltenerstellung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chunkSize">Chunk-Größe</Label>
                <Input
                  id="chunkSize"
                  type="number"
                  value={worldConfig.chunkSize}
                  onChange={(e) => setWorldConfig({...worldConfig, chunkSize: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label htmlFor="seed">Seed</Label>
                <Input
                  id="seed"
                  type="number"
                  value={worldConfig.seed}
                  onChange={(e) => setWorldConfig({...worldConfig, seed: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <Button 
              onClick={generateChunk} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Generiere...' : 'Chunk generieren'}
            </Button>
            
            {isInitialized && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Weltgenerator initialisiert mit Seed {worldConfig.seed}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Ergebnis */}
        <Card>
          <CardHeader>
            <CardTitle>Generierte Welt</CardTitle>
            <CardDescription>Vorschau des generierten Chunks</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedChunk ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Position:</strong> ({generatedChunk.x_offset}, {generatedChunk.y_offset})
                  </div>
                  <div>
                    <strong>Größe:</strong> {generatedChunk.size}x{generatedChunk.size}
                  </div>
                  <div>
                    <strong>Objekte:</strong> {generatedChunk.objects.length}
                  </div>
                  <div>
                    <strong>Biome:</strong> {new Set(generatedChunk.biomemap.flat()).size}
                  </div>
                </div>
                
                {/* Vereinfachte Höhenkarten-Visualisierung */}
                <div className="bg-muted p-4 rounded">
                  <h4 className="font-medium mb-2">Höhenkarte (vereinfacht)</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {generatedChunk.heightmap.slice(0, 8).map((row, i) => 
                      row.slice(0, 8).map((height, j) => (
                        <div 
                          key={`${i}-${j}`}
                          className="w-4 h-4 rounded-sm"
                          style={{
                            backgroundColor: `hsl(${120 - height}deg, 50%, ${30 + height/2}%)`
                          }}
                          title={`Höhe: ${height.toFixed(1)}`}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Noch kein Chunk generiert</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Spiel-Engine-Komponente
function GameEngine() {
  const [engineStatus, setEngineStatus] = useState(null)
  const [modules, setModules] = useState([])
  const [activeModule, setActiveModule] = useState(null)

  useEffect(() => {
    fetchEngineStatus()
    fetchModules()
  }, [])

  const fetchEngineStatus = async () => {
    try {
      const response = await fetch(`${API_CONFIG.gameEngine}/status`)
      if (response.ok) {
        const data = await response.json()
        setEngineStatus(data)
        setActiveModule(data.activeModule)
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Engine-Status:', error)
    }
  }

  const fetchModules = async () => {
    try {
      const response = await fetch(`${API_CONFIG.gameEngine}/modules`)
      if (response.ok) {
        const data = await response.json()
        setModules(data.modules)
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Module:', error)
    }
  }

  const startEngine = async () => {
    try {
      await fetch(`${API_CONFIG.gameEngine}/start`, { method: 'POST' })
      fetchEngineStatus()
    } catch (error) {
      console.error('Fehler beim Starten der Engine:', error)
    }
  }

  const stopEngine = async () => {
    try {
      await fetch(`${API_CONFIG.gameEngine}/stop`, { method: 'POST' })
      fetchEngineStatus()
    } catch (error) {
      console.error('Fehler beim Stoppen der Engine:', error)
    }
  }

  const activateModule = async (moduleId) => {
    try {
      await fetch(`${API_CONFIG.gameEngine}/modules/${moduleId}/activate`, { method: 'POST' })
      fetchEngineStatus()
    } catch (error) {
      console.error('Fehler beim Aktivieren des Moduls:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Spiel-Engine</h2>
        <p className="text-muted-foreground">Verwalte und steuere die OmniGame-Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engine-Steuerung */}
        <Card>
          <CardHeader>
            <CardTitle>Engine-Steuerung</CardTitle>
            <CardDescription>Start, stoppe und überwache die Spiel-Engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {engineStatus && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={engineStatus.isRunning ? 'default' : 'secondary'}>
                    {engineStatus.isRunning ? 'Läuft' : 'Gestoppt'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Aktives Modul:</span>
                  <Badge variant="outline">{engineStatus.activeModule}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Verfügbare Module:</span>
                  <span>{engineStatus.availableModules.length}</span>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={startEngine} 
                disabled={engineStatus?.isRunning}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
              
              <Button 
                onClick={stopEngine} 
                disabled={!engineStatus?.isRunning}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Module */}
        <Card>
          <CardHeader>
            <CardTitle>Spiel-Module</CardTitle>
            <CardDescription>Wähle und aktiviere verschiedene Spielmodi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modules.map((moduleId) => {
                const moduleNames = {
                  'CORE_HUB': 'Core Hub',
                  'FPS_ARENA': 'Ego-Shooter Arena',
                  'VOXEL_WORLD': 'Voxel Craft & Build',
                  'BR_ISLAND': 'Battle Royale Island'
                }
                
                const isActive = activeModule === moduleNames[moduleId]
                
                return (
                  <Button
                    key={moduleId}
                    variant={isActive ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => activateModule(moduleId)}
                  >
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    {moduleNames[moduleId] || moduleId}
                    {isActive && <Badge className="ml-auto">Aktiv</Badge>}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Placeholder-Komponenten für weitere Seiten
function NetworkSimulation() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-foreground mb-4">Netzwerk-Simulation</h2>
      <Card>
        <CardContent className="p-8 text-center">
          <Network className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">C++ Netzwerk-Simulation wird implementiert...</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Marketplace() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('omniverse_api_key') || '')
  const [activeTab, setActiveTab] = useState('browse')

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Marktplatz</h2>
        <p className="text-muted-foreground">Kaufe und verkaufe OmniVerse-Inhalte</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="browse">Durchsuchen</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="upload">Verkaufen</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="paypal">PayPal</TabsTrigger>
          <TabsTrigger value="revenue">Umsatz</TabsTrigger>
        </TabsList>
        
        <TabsContent value="browse" className="space-y-4">
          <MarketplaceBrowser apiKey={apiKey} />
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ApiKeyManager apiKey={apiKey} setApiKey={setApiKey} />
            <div>
              <SubscriptionManager apiKey={apiKey} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Deine Inhalte verkaufen</h3>
              <p className="text-muted-foreground">Lade Welten, Module und Assets hoch</p>
            </div>
            <ItemUploadDialog apiKey={apiKey} onItemCreated={() => setActiveTab('browse')} />
          </div>
          
          {!apiKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Du benötigst einen API-Zugang, um Items zu verkaufen. Registriere dich im Account-Tab.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard apiKey={apiKey} />
        </TabsContent>
        
        <TabsContent value="paypal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PayPalSubscriptionUpgrade 
              apiKey={apiKey} 
              currentTier="free"
              onUpgradeSuccess={(data) => console.log('Upgrade successful:', data)}
            />
            <PayPalMarketplacePayout apiKey={apiKey} />
          </div>
          <PayPalTransactions apiKey={apiKey} />
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Umsatz-Dashboard</h3>
            <PayPalRevenueDashboard apiKey={apiKey} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CollectiveThinking() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-foreground mb-4">Kollektives Denken</h2>
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">KI-Kollektiv-Features werden implementiert...</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Hauptanwendung
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/world-editor" element={<WorldEditor />} />
          <Route path="/game-engine" element={<GameEngine />} />
          <Route path="/network-sim" element={<NetworkSimulation />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/collective" element={<CollectiveThinking />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
