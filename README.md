# Finance Tracker — Backend

NestJS + TypeScript REST API for the Finance Tracker application.

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
docker-compose up -d postgres

# Run in development mode
npm run start:dev
```

### Docker

```bash
# Build and run all services
docker-compose up --build
```

The API will be available at `http://localhost:4000`.

## Project Structure

```
src/
├── app.module.ts          # Root module
├── app.controller.ts      # Health check endpoint
├── app.service.ts         # App service
├── main.ts                # Entry point
└── modules/               # Feature modules (added per Epic)
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
