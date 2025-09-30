import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Coins, 
  ShoppingCart, 
  Upload, 
  Download, 
  Star, 
  CreditCard,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const API_GATEWAY = 'http://localhost:5006/api'

// API-Key-Management
export function ApiKeyManager({ apiKey, setApiKey }) {
  const [email, setEmail] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [profile, setProfile] = useState(null)

  const registerUser = async () => {
    if (!email) return
    
    setIsRegistering(true)
    try {
      const response = await fetch(`${API_GATEWAY}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      if (response.ok) {
        const data = await response.json()
        setApiKey(data.api_key)
        localStorage.setItem('omniverse_api_key', data.api_key)
      }
    } catch (error) {
      console.error('Registration failed:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  const fetchProfile = async () => {
    if (!apiKey) return
    
    try {
      const response = await fetch(`${API_GATEWAY}/auth/profile`, {
        headers: { 'X-API-Key': apiKey }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [apiKey])

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API-Zugang einrichten</CardTitle>
          <CardDescription>Registriere dich für den OmniVerse-API-Zugang</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.com"
            />
          </div>
          
          <Button 
            onClick={registerUser} 
            disabled={isRegistering || !email}
            className="w-full"
          >
            {isRegistering ? 'Registriere...' : 'Kostenlos registrieren'}
          </Button>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Du erhältst 100 kostenlose Credits zum Testen der API.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dein Account</CardTitle>
        <CardDescription>API-Zugang und Credits</CardDescription>
      </CardHeader>
      <CardContent>
        {profile && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>E-Mail:</span>
              <span className="font-mono text-sm">{profile.email}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Credits:</span>
              <Badge variant="outline">
                <Coins className="h-3 w-3 mr-1" />
                {profile.credits}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>Subscription:</span>
              <Badge variant={profile.subscription_tier === 'free' ? 'secondary' : 'default'}>
                {profile.subscription_tier}
              </Badge>
            </div>
            
            <div className="mt-4">
              <Label>API-Key</Label>
              <Input 
                value={apiKey} 
                readOnly 
                className="font-mono text-xs"
                onClick={(e) => e.target.select()}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Subscription-Management
export function SubscriptionManager({ apiKey }) {
  const [tiers, setTiers] = useState({})
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [selectedTier, setSelectedTier] = useState('')

  useEffect(() => {
    fetchTiers()
  }, [])

  const fetchTiers = async () => {
    try {
      const response = await fetch(`${API_GATEWAY}/billing/tiers`)
      if (response.ok) {
        const data = await response.json()
        setTiers(data)
      }
    } catch (error) {
      console.error('Failed to fetch tiers:', error)
    }
  }

  const upgradeSubscription = async (tier) => {
    if (!apiKey) return
    
    setIsUpgrading(true)
    try {
      const response = await fetch(`${API_GATEWAY}/billing/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ tier })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`Upgrade erfolgreich! Transaktion: ${data.transaction_id}`)
      }
    } catch (error) {
      console.error('Upgrade failed:', error)
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Subscription-Pläne</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(tiers).map(([tierKey, tier]) => (
          <Card key={tierKey} className={tierKey === 'pro' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {tier.name}
                {tierKey === 'pro' && <Badge>Beliebt</Badge>}
              </CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold">
                  {tier.price === 0 ? 'Kostenlos' : `€${tier.price}`}
                </span>
                {tier.price > 0 && <span className="text-sm">/Monat</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div>✓ {tier.credits_per_month.toLocaleString()} Credits/Monat</div>
                <div>✓ {tier.max_worlds === -1 ? 'Unbegrenzte' : tier.max_worlds} Welten</div>
                <div>✓ {tier.api_rate_limit} API-Aufrufe/Stunde</div>
                <div>✓ {tier.max_chunks_per_world === -1 ? 'Unbegrenzte' : tier.max_chunks_per_world.toLocaleString()} Chunks/Welt</div>
              </div>
              
              {tierKey !== 'free' && (
                <Button 
                  onClick={() => upgradeSubscription(tierKey)}
                  disabled={isUpgrading || !apiKey}
                  className="w-full mt-4"
                  variant={tierKey === 'pro' ? 'default' : 'outline'}
                >
                  {isUpgrading ? 'Upgrading...' : 'Upgrade'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Marktplatz-Browser
export function MarketplaceBrowser({ apiKey }) {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const categories = ['world', 'module', 'asset', 'template', 'script']

  useEffect(() => {
    fetchItems()
  }, [searchTerm, selectedCategory])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory) params.append('category', selectedCategory)
      
      const response = await fetch(`${API_GATEWAY}/marketplace/items?${params}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const purchaseItem = async (itemId) => {
    if (!apiKey) {
      alert('Bitte registriere dich zuerst für einen API-Zugang')
      return
    }
    
    try {
      const response = await fetch(`${API_GATEWAY}/marketplace/items/${itemId}/purchase`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`Kauf erfolgreich! Transaktion: ${data.transaction_id}`)
        fetchItems() // Refresh
      } else {
        const error = await response.json()
        alert(`Kauf fehlgeschlagen: ${error.error}`)
      }
    } catch (error) {
      console.error('Purchase failed:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <Input
          placeholder="Suche nach Items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Kategorie wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle Kategorien</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Lade Items...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">{item.category}</Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{item.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">
                    <Coins className="h-4 w-4 inline mr-1" />
                    {item.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <Download className="h-3 w-3 inline mr-1" />
                    {item.downloads}
                  </span>
                </div>
                
                <Button 
                  onClick={() => purchaseItem(item.id)}
                  disabled={!apiKey}
                  className="w-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Kaufen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {items.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Items gefunden</p>
        </div>
      )}
    </div>
  )
}

// Item-Upload-Dialog
export function ItemUploadDialog({ apiKey, onItemCreated }) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    data: ''
  })
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!apiKey) return
    
    setIsUploading(true)
    try {
      const response = await fetch(`${API_GATEWAY}/marketplace/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          ...formData,
          data: JSON.parse(formData.data || '{}')
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsOpen(false)
        setFormData({ title: '', description: '', category: '', price: 0, data: '' })
        onItemCreated?.(data.item_id)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={!apiKey}>
          <Upload className="h-4 w-4 mr-2" />
          Item hochladen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Item hochladen</DialogTitle>
          <DialogDescription>
            Verkaufe deine Kreationen im OmniVerse-Marktplatz
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="category">Kategorie</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="world">Welt</SelectItem>
                <SelectItem value="module">Modul</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="script">Script</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="price">Preis (Credits)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="data">Daten (JSON)</Label>
            <Textarea
              id="data"
              value={formData.data}
              onChange={(e) => setFormData({...formData, data: e.target.value})}
              placeholder='{"type": "world", "chunks": [...], "metadata": {...}}'
              className="font-mono text-sm"
            />
          </div>
          
          <Button type="submit" disabled={isUploading} className="w-full">
            {isUploading ? 'Lade hoch...' : 'Item erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Analytics-Dashboard
export function AnalyticsDashboard({ apiKey }) {
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (apiKey) {
      fetchAnalytics()
    }
  }, [apiKey])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_GATEWAY}/analytics/usage`, {
        headers: { 'X-API-Key': apiKey }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!apiKey) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Registriere dich für einen API-Zugang, um Analytics zu sehen.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">Lade Analytics...</div>
  }

  if (!analytics) {
    return <div className="text-center py-8">Keine Analytics-Daten verfügbar</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktuelle Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Coins className="h-5 w-5 mr-2" />
              {analytics.current_credits}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.subscription_tier}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API-Aufrufe (30 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.usage_by_endpoint.reduce((sum, item) => sum + item.calls, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API-Nutzung nach Endpunkt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.usage_by_endpoint.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-mono text-sm">{item.endpoint}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{item.calls} Aufrufe</span>
                  <Badge variant="outline">{item.total_credits} Credits</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
