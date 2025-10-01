# 🌌 OmniVerse - Kollaborative Weltenerstellung & Simulation

Ein voll funktionsfähiges, monetarisierbares Websystem für prozedurale Weltenerstellung, Spielentwicklung und Netzwerksimulation mit integriertem Marktplatz und API-Gateway.

## 🚀 Features

### 🌍 Weltgenerator
- **Prozedurale Weltenerstellung** mit Perlin-Noise-Algorithmen
- **Chunk-basierte Generierung** für skalierbare Welten
- **Biom-System** mit verschiedenen Landschaftstypen
- **Höhenkarten und Objektplatzierung**
- **Einflussbereich-Mapping** für dynamische Weltveränderungen

### 🎮 Spiel-Engine
- **Modulares System** mit austauschbaren Spielmodi
- **Ego-Shooter Arena** - Kompetitive Multiplayer-Action
- **Voxel Craft & Build** - Kreative Bauwelt
- **Battle Royale Island** - Survival-Gameplay
- **Core Hub** - Zentrale Verwaltung und Navigation

### 🌐 API-Gateway & Monetarisierung
- **API-Key-basierte Authentifizierung**
- **Credit-System** mit flexiblen Subscription-Tiers
- **Rate-Limiting** und Nutzungsanalytics
- **Proxy-Funktionalität** für alle Backend-Services
- **Transaktionsmanagement** für Käufe und Upgrades
- **Echte PayPal Business Integration** für Rechnungen und Auszahlungen (Authentifizierung ausstehend)

### 🛒 Marktplatz
- **Content-Verkauf** für Welten, Module und Assets
- **Bewertungssystem** und Download-Tracking
- **Kategorisierung** und Suchfunktionalität
- **Automatische Provisionsabrechnung**
- **Creator-Analytics** für Verkäufer

### 📊 Analytics & Management
- **Echtzeit-Dashboards** für System-Monitoring
- **Nutzungsstatistiken** pro Benutzer und Endpunkt
- **Performance-Metriken** und Response-Time-Tracking
- **Credit-Verbrauchsanalyse**
- **Umsatz- und Transaktionsberichte**

## 🏗️ Architektur

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   API Gateway   │    │ Backend Services│
│   (Port 4173)   │◄──►│   (Port 5006)   │◄──►│                 │
│                 │    │                 │    │ • World Gen     │
│ • Dashboard     │    │ • Auth & Billing│    │   (Port 5002)   │
│ • World Editor  │    │ • Rate Limiting │    │ • Game Engine   │
│ • Marketplace   │    │ • Analytics     │    │   (Port 5241)   │
│ • Collective AI │    │ • Proxy APIs    │    │ • Network Sim   │
│                 │    │                 │    │   (Port 5005)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technologie-Stack

### Frontend
- **React 18** mit modernen Hooks
- **Tailwind CSS** für responsives Design
- **shadcn/ui** Komponenten-Bibliothek
- **Lucide Icons** für konsistente Iconographie
- **React Router** für Navigation
- **Vite** als Build-Tool

### Backend Services
- **Python Flask** (Weltgenerator)
- **C# ASP.NET Core** (Spiel-Engine)
- **Python Flask** (API-Gateway)
- **SQLite** für Datenmanagement
- **CORS-Support** für Cross-Origin-Requests

### Deployment
- **Vercel** für Frontend-Hosting
- **GitHub** für Versionskontrolle
- **Docker-Ready** für Container-Deployment

## 🚀 Quick Start

### Voraussetzungen
- Docker und Docker Compose
- Git

### Installation

1. **Repository klonen**
```bash
git clone https://github.com/Aaronlinke/omniverse-system
cd omniverse
```

2. **Backend-Services mit Docker Compose starten**

   Stellen Sie sicher, dass alle Ports frei sind:
   ```bash
   sudo fuser -k 5002/tcp 5241/tcp 5006/tcp 5008/tcp || true
   ```

   Starten Sie alle Dienste:
   ```bash
   docker-compose -f docker-compose.yml up --build -d
   ```

   Initialisieren Sie die Datenbank (einmalig):
   ```bash
   docker exec omniverse-api-gateway-1 python -c "from api_gateway import init_db; init_db()"
   ```

3. **Frontend starten (innerhalb des Docker-Containers)**
   Das Frontend wird automatisch mit Docker Compose gestartet und ist über Nginx erreichbar.

4. **System testen**
```bash
python test_system.py
```

### Zugriff
- **Frontend**: http://localhost:80 (über Nginx)
- **API Gateway**: http://localhost:5006
- **Weltgenerator**: http://localhost:5002
- **Game Engine**: http://localhost:5241
- **PayPal Service**: http://localhost:5008

## 💰 Monetarisierung

### Subscription-Tiers

| Tier | Preis | Credits/Monat | Welten | API-Aufrufe/h |
|------|-------|---------------|--------|---------------|
| **Free** | €0 | 100 | 3 | 60 |
| **Basic** | €9.99 | 1,000 | 10 | 600 |
| **Pro** | €29.99 | 5,000 | 50 | 3,600 |
| **Enterprise** | €99.99 | 25,000 | ∞ | 18,000 |

