import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, Boxes, Fuel, MapPinned, PackageCheck, ShieldAlert, Truck, Warehouse } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertCard, DashboardCharts, ForecastChart, Header, InventoryTable, KPICard, LogisticsMap, RecommendationCard, ShipmentCard, Sidebar, StatRow } from './components'
import { api } from './api'

const defaultDemandData = [
  { day: 'D-30', historical: 880, forecast: 940 },
  { day: 'D-21', historical: 920, forecast: 980 },
  { day: 'D-14', historical: 980, forecast: 1040 },
  { day: 'D-10', historical: 1020, forecast: 1095 },
  { day: 'D-7', historical: 1080, forecast: 1125 },
  { day: 'D-3', historical: 1110, forecast: 1180 },
  { day: 'D-1', historical: 1160, forecast: 1240 },
]

const defaultRiskData = [
  { name: 'Safe', value: 8 },
  { name: 'Low', value: 3 },
  { name: 'Critical', value: 2 },
]

const defaultRoutes = [
  { source: 'Central Depot A', destination: 'Forward Base Alpha', distance_km: 145, terrain: 'Mountainous', weather: 'Heavy Rain', status: 'Delayed' },
  { source: 'Central Depot A', destination: 'Forward Base Bravo', distance_km: 210, terrain: 'Hilly', weather: 'Clear', status: 'Normal' },
  { source: 'Central Depot B', destination: 'Forward Base Charlie', distance_km: 230, terrain: 'Plain', weather: 'Heavy Rain', status: 'Restricted' },
  { source: 'Regional Depot C', destination: 'Forward Base Delta', distance_km: 190, terrain: 'Hilly', weather: 'Snow', status: 'Delayed' },
  { source: 'Regional Depot C', destination: 'Forward Base Echo', distance_km: 160, terrain: 'Plain', weather: 'Clear', status: 'Normal' },
]

