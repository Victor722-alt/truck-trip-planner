# Truck Trip Planner

A full-stack web application for planning truck trips with Hours of Service (HOS) compliance, route visualization, and daily log sheet generation.

## Features

- **Trip Planning**: Plan trips with current location, pickup, and dropoff locations
- **HOS Compliance**: Automatic calculation of driving hours and rest periods
- **Route Visualization**: Interactive map showing trip route
- **Daily Log Sheets**: Auto-generated log sheets for each day of the trip
- **PDF Export**: Export log sheets as PDF
- **Trip History**: View and manage past trips
- **User Authentication**: Secure JWT-based authentication

## Tech Stack

### Backend
- Django 5.0
- Django REST Framework
- PostgreSQL
- JWT Authentication
- OpenRouteService API (optional, for routing)

### Frontend
- React 18
- React Router
- React Leaflet (for maps)
- Axios
- jsPDF

## Project Structure

```
truck-trip-planner/
├── backend/          # Django backend
├── frontend/          # React frontend
├── docker-compose.yml # Docker orchestration
└── README.md
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- (Optional) OpenRouteService API key for better routing

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd truck-trip-planner
```

2. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Edit `.env` and add your OpenRouteService API key (optional):
```
ORS_API_KEY=your_actual_api_key_here
```

4. Build and start the containers:
```bash
docker-compose up --build
```

5. Run database migrations:
```bash
docker-compose exec backend python manage.py migrate
```

6. Create a superuser (optional):
```bash
docker-compose exec backend python manage.py createsuperuser
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

## Usage

1. **Register/Login**: Create an account or login
2. **Plan a Trip**: 
   - Enter your current location
   - Enter pickup location
   - Enter dropoff location
   - Enter current cycle hours (0-11)
3. **View Results**: 
   - See trip summary with total distance and estimated days
   - View route on interactive map
   - Review daily log sheets
4. **Export**: Export log sheets as PDF
5. **History**: View all your past trips

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `GET /api/auth/profile/` - Get user profile

### Trips
- `GET /api/trips/` - List all trips
- `POST /api/trips/` - Create new trip
- `GET /api/trips/{id}/` - Get trip details
- `GET /api/trips/{id}/logs/` - Get trip logs

## HOS Rules (Simplified)

- Maximum 11 driving hours per day
- Maximum 14 on-duty hours per day
- 10 hours required rest between shifts
- Average speed: 55 mph

## Development

### Backend Development

```bash
cd backend
python manage.py runserver
```

### Frontend Development

```bash
cd frontend
npm start
```

## Environment Variables

See `.env.example` for all available environment variables.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

