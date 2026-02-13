'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { IncidenceWithDetails } from '@/types'
import { TaskType } from '@/types/enums'
import { IncidenceFormAdmin } from './incidence-form-admin'
import { IncidenceFormDev } from './incidence-form-dev'

interface IncidenceFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: IncidenceWithDetails | null
    type?: TaskType
    externalId?: number
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
    onIncidenceCreated?: () => void
    isDev?: boolean
    isKanban?: boolean
}

export function IncidenceForm(props: IncidenceFormProps) {
    const { data: session } = useSession()
    const searchParams = useSearchParams()
    
    const userRole = session?.user?.role
    const isMyAssignmentsMode = searchParams.get('mine') === 'true'
    
    const shouldUseDevView = userRole === 'DEV' || (userRole === 'ADMIN' && isMyAssignmentsMode)
    
    if (shouldUseDevView) {
        return <IncidenceFormDev {...props} />
    }
    
    return <IncidenceFormAdmin {...props} />
}
