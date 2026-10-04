import json
import math
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression
from passlib.context import CryptContext
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "logistics.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="SmartPredict Logistics API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPLY_TYPES = [
    "Fuel",
    "Food",
    "Water",
    "Medical Supplies",
    "Maintenance Supplies",
]

TERRAIN_FACTORS = {"Plain": 1.0, "Hilly": 1.25, "Mountainous": 1.5}
WEATHER_FACTORS = {"Clear": 1.0, "Heavy Rain": 1.25, "Snow": 1.4, "Storm": 1.3}


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_users():
    conn = get_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )
        """
    )

    conn.commit()
    conn.close()

def seed_users():
    conn = get_connection()

    users = [
        ("admin", "Admin@123", "Command / Admin"),
        ("logistics", "Logistics@123", "Logistics Officer"),
        ("depot", "Depot@123", "Depot Manager"),
        ("field", "Field@123", "Field Officer"),
    ]

    for username, password, role in users:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,),
        ).fetchone()

        if existing is None:
            password_hash = pwd_context.hash(password)

            conn.execute(
                """
                INSERT INTO users
                (username, password_hash, role, is_active)
                VALUES (?, ?, ?, ?)
                """,
                (username, password_hash, role, 1),
            )

    conn.commit()
    conn.close()


def parse_row(row):
    return dict(row) if row is not None else None


def nearest_depot_for(location_name):
    depot_map = {
        "Forward Base Alpha": "Central Depot A",
        "Forward Base Bravo": "Central Depot A",
        "Forward Base Charlie": "Regional Depot C",
        "Forward Base Delta": "Central Depot B",
        "Forward Base Echo": "Regional Depot C",
    }
    return depot_map.get(location_name, "Central Depot A")


def clamp(x, minimum=0):
    return max(float(x), float(minimum))


def get_last_90_days():
    today = datetime.utcnow().date()
    return [(today - timedelta(days=idx)).isoformat() for idx in range(89, -1, -1)]


def generate_series(base, trend, amplitude, phase, noise_scale=24):
    dates = get_last_90_days()
    series = []
    for i, _date in enumerate(dates):
        wave = math.sin((i + phase) / 9.0) * amplitude
        drift = (i / 90.0) * trend
        noise = ((i % 7) * 1.7 + phase) * noise_scale / 100.0
        value = base + wave + drift + noise
        series.append(round(max(value, 0), 2))
    return list(zip(dates, series))


def get_forecast_values(history_values, periods=7):
    history = np.array(history_values, dtype=float)
    x = np.arange(len(history)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(x, history)
    future_x = np.arange(len(history), len(history) + periods).reshape(-1, 1)
    preds = model.predict(future_x)
    return [max(round(float(v), 2), 0) for v in preds]


def inventory_risk(days_remaining):
    if days_remaining <= 3:
        return "CRITICAL"
    if days_remaining <= 7:
        return "LOW"
    return "SAFE"


def recalculate_inventory_metrics(stock, daily_consumption, safety_stock, predicted_demand=None):
    predicted = float(predicted_demand if predicted_demand is not None else daily_consumption)
    days_remaining = clamp(stock / max(predicted, 0.1), 0)
    risk = inventory_risk(days_remaining)
    required_quantity = max(0, (predicted * 7) + safety_stock - stock)
    return {
        "days_remaining": round(days_remaining, 1),
        "risk": risk,
        "required_quantity": round(required_quantity, 1),
        "predicted_demand": round(predicted, 1),
    }


def seed_demo_data():
    conn = get_connection()
    conn.execute("DROP TABLE IF EXISTS forecasts")
    conn.execute("DROP TABLE IF EXISTS shipments")
    conn.execute("DROP TABLE IF EXISTS vehicles")
    conn.execute("DROP TABLE IF EXISTS inventory")
    conn.execute("DROP TABLE IF EXISTS consumption_history")
    conn.execute("DROP TABLE IF EXISTS routes")
    conn.execute("DROP TABLE IF EXISTS weather")
    conn.execute("DROP TABLE IF EXISTS locations")

    conn.execute(
        """
        CREATE TABLE locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            region TEXT,
            latitude REAL,
            longitude REAL,
            terrain TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER,
            supply TEXT,
            current_stock REAL,
            daily_consumption REAL,
            safety_stock REAL,
            predicted_demand REAL,
            days_remaining REAL,
            risk TEXT,
            last_updated TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE consumption_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER,
            supply TEXT,
            date TEXT,
            quantity REAL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            capacity REAL,
            status TEXT,
            depot TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT,
            destination TEXT,
            distance_km REAL,
            terrain TEXT,
            weather TEXT,
            status TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE shipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shipment_id TEXT,
            source TEXT,
            destination TEXT,
            supply TEXT,
            quantity REAL,
            eta_hours REAL,
            status TEXT,
            created_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE weather (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region TEXT,
            condition TEXT,
            impact_factor REAL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER,
            supply TEXT,
            period_days INTEGER,
            forecast_json TEXT,
            confidence REAL,
            trend_pct REAL,
            generated_at TEXT
        )
        """
    )

    locations = [
        {"name": "Central Depot A", "type": "Depot", "region": "North", "latitude": 28.6139, "longitude": 77.2090, "terrain": "Plain"},
        {"name": "Central Depot B", "type": "Depot", "region": "East", "latitude": 24.8170, "longitude": 93.4392, "terrain": "Plain"},
        {"name": "Regional Depot C", "type": "Depot", "region": "West", "latitude": 19.0760, "longitude": 72.8777, "terrain": "Hilly"},
        {"name": "Forward Base Alpha", "type": "Forward", "region": "North", "latitude": 30.3165, "longitude": 78.0322, "terrain": "Mountainous"},
        {"name": "Forward Base Bravo", "type": "Forward", "region": "East", "latitude": 24.5854, "longitude": 93.8253, "terrain": "Hilly"},
        {"name": "Forward Base Charlie", "type": "Forward", "region": "Central", "latitude": 22.5726, "longitude": 88.3639, "terrain": "Plain"},
        {"name": "Forward Base Delta", "type": "Forward", "region": "West", "latitude": 20.2961, "longitude": 85.8245, "terrain": "Hilly"},
        {"name": "Forward Base Echo", "type": "Forward", "region": "South", "latitude": 17.3850, "longitude": 78.4867, "terrain": "Plain"},
    ]

    location_ids = {}
    for location in locations:
        cursor = conn.execute(
            "INSERT INTO locations (name, type, region, latitude, longitude, terrain) VALUES (?, ?, ?, ?, ?, ?)",
            (location["name"], location["type"], location["region"], location["latitude"], location["longitude"], location["terrain"]),
        )
        location_ids[location["name"]] = cursor.lastrowid

    weather_rows = [
        ("North", "Heavy Rain", 1.25),
        ("East", "Clear", 1.0),
        ("West", "Snow", 1.4),
        ("Central", "Heavy Rain", 1.25),
        ("South", "Clear", 1.0),
    ]
    conn.executemany("INSERT INTO weather (region, condition, impact_factor) VALUES (?, ?, ?)", weather_rows)

    base_consumption = {
        "Fuel": {"Forward Base Alpha": 2900, "Forward Base Bravo": 2200, "Forward Base Charlie": 2400, "Forward Base Delta": 2600, "Forward Base Echo": 2300},
        "Food": {"Forward Base Alpha": 1800, "Forward Base Bravo": 1600, "Forward Base Charlie": 1550, "Forward Base Delta": 1700, "Forward Base Echo": 1650},
        "Water": {"Forward Base Alpha": 2800, "Forward Base Bravo": 2200, "Forward Base Charlie": 2100, "Forward Base Delta": 2400, "Forward Base Echo": 2350},
        "Medical Supplies": {"Forward Base Alpha": 740, "Forward Base Bravo": 680, "Forward Base Charlie": 720, "Forward Base Delta": 690, "Forward Base Echo": 640},
        "Maintenance Supplies": {"Forward Base Alpha": 520, "Forward Base Bravo": 470, "Forward Base Charlie": 510, "Forward Base Delta": 560, "Forward Base Echo": 550},
    }

    stock_map = {
        "Fuel": {"Forward Base Alpha": 8500, "Forward Base Bravo": 12000, "Forward Base Charlie": 9000, "Forward Base Delta": 6500, "Forward Base Echo": 7800},
        "Food": {"Forward Base Alpha": 12400, "Forward Base Bravo": 14200, "Forward Base Charlie": 13300, "Forward Base Delta": 12000, "Forward Base Echo": 12600},
        "Water": {"Forward Base Alpha": 9800, "Forward Base Bravo": 9500, "Forward Base Charlie": 8800, "Forward Base Delta": 7600, "Forward Base Echo": 9700},
        "Medical Supplies": {"Forward Base Alpha": 4200, "Forward Base Bravo": 8600, "Forward Base Charlie": 7400, "Forward Base Delta": 6100, "Forward Base Echo": 4700},
        "Maintenance Supplies": {"Forward Base Alpha": 4300, "Forward Base Bravo": 5300, "Forward Base Charlie": 6200, "Forward Base Delta": 7800, "Forward Base Echo": 6600},
    }

    safety_map = {
        "Fuel": 5000,
        "Food": 4500,
        "Water": 3800,
        "Medical Supplies": 1800,
        "Maintenance Supplies": 2400,
    }

    for location in locations:
        if location["type"] == "Depot":
            continue
        for supply in SUPPLY_TYPES:
            base = base_consumption[supply][location["name"]]
            phase = (ord(location["name"][0]) + len(supply)) % 10
            series = generate_series(base, 30 + phase * 3, 140 + phase * 10, phase, 20)
            for day, value in series:
                conn.execute(
                    "INSERT INTO consumption_history (location_id, supply, date, quantity) VALUES (?, ?, ?, ?)",
                    (location_ids[location["name"]], supply, day, value),
                )
            history_values = [item[1] for item in series]
            forecast_values = get_forecast_values(history_values, periods=30)
            current_stock = stock_map[supply][location["name"]]
            daily_consumption = history_values[-1] / 1.1
            predicted_demand = max(history_values[-1] * 1.12, daily_consumption)
            metrics = recalculate_inventory_metrics(current_stock, daily_consumption, safety_map[supply], predicted_demand)
            conn.execute(
                "INSERT INTO inventory (location_id, supply, current_stock, daily_consumption, safety_stock, predicted_demand, days_remaining, risk, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    location_ids[location["name"]],
                    supply,
                    current_stock,
                    round(daily_consumption, 2),
                    safety_map[supply],
                    round(predicted_demand, 2),
                    metrics["days_remaining"],
                    metrics["risk"],
                    datetime.utcnow().isoformat(),
                ),
            )
            trend_pct = round(((forecast_values[-1] - history_values[-1]) / max(history_values[-1], 1)) * 100, 2)
            conn.execute(
                "INSERT INTO forecasts (location_id, supply, period_days, forecast_json, confidence, trend_pct, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    location_ids[location["name"]],
                    supply,
                    30,
                    json.dumps({"historical": history_values[-30:], "forecast": forecast_values}),
                    0.84,
                    trend_pct,
                    datetime.utcnow().isoformat(),
                ),
            )

    vehicle_map = [
        ("T-01", "Heavy", 5000, "Available", "Central Depot A"),
        ("T-02", "Medium", 3000, "Available", "Central Depot A"),
        ("T-03", "Heavy", 5000, "In Transit", "Central Depot A"),
        ("T-04", "Light", 1500, "Available", "Central Depot A"),
        ("T-05", "Medium", 3500, "Available", "Central Depot B"),
        ("T-06", "Heavy", 5000, "Available", "Central Depot B"),
        ("T-07", "Medium", 3000, "In Transit", "Central Depot B"),
        ("T-08", "Light", 1500, "Available", "Regional Depot C"),
        ("T-09", "Heavy", 5000, "Available", "Regional Depot C"),
        ("T-10", "Medium", 3500, "Available", "Regional Depot C"),
        ("T-11", "Heavy", 5500, "Available", "Central Depot A"),
        ("T-12", "Medium", 3200, "Available", "Central Depot B"),
        ("T-13", "Light", 1800, "Available", "Regional Depot C"),
        ("T-14", "Heavy", 5000, "In Transit", "Central Depot A"),
        ("T-15", "Medium", 3000, "Available", "Regional Depot C"),
    ]
    conn.executemany("INSERT INTO vehicles (name, type, capacity, status, depot) VALUES (?, ?, ?, ?, ?)", vehicle_map)

    route_rows = [
        ("Central Depot A", "Forward Base Alpha", 145.0, "Mountainous", "Heavy Rain", "Delayed"),
        ("Central Depot A", "Forward Base Bravo", 190.0, "Hilly", "Clear", "Normal"),
        ("Central Depot B", "Forward Base Charlie", 210.0, "Plain", "Heavy Rain", "Restricted"),
        ("Regional Depot C", "Forward Base Delta", 180.0, "Hilly", "Snow", "Delayed"),
        ("Regional Depot C", "Forward Base Echo", 170.0, "Plain", "Clear", "Normal"),
    ]
    conn.executemany("INSERT INTO routes (source, destination, distance_km, terrain, weather, status) VALUES (?, ?, ?, ?, ?, ?)", route_rows)

    shipments = [
        ("SH-001", "Central Depot A", "Forward Base Alpha", "Fuel", 7500, 4.2, "In Transit"),
        ("SH-002", "Central Depot A", "Forward Base Bravo", "Food", 4200, 8.4, "Loading"),
        ("SH-003", "Regional Depot C", "Forward Base Charlie", "Medical Supplies", 3700, 12.1, "Delayed"),
        ("SH-004", "Central Depot B", "Forward Base Delta", "Water", 5200, 9.3, "In Transit"),
        ("SH-005", "Regional Depot C", "Forward Base Echo", "Fuel", 3100, 7.5, "Loading"),
        ("SH-006", "Central Depot A", "Forward Base Alpha", "Medical Supplies", 1800, 6.0, "Queued"),
        ("SH-007", "Central Depot A", "Forward Base Bravo", "Water", 2800, 10.2, "In Transit"),
        ("SH-008", "Central Depot B", "Forward Base Charlie", "Maintenance Supplies", 1600, 11.8, "Delayed"),
        ("SH-009", "Regional Depot C", "Forward Base Delta", "Food", 4600, 13.2, "In Transit"),
        ("SH-010", "Central Depot A", "Forward Base Alpha", "Fuel", 6800, 5.4, "Queued"),
        ("SH-011", "Central Depot B", "Forward Base Delta", "Medical Supplies", 2400, 8.9, "In Transit"),
        ("SH-012", "Regional Depot C", "Forward Base Echo", "Water", 3800, 9.6, "Loading"),
        ("SH-013", "Central Depot A", "Forward Base Bravo", "Medical Supplies", 2000, 6.7, "Queued"),
        ("SH-014", "Central Depot A", "Forward Base Alpha", "Maintenance Supplies", 1200, 7.1, "In Transit"),
        ("SH-015", "Central Depot B", "Forward Base Charlie", "Food", 3300, 10.0, "Delayed"),
        ("SH-016", "Regional Depot C", "Forward Base Delta", "Fuel", 4200, 8.6, "Loading"),
        ("SH-017", "Central Depot A", "Forward Base Bravo", "Fuel", 5900, 7.8, "Queued"),
        ("SH-018", "Regional Depot C", "Forward Base Echo", "Medical Supplies", 2400, 6.8, "In Transit"),
        ("SH-019", "Central Depot B", "Forward Base Charlie", "Water", 4300, 9.4, "Delayed"),
        ("SH-020", "Central Depot A", "Forward Base Alpha", "Food", 6000, 5.4, "In Transit"),
        ("SH-021", "Central Depot B", "Forward Base Delta", "Maintenance Supplies", 1800, 12.3, "Loading"),
        ("SH-022", "Regional Depot C", "Forward Base Echo", "Food", 5000, 8.7, "Delayed"),
        ("SH-023", "Central Depot A", "Forward Base Bravo", "Maintenance Supplies", 1500, 7.9, "Queued"),
        ("SH-024", "Regional Depot C", "Forward Base Charlie", "Fuel", 6100, 11.1, "In Transit"),
        ("SH-025", "Central Depot A", "Forward Base Alpha", "Water", 3900, 6.5, "Queued"),
        ("SH-026", "Central Depot B", "Forward Base Delta", "Food", 5700, 10.4, "In Transit"),
        ("SH-027", "Regional Depot C", "Forward Base Echo", "Fuel", 4700, 9.1, "Delayed"),
        ("SH-028", "Central Depot A", "Forward Base Bravo", "Water", 3600, 9.8, "Loading"),
        ("SH-029", "Central Depot B", "Forward Base Charlie", "Medical Supplies", 2500, 8.4, "Queued"),
        ("SH-030", "Regional Depot C", "Forward Base Delta", "Water", 3300, 8.2, "In Transit"),
    ]
    for shipment in shipments:
        conn.execute(
            "INSERT INTO shipments (shipment_id, source, destination, supply, quantity, eta_hours, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (*shipment, datetime.utcnow().isoformat()),
        )

    conn.commit()
    conn.close()


@app.on_event("startup")
def startup_event():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        seed_demo_data()
    else:
        conn = get_connection()
        try:
            check = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='locations'").fetchone()
            if check is None:
                seed_demo_data()
        finally:
            conn.close()
    init_users()
    seed_users()


@app.get("/")
def root():
    return {"name": "SmartPredict Logistics API", "status": "online", "prototype": "Synthetic Data"}


@app.get("/locations")
def get_locations():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM locations ORDER BY id").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/inventory")
def get_inventory():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT i.*, l.name as location_name, l.region, l.terrain, l.latitude, l.longitude
        FROM inventory i
        JOIN locations l ON l.id = i.location_id
        ORDER BY l.name, i.supply
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/consumption")
def get_consumption():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM consumption_history ORDER BY location_id, supply, date").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/forecast/{location_name}/{supply_name}")
def get_forecast(location_name: str, supply_name: str, period: int = 7):
    conn = get_connection()
    location = conn.execute("SELECT id FROM locations WHERE name = ?", (location_name,)).fetchone()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    history_rows = conn.execute(
        "SELECT date, quantity FROM consumption_history WHERE location_id = ? AND supply = ? ORDER BY date ASC",
        (location["id"], supply_name),
    ).fetchall()
    conn.close()
    if not history_rows:
        raise HTTPException(status_code=404, detail="No historical data for this location and supply")
    history_values = [float(row["quantity"]) for row in history_rows]
    forecast_values = get_forecast_values(history_values, periods=max(period, 7))
    change_pct = round(((forecast_values[-1] - history_values[-1]) / max(history_values[-1], 1)) * 100, 2)
    return {
        "location": location_name,
        "supply": supply_name,
        "period": period,
        "historical": [{"day": row["date"], "value": round(float(row["quantity"]), 2)} for row in history_rows[-30:]],
        "forecast": [{"day": f"Day {idx + 1}", "value": round(float(value), 2)} for idx, value in enumerate(forecast_values[:period])],
        "trend": "increase" if change_pct > 0 else "decrease",
        "change_pct": change_pct,
        "confidence": 0.84,
        "average_forecast": round(float(sum(forecast_values[:period]) / max(period, 1)), 2),
    }


@app.get("/alerts")
def get_alerts():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT i.*, l.name as location_name, l.region, l.terrain
        FROM inventory i
        JOIN locations l ON l.id = i.location_id
        WHERE i.risk IN ('LOW', 'CRITICAL')
        ORDER BY i.days_remaining ASC
        """
    ).fetchall()
    conn.close()
    alerts = []
    for row in rows[:5]:
        stock = float(row["current_stock"])
        daily = float(row["daily_consumption"])
        supply = row["supply"]
        loc_name = row["location_name"]
        required = max(0, (float(row["predicted_demand"]) * 7) + float(row["safety_stock"]) - stock)
        alerts.append(
            {
                "location": loc_name,
                "supply": supply,
                "risk": row["risk"],
                "days_remaining": round(float(row["days_remaining"]), 1),
                "message": f"{supply} predicted to fall below safety stock in {round(float(row['days_remaining']), 1)} days.",
                "recommended_quantity": round(required, 1),
                "recommended_dispatch": nearest_depot_for(loc_name),
            }
        )
    return alerts


