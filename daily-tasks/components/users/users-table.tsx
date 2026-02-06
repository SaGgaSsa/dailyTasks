'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Edit, Trash } from 'lucide-react'
import { deleteUser } from '@/app/actions/user-actions'
import { toast } from 'sonner'

import { User } from '@/app/generated/prisma/client'

interface UsersTableProps {
    data: User[]
    onEdit: (user: User) => void
}

export function UsersTable({ data, onEdit }: UsersTableProps) {
    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            const res = await deleteUser(id)
            if (res.success) {
                toast.success('Usuario eliminado')
            } else {
                toast.error('Error al eliminar usuario')
            }
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">No hay usuarios registrados</TableCell>
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
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => handleDelete(user.id)}>
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
    )
}
