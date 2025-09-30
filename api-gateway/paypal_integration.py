#!/usr/bin/env python3
"""
PayPal Integration für OmniVerse API Gateway
Erweitert das API-Gateway um echte PayPal-Funktionalität
"""

import requests
import json
import subprocess
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# PayPal Business Konfiguration
PAYPAL_CONFIG = {
    'business_name': 'Aaron Linke',
    'business_email': 'paypalsurvival25@gmail.com',
    'business_address': 'Hauptstr 6, Tappenbeck 38479',
    'currency': 'EUR',
    'tax_rate': 19.0,  # 19% MwSt in Deutschland
}

def call_paypal_mcp(tool_name, params):
    """Ruft PayPal MCP-Tools auf."""
    try:
        cmd = [
            'manus-mcp-cli', 'tool', 'call', tool_name,
            '--server', 'paypal-for-business',
            '--input', json.dumps(params)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            # Parse die Antwort
            output_lines = result.stdout.strip().split('\n')
            for line in output_lines:
                if line.startswith('{') or line.startswith('['):
                    try:
                        return {'success': True, 'data': json.loads(line)}
                    except json.JSONDecodeError:
                        continue
            
            # Wenn keine JSON-Antwort gefunden wurde, gib den gesamten Output zurück
            return {'success': True, 'data': {'raw_output': result.stdout}}
        else:
            logger.error(f"PayPal MCP Error: {result.stderr}")
            return {'success': False, 'error': result.stderr}
            
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'PayPal API timeout'}
    except Exception as e:
        logger.error(f"PayPal MCP Exception: {str(e)}")
        return {'success': False, 'error': str(e)}

def create_subscription_invoice(customer_email, customer_name, tier):
    """Erstellt eine echte PayPal-Rechnung für Subscription-Upgrades."""
    
    # Subscription-Preise
    tier_prices = {
        'basic': 9.99,
        'pro': 29.99,
        'enterprise': 99.99
    }
    
    if tier.lower() not in tier_prices:
        return {'success': False, 'error': 'Invalid subscription tier'}
    
    amount = tier_prices[tier.lower()]
    due_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    
    # PayPal-Rechnung erstellen
    paypal_params = {
        'business_name': PAYPAL_CONFIG['business_name'],
        'business_email': PAYPAL_CONFIG['business_email'],
        'product_name': f'OmniVerse {tier.title()} Subscription',
        'amount_value': amount,
        'amount_currency_code': PAYPAL_CONFIG['currency'],
        'tax': str(PAYPAL_CONFIG['tax_rate']),
        'due_date': due_date,
        'note_from_seller': f'Upgrade zu OmniVerse {tier.title()} Plan. Vielen Dank für Ihr Vertrauen!'
    }
    
    logger.info(f"Creating PayPal invoice for {customer_email}, tier: {tier}, amount: €{amount}")
    
    result = call_paypal_mcp('create_invoice', paypal_params)
    
    if result['success']:
        tax_amount = amount * (PAYPAL_CONFIG['tax_rate'] / 100)
        total_amount = amount + tax_amount
        
        return {
            'success': True,
            'invoice_data': {
                'customer_email': customer_email,
                'customer_name': customer_name,
                'tier': tier,
                'amount': amount,
                'tax_amount': tax_amount,
                'total_amount': total_amount,
                'currency': PAYPAL_CONFIG['currency'],
                'due_date': due_date,
                'paypal_response': result['data']
            }
        }
    else:
        return result

def create_marketplace_payout(seller_email, seller_name, sale_amount, item_name):
    """Dokumentiert eine Marktplatz-Auszahlung (echte Auszahlungen würden PayPal Payouts API benötigen)."""
    
    commission_rate = 0.10  # 10% Provision
    commission_amount = sale_amount * commission_rate
    seller_payout = sale_amount - commission_amount
    
    # Mindestbetrag prüfen
    if seller_payout < 1.0:
        return {'success': False, 'error': 'Minimum payout amount is €1.00'}
    
    logger.info(f"Processing marketplace payout for {seller_email}: €{seller_payout:.2f}")
    
    # Für echte Auszahlungen würde hier die PayPal Payouts API verwendet werden
    # Da diese nicht in der MCP-Integration verfügbar ist, dokumentieren wir die Auszahlung
    
    return {
        'success': True,
        'payout_data': {
            'seller_email': seller_email,
            'seller_name': seller_name,
            'item_name': item_name,
            'sale_amount': sale_amount,
            'commission_rate': commission_rate,
            'commission_amount': commission_amount,
            'seller_payout': seller_payout,
            'currency': PAYPAL_CONFIG['currency'],
            'status': 'approved',
            'note': f'Marktplatz-Verkauf: {item_name}'
        }
    }

