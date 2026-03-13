'use client'

import { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface LongTextSheetProps {
  title: string
  content: string
  trigger: ReactNode
  description?: string
  emptyMessage?: string
}

export function LongTextSheet({
  title,
  content,
  trigger,
  description,
  emptyMessage = 'Sin descripción disponible',
}: LongTextSheetProps) {
  const trimmedContent = content.trim()

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
              {trimmedContent || emptyMessage}
            </pre>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
