import sys
from fastapi.testclient import TestClient

try:
    from main import app
    print("Successfully imported FastAPI app.")
except ImportError as e:
    print(f"Failed to import app: {e}")
    sys.exit(1)

client = TestClient(app)

def test_health():
    print("Testing health check / root...")
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"
    print("Health check passed.")

def test_profiles():
    print("Testing profiles endpoint...")
    response = client.get("/api/profiles")
    assert response.status_code == 200
    profiles = response.json()
    assert len(profiles) > 0
    assert any(p["id"] == "adhd" for p in profiles)
    print("Profiles check passed.")

def test_adapt():
    print("Testing adapt endpoint with simulated mock agents...")
    payload = {
        "content": "Quantum entanglement is a physical phenomenon that occurs when a pair or group of particles are generated, interact, or share spatial proximity. This is a very dense text paragraph containing details.",
        "page_type": "article",
        "profile": "adhd",
        "agents": ["reader", "focus", "comprehension"],
        "options": {
            "focus_level": 3,
            "reading_level": "simple"
        }
    }
    response = client.post("/api/adapt", json=payload)
    
    # Assert
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
    data = response.json()
    
    # Check outputs are resolved correctly
    assert "reader_output" in data and data["reader_output"] is not None
    assert "focus_output" in data and data["focus_output"] is not None
    assert "comprehension_output" in data and data["comprehension_output"] is not None
    
    reader = data["reader_output"]
    assert "structured_text" in reader
    assert len(reader["chunks"]) > 0
    
    focus = data["focus_output"]
    assert len(focus["remove_selectors"]) > 0
    assert len(focus["inject_css"]) > 0
    
    comp = data["comprehension_output"]
    assert len(comp["tldr"]) > 0
    assert "concept_map" in comp
    assert comp["concept_map"]["main"] is not None
    
    print("Adaptation integration test passed successfully!")

if __name__ == "__main__":
    try:
        test_health()
        test_profiles()
        test_adapt()
        print("\nAll integration tests PASSED. FastAPI app schemas and orchestrator are fully correct.")
    except AssertionError as e:
        print(f"Assertion failed during testing: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during testing: {e}")
        sys.exit(1)
