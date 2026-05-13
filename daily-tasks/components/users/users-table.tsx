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
import { Edit, AlertTriangle, Eye, RotateCcw, KeyRound, UserCheck, UserX } from 'lucide-react'
import { resetUserPassword, setUserEnabled } from '@/app/actions/user-actions'
import { toast } from 'sonner'
import { AdminUserSummary } from '@/app/actions/user-actions'

interface UsersTableProps {
    data: AdminUserSummary[]
    onEdit: (user: AdminUserSummary) => void
    onViewDetail: (user: AdminUserSummary) => void
}

export function UsersTable({ data, onEdit, onViewDetail }: UsersTableProps) {
    const router = useRouter()
    const [userToToggle, setUserToToggle] = useState<AdminUserSummary | null>(null)
    const [userToReset, setUserToReset] = useState<AdminUserSummary | null>(null)
    const [isTogglingEnabled, setIsTogglingEnabled] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    const handleToggleClick = (user: AdminUserSummary) => {
        setUserToToggle(user)
    }

    const handleConfirmToggle = async () => {
        if (!userToToggle) return

        setIsTogglingEnabled(true)
        try {
            const nextEnabledState = !userToToggle.isEnabled
            const res = await setUserEnabled(userToToggle.id, nextEnabledState)
            if (res.success) {
                toast.success(nextEnabledState ? 'Colaborador reactivado' : 'Colaborador deshabilitado')
                setUserToToggle(null)
                router.refresh()
            } else {
                toast.error(res.error || 'Error al actualizar colaborador')
            }
        } catch {
            toast.error('Error al actualizar colaborador')
        } finally {
            setIsTogglingEnabled(false)
        }
    }

    const handleCancelToggle = () => {
        setUserToToggle(null)
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
                                            {!user.isEnabled && (
                                                <span className="inline-flex items-center rounded-md border border-muted-foreground/30 bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                                                    Inactivo
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
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={user.isEnabled ? 'Deshabilitar' : 'Reactivar'}
                                                className={user.isEnabled ? 'text-red-500 hover:text-red-700 hover:bg-red-100' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100'}
                                                onClick={() => handleToggleClick(user)}
                                            >
                                                {user.isEnabled ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
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
            <Dialog open={userToToggle !== null} onOpenChange={(open) => !open && handleCancelToggle()}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={userToToggle?.isEnabled ? 'p-2 rounded-full bg-red-500/10' : 'p-2 rounded-full bg-emerald-500/10'}>
                                <AlertTriangle className={userToToggle?.isEnabled ? 'h-6 w-6 text-red-500' : 'h-6 w-6 text-emerald-600'} />
                            </div>
                            <DialogTitle className="text-card-foreground">
                                {userToToggle?.isEnabled ? 'Deshabilitar colaborador' : 'Reactivar colaborador'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-muted-foreground">
                            {userToToggle?.isEnabled
                                ? <>El colaborador <span className="font-medium text-foreground">{userToToggle?.name}</span> no podrá iniciar sesión ni recibir asignaciones nuevas.</>
                                : <>El colaborador <span className="font-medium text-foreground">{userToToggle?.name}</span> podrá volver a iniciar sesión y recibir asignaciones.</>}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={handleCancelToggle}
                            className="border-border text-foreground hover:bg-accent hover:text-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant={userToToggle?.isEnabled ? 'destructive' : 'default'}
                            onClick={handleConfirmToggle}
                            disabled={isTogglingEnabled}
                        >
                            {isTogglingEnabled
                                ? 'Actualizando...'
                                : userToToggle?.isEnabled
                                    ? 'Deshabilitar'
                                    : 'Reactivar'}
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
