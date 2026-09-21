import pytest

from app import app, queue_manager


@pytest.fixture
def client():
    app.config["TESTING"] = True

    with app.test_client() as client:
        queue_manager.clear()
        yield client
        queue_manager.clear()


def test_initial_status(client):

    response = client.get("/api/status")

    assert response.status_code == 200

    data = response.get_json()

    assert data["current_register"] is None
    assert data["queue"] == []


def test_call_register(client):

    response = client.post("/api/register/3/call")

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["added"] is True
    assert data["status"]["current_register"] == 3


def test_queue_registers(client):

    client.post("/api/register/3/call")
    client.post("/api/register/1/call")
    client.post("/api/register/4/call")

    response = client.get("/api/status")

    data = response.get_json()

    assert data["current_register"] == 3
    assert data["queue"] == [1, 4]


def test_complete_register(client):

    client.post("/api/register/3/call")
    client.post("/api/register/1/call")
    client.post("/api/register/4/call")

    response = client.post("/api/complete")

    assert response.status_code == 200

    data = response.get_json()

    assert data["result"]["completed"] == 3
    assert data["result"]["next"] == 1
    assert data["status"]["current_register"] == 1
    assert data["status"]["queue"] == [4]


def test_invalid_register(client):

    response = client.post("/api/register/5/call")

    assert response.status_code == 400

    data = response.get_json()

    assert data["success"] is False


def test_clear_queue(client):

    client.post("/api/register/3/call")
    client.post("/api/register/1/call")

    response = client.post("/api/clear")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"]["current_register"] is None
    assert data["status"]["queue"] == []