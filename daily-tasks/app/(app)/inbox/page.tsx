import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getAllInboxMessages, getInboxMessages } from '@/app/actions/inbox-messages'
import { getUsers } from '@/app/actions/user-actions'
import { InboxClient } from '@/components/inbox/inbox-client'
import { UserRole } from '@/types/enums'

export default async function InboxPage() {
    const session = await auth()
    if (!session?.user) redirect('/auth/login')

    const isAdmin = session.user.role === UserRole.ADMIN
    const result = isAdmin
        ? await getAllInboxMessages(1, 200)
        : await getInboxMessages(1, 50)

    const messages = result.success && result.data ? result.data.messages : []
    const total = result.success && result.data ? result.data.total : 0
    const usersResult = isAdmin ? await getUsers() : { data: [] }
    const users = isAdmin ? usersResult.data : []

    return (
        <InboxClient
            currentUserId={Number(session.user.id)}
            initialMessages={messages}
            isAdmin={isAdmin}
            total={total}
            users={users}
        />
    )
}
