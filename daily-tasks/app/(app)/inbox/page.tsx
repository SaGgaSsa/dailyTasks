import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getNotifications } from '@/app/actions/notifications'
import { InboxClient } from '@/components/inbox/inbox-client'

export default async function InboxPage() {
    const session = await auth()
    if (!session?.user) redirect('/auth/login')

    const result = await getNotifications(1, 50)
    const notifications = result.success && result.data ? result.data.notifications : []
    const total = result.success && result.data ? result.data.total : 0

    return <InboxClient initialNotifications={notifications} total={total} />
}
