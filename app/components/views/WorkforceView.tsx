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
            <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Citizen Champions (Volunteers)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { name: "Rahul Sharma", reports: 42, impact: 850, id: "CIT-1", rank: 1 },
                        { name: "Ananya Iyer", reports: 38, impact: 720, id: "CIT-2", rank: 2 },
                        { name: "Vikram Singh", reports: 35, impact: 680, id: "CIT-3", rank: 3 },
                    ].map((c, i) => (
                        <div key={c.id} className="glass-panel p-4 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-black",
                                    i === 0 ? "bg-yellow-500 text-black" : "bg-slate-700 text-slate-400"
                                )}>
                                    {c.rank}
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{c.name}</div>
                                    <div className="text-[10px] text-slate-500">{c.reports} Reports Submitted</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Impact</div>
                                <div className="text-lg font-black text-white">{c.impact}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Inline icons for simplicity if lucide-react types mismatch
function Trophy({ className, size = 18 }: { className?: string; size?: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}
