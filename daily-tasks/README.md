# Daily Tasks

Aplicación Next.js 16 + TypeScript + Prisma + PostgreSQL.

## Estado del repositorio

- Flujo local activo con `npm run dev`
- Viable para Vercel
- Dockerización productiva pendiente de agregarse

## Requisitos

- Node.js 22
- npm 11
- PostgreSQL 15+ o contenedor Docker con PostgreSQL

## Variables requeridas

Crear `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

Variables base:

```bash
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=
DATABASE_URL_TEST=
INGEST_SECRET=
EXTERNAL_API_SECRET=
NEXTAUTH_SECRET=
NEXT_PUBLIC_UPLOADS_PATH=/uploads
```

Variables recomendadas para despliegue:

```bash
NEXTAUTH_URL=
NEXT_PUBLIC_APP_URL=
```

Para Docker interno:

```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/daily_tasks
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/daily_tasks_test
NEXTAUTH_URL=http://localhost:8850
NEXT_PUBLIC_APP_URL=http://localhost:8850
```

## Instalación local

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Acceso local:

```bash
http://localhost:3000
```

## Build local

```bash
npm run lint
npm run test:integration
npm run build
npm run start
```

Los tests de integración requieren `DATABASE_URL_TEST` y usan una base separada de la de desarrollo.

## Estructura de despliegue objetivo en Docker

Servicios:

- `app`: Next.js en `3000`
- `db`: PostgreSQL con volumen persistente
- `proxy`: publicación externa por `8850`
- uploads persistidos
- scripts de backup/restore en root

Levantar:

```bash
docker compose up -d --build
```

Acceso:

```bash
http://localhost:8850
```

Parar:

```bash
docker compose down
```

Logs:

```bash
docker compose logs -f app
docker compose logs -f db
docker compose logs -f proxy
```

## CI y gate de deploy

- Los tests de integración deben correr antes del build/publicación de la imagen Docker
- El `Dockerfile` no ejecuta `npm run test:integration`
- El contenedor de app no corre tests al iniciar; solo aplica `prisma migrate deploy` y arranca la app
- CI necesita una PostgreSQL efímera y `DATABASE_URL_TEST`
- Si `npm run test:integration` falla, no debe construirse ni publicarse la imagen

## Backup y restore

Backup:

```bash
./backup-db.sh
```

Restore:

```bash
./restore-db.sh dailyTasks_2026_03_14.bak
```

## Notas operativas

- Los uploads actuales se escriben en `public/uploads`
- La base usa `DATABASE_URL`; en Docker debe apuntar a `db`
- Los tests de integración usan `DATABASE_URL_TEST` y hacen `prisma db push` sobre esa base
- El contenedor aplica `prisma migrate deploy` al iniciar
- Si se resetea la base y se vuelve a seedear, hay que reingresar sesión
