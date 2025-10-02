from flask import Flask, request, jsonify, g
from flask_cors import CORS
import requests
import time
import hashlib
import hmac
import json
import sqlite3
import uuid
from datetime import datetime, timedelta
from functools import wraps
import logging

app = Flask(__name__)
CORS(app)



# Konfiguration
API_CONFIG = {
    'world_generator': 'http://world-generator:5002/api',
    'game_engine': 'http://game-engine:5241/api/GameEngine',
    'network_sim': 'http://network-sim:5005/api'
}

# Datenbank-Setup
DATABASE = 'data/omniverse.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Initialisiert die Datenbank mit den erforderlichen Tabellen."""
    with app.app_context():
        db = get_db()
        db.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                api_key TEXT UNIQUE NOT NULL,
                subscription_tier TEXT DEFAULT 'free',
                credits INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS api_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                credits_used INTEGER DEFAULT 1,
                response_time REAL,
                status_code INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                tier TEXT NOT NULL,
                price REAL NOT NULL,
                credits_included INTEGER NOT NULL,
                valid_until TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            
            CREATE TABLE IF NOT EXISTS marketplace_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                data TEXT NOT NULL,
                downloads INTEGER DEFAULT 0,
                rating REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                buyer_id TEXT NOT NULL,
                seller_id TEXT,
                item_id TEXT,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (buyer_id) REFERENCES users (id),
                FOREIGN KEY (seller_id) REFERENCES users (id),
                FOREIGN KEY (item_id) REFERENCES marketplace_items (id)
            );
        ''')
        db.commit()

# Subscription-Tiers
SUBSCRIPTION_TIERS = {
    'free': {
        'name': 'Free',
        'price': 0,
        'credits_per_month': 100,
        'max_worlds': 3,
        'max_chunks_per_world': 100,
        'api_rate_limit': 60  # requests per hour
    },
    'basic': {
        'name': 'Basic',
        'price': 9.99,
        'credits_per_month': 1000,
        'max_worlds': 10,
        'max_chunks_per_world': 1000,
        'api_rate_limit': 600
    },
    'pro': {
        'name': 'Pro',
        'price': 29.99,
        'credits_per_month': 5000,
        'max_worlds': 50,
        'max_chunks_per_world': 10000,
        'api_rate_limit': 3600
    },
    'enterprise': {
        'name': 'Enterprise',
        'price': 99.99,
        'credits_per_month': 25000,
        'max_worlds': -1,  # unlimited
        'max_chunks_per_world': -1,  # unlimited
        'api_rate_limit': 18000
    }
}

# API-Endpunkt-Kosten (in Credits)
ENDPOINT_COSTS = {
    '/api/world/generate_chunk': 1,
    '/api/world/add_influence_map': 2,
    '/api/game/start': 1,
    '/api/game/activate_module': 1,
    '/api/network/create_topology': 3,
    '/api/network/simulate_packet': 1
}

def require_api_key(f):
    """Decorator für API-Key-Authentifizierung."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE api_key = ?', (api_key,)).fetchone()
        if not user:
            return jsonify({'error': 'Invalid API key'}), 401
        
        # Update last active
        db.execute('UPDATE users SET last_active = ? WHERE id = ?', 
                  (datetime.utcnow(), user['id']))
        db.commit()
        
        g.current_user = dict(user)
        return f(*args, **kwargs)
    return decorated_function

def check_credits(cost):
    """Decorator für Credit-Überprüfung."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if g.current_user['credits'] < cost:
                return jsonify({
                    'error': 'Insufficient credits',
                    'required': cost,
                    'available': g.current_user['credits']
                }), 402
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def deduct_credits(cost):
    """Zieht Credits vom Benutzerkonto ab."""
    db = get_db()
    db.execute('UPDATE users SET credits = credits - ? WHERE id = ?', 
              (cost, g.current_user['id']))
    db.commit()
    g.current_user['credits'] -= cost

def log_api_usage(endpoint, method, status_code, response_time, credits_used=1):
    """Protokolliert API-Nutzung."""
    db = get_db()
    db.execute('''
        INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time, credits_used)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (g.current_user['id'], endpoint, method, status_code, response_time, credits_used))
    db.commit()

