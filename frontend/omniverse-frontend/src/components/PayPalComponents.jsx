import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Send,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Euro,
  Calendar,
  User,
  Building
} from 'lucide-react'

const API_GATEWAY = 'http://localhost:5006/api'

// PayPal Subscription Upgrade
export function PayPalSubscriptionUpgrade({ apiKey, currentTier, onUpgradeSuccess }) {
  const [selectedTier, setSelectedTier] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [upgradeResult, setUpgradeResult] = useState(null)

  const tiers = {
    basic: { name: 'Basic', price: 9.99, features: ['1,000 Credits/Monat', '10 Welten', '600 API-Aufrufe/h'] },
    pro: { name: 'Pro', price: 29.99, features: ['5,000 Credits/Monat', '50 Welten', '3,600 API-Aufrufe/h'] },
    enterprise: { name: 'Enterprise', price: 99.99, features: ['25,000 Credits/Monat', 'Unbegrenzte Welten', '18,000 API-Aufrufe/h'] }
  }

  const handleUpgrade = async () => {
    if (!selectedTier || !customerName || !customerEmail) {
      alert('Bitte füllen Sie alle Felder aus')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`${API_GATEWAY}/paypal/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          customer_email: customerEmail,
          customer_name: customerName,
          tier: selectedTier
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUpgradeResult(data)
        onUpgradeSuccess?.(data)
      } else {
        const error = await response.json()
        alert(`Upgrade fehlgeschlagen: ${error.error}`)
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Upgrade fehlgeschlagen. Bitte versuchen Sie es erneut.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (upgradeResult) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            PayPal-Rechnung erstellt!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Kunde:</Label>
              <p className="font-medium">{upgradeResult.customer_name}</p>
            </div>
            <div>
              <Label>E-Mail:</Label>
              <p className="font-medium">{upgradeResult.customer_email}</p>
            </div>
            <div>
              <Label>Plan:</Label>
              <p className="font-medium">{upgradeResult.tier}</p>
            </div>
            <div>
              <Label>Betrag:</Label>
              <p className="font-medium">€{upgradeResult.amount}</p>
            </div>
            <div>
              <Label>MwSt (19%):</Label>
              <p className="font-medium">€{upgradeResult.tax_amount?.toFixed(2)}</p>
            </div>
            <div>
              <Label>Gesamt:</Label>
              <p className="font-bold text-lg">€{upgradeResult.total?.toFixed(2)}</p>
            </div>
          </div>
          
          {upgradeResult.paypal_invoice_url && (
            <Button 
              onClick={() => window.open(upgradeResult.paypal_invoice_url, '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              PayPal-Rechnung öffnen
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setUpgradeResult(null)}
            className="w-full"
          >
            Neue Rechnung erstellen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          PayPal Subscription Upgrade
        </CardTitle>
        <CardDescription>
          Erstellen Sie eine echte PayPal-Rechnung für Subscription-Upgrades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName">Kundenname</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Max Mustermann"
            />
          </div>
          <div>
            <Label htmlFor="customerEmail">E-Mail-Adresse</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="kunde@example.com"
            />
          </div>
        </div>

        <div>
          <Label>Subscription-Tier wählen</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {Object.entries(tiers).map(([key, tier]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-colors ${
                  selectedTier === key ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedTier(key)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="text-2xl font-bold text-primary">€{tier.price}</p>
                    <p className="text-sm text-muted-foreground mb-2">/Monat</p>
                    <div className="text-xs space-y-1">
                      {tier.features.map((feature, index) => (
                        <div key={index}>✓ {feature}</div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleUpgrade}
          disabled={isProcessing || !selectedTier || !customerName || !customerEmail}
          className="w-full"
        >
          {isProcessing ? 'Erstelle PayPal-Rechnung...' : 'PayPal-Rechnung erstellen'}
        </Button>

        <Alert>
          <Building className="h-4 w-4" />
          <AlertDescription>
            <strong>Rechnungssteller:</strong> Aaron Linke, Hauptstr 6, Tappenbeck 38479
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

// PayPal Marketplace Payout
export function PayPalMarketplacePayout({ apiKey }) {
  const [sellerEmail, setSellerEmail] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [saleAmount, setSaleAmount] = useState('')
  const [itemName, setItemName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [payoutResult, setPayoutResult] = useState(null)

  const handlePayout = async () => {
    if (!sellerEmail || !sellerName || !saleAmount || !itemName) {
      alert('Bitte füllen Sie alle Felder aus')
      return
    }

    const amount = parseFloat(saleAmount)
    if (amount < 1) {
      alert('Mindestbetrag für Auszahlungen: €1.00')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`${API_GATEWAY}/paypal/marketplace/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          seller_email: sellerEmail,
          seller_name: sellerName,
          sale_amount: amount,
          item_name: itemName
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPayoutResult(data)
        // Reset form
        setSellerEmail('')
        setSellerName('')
        setSaleAmount('')
        setItemName('')
      } else {
        const error = await response.json()
        alert(`Auszahlung fehlgeschlagen: ${error.error}`)
      }
    } catch (error) {
      console.error('Payout error:', error)
      alert('Auszahlung fehlgeschlagen. Bitte versuchen Sie es erneut.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Marktplatz-Auszahlung
          </CardTitle>
          <CardDescription>
            Verarbeiten Sie Auszahlungen an Content-Verkäufer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sellerName">Verkäufername</Label>
              <Input
                id="sellerName"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Content Creator"
              />
            </div>
            <div>
              <Label htmlFor="sellerEmail">PayPal E-Mail</Label>
              <Input
                id="sellerEmail"
                type="email"
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                placeholder="creator@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemName">Verkauftes Item</Label>
              <Input
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Fantasy World Pack"
              />
            </div>
            <div>
              <Label htmlFor="saleAmount">Verkaufsbetrag (€)</Label>
              <Input
                id="saleAmount"
                type="number"
                step="0.01"
                min="1"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                placeholder="29.99"
              />
            </div>
          </div>

          {saleAmount && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Auszahlungsberechnung:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label>Verkaufsbetrag:</Label>
                  <p className="font-medium">€{parseFloat(saleAmount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label>Provision (10%):</Label>
                  <p className="font-medium">€{(parseFloat(saleAmount || 0) * 0.1).toFixed(2)}</p>
                </div>
                <div>
                  <Label>Auszahlung:</Label>
                  <p className="font-bold text-green-600">€{(parseFloat(saleAmount || 0) * 0.9).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handlePayout}
            disabled={isProcessing || !sellerEmail || !sellerName || !saleAmount || !itemName}
            className="w-full"
          >
            {isProcessing ? 'Verarbeite Auszahlung...' : 'Auszahlung verarbeiten'}
          </Button>
        </CardContent>
      </Card>

      {payoutResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              Auszahlung erfolgreich verarbeitet!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Verkäufer:</Label>
                <p className="font-medium">{payoutResult.seller_name}</p>
              </div>
              <div>
                <Label>E-Mail:</Label>
                <p className="font-medium">{payoutResult.seller_email}</p>
              </div>
              <div>
                <Label>Item:</Label>
                <p className="font-medium">{payoutResult.item_name}</p>
              </div>
              <div>
                <Label>Auszahlung:</Label>
                <p className="font-bold text-green-600">€{payoutResult.seller_payout?.toFixed(2)}</p>
              </div>
            </div>
            <Badge variant="outline" className="mt-4">
              Status: {payoutResult.status}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// PayPal Transactions Overview
export function PayPalTransactions({ apiKey }) {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: ''
  })

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)

      const response = await fetch(`${API_GATEWAY}/paypal/transactions?${params}`, {
        headers: { 'X-API-Key': apiKey }
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (apiKey) {
      fetchTransactions()
    }
  }, [apiKey, filters])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Receipt className="h-5 w-5 mr-2" />
          PayPal Transaktionen
        </CardTitle>
        <CardDescription>
          Übersicht aller PayPal-Transaktionen und Auszahlungen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-4">
          <Input
            type="date"
            placeholder="Startdatum"
            value={filters.start_date}
            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
          />
          <Input
            type="date"
            placeholder="Enddatum"
            value={filters.end_date}
            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
          />
          <Button onClick={fetchTransactions} disabled={isLoading}>
            {isLoading ? 'Lade...' : 'Aktualisieren'}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Lade Transaktionen...</div>
        ) : (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Transaktionen gefunden</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>PayPal-Transaktionen werden nach der Authentifizierung angezeigt</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// PayPal Revenue Dashboard
export function PayPalRevenueDashboard({ apiKey }) {
  const [revenue, setRevenue] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchRevenue = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_GATEWAY}/paypal/revenue`, {
        headers: { 'X-API-Key': apiKey }
      })

      if (response.ok) {
        const data = await response.json()
        setRevenue(data)
      }
    } catch (error) {
      console.error('Failed to fetch revenue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (apiKey) {
      fetchRevenue()
    }
  }, [apiKey])

  if (isLoading) {
    return <div className="text-center py-8">Lade Umsatzdaten...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center">
            <Euro className="h-5 w-5 mr-2" />
            {revenue?.total_revenue?.toFixed(2) || '0.00'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Subscription-Umsatz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            €{revenue?.subscription_revenue?.toFixed(2) || '0.00'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Marktplatz-Provision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            €{revenue?.marketplace_commission?.toFixed(2) || '0.00'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Netto-Gewinn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center text-green-600">
            <TrendingUp className="h-5 w-5 mr-2" />
            €{revenue?.net_profit?.toFixed(2) || '0.00'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
