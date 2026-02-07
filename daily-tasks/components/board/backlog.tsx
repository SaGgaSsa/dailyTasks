'use client'

import { useState, useEffect } from 'react'
import { IncidenceWithDetails } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { MoreHorizontal, CheckCircle2, Inbox } from 'lucide-react'
import { TaskStatus, TaskType } from '@/types/enums'

interface BacklogProps {
    initialTasks: IncidenceWithDetails[]
    isSheetOpen?: boolean
    onSheetOpenChange?: (open: boolean) => void
    onTaskSelect?: (task: IncidenceWithDetails | null) => void
    onTaskUpdate?: (updatedTask: IncidenceWithDetails) => void
}

const statusColors: Record<TaskStatus, string> = {
    BACKLOG: 'bg-zinc-500/10 text-zinc-400 border-zinc-800',
    TODO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DONE: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const typeColors: Record<TaskType, string> = {
    I_MODAPL: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    I_CASO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    I_CONS: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function Backlog({ initialTasks, isSheetOpen: externalSheetOpen, onSheetOpenChange, onTaskSelect, onTaskUpdate }: BacklogProps) {
    const [tasks, setTasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [internalSheetOpen, setInternalSheetOpen] = useState(false)
    
    // Usar el estado externo si se proporciona, de lo contrario usar el internos
    const isSheetOpen = externalSheetOpen !== undefined ? externalSheetOpen : internalSheetOpen
    const setIsSheetOpen = onSheetOpenChange || setInternalSheetOpen

    // Update local state when initialTasks changes (from parent)
    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    function handleTaskUpdate(updatedTask: IncidenceWithDetails) {
        setTasks(prev => prev.map(task =>
            task.id === updatedTask.id ? updatedTask : task
        ))
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto border border-zinc-900 rounded-2xl bg-[#0F0F0F] shadow-inner">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0F0F0F] border-b border-zinc-900 z-10">
                        <tr>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32">Identificador</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descripción</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32 text-center">Estado</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32 text-center">Tecnología</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32">Colaboradores</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-16 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {tasks.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="p-4 rounded-full bg-zinc-900/50">
                                            <Inbox className="h-8 w-8 text-zinc-600" />
                                        </div>
                                        <div>
                                            <p className="text-zinc-400 font-medium">Sin incidencias en el backlog</p>
                                            <p className="text-zinc-500 text-sm mt-1">Crea una nueva incidencia para comenzar</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            tasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className="group hover:bg-zinc-900/40 transition-all cursor-pointer"
                                    onClick={() => {
                                        if (onTaskSelect) {
                                            onTaskSelect(task)
                                        }
                                        setIsSheetOpen(true)
                                    }}
                                >
                                    <td className="p-4">
                                        <Badge variant="outline" className={`text-[10px] font-mono leading-none py-1 border-none bg-zinc-900/50 ${typeColors[task.type]}`}>
                                            {task.type} {task.externalId}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3 max-w-lg">
                                            <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                                                {task.title}
                                            </span>
                                            <div className="flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
                                                {task.estimatedTime && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-zinc-400">{task.estimatedTime}h</span>
                                                        <span>estimadas</span>
                                                    </span>
                                                )}
                                                {task.subTasks.length > 0 && (
                                                    (() => {
                                                        const completed = task.subTasks.filter(st => st.isCompleted).length;
                                                        const total = task.subTasks.length;
                                                        const isAllCompleted = completed === total;
                                                        return (
                                                            <span className={`flex items-center gap-1 ${isAllCompleted ? 'text-green-400' : ''}`}>
                                                                {isAllCompleted ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        <span>completado</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-zinc-400">
                                                                            {completed}/{total}
                                                                        </span>
                                                                        <span>pendientes</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            <Badge variant="outline" className={`text-[9px] py-0.5 font-bold border-none uppercase tracking-tighter ${statusColors[task.status]}`}>
                                                {task.status}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-900/30 px-2 py-1 rounded">
                                            {task.technology}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            {task.assignees.map((user) => (
                                                <UserAvatar 
                                                    key={user.id} 
                                                    username={user.username} 
                                                    className="h-6 w-6 border-2 border-[#0F0F0F] ring-1 ring-zinc-800 text-[9px]" 
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* El formulario se maneja desde el padre DashboardClient */}
        </div>
    )
}
