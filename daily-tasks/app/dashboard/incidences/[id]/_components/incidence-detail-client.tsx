'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
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
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'

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
    const [activeTab, setActiveTab] = useState("overview")

    useEffect(() => {
        const hash = window.location.hash.replace('#', '')
        const validTabs = ['overview', 'tasks', 'pages', 'files']
        if (validTabs.includes(hash)) {
            setActiveTab(hash)
        }
    }, [])

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '')
            const validTabs = ['overview', 'tasks', 'pages', 'files']
            if (validTabs.includes(hash)) {
                setActiveTab(hash)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

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
                    <IncidenceBadge
                        type={incidenceData.externalWorkItem?.type ?? ''}
                        externalId={incidenceData.externalWorkItem?.externalId ?? ''}
                        className="text-sm font-medium"
                    />
                    <PriorityBadge priority={incidenceData.priority} className="text-sm" />
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
                {incidenceData.description}
            </h1>

            <Tabs 
                value={activeTab} 
                onValueChange={(value) => {
                    setActiveTab(value)
                    window.history.replaceState(null, '', `#${value}`)
                }} 
                className="w-full"
            >
                <TabsList>
                    <TabsTrigger value="overview">General</TabsTrigger>
                    <TabsTrigger value="tasks">Tareas</TabsTrigger>
                    <TabsTrigger value="pages">Páginas</TabsTrigger>
                    <TabsTrigger value="files">Archivos</TabsTrigger>
                </TabsList>

                <Separator className="my-4" />

                <TabsContent value="overview" className="mt-0">
                    <GeneralTab comment={incidenceData.comment} pages={incidenceData.pages} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
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

                <TabsContent value="pages" className="mt-0">
                    <PagesTab
                        incidenceId={incidenceData.id}
                        pages={incidenceData.pages}
                        currentUserId={currentUserId}
                        onRefresh={handleRefreshPages}
                    />
                </TabsContent>

                <TabsContent value="files" className="mt-0">
                    <AssetsTab
                        incidenceId={incidenceData.id}
                        attachments={incidenceData.attachments}
                        currentUserId={currentUserId}
                        onRefresh={handleRefreshAttachments}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