function App() {
  const storedUser = localStorage.getItem('raksha_user')

  const [landing, setLanding] = useState(storedUser ? false : true)

  const [role, setRole] = useState(() => {
    try {
      return storedUser ? JSON.parse(storedUser).role : null
    } catch {
      return null
    }
  })

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  })

  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const roles = [
    {
      name: 'Command / Admin',
      description: 'Full system access and operational control',
    },
    {
      name: 'Logistics Officer',
      description: 'Monitor demand, inventory, routes and shipments',
    },
    {
      name: 'Depot Manager',
      description: 'Manage depot inventory and shipment planning',
    },
    {
      name: 'Field Officer',
      description: 'Monitor field locations, inventory and alerts',
    },
  ]

  const rolePermissions = {
    'Command / Admin': [
      'Dashboard',
      'Demand Forecast',
      'Inventory & Stock Risk',
      'Logistics Map',
      'Shipment Planning',
      'Analytics',
    ],

    'Logistics Officer': [
      'Dashboard',
      'Demand Forecast',
      'Inventory & Stock Risk',
      'Logistics Map',
      'Shipment Planning',
    ],

    'Depot Manager': [
      'Dashboard',
      'Inventory & Stock Risk',
      'Logistics Map',
      'Shipment Planning',
    ],

    'Field Officer': [
      'Dashboard',
      'Inventory & Stock Risk',
      'Logistics Map',
    ],
  }

  /*
   * Pre-configured demo accounts for SIH judges.
   * These are the same accounts already created in the backend.
   */
  const demoAccounts = {
    'Command / Admin': {
      username: 'admin',
      password: 'Admin@123',
    },
    'Logistics Officer': {
      username: 'logistics',
      password: 'Logistics@123',
    },
    'Depot Manager': {
      username: 'depot',
      password: 'Depot@123',
    },
    'Field Officer': {
      username: 'field',
      password: 'Field@123',
    },
  }

  const [page, setPage] = useState('Dashboard')
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString())
  const [locations, setLocations] = useState([])
  const [inventory, setInventory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [shipments, setShipments] = useState([])
  const [vehicles, setVehicles] = useState([])

  const [analytics, setAnalytics] = useState({
    demandTrend: defaultDemandData,
    riskCounts: { safe: 8, low: 3, critical: 2 },
    inventoryByLocation: [],
    transportUtilization: { available: 44000, used: 26000 },
    deliveryPerformance: { on_time: 78, delayed: 22 },
    forecastAccuracy: { mape: 8.2, mae: 94.6 },
  })

  const [selectedLocation, setSelectedLocation] = useState('Forward Base Alpha')

  const [forecastForm, setForecastForm] = useState({
    location: 'Forward Base Alpha',
    supply: 'Fuel',
    period: 7,
  })

  const [forecastData, setForecastData] = useState({
    historical: [],
    forecast: [],
    trend: 'increase',
    change_pct: 14.8,
    confidence: 0.84,
  })

  const [recommendation, setRecommendation] = useState({
    location: 'Forward Base Alpha',
    days_remaining: '2.8',
    quantity: '7,500',
    source: 'Central Depot A',
    vehicles_required: 3,
    eta: '18 hours',
    reason: 'Increased predicted consumption + low current inventory + weather-adjusted travel time.',
  })

  const [scenarioResult, setScenarioResult] = useState(null)

  const [shipmentPlan, setShipmentPlan] = useState({
    source: 'Central Depot A',
    destination: 'Forward Base Alpha',
    supply: 'Fuel',
    quantity: 7500,
  })

  const [mapSelection, setMapSelection] = useState('Forward Base Alpha')

  const handleLogin = async (event) => {
    event.preventDefault()

    setLoginError('')
    setLoginLoading(true)

    try {
      const result = await api.login({
        username: loginForm.username,
        password: loginForm.password,
        role,
      })

      localStorage.setItem('raksha_user', JSON.stringify(result.user))

      setRole(result.user.role)
      setPage('Dashboard')
      setLanding(false)

      setLoginForm({
        username: '',
        password: '',
      })
    } catch (error) {
      setLoginError(
        error.message === 'Request failed: 403'
          ? 'Selected role does not match this account.'
          : 'Invalid username or password.'
      )
    } finally {
      setLoginLoading(false)
    }
  }

  /*
   * Auto-fill credentials when a judge selects a demo role.
   */
  const handleDemoLogin = (selectedRole) => {
    const account = demoAccounts[selectedRole]

    setRole(selectedRole)
    setLoginError('')

    setLoginForm({
      username: account.username,
      password: account.password,
    })
  }

  useEffect(() => {
    const timer = setInterval(
      () => setCurrentTime(new Date().toLocaleString()),
      1000
    )

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          locationsData,
          inventoryData,
          alertsData,
          shipmentsData,
          vehiclesData,
          analyticsData,
        ] = await Promise.all([
          api.getLocations(),
          api.getInventory(),
          api.getAlerts(),
          api.getShipments(),
          api.getVehicles(),
          api.getAnalytics(),
        ])

        setLocations(locationsData)
        setInventory(inventoryData)
        setAlerts(alertsData)
        setShipments(shipmentsData)
        setVehicles(vehiclesData)
        setAnalytics(analyticsData)

        if (inventoryData.length) {
          const alpha = inventoryData.find(
            (item) =>
              item.location_name === 'Forward Base Alpha' &&
              item.supply === 'Fuel'
          )

          if (alpha) {
            setRecommendation({
              location: 'Forward Base Alpha',
              days_remaining: String(alpha.days_remaining || '2.8'),
              quantity: `${Math.round(alpha.required_quantity || 7500)}`,
              source: 'Central Depot A',
              vehicles_required: 3,
              eta: '18.2 hours',
              reason:
                'Increased predicted consumption + low current inventory + weather-adjusted travel time.',
            })
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const loadForecast = async () => {
      try {
        const data = await api.getForecast(
          forecastForm.location,
          forecastForm.supply,
          Number(forecastForm.period)
        )

        setForecastData(data)
      } catch (error) {
        console.error('Forecast load failed', error)
      }
    }

    loadForecast()
  }, [forecastForm])

  const riskData = useMemo(() => {
    return [
      {
        name: 'Safe',
        value: analytics.riskCounts?.safe || defaultRiskData[0].value,
      },
      {
        name: 'Low',
        value: analytics.riskCounts?.low || defaultRiskData[1].value,
      },
      {
        name: 'Critical',
        value:
          analytics.riskCounts?.critical || defaultRiskData[2].value,
      },
    ]
  }, [analytics])

  const inventoryRows = useMemo(() => {
    if (!inventory.length) return []

    return inventory.map((row) => ({
      ...row,
      current_stock: `${Number(row.current_stock).toLocaleString()} ${
        row.supply === 'Fuel'
          ? 'L'
          : row.supply === 'Food'
            ? 'kg'
            : row.supply === 'Water'
              ? 'L'
              : 'units'
      }`,
      daily_consumption: `${Number(row.daily_consumption).toFixed(0)} ${
        row.supply === 'Fuel'
          ? 'L/day'
          : row.supply === 'Food'
            ? 'kg/day'
            : row.supply === 'Water'
              ? 'L/day'
              : 'units/day'
      }`,
      predicted_demand: `${Number(row.predicted_demand).toFixed(0)} ${
        row.supply === 'Fuel'
          ? 'L'
          : row.supply === 'Food'
            ? 'kg'
            : row.supply === 'Water'
              ? 'L'
              : 'units'
      }`,
      days_remaining: Number(row.days_remaining).toFixed(1),
      safety_stock: `${Number(row.safety_stock).toLocaleString()}`,
      recommended_action:
        row.risk === 'CRITICAL'
          ? 'Urgent dispatch'
          : row.risk === 'LOW'
            ? 'Reorder review'
            : 'Maintain stock',
    }))
  }, [inventory])

  const selectedInventory =
    inventory.find((row) => row.location_name === mapSelection) ||
    inventory[0]

  const handleRecommend = async () => {
    const item =
      inventory.find(
        (row) =>
          row.location_name === selectedLocation &&
          row.supply === 'Fuel'
      ) || inventory[0]

    if (!item) return

    const source =
      item.location_name === 'Forward Base Alpha'
        ? 'Central Depot A'
        : 'Central Depot B'

    setRecommendation({
      location: item.location_name,
      days_remaining: String(item.days_remaining || '2.8'),
      quantity: `${Math.round(item.current_stock || 7500)}`,
      source,
      vehicles_required: 3,
      eta: '18 hours',
      reason:
        'Increased predicted consumption + low current inventory + weather-adjusted travel time.',
    })
  }

  const handleScenario = async () => {
    try {
      const result = await api.runScenario({
        type: 'demand_spike',
        location: 'Forward Base Alpha',
        supply: 'Fuel',
        percent: 20,
      })

      setScenarioResult(result)
    } catch (error) {
      console.error(error)
    }
  }

  const handleWeatherScenario = async () => {
    try {
      const result = await api.runScenario({
        type: 'weather_disruption',
        location: 'Forward Base Alpha',
        supply: 'Fuel',
        weather_factor: 1.3,
      })

      setScenarioResult(result)
    } catch (error) {
      console.error(error)
    }
  }

  const createShipment = async () => {
    try {
      const payload = { ...shipmentPlan }

      const result = await api.createShipment(payload)

      const nextShipments = [
        {
          ...payload,
          shipment_id: result.shipment_id,
          eta_hours: result.eta_hours,
          status: result.status,
        },
        ...shipments,
      ]

      setShipments(nextShipments)
      setPage('Shipment Planning')
    } catch (error) {
      console.error('Shipment creation failed', error)
    }
  }

  const displayRoutes = [...defaultRoutes]

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KPICard
          title="Total Forward Locations"
          value={
            locations.filter((loc) => loc.type === 'Forward').length || 8
          }
          subtext="Operational outposts"
          icon={MapPinned}
          tone="neutral"
        />

        <KPICard
          title="Critical Locations"
          value={
            alerts.filter((alert) => alert.risk === 'CRITICAL').length || 3
          }
          subtext="Immediate attention"
          icon={ShieldAlert}
          tone="danger"
        />

        <KPICard
          title="Supplies At Risk"
          value={
            inventory.filter((row) => row.risk !== 'SAFE').length || 7
          }
          subtext="Demand above thresholds"
          icon={AlertTriangle}
          tone="warning"
        />

        <KPICard
          title="Active Shipments"
          value={shipments.length || 14}
          subtext="Movement in progress"
          icon={Truck}
          tone="cyan"
        />

        <KPICard
          title="Fleet Capacity"
          value="82%"
          subtext="4,200 / 5,100 t"
          icon={Warehouse}
          tone="success"
        />

        <KPICard
          title="Predicted Shortages"
          value={Math.max(
            5,
            alerts.filter((alert) => alert.risk === 'CRITICAL').length + 2
          )}
          subtext="Next 7 days"
          icon={Fuel}
          tone="danger"
        />
      </div>

      <DashboardCharts
        demandData={analytics.demandTrend || defaultDemandData}
        riskData={riskData}
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">
              Critical Logistics Alerts
            </h3>

            <button
              type="button"
              onClick={handleScenario}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Run What-If Scenario
            </button>
          </div>

          {(
            alerts.length
              ? alerts
              : [
                  {
                    location: 'Forward Base Alpha',
                    supply: 'Fuel',
                    risk: 'CRITICAL',
                    days_remaining: 2.8,
                    message:
                      'Fuel predicted to fall below safety stock in 2.8 days.',
                    recommended_quantity: 7500,
                    recommended_dispatch: 'Central Depot A',
                  },
                  {
                    location: 'Forward Base Bravo',
                    supply: 'Medical Supplies',
                    risk: 'LOW',
                    days_remaining: 5.0,
                    message:
                      'Medical supplies projected to reach critical level in 5 days.',
                    recommended_quantity: 2200,
                    recommended_dispatch: 'Central Depot A',
                  },
                  {
                    location: 'Depot Charlie',
                    supply: 'Vehicle Capacity',
                    risk: 'LOW',
                    days_remaining: 4.0,
                    message:
                      'Vehicle capacity shortage predicted for upcoming dispatch cycle.',
                    recommended_quantity: 2,
                    recommended_dispatch: 'Regional Depot C',
                  },
                ]
          ).map((alert, idx) => (
            <AlertCard
              key={`${alert.location}-${idx}`}
              title={alert.location}
              severity={
                alert.risk === 'CRITICAL'
                  ? 'red'
                  : alert.risk === 'LOW'
                    ? 'orange'
                    : 'yellow'
              }
              badge={
                alert.risk === 'CRITICAL'
                  ? 'CRITICAL'
                  : alert.risk === 'LOW'
                    ? 'LOW'
                    : 'WATCH'
              }
              description={`${alert.message || alert.supply + ' shortage projected'} ${
                alert.recommended_quantity
                  ? `Recommended replenishment: ${alert.recommended_quantity} units.`
                  : ''
              }`}
            />
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Logistics Recommendation
          </h3>

          <RecommendationCard recommendation={recommendation} />

          {scenarioResult && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="font-semibold">Scenario update</div>
              <div>
                {scenarioResult.message ||
                  scenarioResult.alert ||
                  'Scenario recalculation complete.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderForecast = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Location
            </span>

            <select
              value={forecastForm.location}
              onChange={(e) =>
                setForecastForm((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
            >
              {locations
                .filter((item) => item.type === 'Forward')
                .map((loc) => (
                  <option key={loc.name} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Supply
            </span>

            <select
              value={forecastForm.supply}
              onChange={(e) =>
                setForecastForm((prev) => ({
                  ...prev,
                  supply: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
            >
              {[
                'Fuel',
                'Food',
                'Water',
                'Medical Supplies',
                'Maintenance Supplies',
              ].map((supply) => (
                <option key={supply} value={supply}>
                  {supply}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Forecast period
            </span>

            <select
              value={forecastForm.period}
              onChange={(e) =>
                setForecastForm((prev) => ({
                  ...prev,
                  period: Number(e.target.value),
                }))
              }
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            ML Forecast
          </div>

          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {forecastData.average_forecast || '1,420'} units
          </div>

          <div className="mt-1 text-sm text-emerald-700">
            Confidence {forecastData.confidence || 0.84}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Trend
          </div>

          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {forecastData.trend === 'increase' ? 'Increase' : 'Decrease'}
          </div>

          <div className="mt-1 text-sm text-amber-700">
            Expected demand increase: +
            {Math.abs(forecastData.change_pct || 14.8)}%
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Previous period
          </div>

          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {Math.round(
              (forecastData?.average_forecast || 1420) * 0.87
            )}
          </div>

          <div className="mt-1 text-sm text-emerald-700">
            Forecast accuracy within target
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ForecastChart
          data={
            forecastData.forecast && forecastData.forecast.length
              ? forecastData.forecast.map((value, index) => ({
                  day: `Day ${index + 1}`,
                  historical:
                    forecastData.historical[index]?.value ||
                    value.value * 0.92,
                  forecast: value.value,
                }))
              : defaultDemandData
          }
        />

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Historical Consumption
          </h3>

          <div className="space-y-2 text-sm text-slate-700">
            {(
              forecastData.historical && forecastData.historical.length
                ? forecastData.historical.slice(-7)
                : defaultDemandData.slice(-7)
            ).map((row, idx) => (
              <div
                key={`${row.day || idx}`}
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2"
              >
                <span>{row.day || `Day ${idx + 1}`}</span>

                <strong className="text-slate-900">
                  {Math.round(row.value || row.historical || 980)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderInventory = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Inventory Intelligence
          </h3>

          <button
            type="button"
            onClick={handleRecommend}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Generate Logistics Recommendation
          </button>
        </div>
      </div>

      <InventoryTable rows={inventoryRows} />
    </div>
  )

  const renderMap = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Logistics Map
          </h3>

          <button
            type="button"
            onClick={handleWeatherScenario}
            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-400"
          >
            Weather Disruption
          </button>
        </div>

        <LogisticsMap
          locations={locations.map((loc) => ({
            ...loc,
            fuel:
              loc.name === 'Forward Base Alpha'
                ? '8,500 L'
                : loc.name === 'Forward Base Bravo'
                  ? '12,400 kg'
                  : loc.name === 'Forward Base Charlie'
                    ? '4,200 units'
                    : '7,600 units',
            predicted_demand:
              loc.name === 'Forward Base Alpha' ? '12,600 L' : '9,600 L',
            days_remaining:
              loc.name === 'Forward Base Alpha' ? '2.8' : '5.4',
            risk:
              loc.name === 'Forward Base Alpha' ? 'CRITICAL' : 'LOW',
            recommended_quantity:
              loc.name === 'Forward Base Alpha' ? '7,500 L' : '4,800 L',
            incoming_shipments:
              loc.name === 'Forward Base Alpha' ? '3' : '2',
          }))}
          routes={displayRoutes}
          selectedLocation={selectedInventory}
          onSelectLocation={(name) => setMapSelection(name)}
        />
      </div>
    </div>
  )

  const renderShipments = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-xl font-semibold text-slate-900">
            Shipment Planner
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                Source depot
              </span>

              <select
                value={shipmentPlan.source}
                onChange={(e) =>
                  setShipmentPlan((prev) => ({
                    ...prev,
                    source: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
              >
                <option>Central Depot A</option>
                <option>Central Depot B</option>
                <option>Regional Depot C</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                Destination
              </span>

              <select
                value={shipmentPlan.destination}
                onChange={(e) =>
                  setShipmentPlan((prev) => ({
                    ...prev,
                    destination: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
              >
                {locations
                  .filter((loc) => loc.type === 'Forward')
                  .map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                Supply type
              </span>

              <select
                value={shipmentPlan.supply}
                onChange={(e) =>
                  setShipmentPlan((prev) => ({
                    ...prev,
                    supply: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
              >
                <option>Fuel</option>
                <option>Food</option>
                <option>Water</option>
                <option>Medical Supplies</option>
                <option>Maintenance Supplies</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                Quantity
              </span>

              <input
                type="number"
                value={shipmentPlan.quantity}
                onChange={(e) =>
                  setShipmentPlan((prev) => ({
                    ...prev,
                    quantity: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm uppercase tracking-[0.2em] text-emerald-700">
              Shipment Plan
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">
                  Source:
                </span>{' '}
                {shipmentPlan.source}
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Destination:
                </span>{' '}
                {shipmentPlan.destination}
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Cargo:
                </span>{' '}
                {shipmentPlan.supply}
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Quantity:
                </span>{' '}
                {shipmentPlan.quantity} L
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Vehicles:
                </span>{' '}
                {Math.ceil(shipmentPlan.quantity / 2500)}
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Distance:
                </span>{' '}
                145 km
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Terrain:
                </span>{' '}
                Mountainous
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Weather:
                </span>{' '}
                Heavy Rain
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Adjusted ETA:
                </span>{' '}
                18.2 hours
              </div>

              <div>
                <span className="font-semibold text-slate-900">
                  Status:
                </span>{' '}
                RECOMMENDED
              </div>
            </div>

            <button
              type="button"
              onClick={createShipment}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Create Shipment
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">
              Active Shipments
            </h3>

            <div className="space-y-3">
              {(shipments.length
                ? shipments.slice(0, 5)
                : [
                    {
                      shipment_id: 'SH-001',
                      destination: 'Base Alpha',
                      cargo: 'Fuel',
                      eta_hours: 4,
                      status: 'In Transit',
                    },
                    {
                      shipment_id: 'SH-002',
                      destination: 'Base Bravo',
                      cargo: 'Food',
                      eta_hours: 8,
                      status: 'Loading',
                    },
                    {
                      shipment_id: 'SH-003',
                      destination: 'Base Charlie',
                      cargo: 'Medical',
                      eta_hours: 12,
                      status: 'Delayed',
                    },
                  ]
              ).map((shipment) => (
                <ShipmentCard
                  key={
                    shipment.shipment_id || shipment.destination
                  }
                  shipment={{
                    ...shipment,
                    shipment_id:
                      shipment.shipment_id || 'SH-999',
                    destination:
                      shipment.destination || 'Base Alpha',
                    supply:
                      shipment.cargo ||
                      shipment.supply ||
                      'Fuel',
                    eta_hours:
                      shipment.eta_hours || 8,
                    status:
                      shipment.status || 'In Transit',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Demand Trend
          </div>

          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={
                  analytics.demandTrend ||
                  defaultDemandData
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                />
                <XAxis
                  dataKey="day"
                  stroke="#475569"
                />
                <YAxis stroke="#475569" />
                <Tooltip />
                <Bar
                  dataKey="historical"
                  fill="#16a34a"
                />
                <Bar
                  dataKey="forecast"
                  fill="#ca8a04"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Supply Risk
          </div>

          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={72}
                  fill="#22c55e"
                  paddingAngle={5}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Inventory by Location
          </div>

          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  analytics.inventoryByLocation &&
                  analytics.inventoryByLocation.length
                    ? analytics.inventoryByLocation
                    : [
                        {
                          name: 'Alpha',
                          value: 18000,
                        },
                        {
                          name: 'Bravo',
                          value: 15000,
                        },
                        {
                          name: 'Charlie',
                          value: 12000,
                        },
                      ]
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                />
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                />
                <YAxis stroke="#475569" />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#16a34a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Transport Utilisation
          </div>

          <div className="mt-3 space-y-3">
            <StatRow
              label="Available capacity"
              value={`${
                analytics.transportUtilization?.available ||
                44000
              } t`}
              tone="slate"
            />

            <StatRow
              label="Used capacity"
              value={`${
                analytics.transportUtilization?.used ||
                26000
              } t`}
              tone="warning"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Delivery Performance
          </div>

          <div className="mt-3 space-y-3">
            <StatRow
              label="On-time"
              value={`${
                analytics.deliveryPerformance?.on_time ||
                78
              }%`}
              tone="success"
            />

            <StatRow
              label="Delayed"
              value={`${
                analytics.deliveryPerformance?.delayed ||
                22
              }%`}
              tone="danger"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Forecast Accuracy
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <StatRow
            label="MAPE"
            value={`${
              analytics.forecastAccuracy?.mape ||
              8.2
            }%`}
            tone="slate"
          />

          <StatRow
            label="MAE"
            value={`${
              analytics.forecastAccuracy?.mae ||
              94.6
            } units`}
            tone="warning"
          />
        </div>
      </div>
    </div>
  )

  return landing === true ? (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-lime-50 to-white px-6">
      <div className="w-full max-w-3xl rounded-3xl border border-emerald-200 bg-white/90 p-10 text-center shadow-2xl shadow-emerald-200/60">
        <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-800">
          Prototype
        </div>

        <h1 className="text-5xl font-semibold tracking-tight text-emerald-900">
          RAKSHACONNECT
        </h1>

        <p className="mt-4 text-xl text-slate-700">
          Predictive Logistics & Forward Supply Chain
        </p>

        <p className="mt-8 text-lg text-emerald-700">
          Predict shortages before they happen. Optimise replenishment before supplies run out.
        </p>

        <button
          type="button"
          onClick={() => setLanding('role')}
          className="mt-8 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-500"
        >
          Launch Command Dashboard
        </button>
      </div>
    </div>
  ) : landing === 'role' ? (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-lime-50 to-white px-6">
      <div className="w-full max-w-4xl rounded-3xl border border-emerald-200 bg-white/90 p-8 shadow-2xl shadow-emerald-200/60">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs uppercase tracking-[0.25em] text-emerald-800">
            Secure Access
          </div>

          <h2 className="text-3xl font-semibold text-emerald-900">
            Select Your Role
          </h2>

          <p className="mt-2 text-slate-600">
            Choose your operational role to access RakshaConnect.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {roles.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setRole(item.name)
                setLoginError('')

                setLoginForm({
                  username: '',
                  password: '',
                })

                setLanding('login')
              }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-100"
            >
              <div className="text-lg font-semibold text-emerald-900">
                {item.name}
              </div>

              <div className="mt-2 text-sm text-slate-600">
                {item.description}
              </div>

              <div className="mt-4 text-sm font-semibold text-emerald-700">
                Enter Dashboard →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : landing === 'login' ? (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-lime-50 to-white px-6">
      <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white/90 p-8 shadow-2xl shadow-emerald-200/60">

        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs uppercase tracking-[0.25em] text-emerald-800">
            Secure Login
          </div>

          <h2 className="text-3xl font-semibold text-emerald-900">
            {role}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to access RakshaConnect
          </p>
        </div>

        {/* Demo Access */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-900">
            Demo Access
          </div>

          <div className="mt-1 text-xs text-slate-600">
            Select a role to auto-fill the demo credentials for evaluation.
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {roles.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleDemoLogin(item.name)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  role === item.name &&
                  loginForm.username ===
                    demoAccounts[item.name].username
                    ? 'border-emerald-500 bg-emerald-600 text-white'
                    : 'border-emerald-200 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Username
            </label>

            <input
              type="text"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              placeholder="Enter username"
              required
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              placeholder="Enter password"
              required
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
            />
          </div>

          {loginError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginLoading ? 'Authenticating...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginError('')
              setLanding('role')
            }}
            className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            ← Back to Role Selection
          </button>

        </form>
      </div>
    </div>
  ) : (
    <div className="min-h-screen bg-emerald-50 text-slate-800">
      <div className="flex min-h-screen">

        <Sidebar
          currentPage={page}
          onPageChange={setPage}
          role={role}
          permissions={rolePermissions[role] || []}
        />

        <div className="flex flex-1 flex-col">
          <Header
            currentTime={currentTime}
            onNotificationClick={() => setPage('Dashboard')}
            onPageChange={setPage}
          />

          <main className="flex-1 space-y-6 bg-emerald-50 p-6">
            {page === 'Dashboard' && renderDashboard()}
            {page === 'Demand Forecast' && renderForecast()}
            {page === 'Inventory & Stock Risk' && renderInventory()}
            {page === 'Logistics Map' && renderMap()}
            {page === 'Shipment Planning' && renderShipments()}
            {page === 'Analytics' && renderAnalytics()}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App