@app.get("/vehicles")
def get_vehicles():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM vehicles ORDER BY depot, name").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/shipments")
def get_shipments():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM shipments ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/shipments")
def create_shipment(payload: dict):
    source = payload.get("source")
    destination = payload.get("destination")
    supply = payload.get("supply")
    quantity = float(payload.get("quantity", 0))
    if not source or not destination or not supply:
        raise HTTPException(status_code=400, detail="Missing shipment fields")
    shipment_id = f"SH-{(datetime.utcnow().timestamp() % 100000):05.0f}"
    eta_hours = max(3.0, round(quantity / 2500, 1))
    status = "Recommended"
    conn = get_connection()
    conn.execute(
        "INSERT INTO shipments (shipment_id, source, destination, supply, quantity, eta_hours, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (shipment_id, source, destination, supply, quantity, eta_hours, status, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"shipment_id": shipment_id, "status": status, "eta_hours": eta_hours}


@app.post("/forecast")
def forecast_custom(payload: dict):
    location_name = payload.get("location")
    supply_name = payload.get("supply")
    period = int(payload.get("period", 14))
    return get_forecast(location_name, supply_name, period=period)


@app.post("/scenario")
def run_scenario(payload: dict):
    scenario_type = payload.get("type")
    location = payload.get("location", "Forward Base Alpha")
    supply = payload.get("supply", "Fuel")
    percent = float(payload.get("percent", 20))
    weather_factor = float(payload.get("weather_factor", 1.3))

    conn = get_connection()
    row = conn.execute(
        "SELECT i.*, l.name as location_name FROM inventory i JOIN locations l ON l.id = i.location_id WHERE l.name = ? AND i.supply = ?",
        (location, supply),
    ).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Scenario target not found")

    stock = float(row["current_stock"])
    daily_consumption = float(row["daily_consumption"])
    safety_stock = float(row["safety_stock"])
    if scenario_type == "demand_spike":
        updated_demand = daily_consumption * (1 + percent / 100)
        days_remaining = clamp(stock / max(updated_demand, 0.1), 0)
        risk = inventory_risk(days_remaining)
        required_quantity = max(0, (updated_demand * 7) + safety_stock - stock)
        return {
            "type": "demand_spike",
            "location": location,
            "supply": supply,
            "before_days_remaining": round(float(row["days_remaining"]), 1),
            "days_remaining": round(days_remaining, 1),
            "risk": risk,
            "required_quantity": round(required_quantity, 1),
            "recommendation": f"Dispatch {round(required_quantity, 0)} L immediately.",
            "message": f"Demand spike +{percent}% at {location} sharply reduces remaining stock.",
        }

    if scenario_type == "weather_disruption":
        base_eta = 14.0
        adjusted_eta = round(base_eta * weather_factor, 1)
        dispatch_gap = round(max(0.0, adjusted_eta - base_eta), 1)
        return {
            "type": "weather_disruption",
            "location": location,
            "supply": supply,
            "original_eta": base_eta,
            "new_eta": adjusted_eta,
            "dispatch_earlier_hours": dispatch_gap,
            "alert": f"Dispatch recommended {dispatch_gap} hours earlier.",
        }

    raise HTTPException(status_code=400, detail="Unsupported scenario type")


@app.get("/analytics")
def get_analytics():
    conn = get_connection()
    overall = conn.execute("SELECT COUNT(*) as total FROM inventory WHERE risk in ('LOW','CRITICAL')").fetchone()
    safe = conn.execute("SELECT COUNT(*) as safe FROM inventory WHERE risk = 'SAFE'").fetchone()
    low = conn.execute("SELECT COUNT(*) as low FROM inventory WHERE risk = 'LOW'").fetchone()
    critical = conn.execute("SELECT COUNT(*) as critical FROM inventory WHERE risk = 'CRITICAL'").fetchone()
    rows = conn.execute(
        "SELECT l.name AS label, SUM(i.current_stock) AS value FROM inventory i JOIN locations l ON l.id = i.location_id WHERE l.type = 'Forward' GROUP BY l.name ORDER BY value DESC"
    ).fetchall()
    dispatch_rows = conn.execute("SELECT SUM(capacity) AS available, SUM(CASE WHEN status='In Transit' THEN capacity ELSE 0 END) as used FROM vehicles").fetchone()
    conn.close()

    risk_counts = {
        "safe": safe["safe"],
        "low": low["low"],
        "critical": critical["critical"],
    }

    return {
        "demandTrend": [
            {"day": "D-14", "historical": 1200, "forecast": 1325},
            {"day": "D-10", "historical": 1290, "forecast": 1380},
            {"day": "D-7", "historical": 1330, "forecast": 1475},
            {"day": "D-5", "historical": 1410, "forecast": 1530},
            {"day": "D-3", "historical": 1380, "forecast": 1600},
            {"day": "D-1", "historical": 1460, "forecast": 1690},
        ],
        "riskCounts": risk_counts,
        "inventoryByLocation": [{"name": row["label"], "value": round(float(row["value"]), 1)} for row in rows],
        "transportUtilization": {
            "available": int(dispatch_rows["available"] or 0),
            "used": int(dispatch_rows["used"] or 0),
        },
        "deliveryPerformance": {"on_time": 78, "delayed": 22},
        "forecastAccuracy": {"mape": 8.2, "mae": 94.6},
    }

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str

@app.post("/login")
def login(payload: LoginRequest):
    conn = get_connection()

    user = conn.execute(
        """
        SELECT id, username, password_hash, role, is_active
        FROM users
        WHERE username = ?
        """,
        (payload.username,),
    ).fetchone()

    conn.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )

    if user["role"] != payload.role:
        raise HTTPException(
            status_code=403,
            detail="Selected role does not match the user account",
        )

    if not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
        },
    }    

@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    seed_demo_data()
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