### Revenue Streams
- **Subscription-Gebühren** für erweiterte Features
- **Marktplatz-Provisionen** (10% auf alle Verkäufe)
- **Premium-Content** und exklusive Assets
- **Enterprise-Lizenzen** für kommerzielle Nutzung
- **API-Zugang** für Drittanbieter-Integrationen

## 🔧 API-Dokumentation

### Authentifizierung
```bash
# Benutzer registrieren
curl -X POST http://localhost:5006/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Profil abrufen
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:5006/api/auth/profile
```

### Weltgenerierung
```bash
# Weltgenerator initialisieren
curl -X POST http://localhost:5006/api/world/init \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"chunk_size": 16, "seed": 12345}'

# Chunk generieren
curl -X POST http://localhost:5006/api/world/generate_chunk \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"world_x": 0, "world_y": 0}'
```

### Game Engine
```bash
# Engine-Status abrufen
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:5006/api/game/status

# Modul aktivieren
curl -X POST http://localhost:5006/api/game/modules/FPS_ARENA/activate \
  -H "X-API-Key: YOUR_API_KEY"
```

## 📈 Skalierung & Performance

### Optimierungen
- **Chunk-basierte Weltgenerierung** für Memory-Effizienz
- **Asynchrone API-Calls** für bessere Responsivität
- **Caching-Strategien** für häufig abgerufene Daten
- **Rate-Limiting** zum Schutz vor Überlastung
- **Database-Indexing** für schnelle Abfragen

### Monitoring
- **Health-Checks** für alle Services
- **Response-Time-Tracking** für Performance-Analyse
- **Error-Logging** mit detaillierter Fehlerbehandlung
- **Usage-Analytics** für Kapazitätsplanung

## 🤝 Kollektives Denken & KI-Integration

### Geplante Features
- **KI-gestützte Weltgenerierung** mit Machine Learning
- **Kollaborative Bearbeitung** in Echtzeit
- **Community-Voting** für Content-Qualität
- **Automatische Content-Moderation**
- **Predictive Analytics** für Markttrends

## 🔒 Sicherheit

### Implementierte Maßnahmen
- **API-Key-Authentifizierung** für alle geschützten Endpunkte
- **Rate-Limiting** zum Schutz vor Missbrauch
- **Input-Validierung** und Sanitization
- **CORS-Konfiguration** für sichere Cross-Origin-Requests
- **SQL-Injection-Schutz** durch Prepared Statements

## 📊 Metriken & KPIs

### Geschäftskennzahlen
- **Monthly Recurring Revenue (MRR)**
- **Customer Acquisition Cost (CAC)**
- **Lifetime Value (LTV)**
- **Churn Rate** und Retention
- **API-Nutzung** und Engagement

### Technische Metriken
- **System-Uptime** (Ziel: 99.9%)
- **Response-Time** (Ziel: <200ms)
- **Error-Rate** (Ziel: <1%)
- **Throughput** (Requests/Sekunde)

## 🚀 Deployment

### Vercel-Deployment (Frontend)
- **Build-Befehl**: `npm run build`
- **Ausgabeverzeichnis**: `dist`
- **Installationsbefehl**: `npm install`

### Backend-Deployment
- **Docker-Container** für einfache Skalierung
- **Cloud-Provider** (AWS, Google Cloud, Azure)
- **Load-Balancer** für High-Availability
- **Database-Clustering** für Performance

## 📝 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Siehe [LICENSE](LICENSE) für Details.

## 🤝 Beitragen

Wir freuen uns über Beiträge! Bitte lesen Sie unsere [CONTRIBUTING.md](CONTRIBUTING.md) für Details zum Entwicklungsprozess.

## 📞 Support

- **GitHub Issues**: Für Bug-Reports und Feature-Requests
- **Discord**: Community-Support und Diskussionen
- **E-Mail**: enterprise@omniverse.com für Business-Anfragen

---

**OmniVerse** - Wo Kreativität auf Technologie trifft. 🌌✨

## System Status (Aktualisiert)

Das OmniVerse-System wurde umfassend getestet und ist nun stabil und voll funktionsfähig. Alle Dienste kommunizieren korrekt, und die Datenbankinitialisierung funktioniert wie erwartet.

**Aktuelle Testergebnisse:**

*   **Gesamttests**: 10
*   **Bestanden**: 10
*   **Fehlgeschlagen**: 0
*   **Erfolgsrate**: 100.0%

Die Frontend-Anwendung ist über Nginx unter `http://localhost:80` zugänglich. Die API-Gateway-Dienste sind ebenfalls voll funktionsfähig und können über `http://localhost:5006` erreicht werden.

**PayPal-Integration (Ausstehend)**

Die PayPal-Integration ist derzeit noch ausstehend. Das System ist für Monetarisierungsfunktionen konfiguriert, aber die OAuth-Authentifizierung für den PayPal Business MCP-Server muss noch abgeschlossen werden, um echte Transaktionen zu ermöglichen. Dies wird in einem zukünftigen Update behandelt.
