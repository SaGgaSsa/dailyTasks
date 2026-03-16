import { spawnSync } from 'node:child_process'

const databaseUrlTest = process.env.DATABASE_URL_TEST

if (!databaseUrlTest) {
  console.error('DATABASE_URL_TEST is required to run integration tests')
  process.exit(1)
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrlTest,
  NODE_ENV: process.env.NODE_ENV || 'test',
}

const prismaResult = spawnSync(
  'npx',
  ['prisma', 'db', 'push'],
  {
    stdio: 'inherit',
    env,
  }
)

if (prismaResult.status !== 0) {
  process.exit(prismaResult.status ?? 1)
}

const vitestArgs = ['vitest', 'run', ...process.argv.slice(2)]
const vitestResult = spawnSync('npx', vitestArgs, {
  stdio: 'inherit',
  env,
})

process.exit(vitestResult.status ?? 1)
