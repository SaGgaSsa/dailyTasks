'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IncidenceForm } from './incidence-form'
import { useSession } from 'next-auth/react'

interface ColumnActionProps {
    status: string
}

export function ColumnAction({ status }: ColumnActionProps) {
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)

    const isAdmin = session?.user?.role === 'ADMIN'

    // Only Admins can create incidences
    if (!isAdmin) return null

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setOpen(true)}
            >
                <Plus className="h-4 w-4" />
            </Button>

            <IncidenceForm
                open={open}
                onOpenChange={setOpen}
            />
        </>
    )
}
