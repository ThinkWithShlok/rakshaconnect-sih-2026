import { Activity, AlertTriangle, ArrowRight, CircleAlert, Gauge, MapPinned, PackageCheck, Route, ShieldAlert, ShieldCheck, Truck, Warehouse, Zap } from 'lucide-react'
import { BarChart, Bar, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png'
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png'
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

export function Sidebar({ currentPage, onPageChange, role, permissions = [] }) {
  const items = permissions

  return (
    <aside className="w-72 shrink-0 border-r border-emerald-200 bg-white/90 p-5 text-emerald-900">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-emerald-700">RakshaConnect</div>
          <div className="text-lg font-semibold text-slate-900">Logistics</div>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const active = currentPage === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                active ? 'bg-emerald-600 text-white ring-1 ring-emerald-500 shadow-sm' : 'text-slate-700 hover:bg-emerald-50'
              }`}
            >
              <span>{item}</span>
              <ArrowRight className={`h-4 w-4 ${active ? 'opacity-100' : 'opacity-50'}`} />
            </button>
          )
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <div className="mb-1 font-semibold uppercase tracking-[0.2em] text-amber-700">Prototype</div>
        <div>Prototype / Synthetic Data</div>
      </div>
    </aside>
  )
}

export function Header({ currentTime, onNotificationClick, onPageChange }) {
  return (
    <header className="flex items-center justify-between border-b border-emerald-200 bg-white/80 px-6 py-4 backdrop-blur-sm">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-emerald-700">Forward Logistics Command</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">RakshaConnect</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">System Status: Operational</div>
        <div className="text-sm text-slate-600">{currentTime}</div>
        <button type="button" onClick={onNotificationClick} className="relative rounded-full border border-emerald-200 bg-white p-2 text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800">
          <Activity className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500"></span>
        </button>
      </div>
    </header>
  )
}

export function KPICard({ title, value, subtext, icon: Icon, tone = 'neutral' }) {
  const toneMap = {
    neutral: 'text-slate-800 bg-white border-emerald-200',
    warning: 'text-amber-800 bg-amber-50 border-amber-200',
    danger: 'text-rose-800 bg-rose-50 border-rose-200',
    success: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    cyan: 'text-cyan-800 bg-cyan-50 border-cyan-200',
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</div>
        <div className="rounded-lg border border-emerald-200 bg-white p-2 text-emerald-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-xs text-slate-600">{subtext}</div>
    </div>
  )
}

export function AlertCard({ title, description, severity = 'red', badge }) {
  const colors = {
    red: 'border-rose-200 bg-rose-50 text-rose-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  }

  return (
    <div className={`rounded-2xl border p-4 ${colors[severity]}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-900">{title}</div>
        <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em]">{badge}</span>
      </div>
      <p className="text-sm text-slate-700">{description}</p>
    </div>
  )
}

