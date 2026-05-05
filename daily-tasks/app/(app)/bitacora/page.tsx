import Link from 'next/link'
import { redirect } from 'next/navigation'
import { History } from 'lucide-react'

import { getEnvironmentLogEnvironments } from '@/app/actions/environment-log'
import { Button } from '@/components/ui/button'
import { EnvironmentListClient } from './_components/environment-list-client'

export default async function EnvironmentLogPage() {
  const result = await getEnvironmentLogEnvironments()

  if (!result.success) {
    redirect('/auth/login')
  }

  const environments = result.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bitácora</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial de deploys por ambiente habilitado.
          </p>
        </div>
        {environments[0] ? (
          <Button asChild size="sm">
            <Link href={`/bitacora/${environments[0].id}`}>
              <History className="h-4 w-4" />
              Ver historial
            </Link>
          </Button>
        ) : null}
      </div>

      <EnvironmentListClient initialEnvironments={environments} />
    </div>
  )
}
