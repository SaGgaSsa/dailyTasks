'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOrCreateScriptsPage } from '@/app/actions/pages'
import { toast } from 'sonner'

interface OpenScriptsButtonProps {
  incidenceId?: number | null
  pageId?: number | null
  size?: 'icon' | 'sm'
  className?: string
  title?: string
  onNavigate?: (url: string) => void
}

export function OpenScriptsButton({
  incidenceId,
  pageId,
  size = 'icon',
  className,
  title = 'Ver scripts',
  onNavigate,
}: OpenScriptsButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleOpen = () => {
    if (!incidenceId) return

    if (pageId) {
      const targetUrl = `/dashboard/incidences/${incidenceId}/pages/${pageId}`
      if (onNavigate) {
        onNavigate(targetUrl)
        return
      }

      router.push(targetUrl)
      return
    }

    startTransition(async () => {
      const result = await getOrCreateScriptsPage(incidenceId)
      if (!result.success || !result.data) {
        toast.error(result.error || 'No se pudo abrir la página de scripts')
        return
      }

      const targetUrl = `/dashboard/incidences/${incidenceId}/pages/${result.data.id}`
      if (onNavigate) {
        onNavigate(targetUrl)
        return
      }

      router.push(targetUrl)
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'icon'}
      onClick={(event) => {
        event.stopPropagation()
        handleOpen()
      }}
      disabled={!incidenceId || isPending}
      className={className}
      title={title}
    >
      <FileCode2 className={size === 'sm' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {size === 'sm' && <span>Ver scripts</span>}
    </Button>
  )
}
