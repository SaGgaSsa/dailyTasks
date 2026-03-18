'use client'

import { useRouter } from 'next/navigation'
import { FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OpenScriptsButtonProps {
  incidenceId?: number | null
  size?: 'icon' | 'sm'
  className?: string
  title?: string
  onNavigate?: (url: string) => void
}

export function OpenScriptsButton({
  incidenceId,
  size = 'icon',
  className,
  title = 'Ver scripts',
  onNavigate,
}: OpenScriptsButtonProps) {
  const router = useRouter()

  const handleOpen = () => {
    if (!incidenceId) return

    const targetUrl = `/dashboard/incidences/${incidenceId}#scripts`
    if (onNavigate) {
      onNavigate(targetUrl)
      return
    }

    router.push(targetUrl)
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
      disabled={!incidenceId}
      className={className}
      title={title}
    >
      <FileCode2 className={size === 'sm' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {size === 'sm' && <span>Ver scripts</span>}
    </Button>
  )
}
