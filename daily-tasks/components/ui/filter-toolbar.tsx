'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FilterToolbarProps {
  startContent: ReactNode
  endContent?: ReactNode
  className?: string
  startClassName?: string
  endClassName?: string
}

export function FilterToolbar({
  startContent,
  endContent,
  className,
  startClassName,
  endClassName,
}: FilterToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 px-1', className)}>
      <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-4', startClassName)}>
        {startContent}
      </div>
      {endContent ? (
        <div className={cn('ml-auto flex items-center gap-2', endClassName)}>
          {endContent}
        </div>
      ) : null}
    </div>
  )
}
