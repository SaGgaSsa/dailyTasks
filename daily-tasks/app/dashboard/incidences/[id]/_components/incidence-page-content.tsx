'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IncidenceDetailClient } from './incidence-detail-client'
import { IncidenceWithDetails } from '@/types'
import { toast } from 'sonner'

interface IncidencePageContentProps {
    incidence: IncidenceWithDetails
    allUsers: { id: number; name: string | null; username: string; role: string }[]
    currentUserId: number
    isAdmin: boolean
}

export function IncidencePageContent({ incidence, allUsers, currentUserId, isAdmin }: IncidencePageContentProps) {
    const pathname = usePathname()
    const [hasChanges, setHasChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showExitDialog, setShowExitDialog] = useState(false)
    const pendingNavigationRef = useRef<string | null>(null)
    const saveFnRef = useRef<(() => Promise<void>) | null>(null)

    const handleSave = useCallback(async () => {
        if (saveFnRef.current) {
            setIsSaving(true)
            try {
                await saveFnRef.current()
                setHasChanges(false)
                toast.success('Cambios guardados')
            } catch (error) {
                console.error('Error saving:', error)
            } finally {
                setIsSaving(false)
            }
        }
    }, [])

    const handleHasChangesChange = useCallback((changed: boolean) => {
        setHasChanges(changed)
    }, [])

    const handleSaveRef = useCallback((saveFn: () => Promise<void>) => {
        saveFnRef.current = saveFn
    }, [])

    useEffect(() => {
        if (!hasChanges) return

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const anchor = target.closest('a')
            if (anchor && anchor.href && !anchor.href.includes(pathname)) {
                e.preventDefault()
                e.stopPropagation()
                pendingNavigationRef.current = anchor.href
                setShowExitDialog(true)
            }
        }

        document.addEventListener('click', handleClick, true)
        return () => document.removeEventListener('click', handleClick, true)
    }, [hasChanges, pathname])

    const handleConfirmExit = () => {
        setShowExitDialog(false)
        setHasChanges(false)
        if (pendingNavigationRef.current) {
            window.location.href = pendingNavigationRef.current
        }
    }

    const handleCancelExit = () => {
        setShowExitDialog(false)
        pendingNavigationRef.current = null
    }

    return (
        <>
            <IncidenceDetailClient
                incidence={incidence}
                allUsers={allUsers}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onSave={handleSave}
                onHasChangesChange={handleHasChangesChange}
                onSaveRef={handleSaveRef}
            />
            <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Salir sin guardar</DialogTitle>
                        <DialogDescription>
                            Tiene cambios sin guardar. ¿Está seguro de que desea salir?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelExit}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmExit}>
                            Salir sin guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
