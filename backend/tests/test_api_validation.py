from fastapi.testclient import TestClient

from app.main import app


def test_scenarios_reject_malformed_inputs_without_server_errors():
    client = TestClient(app, raise_server_exceptions=False)
    field = client.get('/api/fields').json()['features'][0]['id']
    for endpoint, key in [('plans', 'scenario'), ('scenarios', 'assumptions')]:
        for scenario in ({'planting_delay_days': 'bad'}, {'rainfall_change_percent': [1]},
                         {'irrigation': 'invalid'}, {'drainage': ['poor']},
                         {'planting_delay_days': 1e100}):
            assert client.post(f'/api/fields/{field}/{endpoint}', json={key: scenario}).status_code == 422
        assert client.post(f'/api/fields/{field}/{endpoint}', json={key: {'planting_delay_days': 14}}).status_code == 200
    for value in ('NaN', '1e309'):
        response = client.post(f'/api/fields/{field}/plans',
                               content='{"scenario":{"rainfall_change_percent":' + value + '}}',
                               headers={'content-type': 'application/json'})
        assert response.status_code == 422
