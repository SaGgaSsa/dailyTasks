import { notFound } from 'next/navigation'

import {
  getEnvironmentLogEntries,
  getEnvironmentLogEnvironments,
  getPendingEnvironmentDeployItems,
} from '@/app/actions/environment-log'
import { auth } from '@/auth'
import { EnvironmentActivityLog } from '../_components/environment-activity-log'

interface EnvironmentLogDetailPageProps {
  params: Promise<{ environmentId: string }>
}

export default async function EnvironmentLogDetailPage({ params }: EnvironmentLogDetailPageProps) {
  const { environmentId } = await params
  const numericEnvironmentId = Number(environmentId)

  if (!Number.isInteger(numericEnvironmentId) || numericEnvironmentId <= 0) {
    notFound()
  }

  const session = await auth()
  const canRegisterDeploy = session?.user?.role === 'ADMIN' || session?.user?.role === 'DEV'
  const canManageConfiguration = session?.user?.role === 'ADMIN' || session?.user?.role === 'QA'
  const canCreateScript = session?.user?.role === 'ADMIN' || session?.user?.role === 'QA' || session?.user?.role === 'DEV'

  const [environmentsResult, entriesResult, pendingResult] = await Promise.all([
    getEnvironmentLogEnvironments(),
    getEnvironmentLogEntries(numericEnvironmentId),
    getPendingEnvironmentDeployItems(numericEnvironmentId),
  ])

  const environment = environmentsResult.data?.find((item) => item.id === numericEnvironmentId)
  if (!environment || !entriesResult.success || !pendingResult.success) {
    notFound()
  }

  const batches = entriesResult.data ?? []
  const pendingItems = pendingResult.data ?? []

  return (
    <EnvironmentActivityLog
      environmentId={environment.id}
      environmentName={environment.name}
      batches={batches}
      pendingItems={pendingItems}
      canRegisterDeploy={canRegisterDeploy}
      canCreateConfiguration={canManageConfiguration}
      canCreateScript={canCreateScript}
      canValidateConfiguration={canManageConfiguration}
    />
  )
}
