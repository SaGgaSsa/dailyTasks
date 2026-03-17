import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const { Pool } = require('pg') as {
  Pool: new (config: { connectionString?: string }) => {
    end(): Promise<void>
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool as ConstructorParameters<typeof PrismaPg>[0])
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.workItemType.upsert({
    where: { name: 'Bug' },
    update: {},
    create: { name: 'Bug', color: 'red' },
  })

  await prisma.workItemType.upsert({
    where: { name: 'Feature' },
    update: {},
    create: { name: 'Feature', color: 'green' },
  })

  const hashedPassword = await bcrypt.hash('1234', 10)
  await prisma.user.upsert({
    where: { email: 'admin1@gmail.com' },
    update: {},
    create: {
      email: 'admin1@gmail.com',
      password: hashedPassword,
      username: 'admin1',
      role: 'ADMIN',
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
