import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await hash('123456', 12)

  const sag = await prisma.user.upsert({
    where: { username: 'SAG' },
    update: {},
    create: {
      id: 140,
      username: 'SAG',
      name: 'Sebastian Galarza',
      email: 'sebastian.galarza@sisa.com.ar',
      password,
      role: 'ADMIN',
      technologies: ['SISA', 'WEB', 'ANDROID', 'ANGULAR', 'SPRING'],
    },
  })

  console.log({ sag })
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
