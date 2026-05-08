import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { getExternalWorkItemsManagementData } from '@/app/actions/external-work-items'
import { TramitesClient } from '@/components/tramites/tramites-client'

export const dynamic = 'force-dynamic'

export default async function TramitesPage() {
  const session = await auth()

  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'QA') {
    redirect('/incidences')
  }

  const result = await getExternalWorkItemsManagementData({})
  const initialData = result.success
    ? result.data
    : {
        items: [],
        workItemTypes: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }

  return (
    <div className="flex-1 p-2">
      <TramitesClient initialData={initialData} />
    </div>
  )
}
