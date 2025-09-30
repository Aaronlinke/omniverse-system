import requests
import json

# Test der World Generator API
base_url = "http://localhost:5002/api"

def test_health():
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"Health Check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health Check failed: {e}")
        return False

def test_init():
    try:
        data = {"chunk_size": 16, "seed": 12345}
        response = requests.post(f"{base_url}/init", json=data, timeout=5)
        print(f"Init: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Init failed: {e}")
        return False

def test_generate_chunk():
    try:
        data = {"world_x": 0, "world_y": 0}
        response = requests.post(f"{base_url}/generate_chunk", json=data, timeout=10)
        print(f"Generate Chunk: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            chunk = result.get('chunk', {})
            print(f"Chunk size: {chunk.get('size')}, Objects: {len(chunk.get('objects', []))}")
        return response.status_code == 200
    except Exception as e:
        print(f"Generate Chunk failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing World Generator Service...")
    
    if test_health():
        print("✓ Health check passed")
        
        if test_init():
            print("✓ Initialization passed")
            
            if test_generate_chunk():
                print("✓ Chunk generation passed")
                print("All tests passed!")
            else:
                print("✗ Chunk generation failed")
        else:
            print("✗ Initialization failed")
    else:
        print("✗ Health check failed - service not running")
