# Finance Tracker — Backend

NestJS + TypeScript REST API for the Finance Tracker application.

## Quick Start

```bash
git clone https://github.com/DrRotstein/finance-tracker-backend.git
git clone https://github.com/DrRotstein/finance-tracker-frontend.git
cd finance-tracker-backend
docker compose up --build
```

Then open http://localhost:5173 (frontend) and http://localhost:4000 (backend API).

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10
- **Language:** TypeScript 5
- **Database:** PostgreSQL 16
- **ORM:** TypeORM 0.3
- **Containerization:** Docker

## Getting Started

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)

### Development

```bash
# Install dependencies
npm install

# Start PostgreSQL via Docker
docker compose up -d postgres

# Run in development mode
npm run start:dev
```

### Docker (Full Stack)

```bash
# Build and run all services (backend + frontend + postgres)
docker compose up --build
```

The API will be available at `http://localhost:4000`.
The frontend will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── app.module.ts          # Root module
├── app.controller.ts      # Health check endpoint
├── app.service.ts         # App service
├── data-source.ts         # TypeORM DataSource for CLI migrations
├── main.ts                # Entry point
├── entities/              # Database entities
├── migrations/            # TypeORM migrations
├── accounts/              # Accounts module
├── transactions/          # Transactions module
└── relations/             # Relations module
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `finance_tracker` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start in production mode |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run lint` | Lint source files |
