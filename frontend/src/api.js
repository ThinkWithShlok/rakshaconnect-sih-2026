const API_BASE = '/api'

async function fetchJson(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}

export const api = {
  getLocations: () => fetchJson('/locations'),
  getInventory: () => fetchJson('/inventory'),
  getConsumption: () => fetchJson('/consumption'),
  getAlerts: () => fetchJson('/alerts'),
  getVehicles: () => fetchJson('/vehicles'),
  getShipments: () => fetchJson('/shipments'),
  getForecast: (location, supply, period = 7) => fetchJson(`/forecast/${encodeURIComponent(location)}/${encodeURIComponent(supply)}?period=${period}`),
  getAnalytics: () => fetchJson('/analytics'),
  createShipment: (payload) => fetchJson('/shipments', { method: 'POST', body: JSON.stringify(payload) }),
  runScenario: (payload) => fetchJson('/scenario', { method: 'POST', body: JSON.stringify(payload) }),
}
