'use client';

import { useState } from 'react';
import { Vehicle } from '@/app/lib/simulation';
import { Truck, Fuel, Clock, Gauge, AlertCircle, Plus, User, MapPin, X, Navigation } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveFleetProps {
    vehicles: Vehicle[];
    onAddTruck: () => void;
    onAssignDriver: (vehicleId: string, driverName: string) => void;
    onDeleteTruck: (vehicleId: string) => void;
}

export default function ActiveFleet({ vehicles, onAddTruck, onAssignDriver, onDeleteTruck }: ActiveFleetProps) {
    const [selectedTruck, setSelectedTruck] = useState<Vehicle | null>(null);

    const handleDriverChange = (vehicleId: string) => {
        const newDriver = prompt("Enter new driver name:");
        if (newDriver) {
            onAssignDriver(vehicleId, newDriver);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Truck className="text-primary" size={28} /> Fleet Management
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Real-time tracking and resource allocation</p>
                </div>
                <button
                    onClick={onAddTruck}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:scale-105"
                >
                    <Plus size={18} /> Deploy New Truck
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vehicles.map((v, i) => (
                    <motion.div
                        key={v.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                            "glass-panel p-5 rounded-xl border relative overflow-hidden group hover:border-primary/50 transition-colors",
                            v.status === 'breakdown' ? "border-red-900/50 bg-red-950/10" : "border-slate-800"
                        )}
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                            <Truck size={64} className={v.status === 'breakdown' ? "text-red-500" : "text-slate-500"} />
                        </div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <div className="text-xl font-bold text-white tracking-tight">{v.id}</div>
                                <div
                                    className="text-sm text-slate-400 flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
                                    onClick={() => handleDriverChange(v.id)}
                                    title="Click to reassign driver"
                                >
                                    <User size={12} /> {v.driver}
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded text-xs font-bold uppercase tracking-wider",
                                v.status === 'active' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                                    v.status === 'breakdown' ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" :
                                        "bg-slate-700 text-slate-300 border border-slate-600"
                            )}>
                                {v.status}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Fuel size={10} /> Fuel
                                </div>
                                <div className={cn("text-lg font-mono font-bold", v.fuel < 20 ? "text-red-400" : "text-white")}>
                                    {v.fuel.toFixed(0)}%
                                </div>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Gauge size={10} /> Load
                                </div>
                                <div className={cn("text-lg font-mono font-bold", v.load > 90 ? "text-orange-400" : "text-white")}>
                                    {v.load.toFixed(0)}%
                                </div>
                            </div>
                        </div>

                        {/* Route Info */}
                        <div className="relative z-10">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Current Analysis</span>
                                <span className={v.routeExcellence > 85 ? "text-green-400" : "text-yellow-400"}>
                                    {v.routeExcellence}% Opt.
                                </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-primary" style={{ width: `${v.routeExcellence}%` }}></div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedTruck(v)}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <Navigation size={14} /> Route
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Decommission this vehicle?')) onDeleteTruck(v.id);
                                    }}
                                    className="px-3 py-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-500 rounded transition-colors"
                                    title="Decommission Vehicle"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Route Detail Modal */}
            <AnimatePresence>
                {selectedTruck && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedTruck(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Truck className="text-primary" /> Route Details: {selectedTruck.id}
                                    </h3>
                                    <div className="text-sm text-slate-400 flex items-center gap-2">
                                        <User size={12} /> {selectedTruck.driver} • <span className="text-green-400">{selectedTruck.status}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTruck(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Mock Map View */}
                                    <div className="bg-slate-950 rounded-xl border border-slate-800 aspect-video relative flex items-center justify-center overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/77.2090,28.6139,12,0/600x400?access_token=pk.mock')] bg-cover opacity-50 grayscale"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <p className="text-slate-500 text-xs text-center bg-black/80 p-2 rounded border border-slate-800">
                                                Live GPS Feed<br />
                                                <span className="text-white font-mono">{selectedTruck.lat.toFixed(4)}, {selectedTruck.lng.toFixed(4)}</span>
                                            </p>
                                        </div>
                                        {/* Animated Path */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
                                            <path d="M 50 150 Q 150 50 250 150 T 450 150" fill="none" stroke={selectedTruck.color} strokeWidth="3" strokeDasharray="5,5" className="animate-pulse" />
                                            <circle cx="50" cy="150" r="4" fill={selectedTruck.color} />
                                            <circle cx="450" cy="150" r="4" fill="white" className="animate-ping" />
                                        </svg>
                                    </div>

                                    {/* Waypoints List */}
                                    <div className="overflow-hidden flex flex-col h-full">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Active Waypoints</h4>
                                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                            {selectedTruck.currentRoute.length > 0 ? (
                                                selectedTruck.currentRoute.slice(0, 8).map((pt, i) => (
                                                    <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700">
                                                        <div className="mt-1 min-w-[16px] flex flex-col items-center">
                                                            <div className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20"></div>
                                                            {i < selectedTruck.currentRoute.length - 1 && <div className="w-0.5 h-6 bg-slate-800 my-1"></div>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-slate-200 font-medium">Stop #{i + 1}</div>
                                                            <div className="text-xs text-slate-500 font-mono">
                                                                {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-slate-500 italic">
                                                    No active route. Vehicle is idle.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
