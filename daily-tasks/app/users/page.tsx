import { getUsers } from '@/app/actions/user-actions'
import { UsersClient } from '@/components/users/users-client'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await auth()

  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const usersResult = await getUsers()
  const users = usersResult.data

  if (usersResult.error) {
    console.error(usersResult.error)
  }

  return (
    <div className="flex-1 space-y-4 p-2">
      <UsersClient initialUsers={users} />
    </div>
  )
}
