'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function IncidencePageContent() {
    const pathname = usePathname()
    const router = useRouter()
    const [hasChanges, setHasChanges] = useState(false)
    const [showExitDialog, setShowExitDialog] = useState(false)
    const pendingNavigationRef = useRef<string | null>(null)
    const saveFnRef = useRef<(() => Promise<void>) | null>(null)

    const handleSave = async () => {
        if (saveFnRef.current) {
            try {
                await saveFnRef.current()
                setHasChanges(false)
                router.back()
            } catch {
                // Error ya mostrado en tasks-tab
            }
        }
    }

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasChanges])

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
    )
}
