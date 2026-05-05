'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { History, Star } from 'lucide-react'
import { toast } from 'sonner'

import { EnvironmentLogEnvironment, toggleEnvironmentFavorite } from '@/app/actions/environment-log'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface EnvironmentListClientProps {
  initialEnvironments: EnvironmentLogEnvironment[]
}

export function EnvironmentListClient({ initialEnvironments }: EnvironmentListClientProps) {
  const [environments, setEnvironments] = useState(initialEnvironments)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  function handleToggleFavorite(environmentId: number) {
    setPendingId(environmentId)
    startTransition(async () => {
      const result = await toggleEnvironmentFavorite(environmentId)
      setPendingId(null)

      if (!result.success || !result.data) {
        toast.error(result.error || 'No se pudo actualizar el favorito')
        return
      }

      setEnvironments((current) =>
        current.map((environment) =>
          environment.id === environmentId
            ? { ...environment, isFavorite: result.data!.isFavorite }
            : environment
        )
      )
    })
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-2">Ambiente</TableHead>
            <TableHead className="w-[96px] h-9 px-2 text-center">Favorito</TableHead>
            <TableHead className="w-[120px] h-9 px-2 text-right">Historial</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {environments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No hay ambientes habilitados.
              </TableCell>
            </TableRow>
          ) : null}

          {environments.map((environment) => (
            <TableRow key={environment.id}>
              <TableCell className="px-2 py-2 font-medium">{environment.name}</TableCell>
              <TableCell className="px-2 py-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pendingId === environment.id}
                  onClick={() => handleToggleFavorite(environment.id)}
                  aria-label={environment.isFavorite ? 'Quitar favorito' : 'Marcar favorito'}
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      environment.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'
                    )}
                  />
                </Button>
              </TableCell>
              <TableCell className="px-2 py-2 text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/bitacora/${environment.id}`}>
                    <History className="h-4 w-4" />
                    Abrir
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
