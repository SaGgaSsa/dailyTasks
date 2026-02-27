'use client'

import { useState, useCallback, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { IncidenceWithDetails, AttachmentWithDetails } from '@/types'
import { TaskType, Priority } from '@/types/enums'
import { GeneralTab } from './general-tab'
import { TasksTab } from './tasks-tab'
import { AssetsTab } from './assets-tab'
import { PagesTab } from './pages-tab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { getIncidence } from '@/app/actions/incidence-actions'

const typeColors: Record<TaskType, string> = {
    I_MODAPL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    I_CASO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    I_CONS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
    LOW: { label: 'Baja', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
    MEDIUM: { label: 'Media', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    HIGH: { label: 'Alta', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

interface IncidenceDetailClientProps {
    incidence: IncidenceWithDetails
    allUsers: { id: number; name: string | null; username: string; role: string }[]
    currentUserId: number
    isAdmin: boolean
    hasChanges?: boolean
    isSaving?: boolean
    onSave?: () => void
    onHasChangesChange?: (hasChanges: boolean) => void
    onSaveRef?: (saveFn: () => Promise<void>) => void
}

export function IncidenceDetailClient({ 
    incidence, 
    allUsers, 
    currentUserId, 
    isAdmin,
    hasChanges = false,
    isSaving = false,
    onSave,
    onHasChangesChange,
    onSaveRef,
}: IncidenceDetailClientProps) {
    const [incidenceData, setIncidenceData] = useState<IncidenceWithDetails>(incidence)
    const [isPending, startTransition] = useTransition()

    const handleIncidenceUpdate = useCallback((updated: IncidenceWithDetails) => {
        setIncidenceData(updated)
    }, [])

    const handleRefreshAttachments = useCallback(() => {
        startTransition(async () => {
            const updated = await getIncidence(incidence.id)
            if (updated) {
                setIncidenceData(updated)
            }
        })
    }, [incidence.id])

    const handleRefreshPages = useCallback(() => {
        startTransition(async () => {
            const updated = await getIncidence(incidence.id)
            if (updated) {
                setIncidenceData(updated)
            }
        })
    }, [incidence.id])

    return (
        <div className="pt-6 pl-8 pr-6 border-r border-border min-h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-sm font-medium ${typeColors[incidenceData.type]}`}>
                        {incidenceData.type} {incidenceData.externalId}
                    </Badge>
                    <Badge variant="outline" className={`text-sm ${priorityConfig[incidenceData.priority].className}`}>
                        {priorityConfig[incidenceData.priority].label}
                    </Badge>
                </div>
                {hasChanges && (
                    <Button
                        size="icon"
                        onClick={onSave}
                        disabled={isSaving}
                        className="h-8 w-8"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight mt-2 mb-6">
                {incidenceData.title}
            </h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="tareas">Tareas</TabsTrigger>
                    <TabsTrigger value="archivos">Archivos</TabsTrigger>
                    <TabsTrigger value="pages">Páginas</TabsTrigger>
                </TabsList>

                <Separator className="my-4" />

                <TabsContent value="general" className="mt-0">
                    <GeneralTab comment={incidenceData.comment} />
                </TabsContent>

                <TabsContent value="tareas" className="mt-0">
                    <TasksTab
                        incidence={incidenceData}
                        allUsers={allUsers}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onIncidenceUpdate={handleIncidenceUpdate}
                        onHasChangesChange={onHasChangesChange}
                        onSaveRef={onSaveRef}
                    />
                </TabsContent>

                <TabsContent value="archivos" className="mt-0">
                    <AssetsTab
                        incidenceId={incidenceData.id}
                        attachments={incidenceData.attachments}
                        currentUserId={currentUserId}
                        onRefresh={handleRefreshAttachments}
                    />
                </TabsContent>

                <TabsContent value="pages" className="mt-0">
                    <PagesTab
                        incidenceId={incidenceData.id}
                        pages={incidenceData.pages}
                        currentUserId={currentUserId}
                        onRefresh={handleRefreshPages}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
