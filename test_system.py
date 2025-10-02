#!/usr/bin/env python3
"""
OmniVerse System Integration Test
Testet alle Komponenten des OmniVerse-Systems
"""

import requests
import json
import time
import sys
from datetime import datetime

# Service-URLs
SERVICES = {
    'world_generator': 'http://localhost:5002/api',
    'game_engine': 'http://localhost:5241/api/GameEngine',
    'api_gateway': 'http://localhost:5006/api',
    'frontend': 'http://localhost:4173'
}

class OmniVerseSystemTest:
    def __init__(self):
        self.api_key = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """Protokolliert Testergebnisse."""
        status = "✅ PASS" if success else "❌ FAIL"
        timestamp = datetime.now().strftime("%H:%M:%S")
        result = f"[{timestamp}] {status} {test_name}"
        if message:
            result += f" - {message}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': timestamp
        })
        
    def test_service_health(self, service_name, url):
        """Testet den Health-Check eines Services."""
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test(f"{service_name} Health Check", True, f"Status: {data.get('status', 'unknown')}")
                return True
            else:
                self.log_test(f"{service_name} Health Check", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test(f"{service_name} Health Check", False, str(e))
            return False
    
    def test_user_registration(self):
        """Testet die Benutzerregistrierung."""
        try:
            test_email = f"test_{int(time.time())}@omniverse.com"
            response = requests.post(
                f"{SERVICES['api_gateway']}/auth/register",
                json={'email': test_email},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                self.api_key = data['api_key']
                self.user_id = data['user_id']
                self.log_test("User Registration", True, f"User ID: {self.user_id[:8]}...")
                return True
            else:
                self.log_test("User Registration", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("User Registration", False, str(e))
            return False
    
    def test_api_authentication(self):
        """Testet die API-Authentifizierung."""
        if not self.api_key:
            self.log_test("API Authentication", False, "No API key available")
            return False
            
        try:
            response = requests.get(
                f"{SERVICES['api_gateway']}/auth/profile",
                headers={'X-API-Key': self.api_key},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("API Authentication", True, f"Credits: {data['credits']}")
                return True
            else:
                self.log_test("API Authentication", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Authentication", False, str(e))
            return False
    
    def test_world_generation(self):
        """Testet die Weltgenerierung über das API-Gateway."""
        if not self.api_key:
            self.log_test("World Generation", False, "No API key available")
            return False
            
        try:
            # Initialisiere Weltgenerator
            init_response = requests.post(
                f"{SERVICES['api_gateway']}/world/init",
                headers={'X-API-Key': self.api_key},
                json={'chunk_size': 16, 'seed': 12345},
                timeout=10
            )
            
            if init_response.status_code != 200:
                self.log_test("World Generation", False, f"Init failed: HTTP {init_response.status_code}")
                return False
            
            # Generiere Chunk
            chunk_response = requests.post(
                f"{SERVICES['api_gateway']}/world/generate_chunk",
                headers={'X-API-Key': self.api_key},
                json={'world_x': 0, 'world_y': 0},
                timeout=10
            )
            
            if chunk_response.status_code == 200:
                data = chunk_response.json()
                chunk_size = data.get('chunk', {}).get('size', 0)
                self.log_test("World Generation", True, f"Generated {chunk_size}x{chunk_size} chunk")
                return True
            else:
                self.log_test("World Generation", False, f"HTTP {chunk_response.status_code}")
                return False
        except Exception as e:
            self.log_test("World Generation", False, str(e))
            return False
    
    def test_game_engine_control(self):
        """Testet die Game-Engine-Steuerung."""
        if not self.api_key:
            self.log_test("Game Engine Control", False, "No API key available")
            return False
            
        try:
            # Teste Engine-Status
            status_response = requests.get(
                f"{SERVICES['api_gateway']}/game/status",
                headers={'X-API-Key': self.api_key},
                timeout=5
            )
            
            if status_response.status_code == 200:
                data = status_response.json()
                active_module = data.get('activeModule', 'Unknown')
                self.log_test("Game Engine Control", True, f"Active module: {active_module}")
                return True
            else:
                self.log_test("Game Engine Control", False, f"HTTP {status_response.status_code}")
                return False
        except Exception as e:
            self.log_test("Game Engine Control", False, str(e))
            return False
    
    def test_entity_management(self):
        """Testet die Entitätsverwaltung in der Game Engine."""
        if not self.api_key:
            self.log_test("Entity Management", False, "No API key available")
            return False

        try:
            # Test creating an entity
            create_response = requests.post(
                f"{SERVICES['api_gateway']}/game/entities",
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "action": "create",
                    "entityId": "test_entity_1"
                },
                timeout=5
            )

            if create_response.status_code != 200 or create_response.json().get("status") != "success":
                self.log_test("Entity Management (Create)", False, f"HTTP {create_response.status_code} - {create_response.json().get('message', '')}")
                return False
            self.log_test("Entity Management (Create)", True, "Entity test_entity_1 created")

            # Test updating an entity
            update_response = requests.post(
                f"{SERVICES['api_gateway']}/game/entities",
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "action": "update",
                    "entityId": "test_entity_1"
                },
                timeout=5
            )

            if update_response.status_code != 200 or update_response.json().get("status") != "success":
                self.log_test("Entity Management (Update)", False, f"HTTP {update_response.status_code} - {update_response.json().get('message', '')}")
                return False
            self.log_test("Entity Management (Update)", True, "Entity test_entity_1 updated")

            # Test deleting an entity
            delete_response = requests.post(
                f"{SERVICES['api_gateway']}/game/entities",
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "action": "delete",
                    "entityId": "test_entity_1"
                },
                timeout=5
            )

            if delete_response.status_code != 200 or delete_response.json().get("status") != "success":
                self.log_test("Entity Management (Delete)", False, f"HTTP {delete_response.status_code} - {delete_response.json().get('message', '')}")
                return False
            self.log_test("Entity Management (Delete)", True, "Entity test_entity_1 deleted")

            return True
        except Exception as e:
            self.log_test("Entity Management", False, str(e))
            return False

    def test_subscription_tiers(self):
        """Testet die Subscription-Tier-API."""
        try:
            response = requests.get(f"{SERVICES['api_gateway']}/billing/tiers", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                tier_count = len(data)
                self.log_test("Subscription Tiers", True, f"{tier_count} tiers available")
                return True
            else:
                self.log_test("Subscription Tiers", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Subscription Tiers", False, str(e))
            return False
    
    def test_marketplace_items(self):
        """Testet die Marktplatz-API."""
        try:
            response = requests.get(f"{SERVICES['api_gateway']}/marketplace/items", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                item_count = len(data)
                self.log_test("Marketplace Items", True, f"{item_count} items found")
                return True
            else:
                self.log_test("Marketplace Items", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Marketplace Items", False, str(e))
            return False
    
    def test_frontend_accessibility(self):
        """Testet die Frontend-Erreichbarkeit."""
        try:
            response = requests.get(SERVICES['frontend'], timeout=5)
            
            if response.status_code == 200:
                content_length = len(response.text)
                self.log_test("Frontend Accessibility", True, f"Content length: {content_length} bytes")
                return True
            else:
                self.log_test("Frontend Accessibility", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Frontend Accessibility", False, str(e))
            return False
    
    def run_all_tests(self):
        """Führt alle Tests aus."""
        print("🚀 Starting OmniVerse System Integration Test")
        print("=" * 50)
        
        # Health Checks
        print("\n📊 Service Health Checks:")
        health_results = []
        health_results.append(self.test_service_health("World Generator", SERVICES['world_generator']))
        health_results.append(self.test_service_health("Game Engine", SERVICES['game_engine']))
        health_results.append(self.test_service_health("API Gateway", SERVICES['api_gateway']))
        
        # Frontend Test
        print("\n🌐 Frontend Tests:")
        self.test_frontend_accessibility()
        
        # API Gateway Tests
        print("\n🔐 API Gateway Tests:")
        if self.test_user_registration():
            self.test_api_authentication()
            self.test_world_generation()
            self.test_game_engine_control()
            self.test_entity_management()
        
        # Marketplace Tests
        print("\n🛒 Marketplace Tests:")
        self.test_subscription_tiers()
        self.test_marketplace_items()
        
        # Zusammenfassung
        print("\n" + "=" * 50)
        print("📋 Test Summary:")
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total) * 100 if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 System is ready for deployment!")
        elif success_rate >= 60:
            print("\n⚠️  System has some issues but is mostly functional")
        else:
            print("\n🚨 System has critical issues that need to be addressed")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = OmniVerseSystemTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

