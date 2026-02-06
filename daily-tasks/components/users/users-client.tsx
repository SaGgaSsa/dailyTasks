'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { UserSheet } from './user-sheet'
import { UsersTable } from './users-table'
import { Button } from '@/components/ui/button'

import { User } from '@prisma/client'

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    const handleEdit = (user: User) => {
        setSelectedUser(user)
        setIsOpen(true)
    }

    const handleAdd = () => {
        setSelectedUser(null)
        setIsOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                </Button>
            </div>

            <UsersTable data={initialUsers} onEdit={handleEdit} />

            <UserSheet
                open={isOpen}
                onOpenChange={setIsOpen}
                initialData={selectedUser}
            />
        </div>
    )
}