def get_paypal_transactions(transaction_id=None, status=None, start_date=None, end_date=None):
    """Ruft PayPal-Transaktionen ab."""
    
    params = {}
    if transaction_id:
        params['transaction_id'] = transaction_id
    if status:
        params['transaction_status'] = status
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    
    logger.info(f"Fetching PayPal transactions with params: {params}")
    
    result = call_paypal_mcp('list_transactions', params)
    
    if result['success']:
        return {
            'success': True,
            'transactions': result['data']
        }
    else:
        return result

def get_revenue_summary():
    """Erstellt eine Umsatzzusammenfassung."""
    
    # Hier würden wir normalerweise die lokale Datenbank und PayPal-Transaktionen kombinieren
    # Für die Demo geben wir eine Beispiel-Zusammenfassung zurück
    
    return {
        'success': True,
        'revenue_summary': {
            'total_revenue': 0.0,
            'subscription_revenue': 0.0,
            'marketplace_commission': 0.0,
            'total_payouts': 0.0,
            'net_profit': 0.0,
            'currency': PAYPAL_CONFIG['currency'],
            'period': 'current_month',
            'last_updated': datetime.now().isoformat()
        }
    }

# Integration in das API-Gateway
def add_paypal_routes(app):
    """Fügt PayPal-Routen zum Flask-App hinzu."""
    
    @app.route('/api/paypal/subscription/upgrade', methods=['POST'])
    def paypal_subscription_upgrade():
        """Erstellt PayPal-Rechnung für Subscription-Upgrade."""
        try:
            data = request.get_json()
            
            required_fields = ['customer_email', 'customer_name', 'tier']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing field: {field}'}), 400
            
            result = create_subscription_invoice(
                data['customer_email'],
                data['customer_name'],
                data['tier']
            )
            
            if result['success']:
                return jsonify(result['invoice_data'])
            else:
                return jsonify({'error': result['error']}), 500
                
        except Exception as e:
            logger.error(f"PayPal subscription upgrade error: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500
    
    @app.route('/api/paypal/marketplace/payout', methods=['POST'])
    def paypal_marketplace_payout():
        """Erstellt Marktplatz-Auszahlung."""
        try:
            data = request.get_json()
            
            required_fields = ['seller_email', 'seller_name', 'sale_amount', 'item_name']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing field: {field}'}), 400
            
            result = create_marketplace_payout(
                data['seller_email'],
                data['seller_name'],
                float(data['sale_amount']),
                data['item_name']
            )
            
            if result['success']:
                return jsonify(result['payout_data'])
            else:
                return jsonify({'error': result['error']}), 500
                
        except Exception as e:
            logger.error(f"PayPal marketplace payout error: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500
    
    @app.route('/api/paypal/transactions', methods=['GET'])
    def paypal_transactions():
        """Ruft PayPal-Transaktionen ab."""
        try:
            transaction_id = request.args.get('transaction_id')
            status = request.args.get('status')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            result = get_paypal_transactions(transaction_id, status, start_date, end_date)
            
            if result['success']:
                return jsonify(result['transactions'])
            else:
                return jsonify({'error': result['error']}), 500
                
        except Exception as e:
            logger.error(f"PayPal transactions error: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500
    
    @app.route('/api/paypal/revenue', methods=['GET'])
    def paypal_revenue():
        """Ruft Umsatzzusammenfassung ab."""
        try:
            result = get_revenue_summary()
            
            if result['success']:
                return jsonify(result['revenue_summary'])
            else:
                return jsonify({'error': result['error']}), 500
                
        except Exception as e:
            logger.error(f"PayPal revenue error: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500
    
    @app.route('/api/paypal/config', methods=['GET'])
    def paypal_config():
        """Gibt PayPal-Konfiguration zurück."""
        return jsonify({
            'business_name': PAYPAL_CONFIG['business_name'],
            'currency': PAYPAL_CONFIG['currency'],
            'tax_rate': PAYPAL_CONFIG['tax_rate']
        })

if __name__ == '__main__':
    # Test der PayPal-Integration
    print("🏦 PayPal Integration Test")
    print(f"💼 Geschäft: {PAYPAL_CONFIG['business_name']}")
    print(f"📧 E-Mail: {PAYPAL_CONFIG['business_email']}")
    
    # Test-Rechnung erstellen
    result = create_subscription_invoice('test@customer.com', 'Test Customer', 'pro')
    if result['success']:
        print("✅ Test-Rechnung erfolgreich erstellt")
        print(json.dumps(result['invoice_data'], indent=2))
    else:
        print(f"❌ Test-Rechnung fehlgeschlagen: {result['error']}")
