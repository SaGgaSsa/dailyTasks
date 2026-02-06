'use client'

import { useState } from 'react'
import { IncidenceWithDetails } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, MoreHorizontal } from 'lucide-react'
import { IncidenceForm } from './incidence-form'
import { TaskStatus, TaskType } from '@prisma/client'
import { MarkdownText } from '@/components/ui/markdown-text'

interface PlanningViewProps {
    initialTasks: IncidenceWithDetails[]
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

export function PlanningView({ initialTasks }: PlanningViewProps) {
    const [tasks] = useState<IncidenceWithDetails[]>(initialTasks)
    const [selectedTask, setSelectedTask] = useState<IncidenceWithDetails | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Backlog de Ingeniería
                </h2>
                <Button onClick={() => setIsSheetOpen(true)} className="bg-zinc-100 text-zinc-900 hover:bg-white font-bold h-9 shadow-lg">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Incidencia
                </Button>
            </div>

            <div className="flex-1 overflow-auto border border-zinc-900 rounded-2xl bg-[#0F0F0F] shadow-inner">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0F0F0F] border-b border-zinc-900 z-10">
                        <tr>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32">Identificador</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Requerimiento</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32 text-center">Estado</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32 text-center">Stack</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-32">Team</th>
                            <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-16 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {tasks.map((task) => (
                            <tr
                                key={task.id}
                                className="group hover:bg-zinc-900/40 transition-all cursor-pointer"
                                onClick={() => {
                                    setSelectedTask(task)
                                    setIsSheetOpen(true)
                                }}
                            >
                                <td className="p-4">
                                    <Badge variant="outline" className={`text-[10px] font-mono leading-none py-1 border-none bg-zinc-900/50 ${typeColors[task.type]}`}>
                                        {task.type} {task.externalId}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1.5 max-w-lg">
                                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                            {task.title}
                                        </span>
                                        {task.description && (
                                            <div className="line-clamp-1 opacity-50 text-[11px]">
                                                <MarkdownText content={task.description} />
                                            </div>
                                        )}
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
                                            <Avatar key={user.id} className="h-6 w-6 border-2 border-[#0F0F0F] ring-1 ring-zinc-800">
                                                <AvatarImage src={user.avatarUrl || ''} />
                                                <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400">
                                                    {user.username.substring(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <IncidenceForm
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setSelectedTask(null)
                }}
                initialData={selectedTask}
            />
        </div>
    )
}
