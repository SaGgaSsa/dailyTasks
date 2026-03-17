import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import 'dotenv/config'

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
    where: { email: 'admin@dailytasks.com' },
    update: {},
    create: {
      email: 'admin@dailytasks.com',
      password: hashedPassword,
      username: 'admin',
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email: 'dev@dailytasks.com' },
    update: {},
    create: {
      email: 'dev@dailytasks.com',
      password: hashedPassword,
      username: 'dev',
      role: 'DEV',
    },
  })

  await prisma.user.upsert({
    where: { email: 'qa@dailytasks.com' },
    update: {},
    create: {
      email: 'qa@dailytasks.com',
      password: hashedPassword,
      username: 'qa',
      role: 'QA',
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
