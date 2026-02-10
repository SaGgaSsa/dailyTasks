import { db } from './lib/db'
import { TechStack, TaskStatus } from './types/enums'

async function testDirectQuery() {
  try {
    const incidences = await db.incidence.findMany({
      where: {
        status: TaskStatus.BACKLOG
      },
      include: {
        assignments: {
          where: { isAssigned: true },
          include: {
            user: true,
            tasks: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        }
      },
      orderBy: [
        {
          priority: 'desc'
        },
        {
          createdAt: 'asc'
        }
      ]
    })
    
  } catch (error) {
    console.error('Error in direct query:', error)
  } finally {
    await db.$disconnect()
  }
}

testDirectQuery()