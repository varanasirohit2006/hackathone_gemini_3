import { motion } from 'framer-motion';
import { Trophy, Medal, Star, User } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export interface Citizen {
    id: string;
    name: string;
    points: number;
    rank: number;
    avatar?: string;
}

interface LeaderboardProps {
    citizens: Citizen[];
}

export default function Leaderboard({ citizens }: LeaderboardProps) {
    const sortedCitizens = [...citizens].sort((a, b) => b.points - a.points);

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <span>Citizen Champions</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Top contributors to Clean City Quest</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {sortedCitizens.map((citizen, index) => {
                    const isTop3 = index < 3;
                    let rankColor = "text-slate-400";
                    let rankIcon = <span className="font-mono font-bold text-sm w-6 text-center">{index + 1}</span>;

                    if (index === 0) {
                        rankColor = "text-yellow-400";
                        rankIcon = <Trophy size={20} className="text-yellow-500" />;
                    } else if (index === 1) {
                        rankColor = "text-slate-300";
                        rankIcon = <Medal size={20} className="text-slate-300" />;
                    } else if (index === 2) {
                        rankColor = "text-amber-600";
                        rankIcon = <Medal size={20} className="text-amber-600" />;
                    }

                    return (
                        <motion.div
                            key={citizen.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-slate-800/50",
                                isTop3 ? "bg-slate-800/30 border-slate-700" : "bg-transparent border-transparent hover:border-slate-800"
                            )}
                        >
                            <div className="flex-shrink-0 w-8 flex items-center justify-center">
                                {rankIcon}
                            </div>

                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600">
                                {citizen.avatar ? (
                                    <img src={citizen.avatar} alt={citizen.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-slate-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={cn("font-medium truncate", isTop3 ? "text-white" : "text-slate-300")}>
                                    {citizen.name}
                                </div>
                                <div className="text-xs text-green-400 flex items-center gap-1">
                                    <Star size={10} fill="currentColor" /> {citizen.points.toLocaleString()} pts
                                </div>
                            </div>

                            {index === 0 && (
                                <div className="px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/50 text-xs text-yellow-500 font-bold uppercase tracking-wider">
                                    King
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
