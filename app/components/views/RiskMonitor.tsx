'use client';

import { Alert } from '@/app/lib/simulation';
import { AlertTriangle, MapPin, Clock, CheckCircle, Truck, ShieldAlert } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface RiskMonitorProps {
    alerts: Alert[];
    onResolveAlert: (alertId: string) => void;
}

export default function RiskMonitor({ alerts, onResolveAlert }: RiskMonitorProps) {
    const handleAction = (alertItem: Alert) => {
        if (alertItem.severity === 'critical') {
            const confirmDeploy = confirm(`CRITICAL RISK: ${alertItem.type}\n\nDeploy Emergency Response Team to ${alertItem.location}?`);
            if (confirmDeploy) {
                window.alert("Emergency Team Dispatched. ETA 10 minutes.");
                onResolveAlert(alertItem.id);
            }
        } else {
            onResolveAlert(alertItem.id);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={28} /> Risk & Incident Radar
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Live monitoring of system-wide anomalies and citizen reports</p>
                </div>
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 border border-slate-700">
                    Export Incident Report
                </button>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4">Severity</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Message</th>
                            <th className="p-4">Location</th>
                            <th className="p-4 hidden md:table-cell">Time</th>
                            <th className="p-4 text-right">Countermeasures</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {alerts.map((alert) => (
                            <tr key={alert.id} className={cn(
                                "hover:bg-slate-800/30 transition-colors group",
                                alert.severity === 'critical' ? "bg-red-950/20" : ""
                            )}>
                                <td className="p-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded text-[10px] font-bold uppercase border flex w-fit items-center gap-1",
                                        alert.severity === 'critical' ? "bg-red-500/20 text-red-500 border-red-500/50" :
                                            alert.severity === 'high' ? "bg-orange-500/20 text-orange-500 border-orange-500/50" :
                                                "bg-blue-500/20 text-blue-500 border-blue-500/50"
                                    )}>
                                        {alert.severity === 'critical' && <ShieldAlert size={10} />}
                                        {alert.severity}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-300 capitalize font-medium">
                                    <div className="flex items-center gap-2">
                                        {alert.type === 'breakdown' && <Truck size={14} className="text-red-400" />}
                                        {alert.type}
                                    </div>
                                </td>
                                <td className="p-4 text-white max-w-xs md:max-w-md truncate font-medium">{alert.message}</td>
                                <td className="p-4 text-slate-400">
                                    <div className="flex items-center gap-1 text-xs">
                                        <MapPin size={12} /> {alert.location}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-500 font-mono text-xs hidden md:table-cell">{alert.timestamp}</td>
                                <td className="p-4 text-right">
                                    {alert.severity === 'critical' ? (
                                        <button
                                            onClick={() => handleAction(alert)}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105 flex items-center gap-2 ml-auto"
                                        >
                                            <Truck size={12} /> Deploy Team
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAction(alert)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-green-600 hover:text-white text-slate-300 rounded text-xs font-bold transition-all ml-auto border border-slate-700 hover:border-green-500"
                                        >
                                            <CheckCircle size={12} /> Mark Resolved
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {alerts.length === 0 && (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
                        <CheckCircle size={48} className="text-slate-700" />
                        <div>
                            <p className="text-lg font-bold text-slate-400">All Clear</p>
                            <p className="text-sm">No active risks or incidents detected in District 1.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
