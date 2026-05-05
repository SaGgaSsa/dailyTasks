import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  getEnvironmentLogEntries,
  getEnvironmentLogEnvironments,
  getPendingEnvironmentDeployItems,
} from '@/app/actions/environment-log'
import { auth } from '@/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EnvironmentDeployDialog } from '../_components/environment-deploy-dialog'

interface EnvironmentLogDetailPageProps {
  params: Promise<{ environmentId: string }>
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function EnvironmentLogDetailPage({ params }: EnvironmentLogDetailPageProps) {
  const { environmentId } = await params
  const numericEnvironmentId = Number(environmentId)

  if (!Number.isInteger(numericEnvironmentId) || numericEnvironmentId <= 0) {
    notFound()
  }

  const session = await auth()
  const canRegisterDeploy = session?.user?.role === 'ADMIN' || session?.user?.role === 'DEV'

  const [environmentsResult, entriesResult, pendingResult] = await Promise.all([
    getEnvironmentLogEnvironments(),
    getEnvironmentLogEntries(numericEnvironmentId),
    getPendingEnvironmentDeployItems(numericEnvironmentId),
  ])

  const environment = environmentsResult.data?.find((item) => item.id === numericEnvironmentId)
  if (!environment || !entriesResult.success || !pendingResult.success) {
    notFound()
  }

  const entries = entriesResult.data ?? []
  const pendingItems = pendingResult.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
            <Link href="/bitacora">Bitácora</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{environment.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial filtrado del ambiente.
          </p>
        </div>
        <EnvironmentDeployDialog
          environmentId={environment.id}
          environmentName={environment.name}
          initialPendingItems={pendingItems}
          canRegisterDeploy={canRegisterDeploy}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-2">Fecha</TableHead>
              <TableHead className="h-9 px-2">Tipo</TableHead>
              <TableHead className="h-9 px-2">Sujeto</TableHead>
              <TableHead className="h-9 px-2">Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No hay entradas registradas.
                </TableCell>
              </TableRow>
            ) : null}

            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="px-2 py-2 text-sm text-muted-foreground">
                  {formatDateTime(entry.occurredAt)}
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Badge variant="secondary">Deploy</Badge>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                      {entry.ticket ? `Ticket #${entry.ticket.ticketNumber}` : `Incidencia #${entry.incidence?.id ?? '-'}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.incidence?.workItem.type} {entry.incidence?.workItem.externalId} · {entry.incidence?.description ?? entry.ticket?.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 text-sm">
                  {entry.createdBy.name || entry.createdBy.username}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
