'use client'

import { useState } from 'react'
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
import { Edit, Trash, AlertTriangle } from 'lucide-react'
import { deleteUser } from '@/app/actions/user-actions'
import { toast } from 'sonner'

import { User } from '@prisma/client'

interface UsersTableProps {
    data: User[]
    onEdit: (user: User) => void
}

export function UsersTable({ data, onEdit }: UsersTableProps) {
    const [userToDelete, setUserToDelete] = useState<User | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDeleteClick = (user: User) => {
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
            } else {
                toast.error('Error al eliminar colaborador')
            }
        } catch (error) {
            toast.error('Error al eliminar colaborador')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCancelDelete = () => {
        setUserToDelete(null)
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
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
                                                <Edit className="h-4 w-4" />
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
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-500/10">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                            <DialogTitle className="text-zinc-100">Confirmar eliminación</DialogTitle>
                        </div>
                        <DialogDescription className="text-zinc-400">
                            ¿Estás seguro de que deseas eliminar a <span className="font-medium text-zinc-200">{userToDelete?.name}</span>? 
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={handleCancelDelete}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
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
        </>
    )
}
