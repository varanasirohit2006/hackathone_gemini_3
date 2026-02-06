'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard,
  Map as MapIcon,
  AlertTriangle,
  Truck,
  Trash2,
  Activity,
  Menu,
  Mic,
  Search,
  Users,
  Zap,
  Leaf,
  Navigation
} from 'lucide-react';
import { SimulationEngine, Bin, Vehicle, Alert, DistrictStats, Worker } from '@/app/lib/simulation';
import { cn } from '@/app/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AIAssistant from '@/app/components/AIAssistant';
import ActiveFleet from '@/app/components/views/ActiveFleet';
import RiskMonitor from '@/app/components/views/RiskMonitor';
import WorkforceView from '@/app/components/views/WorkforceView';

import CitizenReportModal from '@/app/components/CitizenReportModal';
import { getAIActionPlan, suggestBinLocations } from '@/app/actions';

// Dynamically import Map to avoid SSR issues
const Map = dynamic(() => import('@/app/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900/50 animate-pulse flex items-center justify-center">Loading Digital Twin...</div>
});

export default function Dashboard() {
  const [stats, setStats] = useState<DistrictStats | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [dumpyardLocation, setDumpyardLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlacingDumpyard, setIsPlacingDumpyard] = useState(false);

  // Simulation Loop State Tracking with Refs for synchronous updates
  const vehiclesRef = useRef<Vehicle[]>([]);
  const binsRef = useRef<Bin[]>([]);
  const alertsRef = useRef<Alert[]>([]);
  const dumpyardRef = useRef<{ lat: number, lng: number } | null>(null);

  // Sync refs with state
  useEffect(() => { vehiclesRef.current = vehicles; }, [vehicles]);
  useEffect(() => { binsRef.current = bins; }, [bins]);
  useEffect(() => { dumpyardRef.current = dumpyardLocation; }, [dumpyardLocation]);

  // Keep stats in sync with current fleet size
  useEffect(() => {
    setStats(prev => prev ? ({ ...prev, activeTrucks: vehicles.length }) : prev);
  }, [vehicles]);

  // Initial Load
  useEffect(() => {
    const initialBins = SimulationEngine.initializeBins(50);
    const initialVehicles = SimulationEngine.initializeVehicles(8);
    const initialWorkers = SimulationEngine.initializeWorkers(12);

    setBins(initialBins);
    binsRef.current = initialBins;

    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;

    setWorkers(initialWorkers);

    // Initial Stats
    setStats({
      totalWasteCollected: 124.5,
      efficiency: 88,
      activeTrucks: 8,
      pendingComplaints: 2,
      greenScore: 78.5,
      costSaved: 12050
    });
  }, []);

  // Main Simulation Tick
  useEffect(() => {
    const interval = setInterval(() => {
      // Use Refs to get latest state without closure staleness
      const currentVehicles = vehiclesRef.current;
      const currentBins = binsRef.current;
      const currentDumpyard = dumpyardRef.current;

      const result = SimulationEngine.tick(currentVehicles, currentBins, currentDumpyard);

      // Update State
      if (result.vehicles !== currentVehicles) { // Only update if changed (Reference check might pass if mutated, but tick returns new array usually)
        setVehicles(result.vehicles);
      }
      setBins(result.bins);

      // Handle New Alerts from Simulation (e.g. Return to Base)
      if (result.newAlerts && result.newAlerts.length > 0) {
        setAlerts(prev => [...result.newAlerts, ...prev]);
      }

      // Update stats
      if (result.statsUpdate.totalWasteCollected! > 0) {
        setStats(prev => prev ? ({ ...prev, totalWasteCollected: prev.totalWasteCollected + result.statsUpdate.totalWasteCollected! }) : null);
      }

    }, 1500); // 1.5s tick

    return () => clearInterval(interval);
  }, []);


  // AI Analysis Handler
  const handleAISuggestion = async () => {
    // Analyze current bins to find hotspot
    const summary = bins.map(b => ({ lat: b.lat, lng: b.lng, fill: b.fillLevel, type: b.type }));
    const result = await suggestBinLocations(summary);

    if (result && result.suggestedLat) {
      const newShed: Bin = {
        id: `MUNI-SHED-${1000 + bins.length}`,
        lat: result.suggestedLat,
        lng: result.suggestedLng,
        fillLevel: 0,
        status: 'normal',
        lastCollection: 'Just Installed',
        type: 'recyclable' // Municipal sheds are often for segregation
      };

      setBins(prev => [...prev, newShed]);

      const infraAlert: Alert = {
        id: `AI-INFRA-${Date.now()}`,
        type: 'citizen_report', // borrowing type for icon
        severity: 'low',
        location: 'AI Optimized Zone',
        timestamp: new Date().toLocaleTimeString(),
        message: `🤖 OPTIMIZATION: ${result.reasoning}. New Station Deployed.`
      };
      setAlerts(prev => [infraAlert, ...prev]);
    }
  };

  // Interaction Handlers
  const handleMapClick = (lat: number, lng: number) => {
    if (isPlacingDumpyard) {
      setDumpyardLocation({ lat, lng });
      setIsPlacingDumpyard(false);
      // Alert user
      const newAlert: Alert = {
        id: `SYS-DUMP-${Date.now()}`,
        type: 'delay',
        severity: 'low',
        location: 'System',
        timestamp: new Date().toLocaleTimeString(),
        message: 'Dumpyard Location Updated. Fleet re-routing enabled.'
      };
      setAlerts(prev => [newAlert, ...prev]);
    }
  };

  const handleSimulateIncident = () => {
    // Simulate a truck breakdown
    const activeTruck = vehicles.find(v => v.status === 'active');
    if (activeTruck) {
      const result = SimulationEngine.handleBreakdown(activeTruck.id, vehicles, bins);
      setVehicles(result.updatedVehicles);
      setAlerts(prev => [result.newAlert, ...prev]);
    } else {
      // Fallback if no truck active
      const newAlert: Alert = {
        id: `SIM-${Date.now()}`,
        type: 'overflow',
        severity: 'critical',
        location: 'Central Plaza',
        timestamp: new Date().toLocaleTimeString(),
        message: 'Manual Override: District Overflow Protocol Activated'
      };
      setAlerts(prev => [newAlert, ...prev]);
    }
  };

  const handleUserReport = async (data: any) => {
    let reportType = data.type;
    // Prefer full description; fall back to raw voice transcript if needed
    let description = data.desc || data.voiceTranscript || '';
    const location = data.location;

    // Call Gemini AI for Decision Making
    // User requirement: "solve the problem with using ai"
    const aiDecision = await getAIActionPlan(description);
    console.log("🤖 AI Decision:", aiDecision);

    // 1. EXECUTE AI ACTION
    if (aiDecision.actionType === 'REROUTE_FLEET') {
      // User Requirement: "gemini ai... reasigning the routes if the problem was truck breakdown"
      const activeTruck = vehicles.find(v => v.status === 'active');
      if (activeTruck) {
        const result = SimulationEngine.handleBreakdown(activeTruck.id, vehicles, bins);
        setVehicles(result.updatedVehicles);

        const systemAlert: Alert = {
          id: `SYS-AI-${Date.now()}`,
          type: 'breakdown',
          severity: 'critical',
          location: location ? 'Reported Location' : 'Sector 4',
          timestamp: new Date().toLocaleTimeString(),
          message: `🤖 AI INTERVENTION: ${aiDecision.reasoning}. Fleet re-optimized.`
        };
        setAlerts(prev => [result.newAlert, systemAlert, ...prev]);
        description += `\n[AI] ACTION: Fleet Re-route triggered.`;
      }
    }
    else if (aiDecision.actionType === 'INSTALL_SHED') {
      // User Requirement: "risk of waste is high... put one center like municpal shed"
      const shedLat = location?.lat || 28.6139 + (Math.random() - 0.5) * 0.01;
      const shedLng = location?.lng || 77.2090 + (Math.random() - 0.5) * 0.01;

      const newShed: Bin = {
        id: `SHED-${1000 + bins.length}`,
        lat: shedLat,
        lng: shedLng,
        fillLevel: 10,
        status: 'normal',
        lastCollection: 'Just Installed',
        type: 'recyclable'
      };
      setBins(prev => [...prev, newShed]);

      const infraAlert: Alert = {
        id: `INFRA-${Date.now()}`,
        type: 'citizen_report',
        severity: 'medium',
        location: location ? 'Pinned Location' : 'High Risk Zone',
        timestamp: new Date().toLocaleTimeString(),
        message: `🏗️ INFRASTRUCTURE: ${aiDecision.reasoning}. Municipal Shed deployed.`
      };
      setAlerts(prev => [infraAlert, ...prev]);
      description += `\n[AI] ACTION: Municipal Shed deployed.`;
    }
    else if (aiDecision.actionType === 'HAZMAT_TEAM') {
      const hazmatAlert: Alert = {
        id: `HAZ-${Date.now()}`,
        type: 'hazard',
        severity: 'critical',
        location: location ? 'Reported Location' : 'Hazard Zone',
        timestamp: new Date().toLocaleTimeString(),
        message: `☣️ BIO-HAZARD PROTOCOL: ${aiDecision.reasoning}. Hazmat Team Dispatched.`
      };
      setAlerts(prev => [hazmatAlert, ...prev]);
      description += `\n[AI] ACTION: Hazmat Team dispatched.`;
    }

    // 2. Log the Standard Report
    const { alert, newBin } = SimulationEngine.reportIssue(reportType, description, location?.lat, location?.lng, data.analysis?.recommendation);

    // Override severity based on AI (case-insensitive + full mapping)
    if (aiDecision?.riskLevel) {
      const normalizedRisk = String(aiDecision.riskLevel).toLowerCase();
      if (normalizedRisk === 'critical' || normalizedRisk === 'very_high') {
        alert.severity = 'critical';
      } else if (normalizedRisk === 'high') {
        alert.severity = 'high';
      } else if (normalizedRisk === 'medium' || normalizedRisk === 'moderate') {
        alert.severity = 'medium';
      } else if (normalizedRisk === 'low') {
        alert.severity = 'low';
      }
    }

    setAlerts(prev => [alert, ...prev]);

    // Add the generated "junk/overflow/risk" bin and reoptimize routes dynamically
    if (newBin && aiDecision.actionType !== 'INSTALL_SHED') {
      const nextBins = [...binsRef.current, newBin];
      binsRef.current = nextBins;
      setBins(nextBins);

      const shouldReroute =
        aiDecision.actionType === 'DISPATCH_TRUCK' ||
        alert.severity === 'high' ||
        alert.severity === 'critical';

      if (shouldReroute) {
        setVehicles(prev => SimulationEngine.reoptimizeFleet(prev, nextBins));
      }
    } else {
      // If no new bin was created, still reroute on high/critical risk
      if (alert.severity === 'high' || alert.severity === 'critical') {
        const currentBins = binsRef.current;
        setVehicles(prev => SimulationEngine.reoptimizeFleet(prev, currentBins));
      }
    }
  };

  const handleAddTruck = () => {
    // Use latest bins via ref to avoid stale closures when optimizing routes
    const currentBins = binsRef.current;
    setVehicles(prev => SimulationEngine.addVehicle(prev, currentBins));
  };

  const handleDeleteTruck = (vehicleId: string) => {
    // Use latest bins via ref when redistributing routes after removal
    const currentBins = binsRef.current;
    setVehicles(prev => SimulationEngine.removeVehicle(vehicleId, prev, currentBins));
  };

  const handleAssignDriver = (vehicleId: string, driverName: string) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, driver: driverName } : v));
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleAIAction = (actionType: string, target: string) => {
    // Execute actions recommended by Gemini
    if (actionType === 'ADD_TRUCK') {
      handleAddTruck();
    }
    else if (actionType === 'REMOVE_TRUCK') {
      // If target specifies an ID, remove it. Else remove a random idle one or the last one.
      // Simple logic: If target mimics an ID, use it. Else remove last.
      const targetTruck = vehicles.find(v => target.includes(v.id));
      if (targetTruck) {
        handleDeleteTruck(targetTruck.id);
      } else {
        // Remove last added
        if (vehicles.length > 0) handleDeleteTruck(vehicles[vehicles.length - 1].id);
      }
    }
    else if (actionType === 'INSTALL_SHED') {
      // Create a shed at a random location or safe spot if target is vague
      const newShed: Bin = {
        id: `SHED-${1000 + bins.length}`,
        lat: 28.6139 + (Math.random() - 0.5) * 0.02,
        lng: 77.2090 + (Math.random() - 0.5) * 0.02,
        fillLevel: 10,
        status: 'normal',
        lastCollection: 'Just Installed',
        type: 'recyclable'
      };
      setBins(prev => [...prev, newShed]);

      const infraAlert: Alert = {
        id: `INFRA-AI-${Date.now()}`,
        type: 'citizen_report',
        severity: 'medium',
        location: ' AI Optimized Location',
        timestamp: new Date().toLocaleTimeString(),
        message: `🏗️ INFRASTRUCTURE: AI Deployed Municipal Shed based on analysis.`
      };
      setAlerts(prev => [infraAlert, ...prev]);
    }
    else if (actionType === 'REROUTE') {
      const reopt = SimulationEngine.reoptimizeFleet(vehicles, bins);
      setVehicles(reopt);
      const alert: Alert = {
        id: `OPT-${Date.now()}`,
        type: 'delay', // Info type
        severity: 'low',
        location: 'District Wide',
        timestamp: new Date().toLocaleTimeString(),
        message: `🔄 FLEET OPTIMIZATION: Routes recalculated based on previous day data & current load.`
      };
      setAlerts(prev => [alert, ...prev]);
    }
  };

  if (!stats) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Initializing System...</div>;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex">
      {/* Sidebar Navigation */}
      <aside className="w-20 hidden md:flex flex-col items-center py-6 gap-6 glass-panel border-r border-r-slate-800 z-10 sticky top-0 h-screen">
        <div className="p-3 rounded-xl bg-primary/20 text-primary mb-6">
          <Activity size={28} />
        </div>

        <NavIcon icon={<LayoutDashboard size={24} />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
        <NavIcon icon={<MapIcon size={24} />} active={activeTab === 'map'} onClick={() => setActiveTab('map')} label="Digital Twin" />
        <NavIcon icon={<Navigation size={24} />} active={activeTab === 'routes'} onClick={() => setActiveTab('routes')} label="Routes" />
        <NavIcon icon={<AlertTriangle size={24} />} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} label="Risks" alertCount={alerts.length} />
        <NavIcon icon={<Truck size={24} />} active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} label="Fleet" />
        <NavIcon icon={<Users size={24} />} active={activeTab === 'workforce'} onClick={() => setActiveTab('workforce')} label="Workforce" />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-auto relative">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 glass-panel sticky top-0 z-20">
          <h1 className="text-xl font-bold tracking-wider text-white flex items-center gap-2">
            <span className="text-primary">DISTRICT</span> COMMAND CENTER
          </h1>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlacingDumpyard(!isPlacingDumpyard)}
              className={cn(
                "hidden md:flex items-center gap-2 px-4 py-2 rounded border text-sm transition-colors font-medium",
                isPlacingDumpyard ? "bg-purple-900 border-purple-500 text-purple-200 animate-pulse" : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/50 text-purple-400 border-dashed"
              )}
            >
              <Trash2 size={16} /> {isPlacingDumpyard ? "Click Map to Set Station" : "Set Dumpyard"}
            </button>
            <button
              onClick={handleAISuggestion}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-sm transition-colors font-medium border-dashed"
            >
              <Leaf size={16} /> AI Pattern Analysis
            </button>
            <button
              onClick={handleSimulateIncident}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-sm transition-colors font-medium border-dashed"
            >
              <Zap size={16} /> Simulate Incident
            </button>
            <button
              onClick={() => setIsReportOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 text-blue-400 text-sm transition-colors font-medium border-dashed"
            >
              <Search size={16} /> Citizen Scan
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-700 text-sm text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              SYSTEM ONLINE
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Current Time</div>
              <div className="text-sm font-mono font-bold text-primary">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </header>

        <div className="p-6 grid grid-cols-12 gap-6 pb-20">

          {/* Key Metrics Row */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Waste Collected Today" value={`${stats.totalWasteCollected.toFixed(1)} T`} icon={<Trash2 className="text-blue-400" />} trend="+5%" />
            <MetricCard title="Active Trucks" value={vehicles.length.toString()} icon={<Truck className="text-green-400" />} subtext="4 Idle / 2 Maint" />
            <MetricCard title="Overflow Alerts" value={alerts.filter(a => a.severity === 'critical').length.toString()} icon={<AlertTriangle className="text-red-500" />} isCritical={true} />
            <MetricCard title="Green Score" value={stats.greenScore.toString()} icon={<Activity className="text-emerald-400" />} />
          </div>

          {activeTab === 'overview' || activeTab === 'map' ? (
            <>
              {/* Main Map / Digital Twin */}
              <div className={cn("col-span-12 glass-panel rounded-xl overflow-hidden relative border border-slate-800/50 shadow-2xl transition-all duration-500", activeTab === 'map' ? "h-[70vh]" : "lg:col-span-8 h-[500px]")}>
                <div className="absolute top-4 left-4 z-[400] bg-black/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-primary border border-primary/30">
                  LIVE OPS: DISTRICT 1 {isPlacingDumpyard && "- SETTING DUMPYARD"}
                </div>
                <Map
                  bins={bins}
                  vehicles={vehicles}
                  alerts={alerts}
                  dumpyardLocation={dumpyardLocation}
                  onMapClick={isPlacingDumpyard ? handleMapClick : undefined}
                />
              </div>

              {/* Right Panel: Alerts & Priority List - Only show in overview */}
              {activeTab === 'overview' && (
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-[500px]">

                  {/* Alert Feed */}
                  <div className="flex-1 glass-panel rounded-xl p-4 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                      Real-Time Alerts <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs">{alerts.length} Active</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                      {alerts.map(alert => (
                        <div
                          key={alert.id}
                          className="p-3 rounded bg-red-950/30 border border-red-900/50 hover:border-red-500/50 transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-red-400 uppercase border border-red-900 px-1 rounded bg-black/40">
                              {alert.type}
                            </span>
                            <span className="text-[10px] text-slate-500">{alert.timestamp}</span>
                          </div>
                          <p className="text-sm text-slate-200 font-medium">{alert.message}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <MapIcon size={10} /> {alert.location}
                            </div>
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                            >
                              Mark Solved
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority Zones Mock */}
                  <div className="h-1/3 glass-panel rounded-xl p-4 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Priority Zones</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm p-2 bg-slate-800/50 rounded">
                        <span>Market A</span>
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 w-[92%]"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-slate-800/50 rounded">
                        <span>Res. Block 4</span>
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 w-[78%]"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {activeTab === 'fleet' && (
            <div className="col-span-12 h-[75vh]">
              <ActiveFleet
                vehicles={vehicles}
                onAddTruck={handleAddTruck}
                onAssignDriver={handleAssignDriver}
                onDeleteTruck={handleDeleteTruck}
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="col-span-12 h-[75vh]">
              <RiskMonitor alerts={alerts} onResolveAlert={handleResolveAlert} />
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="col-span-12 h-[75vh] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Navigation className="text-primary" size={20} /> Live Truck Routes
                </h2>
                <span className="text-xs text-slate-400">
                  Tracking {vehicles.length} trucks & {bins.length} collection points
                </span>
              </div>
              <div className="glass-panel rounded-xl overflow-hidden border border-slate-800/50 shadow-2xl h-full">
                <Map
                  bins={bins}
                  vehicles={vehicles}
                  alerts={alerts}
                  dumpyardLocation={dumpyardLocation}
                />
              </div>
            </div>
          )}

          {activeTab === 'workforce' && (
            <div className="col-span-12 h-[75vh]">
              <WorkforceView workers={workers} />
            </div>
          )}

          {/* Bottom Floating Bar */}
          <AIAssistant vehicles={vehicles} alerts={alerts} onAction={handleAIAction} />

          {/* Modals */}
          <AnimatePresence>
            {isReportOpen && <CitizenReportModal onClose={() => setIsReportOpen(false)} onReport={handleUserReport} />}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

// Sub-components for cleaner file (usually in separate files)
function NavIcon({ icon, active, onClick, label, alertCount }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative group",
        active
          ? "bg-primary text-white shadow-[0_0_15px_rgba(0,136,255,0.4)]"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      {icon}
      {alertCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border border-black font-bold">
          {alertCount}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute left-14 bg-slate-900 border border-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );
}

function MetricCard({ title, value, icon, trend, subtext, isCritical }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors",
        isCritical ? "border-red-900/50 bg-red-950/10" : "border-slate-800"
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{title}</span>
        <div className={cn("p-2 rounded-lg bg-slate-900/50", isCritical && "animate-pulse")}>{icon}</div>
      </div>

      <div className="mt-2">
        <div className={cn("text-3xl font-bold text-white", isCritical && "text-red-500 shadow-glow-red")}>{value}</div>
      </div>

      {trend && <div className="text-xs text-green-400 mt-1 font-mono">{trend} from yesterday</div>}
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}

      {/* Decorative background glow */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-all"></div>
    </motion.div>
  );
}
