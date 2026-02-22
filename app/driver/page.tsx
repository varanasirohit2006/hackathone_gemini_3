'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, LogIn, AlertTriangle, CheckCircle, Loader2, MapPin, Send, Wrench, Fuel, Clock, ArrowLeft, Trash2, IndianRupee, Route, TrendingUp } from 'lucide-react';
import { analyzeOperations } from '@/app/actions';

const TRUCK_IDS = ['TRK-1', 'TRK-2', 'TRK-3', 'TRK-4', 'TRK-5', 'TRK-6', 'TRK-7', 'TRK-8'];

const CITIES = [
    { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
    { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
    { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
];

const ISSUE_TYPES = [
    { id: 'breakdown', label: 'Vehicle Breakdown', icon: Wrench, color: 'red' },
    { id: 'fuel', label: 'Low Fuel', icon: Fuel, color: 'yellow' },
    { id: 'route_blocked', label: 'Route Blocked', icon: MapPin, color: 'orange' },
    { id: 'overloaded', label: 'Truck Overloaded', icon: Truck, color: 'purple' },
    { id: 'delay', label: 'Traffic Delay', icon: Clock, color: 'blue' },
    { id: 'safety', label: 'Safety Concern', icon: AlertTriangle, color: 'red' },
];

// Deterministic route for each truck
const DAILY_ROUTES: Record<string, { stops: string[], distanceKm: number }> = {
    'TRK-1': { stops: ['Sector 14 Market', 'Green Park Colony', 'MG Road Junction', 'Civil Lines', 'Railway Station Area'], distanceKm: 18.4 },
    'TRK-2': { stops: ['Industrial Zone A', 'Phase 2 Complex', 'Bus Stand Area', 'Old City Square', 'Hospital Road'], distanceKm: 22.1 },
    'TRK-3': { stops: ['University Campus', 'Lake View Garden', 'IT Park', 'Shopping Mall Zone', 'Stadium Road'], distanceKm: 16.8 },
    'TRK-4': { stops: ['Government Colony', 'Temple Road', 'Bazaar Street', 'Park Avenue', 'School Lane'], distanceKm: 14.5 },
    'TRK-5': { stops: ['Outer Ring Sector', 'Highway Junction', 'Factory Area', 'Warehouse District', 'Transport Nagar'], distanceKm: 25.3 },
    'TRK-6': { stops: ['Residential Block C', 'Community Hall', 'Post Office Area', 'Water Tank Road', 'Market Lane'], distanceKm: 12.9 },
    'TRK-7': { stops: ['Tech Park', 'Apartment Complex', 'Metro Station', 'Commercial Street', 'Bridge Road'], distanceKm: 19.7 },
    'TRK-8': { stops: ['Military Area Gate', 'Cantonment Road', 'Club House', 'Parade Ground', 'Defense Colony'], distanceKm: 15.2 },
};

// Generate deterministic daily earnings
function getDailyEarnings(truckId: string): { today: number, week: number, month: number, trips: number, bonus: number } {
    const truckNum = parseInt(truckId.split('-')[1]) || 1;
    const baseDaily = 450 + (truckNum * 37) % 200; // ₹450-650 per day
    const trips = 3 + (truckNum % 4); // 3-6 trips
    const bonus = truckNum % 3 === 0 ? 100 : truckNum % 2 === 0 ? 50 : 0;
    return {
        today: baseDaily + bonus,
        week: (baseDaily + bonus) * 6,
        month: (baseDaily + bonus) * 26,
        trips,
        bonus
    };
}

export default function DriverPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginForm, setLoginForm] = useState({ name: '', truckId: TRUCK_IDS[0], city: CITIES[0].name, employeeId: '' });
    const [driver, setDriver] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'route' | 'report' | 'earnings'>('route');
    const [issueType, setIssueType] = useState('breakdown');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [step, setStep] = useState<'form' | 'processing' | 'result'>('form');
    const [aiSolution, setAiSolution] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [completedStops, setCompletedStops] = useState<Set<number>>(new Set());

    // Festival notifications
    const [festivals, setFestivals] = useState<string[]>([]);
    const [showFestivalBanner, setShowFestivalBanner] = useState(true);

    // Current time
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginForm.name || !loginForm.employeeId) return;
        setDriver(loginForm);
        setIsLoggedIn(true);

        // Check for upcoming festivals via Gemini
        try {
            const result = await analyzeOperations(
                `What major Indian festivals or public holidays are coming up in the next 2 weeks from today (${new Date().toLocaleDateString()})? List only the festival name and date. Also mention which cities will be most impacted by waste surge due to these festivals. Keep it brief, 3-4 lines max.`,
                { vehicleCount: 8, activeAlerts: 0, criticalAlerts: 0 }
            );
            if (result.text) {
                setFestivals([result.text]);
            }
        } catch {
            setFestivals(['⚠️ Check local calendar for upcoming festivals that may increase waste load.']);
        }
    };

    const handleSubmitIssue = async () => {
        setStep('processing');

        const issueLabel = ISSUE_TYPES.find(i => i.id === issueType)?.label || issueType;

        let solution = null;
        try {
            solution = await analyzeOperations(
                `A truck driver (${driver.name}, Truck ${driver.truckId}) in ${driver.city} reported: "${issueLabel}" - "${description}" at location "${location || 'Unknown'}". 
        Analyze this problem and provide:
        1. Immediate action steps
        2. Whether to dispatch a replacement truck
        3. Which nearby routes should be adjusted
        4. Safety measures if applicable
        Keep response concise and actionable.`,
                { vehicleCount: 8, activeAlerts: 1, criticalAlerts: issueType === 'breakdown' || issueType === 'safety' ? 1 : 0 }
            );
        } catch {
            solution = {
                text: `Received report: ${issueLabel}. Dispatching nearest available truck. Notifying control center. Please stay at safe location.`,
                suggestedActions: [{ type: 'REROUTE', target: driver.city }]
            };
        }

        setAiSolution(solution);

        const city = CITIES.find(c => c.name === driver.city) || CITIES[0];
        const report = {
            id: `DRV-${Date.now()}`,
            driverName: driver.name,
            truckId: driver.truckId,
            employeeId: driver.employeeId,
            city: driver.city,
            issueType,
            issueLabel,
            description,
            location,
            coordinates: {
                lat: city.lat + (Math.random() - 0.5) * 0.02,
                lng: city.lng + (Math.random() - 0.5) * 0.02,
            },
            aiSolution: solution,
            timestamp: new Date().toLocaleString(),
            severity: issueType === 'breakdown' || issueType === 'safety' ? 'critical' : 'high',
            status: 'active',
        };

        setReports(prev => [report, ...prev]);

        // Store in localStorage for command center
        const existing = JSON.parse(localStorage.getItem('driver_reports') || '[]');
        existing.push(report);
        localStorage.setItem('driver_reports', JSON.stringify(existing));

        setStep('result');
    };

    const resetForm = () => {
        setStep('form');
        setIssueType('breakdown');
        setDescription('');
        setLocation('');
        setAiSolution(null);
    };

    const todayRoute = driver ? DAILY_ROUTES[driver.truckId] || DAILY_ROUTES['TRK-1'] : DAILY_ROUTES['TRK-1'];
    const earnings = driver ? getDailyEarnings(driver.truckId) : getDailyEarnings('TRK-1');

    // LOGIN SCREEN
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-4">
                            <Truck size={32} className="text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            <span className="text-blue-400">Fleet</span>Driver
                        </h1>
                        <p className="text-slate-400 text-sm">Driver Operations Portal</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 space-y-4 backdrop-blur-xl shadow-2xl">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <LogIn size={20} className="text-blue-400" /> Driver Login
                        </h2>

                        <div>
                            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Full Name</label>
                            <input
                                type="text"
                                placeholder="Driver name"
                                value={loginForm.name}
                                onChange={e => setLoginForm({ ...loginForm, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Employee ID</label>
                            <input
                                type="text"
                                placeholder="EMP-XXXX"
                                value={loginForm.employeeId}
                                onChange={e => setLoginForm({ ...loginForm, employeeId: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Truck ID</label>
                                <select
                                    value={loginForm.truckId}
                                    onChange={e => setLoginForm({ ...loginForm, truckId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                >
                                    {TRUCK_IDS.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">City</label>
                                <select
                                    value={loginForm.city}
                                    onChange={e => setLoginForm({ ...loginForm, city: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                >
                                    {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                        >
                            <LogIn size={18} /> Login as Driver
                        </button>

                        <div className="text-center">
                            <a href="/" className="text-xs text-slate-500 hover:text-blue-400 transition-colors">← Command Center</a>
                            <span className="text-slate-700 mx-2">|</span>
                            <a href="/customer" className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">Citizen Portal →</a>
                        </div>
                    </form>
                </motion.div>
            </div>
        );
    }

    // DASHBOARD
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Truck size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">FleetDriver Portal</div>
                            <div className="text-[10px] text-slate-500">{driver?.name} • {driver?.truckId} • {driver?.city}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-slate-500">{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                            <div className="text-xs text-blue-400 font-mono">{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <button
                            onClick={() => { setIsLoggedIn(false); setDriver(null); }}
                            className="text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-1 rounded-lg bg-slate-800 border border-slate-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="max-w-4xl mx-auto px-4 pt-4">
                <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
                    {[
                        { id: 'route' as const, label: "Today's Route", icon: Route },
                        { id: 'report' as const, label: 'Report Issue', icon: AlertTriangle },
                        { id: 'earnings' as const, label: 'Earnings', icon: IndianRupee },
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Festival Alert Banner */}
                {festivals.length > 0 && showFestivalBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 relative"
                    >
                        <button
                            onClick={() => setShowFestivalBanner(false)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-white text-xs"
                        >✕</button>
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">🎉</div>
                            <div>
                                <div className="text-sm font-bold text-amber-400 mb-1">Festival Alert — Increased Waste Expected</div>
                                {festivals.map((f, i) => (
                                    <div key={i} className="text-xs text-slate-300 whitespace-pre-line">{f}</div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ============ TODAY'S ROUTE TAB ============ */}
                {activeTab === 'route' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                            <div className="p-4 border-b border-slate-800 bg-blue-950/30 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Route size={20} className="text-blue-400" /> Today&apos;s Collection Route
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {todayRoute.stops.length} stops • {todayRoute.distanceKm} km total • {driver?.truckId}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">Progress</div>
                                    <div className="text-lg font-bold text-blue-400">{completedStops.size}/{todayRoute.stops.length}</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-4 pt-3">
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(completedStops.size / todayRoute.stops.length) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 space-y-2">
                                {todayRoute.stops.map((stop, idx) => {
                                    const isDone = completedStops.has(idx);
                                    const isNext = !isDone && (idx === 0 || completedStops.has(idx - 1));
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDone ? 'bg-emerald-950/30 border border-emerald-500/20' :
                                                    isNext ? 'bg-blue-950/40 border border-blue-500/30 ring-1 ring-blue-500/20' :
                                                        'bg-slate-800/50 border border-slate-700/50'
                                                }`}
                                        >
                                            {/* Stop Number */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 shrink-0 ${isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                                    isNext ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse' :
                                                        'bg-slate-700 border-slate-600 text-slate-400'
                                                }`}>
                                                {isDone ? '✓' : idx + 1}
                                            </div>

                                            {/* Stop Info */}
                                            <div className="flex-1">
                                                <div className={`text-sm font-medium ${isDone ? 'text-emerald-400 line-through opacity-70' : 'text-white'}`}>
                                                    {stop}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    {isDone ? 'Completed' : isNext ? '→ Next stop' : `Stop ${idx + 1}`}
                                                </div>
                                            </div>

                                            {/* Mark Complete Button */}
                                            {isNext && (
                                                <button
                                                    onClick={() => setCompletedStops(prev => new Set([...prev, idx]))}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 font-semibold transition-all"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            {isDone && (
                                                <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {completedStops.size === todayRoute.stops.length && (
                                <div className="p-4 border-t border-slate-800">
                                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                        <CheckCircle size={24} className="text-emerald-400" />
                                        <div>
                                            <div className="text-white font-semibold">Route Complete! 🎉</div>
                                            <div className="text-xs text-slate-400">All {todayRoute.stops.length} stops completed. Return to dumpyard for unloading.</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ============ REPORT ISSUE TAB ============ */}
                {activeTab === 'report' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                            <div className="p-4 border-b border-slate-800 bg-red-950/20">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-red-400" /> Report Issue
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Report vehicle problems — Gemini will provide immediate solutions</p>
                            </div>

                            <div className="p-6">
                                <AnimatePresence mode="wait">
                                    {step === 'form' && (
                                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Issue Type</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {ISSUE_TYPES.map(issue => {
                                                        const Icon = issue.icon;
                                                        return (
                                                            <button
                                                                key={issue.id}
                                                                onClick={() => setIssueType(issue.id)}
                                                                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${issueType === issue.id
                                                                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                                                                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                                                                    }`}
                                                            >
                                                                <Icon size={16} />
                                                                {issue.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Current Location</label>
                                                <div className="relative">
                                                    <MapPin size={16} className="absolute left-3 top-3.5 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Connaught Place, Outer Ring Road"
                                                        value={location}
                                                        onChange={e => setLocation(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Details</label>
                                                <textarea
                                                    placeholder="Describe the issue..."
                                                    value={description}
                                                    onChange={e => setDescription(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                                                />
                                            </div>

                                            <button
                                                onClick={handleSubmitIssue}
                                                disabled={!description}
                                                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                                            >
                                                <Send size={18} /> Report Issue — Get AI Solution
                                            </button>
                                        </motion.div>
                                    )}

                                    {step === 'processing' && (
                                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center space-y-4">
                                            <Loader2 size={48} className="mx-auto text-blue-400 animate-spin" />
                                            <div className="text-white font-semibold">Gemini is analyzing the issue...</div>
                                            <div className="text-xs text-slate-500">Finding optimal solution & notifying control center</div>
                                        </motion.div>
                                    )}

                                    {step === 'result' && (
                                        <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                                <CheckCircle size={24} className="text-blue-400 shrink-0" />
                                                <div>
                                                    <div className="text-white font-semibold">Issue Reported & Solution Ready!</div>
                                                    <div className="text-xs text-slate-400 mt-1">The control center has been notified. The risk is now live on the map.</div>
                                                </div>
                                            </div>

                                            {aiSolution && (
                                                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3">
                                                    <div className="text-sm font-semibold text-white">🤖 Gemini AI Solution</div>
                                                    <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                                                        {aiSolution.text}
                                                    </div>
                                                    {aiSolution.suggestedActions && aiSolution.suggestedActions.length > 0 && (
                                                        <div className="space-y-1 mt-2">
                                                            <div className="text-[10px] text-slate-500 uppercase">Automated Actions Taken:</div>
                                                            {aiSolution.suggestedActions.map((a: any, i: number) => (
                                                                <div key={i} className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">
                                                                    ✓ {a.type.replace('_', ' ')}: {a.target}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={resetForm}
                                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-700"
                                            >
                                                Report Another Issue
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Previous Reports */}
                        {reports.length > 0 && (
                            <div className="mt-6 bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
                                <div className="p-4 border-b border-slate-800">
                                    <h3 className="text-sm font-bold text-white">Your Reports ({reports.length})</h3>
                                </div>
                                <div className="divide-y divide-slate-800">
                                    {reports.map(r => (
                                        <div key={r.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm text-white font-medium">{r.issueLabel}</div>
                                                <div className="text-xs text-slate-500">{r.location || r.description?.substring(0, 40)}</div>
                                                <div className="text-[10px] text-slate-600 mt-1">{r.timestamp}</div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${r.severity === 'critical'
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                }`}>
                                                {r.severity === 'critical' ? '🔴 Critical' : '⚠️ High'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ============ EARNINGS TAB ============ */}
                {activeTab === 'earnings' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Earnings Summary Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 text-center backdrop-blur-xl">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Today</div>
                                <div className="text-2xl font-black text-emerald-400">₹{earnings.today}</div>
                                <div className="text-[10px] text-slate-500 mt-1">{earnings.trips} trips</div>
                            </div>
                            <div className="bg-slate-900/80 border border-blue-500/30 rounded-2xl p-4 text-center backdrop-blur-xl">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">This Week</div>
                                <div className="text-2xl font-black text-blue-400">₹{earnings.week.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 mt-1">6 days</div>
                            </div>
                            <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 text-center backdrop-blur-xl">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">This Month</div>
                                <div className="text-2xl font-black text-purple-400">₹{earnings.month.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 mt-1">26 working days</div>
                            </div>
                        </div>

                        {/* Earnings Breakdown */}
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                            <div className="p-4 border-b border-slate-800 bg-emerald-950/20">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <TrendingUp size={20} className="text-emerald-400" /> Earnings Breakdown
                                </h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">🚛</div>
                                        <div>
                                            <div className="text-sm text-white font-medium">Base Pay</div>
                                            <div className="text-[10px] text-slate-500">Daily fixed rate</div>
                                        </div>
                                    </div>
                                    <div className="text-emerald-400 font-bold">₹{earnings.today - earnings.bonus}</div>
                                </div>

                                {earnings.bonus > 0 && (
                                    <div className="flex justify-between items-center p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">⭐</div>
                                            <div>
                                                <div className="text-sm text-white font-medium">Performance Bonus</div>
                                                <div className="text-[10px] text-slate-500">Efficiency reward</div>
                                            </div>
                                        </div>
                                        <div className="text-amber-400 font-bold">+₹{earnings.bonus}</div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm">⛽</div>
                                        <div>
                                            <div className="text-sm text-white font-medium">Fuel Allowance</div>
                                            <div className="text-[10px] text-slate-500">{todayRoute.distanceKm} km covered</div>
                                        </div>
                                    </div>
                                    <div className="text-blue-400 font-bold">₹{Math.round(todayRoute.distanceKm * 8)}</div>
                                </div>

                                <div className="border-t border-slate-700 pt-3 flex justify-between items-center px-3">
                                    <div className="text-sm font-bold text-white">Total Today</div>
                                    <div className="text-lg font-black text-emerald-400">₹{earnings.today + Math.round(todayRoute.distanceKm * 8)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="text-sm font-bold text-white">Recent Payments</h3>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {[
                                    { date: 'Yesterday', amount: earnings.today - 20, status: 'Paid' },
                                    { date: '2 days ago', amount: earnings.today + 30, status: 'Paid' },
                                    { date: '3 days ago', amount: earnings.today - 50, status: 'Paid' },
                                    { date: '4 days ago', amount: earnings.today + 10, status: 'Paid' },
                                    { date: '5 days ago', amount: earnings.today, status: 'Paid' },
                                ].map((p, i) => (
                                    <div key={i} className="p-3 px-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-white">{p.date}</div>
                                            <div className="text-[10px] text-slate-500">{driver?.truckId} • {driver?.city}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-emerald-400">₹{p.amount}</div>
                                            <div className="text-[10px] text-emerald-600">{p.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Navigation */}
                <div className="text-center pb-8 space-x-4">
                    <a href="/" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
                        ← Command Center (Admin)
                    </a>
                    <a href="/customer" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">
                        Citizen Portal →
                    </a>
                </div>
            </div>
        </div>
    );
}
