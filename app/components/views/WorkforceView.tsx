'use client';

import { Worker } from '@/app/lib/simulation';
import { Users, Battery, Briefcase, UserCheck } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export default function WorkforceView({ workers }: { workers: Worker[] }) {
    return (
        <div className="h-full overflow-y-auto p-2">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-purple-400" /> Duty Roster & Health
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {workers.map((w) => (
                    <div key={w.id} className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col gap-3 group hover:border-purple-500/30 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                                    {w.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{w.name}</div>
                                    <div className="text-xs text-slate-500">{w.id}</div>
                                </div>
                            </div>
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                w.status === 'on-duty' ? "bg-green-500 animate-pulse" : "bg-slate-600"
                            )}></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-slate-900/50 p-2 rounded flex flex-col gap-1">
                                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Briefcase size={10} /> Role
                                </span>
                                <span className="text-xs text-slate-200 capitalize">{w.role}</span>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded flex flex-col gap-1">
                                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <UserCheck size={10} /> Zone
                                </span>
                                <span className="text-xs text-slate-200">{w.zone}</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-800 pt-3 mt-1">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span className="flex items-center gap-1"><Battery size={10} /> Fatigue Level</span>
                                <span className={cn(
                                    w.fatigue > 60 ? "text-red-400" : "text-green-400"
                                )}>{w.fatigue}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full", w.fatigue > 60 ? "bg-red-500" : "bg-green-500")}
                                    style={{ width: `${w.fatigue}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
