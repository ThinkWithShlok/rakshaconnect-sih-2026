# SmartPredict Logistics

Prototype for SIH 2026 Problem Statement SIH26251: Indian Army – Predictive Logistics & Forward Supply Chain.

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes

- The application uses synthetic demo data.
- The backend runs on http://localhost:8000
- The frontend runs on http://localhost:5173
- The UI includes dashboard, forecast, inventory, logistics map, shipment planning, analytics, and what-if scenarios.
