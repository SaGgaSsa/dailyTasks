'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Edit, Trash, AlertTriangle, Eye, RotateCcw, KeyRound } from 'lucide-react'
import { deleteUser, resetUserPassword } from '@/app/actions/user-actions'
import { toast } from 'sonner'
import { AdminUserSummary } from '@/app/actions/user-actions'

interface UsersTableProps {
    data: AdminUserSummary[]
    onEdit: (user: AdminUserSummary) => void
    onViewDetail: (user: AdminUserSummary) => void
}

export function UsersTable({ data, onEdit, onViewDetail }: UsersTableProps) {
    const router = useRouter()
    const [userToDelete, setUserToDelete] = useState<AdminUserSummary | null>(null)
    const [userToReset, setUserToReset] = useState<AdminUserSummary | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    const handleDeleteClick = (user: AdminUserSummary) => {
        setUserToDelete(user)
    }

    const handleConfirmDelete = async () => {
        if (!userToDelete) return

        setIsDeleting(true)
        try {
            const res = await deleteUser(userToDelete.id)
            if (res.success) {
                toast.success('Colaborador eliminado')
                setUserToDelete(null)
                router.refresh()
            } else {
                toast.error('Error al eliminar colaborador')
            }
        } catch {
            toast.error('Error al eliminar colaborador')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCancelDelete = () => {
        setUserToDelete(null)
    }

    const handleConfirmReset = async () => {
        if (!userToReset) return

        setIsResetting(true)
        try {
            const res = await resetUserPassword(userToReset.id)
            if (res.success) {
                toast.success('Password reseteado')
                setUserToReset(null)
                router.refresh()
            } else {
                toast.error(res.error || 'Error al resetear password')
            }
        } catch {
            toast.error('Error al resetear password')
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Mail</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No hay colaboradores registrados</TableCell>
                            </TableRow>
                        ) : (
                            data.map((user) => (
                                <TableRow key={user.id} className="cursor-pointer" onClick={() => onEdit(user)}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{user.name}</span>
                                            {user.mustChangePassword && (
                                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    <KeyRound className="h-3 w-3" />
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" onClick={() => onViewDetail(user)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Resetear password"
                                                onClick={() => setUserToReset(user)}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => handleDeleteClick(user)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Diálogo de confirmación */}
            <Dialog open={userToDelete !== null} onOpenChange={(open) => !open && handleCancelDelete()}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-500/10">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                            <DialogTitle className="text-card-foreground">Confirmar eliminación</DialogTitle>
                        </div>
                        <DialogDescription className="text-muted-foreground">
                            ¿Estás seguro de que deseas eliminar a <span className="font-medium text-foreground">{userToDelete?.name}</span>?
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={handleCancelDelete}
                            className="border-border text-foreground hover:bg-accent hover:text-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={userToReset !== null} onOpenChange={(open) => !open && setUserToReset(null)}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-amber-500/10">
                                <RotateCcw className="h-6 w-6 text-amber-500" />
                            </div>
                            <DialogTitle className="text-card-foreground">Resetear password</DialogTitle>
                        </div>
                        <DialogDescription className="text-muted-foreground">
                            Se asignará la contraseña temporal a <span className="font-medium text-foreground">{userToReset?.name}</span> y deberá cambiarla al ingresar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setUserToReset(null)}
                            className="border-border text-foreground hover:bg-accent hover:text-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmReset}
                            disabled={isResetting}
                        >
                            {isResetting ? 'Reseteando...' : 'Resetear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
