# Daily Tasks - Next.js 15 + PostgreSQL Development Environment

A robust Next.js 15 application with PostgreSQL database setup using Docker Compose.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js (for running the Next.js application)

### Setup Instructions

1. **Start the PostgreSQL Database**

   ```bash
   docker-compose up -d
   ```

   This will:
   - Pull the PostgreSQL 15 image
   - Create a persistent volume for data storage
   - Start the database container
   - Expose port 5432 on localhost

2. **Navigate to the Next.js Application**

   ```bash
   cd daily-tasks
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Start the Development Server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Environment Configuration

The database connection is configured through environment variables. Copy the root example file and adjust the values for your local environment:

```bash
cp .env.example .env
```

Recommended variables:

- **Database URL**: `postgresql://postgres:<your-password>@localhost:5432/dailytasks`
- **User**: `postgres`
- **Password**: `<your-password>`
- **Database**: `dailytasks`

These values are defined in the root `.env` file used by `docker-compose.yml`.

### Docker Compose Services

- **postgres**: PostgreSQL 15 database with persistent storage
  - Container name: `dailytasks-postgres`
  - Port: `5432:5432`
  - Volume: `postgres_data` (persistent)

### Stopping the Environment

To stop and remove the containers:

```bash
docker-compose down
```

To stop the containers but keep the data:

```bash
docker-compose stop
```

### Database Access

You can connect to the PostgreSQL database using any PostgreSQL client:

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `dailytasks`
- **User**: `postgres`
- **Password**: `<your-password>`

## Project Structure

```
.
├── daily-tasks/          # Next.js 15 application
│   ├── src/             # Source code
│   ├── package.json     # Dependencies
│   └── .env.example    # Environment template
├── docker-compose.yml   # PostgreSQL setup
├── .env.example         # Root environment template for Docker
└── README.md           # This file
```

## Next.js Features

- **Next.js 15** with App Router
- **TypeScript** support
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **Source directory** structure (`src/`)
- **Import alias** configured (`@/*`)

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Ensure Docker Compose is running:
   ```bash
   docker-compose ps
   ```

2. Check the database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify the database is accessible:
   ```bash
   docker-compose exec postgres psql -U postgres -d dailytasks
   ```

### Port Conflicts

If port 5432 is already in use, you can modify the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Change to available port
```

Then update the `DATABASE_URL` in `.env` accordingly.