export function RiskBadge({ risk }) {
  const colors = {
    SAFE: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    LOW: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
    CRITICAL: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
  }

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors[risk] || colors.SAFE}`}>{risk}</span>
}

export function ForecastChart({ data }) {
  return (
    <div className="h-72 w-full rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="day" stroke="#475569" />
          <YAxis stroke="#475569" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="historical" stroke="#16a34a" strokeWidth={2} />
          <Line type="monotone" dataKey="forecast" stroke="#ca8a04" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function InventoryTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <table className="min-w-full text-sm text-left text-slate-700">
        <thead className="bg-emerald-50 text-slate-700">
          <tr>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Supply</th>
            <th className="px-4 py-3">Current Stock</th>
            <th className="px-4 py-3">Daily Consumption</th>
            <th className="px-4 py-3">Predicted Demand</th>
            <th className="px-4 py-3">Days Remaining</th>
            <th className="px-4 py-3">Safety Stock</th>
            <th className="px-4 py-3">Risk</th>
            <th className="px-4 py-3">Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.location_name}-${row.supply}`} className="border-t border-emerald-100">
              <td className="px-4 py-3 font-medium text-slate-900">{row.location_name}</td>
              <td className="px-4 py-3">{row.supply}</td>
              <td className="px-4 py-3">{row.current_stock}</td>
              <td className="px-4 py-3">{row.daily_consumption}</td>
              <td className="px-4 py-3">{row.predicted_demand}</td>
              <td className="px-4 py-3">{row.days_remaining}</td>
              <td className="px-4 py-3">{row.safety_stock}</td>
              <td className="px-4 py-3"><RiskBadge risk={row.risk} /></td>
              <td className="px-4 py-3 text-emerald-700">{row.recommended_action || 'Dispatch to depot'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LogisticsMap({ locations, routes, selectedLocation, onSelectLocation }) {
  const center = [22.5, 79.5]
  const mapRoutes = routes.map((route) => {
    const source = locations.find((l) => l.name === route.source)
    const destination = locations.find((l) => l.name === route.destination)
    if (!source || !destination) return null
    return [
      [source.latitude, source.longitude],
      [destination.latitude, destination.longitude],
    ]
  }).filter(Boolean)

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_0.9fr]">
      <div className="h-[540px] overflow-hidden rounded-2xl border border-emerald-200 shadow-sm">
        <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapRoutes.map((points, idx) => (
            <Polyline key={idx} positions={points} pathOptions={{ color: idx % 2 === 0 ? '#38bdf8' : '#f59e0b', weight: 3 }} />
          ))}
          {locations.map((location) => (
            <Marker key={location.name} position={[location.latitude, location.longitude]} eventHandlers={{ click: () => onSelectLocation(location.name) }}>
              <Popup>
                <div className="text-sm text-slate-800">
                  <strong>{location.name}</strong>
                  <div>Type: {location.type}</div>
                  <div>Terrain: {location.terrain}</div>
                  <div>Region: {location.region}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        {selectedLocation ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">{selectedLocation.name}</h3>
              <RiskBadge risk={selectedLocation.risk || 'SAFE'} />
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div><span className="text-slate-500">Inventory:</span> Fuel {selectedLocation.fuel || '8,500 L'}</div>
              <div><span className="text-slate-500">Predicted fuel demand:</span> {selectedLocation.predicted_demand || '12,600 L'}</div>
              <div><span className="text-slate-500">Days remaining:</span> {selectedLocation.days_remaining || '2.8'}</div>
              <div><span className="text-slate-500">Recommended dispatch:</span> {selectedLocation.recommended_quantity || '7,500 L'}</div>
              <div><span className="text-slate-500">Incoming shipments:</span> {selectedLocation.incoming_shipments || '2'}</div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500">Select a location to inspect inventory and route status.</div>
        )}
      </div>
    </div>
  )
}

export function ShipmentCard({ shipment }) {
  const progress = shipment.status === 'In Transit' ? 65 : shipment.status === 'Loading' ? 35 : shipment.status === 'Delayed' ? 45 : 20

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium text-slate-900">{shipment.shipment_id}</div>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-800">{shipment.status}</span>
      </div>
      <div className="mb-2 text-sm text-slate-700">{shipment.destination} • {shipment.supply}</div>
      <div className="mb-2 flex justify-between text-xs text-slate-500">
        <span>ETA: {shipment.eta_hours}h</span>
        <span>{shipment.quantity} units</span>
      </div>
      <div className="h-2 rounded-full bg-emerald-100">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  )
}

export function RecommendationCard({ recommendation }) {
  const quantityText = recommendation.quantity?.toString().includes('L') ? recommendation.quantity : `${recommendation.quantity} L`

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-emerald-800">
        <Zap className="h-4 w-4" />
        <span className="text-sm font-semibold uppercase tracking-[0.2em]">AI Logistics Recommendation</span>
      </div>
      <h3 className="mb-3 text-2xl font-semibold text-slate-900">{recommendation.location}</h3>
      <div className="space-y-3 text-sm text-slate-700">
        <div><span className="font-semibold text-slate-900">Fuel shortage predicted in:</span> {recommendation.days_remaining} days</div>
        <div><span className="font-semibold text-slate-900">Recommended dispatch:</span> {quantityText}</div>
        <div><span className="font-semibold text-slate-900">Source:</span> {recommendation.source}</div>
        <div><span className="font-semibold text-slate-900">Vehicles required:</span> {recommendation.vehicles_required}</div>
        <div><span className="font-semibold text-slate-900">Estimated travel time:</span> {recommendation.eta}</div>
        <div><span className="font-semibold text-slate-900">Recommended dispatch:</span> Immediately</div>
        <div><span className="font-semibold text-slate-900">Reason:</span> {recommendation.reason}</div>
      </div>
    </div>
  )
}

export function StatRow({ label, value, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-emerald-50 text-slate-700',
    danger: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
    success: 'bg-emerald-100 text-emerald-800',
  }

  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${toneMap[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function DashboardCharts({ demandData, riskData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Predicted Supply Demand</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demandData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="day" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="historical" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#ca8a04" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Inventory Risk</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} fill="#22c55e" paddingAngle={5} />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