# === API-Endpunkte ===

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Registriert einen neuen Benutzer."""
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email required'}), 400
    
    # Generiere API-Key
    api_key = hashlib.sha256(f"{email}{time.time()}".encode()).hexdigest()
    user_id = str(uuid.uuid4())
    
    try:
        db = get_db()
        db.execute('''
            INSERT INTO users (id, email, api_key, subscription_tier, credits)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, email, api_key, 'free', 100))
        db.commit()
        
        return jsonify({
            'user_id': user_id,
            'api_key': api_key,
            'subscription_tier': 'free',
            'credits': 100
        })
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already registered'}), 409

@app.route('/api/auth/profile', methods=['GET'])
@require_api_key
def get_profile():
    """Gibt das Benutzerprofil zurück."""
    return jsonify({
        'user_id': g.current_user['id'],
        'email': g.current_user['email'],
        'subscription_tier': g.current_user['subscription_tier'],
        'credits': g.current_user['credits'],
        'created_at': g.current_user['created_at'],
        'last_active': g.current_user['last_active']
    })

@app.route('/api/billing/tiers', methods=['GET'])
def get_subscription_tiers():
    """Gibt verfügbare Subscription-Tiers zurück."""
    return jsonify(SUBSCRIPTION_TIERS)

@app.route('/api/billing/buy_credits', methods=['POST'])
@require_api_key
def buy_credits():
    """Ermöglicht Benutzern den Kauf von Credit-Paketen."""
    data = request.get_json()
    package_id = data.get('package_id')

    credit_packages = {
        'small': {'credits': 500, 'price': 4.99},
        'medium': {'credits': 1200, 'price': 9.99},
        'large': {'credits': 3000, 'price': 19.99}
    }

    if package_id not in credit_packages:
        return jsonify({'error': 'Invalid credit package ID'}), 400

    package = credit_packages[package_id]
    transaction_id = str(uuid.uuid4())

    db = get_db()
    try:
        # Erstelle Transaktion
        db.execute('''
            INSERT INTO transactions (id, buyer_id, amount, type, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (transaction_id, g.current_user['id'], package['price'], 'credit_purchase', 'completed'))

        # Füge Credits zum Benutzerkonto hinzu
        db.execute('UPDATE users SET credits = credits + ? WHERE id = ?',
                  (package['credits'], g.current_user['id']))
        db.commit()

        return jsonify({
            'transaction_id': transaction_id,
            'credits_added': package['credits'],
            'new_balance': g.current_user['credits'] + package['credits']
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/billing/upgrade', methods=['POST'])
@require_api_key
def upgrade_subscription():
    """Upgraded die Subscription eines Benutzers."""
    data = request.get_json()
    tier = data.get('tier')
    
    if tier not in SUBSCRIPTION_TIERS:
        return jsonify({'error': 'Invalid subscription tier'}), 400
    
    if tier == 'free':
        return jsonify({'error': 'Cannot upgrade to free tier'}), 400
    
    tier_info = SUBSCRIPTION_TIERS[tier]
    
    # Simuliere Zahlungsverarbeitung
    transaction_id = str(uuid.uuid4())
    
    db = get_db()
    
    # Erstelle Transaktion
    db.execute('''
        INSERT INTO transactions (id, buyer_id, amount, type, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (transaction_id, g.current_user['id'], tier_info['price'], 'subscription', 'completed'))
    
    # Update Subscription
    valid_until = datetime.utcnow() + timedelta(days=30)
    db.execute('''
        INSERT INTO subscriptions (user_id, tier, price, credits_included, valid_until)
        VALUES (?, ?, ?, ?, ?)
    ''', (g.current_user['id'], tier, tier_info['price'], tier_info['credits_per_month'], valid_until))
    
    # Update User
    db.execute('''
        UPDATE users SET subscription_tier = ?, credits = credits + ?
        WHERE id = ?
    ''', (tier, tier_info['credits_per_month'], g.current_user['id']))
    
    db.commit()
    
    return jsonify({
        'transaction_id': transaction_id,
        'tier': tier,
        'credits_added': tier_info['credits_per_month'],
        'valid_until': valid_until.isoformat()
    })

# === Proxied API-Endpunkte ===

@app.route('/api/world/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@require_api_key
@check_credits(1)
def proxy_world_api(endpoint):
    """Proxy für Weltgenerator-API."""
    start_time = time.time()
    
    try:
        url = f"{API_CONFIG['world_generator']}/{endpoint}"
        
        if request.method == 'GET':
            response = requests.get(url, params=request.args)
        else:
            response = requests.request(
                request.method,
                url,
                json=request.get_json(),
                params=request.args
            )
        
        response_time = time.time() - start_time
        cost = ENDPOINT_COSTS.get(f'/api/world/{endpoint}', 1)
        
        deduct_credits(cost)
        log_api_usage(f'/api/world/{endpoint}', request.method, 
                     response.status_code, response_time, cost)
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        response_time = time.time() - start_time
        log_api_usage(f'/api/world/{endpoint}', request.method, 500, response_time)
        return jsonify({'error': str(e)}), 500

@app.route('/api/game/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@require_api_key
@check_credits(1)
def proxy_game_api(endpoint):
    """Proxy für Game-Engine-API."""
    start_time = time.time()
    
    try:
        url = f"{API_CONFIG['game_engine']}/{endpoint}"
        
        if request.method == 'GET':
            response = requests.get(url, params=request.args)
        else:
            response = requests.request(
                request.method,
                url,
                json=request.get_json(),
                params=request.args
            )
        
        response_time = time.time() - start_time
        cost = ENDPOINT_COSTS.get(f'/api/game/{endpoint}', 1)
        
        deduct_credits(cost)
        log_api_usage(f'/api/game/{endpoint}', request.method, 
                     response.status_code, response_time, cost)
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        response_time = time.time() - start_time
        log_api_usage(f'/api/game/{endpoint}', request.method, 500, response_time)
        return jsonify({'error': str(e)}), 500

# === Marktplatz-API ===

@app.route('/api/marketplace/items', methods=['GET'])
def get_marketplace_items():
    """Gibt Marktplatz-Items zurück."""
    category = request.args.get('category')
    search = request.args.get('search', '')
    
    db = get_db()
    query = '''
        SELECT m.*, u.email as seller_email 
        FROM marketplace_items m 
        JOIN users u ON m.user_id = u.id
        WHERE 1=1
    '''
    params = []
    
    if category:
        query += ' AND m.category = ?'
        params.append(category)
    
    if search:
        query += ' AND (m.title LIKE ? OR m.description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    query += ' ORDER BY m.created_at DESC'
    
    items = db.execute(query, params).fetchall()
    
    return jsonify([dict(item) for item in items])

@app.route('/api/marketplace/items', methods=['POST'])
@require_api_key
def create_marketplace_item():
    """Erstellt ein neues Marktplatz-Item."""
    data = request.get_json()
    
    item_id = str(uuid.uuid4())
    
    db = get_db()
    db.execute('''
        INSERT INTO marketplace_items (id, user_id, title, description, category, price, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        item_id,
        g.current_user['id'],
        data['title'],
        data.get('description', ''),
        data['category'],
        data['price'],
        json.dumps(data['data'])
    ))
    db.commit()
    
    return jsonify({'item_id': item_id}), 201

@app.route('/api/marketplace/items/<item_id>/purchase', methods=['POST'])
@require_api_key
def purchase_item(item_id):
    """Kauft ein Marktplatz-Item."""
    db = get_db()
    item = db.execute('SELECT * FROM marketplace_items WHERE id = ?', (item_id,)).fetchone()
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    if g.current_user['credits'] < item['price']:
        return jsonify({
            'error': 'Insufficient credits',
            'required': item['price'],
            'available': g.current_user['credits']
        }), 402
    
    transaction_id = str(uuid.uuid4())
    
    # Erstelle Transaktion
    db.execute('''
        INSERT INTO transactions (id, buyer_id, seller_id, item_id, amount, type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (transaction_id, g.current_user['id'], item['user_id'], item_id, item['price'], 'purchase', 'completed'))
    
    # Deduct credits from buyer
    db.execute('UPDATE users SET credits = credits - ? WHERE id = ?', 
              (item['price'], g.current_user['id']))
    
    # Add credits to seller (minus 10% platform fee)
    seller_amount = item['price'] * 0.9
    db.execute('UPDATE users SET credits = credits + ? WHERE id = ?', 
              (seller_amount, item['user_id']))
    
    # Update download count
    db.execute('UPDATE marketplace_items SET downloads = downloads + 1 WHERE id = ?', (item_id,))
    
    db.commit()
    
    return jsonify({
        'transaction_id': transaction_id,
        'item_data': json.loads(item['data'])
    })

@app.route('/api/analytics/usage', methods=['GET'])
@require_api_key
def get_usage_analytics():
    """Gibt Nutzungsanalysen zurück."""
    days = int(request.args.get('days', 30))
    
    db = get_db()
    
    # API-Nutzung der letzten X Tage
    usage = db.execute('''
        SELECT endpoint, COUNT(*) as calls, SUM(credits_used) as total_credits
        FROM api_usage 
        WHERE user_id = ? AND timestamp > datetime('now', '-{} days')
        GROUP BY endpoint
        ORDER BY calls DESC
    '''.format(days), (g.current_user['id'],)).fetchall()
    
    # Tägliche Statistiken
    daily_stats = db.execute('''
        SELECT DATE(timestamp) as date, COUNT(*) as calls, SUM(credits_used) as credits
        FROM api_usage 
        WHERE user_id = ? AND timestamp > datetime('now', '-{} days')
        GROUP BY DATE(timestamp)
        ORDER BY date
    '''.format(days), (g.current_user['id'],)).fetchall()
    
    return jsonify({
        'usage_by_endpoint': [dict(row) for row in usage],
        'daily_stats': [dict(row) for row in daily_stats],
        'current_credits': g.current_user['credits'],
        'subscription_tier': g.current_user['subscription_tier']
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health-Check-Endpunkt."""
    return jsonify({
        'status': 'healthy',
        'service': 'api-gateway',
        'timestamp': datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    init_db()
    logging.basicConfig(level=logging.INFO)
    
    # PayPal-Integration hinzufügen
    try:
        from paypal_integration import add_paypal_routes
        add_paypal_routes(app)
        print("💳 PayPal Business Integration: Aktiviert")
    except ImportError:
        print("⚠️  PayPal Integration nicht verfügbar")
    
    print("🌐 OmniVerse API Gateway")
    print("🔐 Authentifizierung: API-Key basiert")
    print("💰 Monetarisierung: Aktiviert")
    print("🛒 Marktplatz: Verfügbar")
    print("🏦 PayPal Business: Integriert")
    print("🚀 Gateway läuft auf http://0.0.0.0:5006")
    
    app.run(host='0.0.0.0', port=5006, debug=True)
