'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowUp, ClipboardCopy, Copy, Database, FileCode, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    createScript,
    updateScript,
    deleteScript,
} from '@/app/actions/script-actions'
import type { ScriptType } from '@prisma/client'
import type { ScriptWithCreator } from '@/types'

interface ScriptsTabProps {
    scripts: ScriptWithCreator[]
    incidenceId: number
    sqlHeader: string
    currentUserId: number
    isAdmin: boolean
    onRefresh?: () => void
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function getRelevantDate(script: ScriptWithCreator): number {
    return Math.max(
        new Date(script.createdAt).getTime(),
        new Date(script.updatedAt).getTime()
    )
}

export function ScriptsTab({ scripts, incidenceId, sqlHeader, currentUserId, isAdmin, onRefresh }: ScriptsTabProps) {
    const [content, setContent] = useState('')
    const [scriptType, setScriptType] = useState<ScriptType>('SQL')
    const [editingScript, setEditingScript] = useState<ScriptWithCreator | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<ScriptWithCreator | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const initialScrollDone = useRef(false)

    const sortedScripts = [...scripts].sort((a, b) => getRelevantDate(a) - getRelevantDate(b))

    const allSqlText = (() => {
        const sqlScripts = sortedScripts.filter(s => s.type === 'SQL')
        if (sqlScripts.length === 0) return ''
        return sqlHeader + '\n\n' + sqlScripts.map(s => s.content).join('\n\n')
    })()

    useEffect(() => {
        if (scripts.length > 0 && !initialScrollDone.current) {
            initialScrollDone.current = true
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        }
    }, [scripts])

    const scrollToBottom = () => {
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    const handleSubmit = async () => {
        if (!content.trim()) return

        setIsSubmitting(true)
        try {
            if (editingScript) {
                const result = await updateScript(editingScript.id, {
                    content: content.trim(),
                    type: scriptType,
                })
                if (result.success) {
                    toast.success('Script actualizado')
                    setEditingScript(null)
                } else {
                    toast.error(result.error || 'Error al actualizar')
                    return
                }
            } else {
                const result = await createScript({
                    incidenceId,
                    content: content.trim(),
                    type: scriptType,
                })
                if (result.success) {
                    toast.success('Script creado')
                } else {
                    toast.error(result.error || 'Error al crear')
                    return
                }
            }
            setContent('')
            setScriptType('SQL')
            onRefresh?.()
            scrollToBottom()
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = (script: ScriptWithCreator) => {
        setEditingScript(script)
        setContent(script.content)
        setScriptType(script.type as ScriptType)
        scrollToBottom()
    }

    const handleCancelEdit = () => {
        setEditingScript(null)
        setContent('')
        setScriptType('SQL')
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return

        setIsDeleting(true)
        try {
            const result = await deleteScript(deleteTarget.id)
            if (result.success) {
                toast.success('Script eliminado')
                onRefresh?.()
            } else {
                toast.error(result.error || 'Error al eliminar')
            }
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    }

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado al portapapeles')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const canModify = (script: ScriptWithCreator) =>
        isAdmin || script.createdById === currentUserId

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Historial */}
                {sortedScripts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No hay scripts registrados
                    </p>
                ) : (
                    <div className="space-y-4">
                        {sortedScripts.map((script) => (
                            <div
                                key={script.id}
                                className="border border-border rounded-lg p-4 space-y-3"
                            >
                                <pre className="font-mono text-sm whitespace-pre-wrap bg-accent/30 rounded p-3">
                                    {script.content}
                                </pre>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant={script.type === 'SQL' ? 'default' : 'secondary'} className="text-[10px]">
                                        {script.type}
                                    </Badge>
                                    <span>{script.createdBy.name || script.createdBy.username}</span>
                                    <div className="flex-1" />
                                    <span>
                                        {new Date(script.createdAt).getTime() !== new Date(script.updatedAt).getTime()
                                            ? `Actualizado: ${formatDate(script.updatedAt)}`
                                            : formatDate(script.createdAt)}
                                    </span>
                                    {canModify(script) && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleEdit(script)}
                                                title="Editar"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-400"
                                                onClick={() => setDeleteTarget(script)}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleCopy(script.content)}
                                        title="Copiar"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Composer (abajo) */}
                <div className="space-y-3">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un script..."
                        className="font-mono text-sm min-h-[100px]"
                    />
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={scriptType === 'SQL' ? 'default' : 'outline'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setScriptType('SQL')}
                                >
                                    <Database className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>SQL</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={scriptType === 'CODE' ? 'default' : 'outline'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setScriptType('CODE')}
                                >
                                    <FileCode className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Code</TooltipContent>
                        </Tooltip>
                        {editingScript && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span>Modificando script</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={handleCancelEdit}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        <div className="flex-1" />
                        {allSqlText && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleCopy(allSqlText)}
                                    >
                                        <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar todos los SQL</TooltipContent>
                            </Tooltip>
                        )}
                        <Button
                            type="button"
                            size="icon"
                            onClick={handleSubmit}
                            disabled={!content.trim() || isSubmitting}
                            className="h-8 w-8"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div ref={bottomRef} />

                {/* Delete confirmation dialog */}
                <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Eliminar Script</DialogTitle>
                            <DialogDescription>
                                ¿Estás seguro de que deseas eliminar este script? Esta acción no se puede deshacer.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
