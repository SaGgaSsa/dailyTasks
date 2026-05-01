import { getUsers } from '@/app/actions/user-actions'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { UsersClient } from '@/components/users/users-client'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await auth()

  if (session?.user?.role !== 'ADMIN') {
    redirect('/incidences')
  }

  const [usersResult, techsData] = await Promise.all([
    getUsers(),
    getCachedTechsWithModules(),
  ])
  const users = usersResult.success && usersResult.data ? usersResult.data : []
  const techOptions = techsData.techs.map(t => ({ value: t.name, label: t.name }))

  if (usersResult.error) {
    console.error(usersResult.error)
  }

  return (
    <div className="flex-1 space-y-4 p-2">
      <UsersClient initialUsers={users} techOptions={techOptions} />
    </div>
  )
}
