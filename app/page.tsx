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
  Navigation,
  Target,
  DollarSign,
  CheckCircle,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { SimulationEngine, Bin, Vehicle, Alert, DistrictStats, Worker } from '@/app/lib/simulation';
import { cn } from '@/app/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AIAssistant from '@/app/components/AIAssistant';
import ActiveFleet from '@/app/components/views/ActiveFleet';
import RiskMonitor from '@/app/components/views/RiskMonitor';
import WorkforceView from '@/app/components/views/WorkforceView';
import Leaderboard from '@/app/components/Leaderboard';

import CitizenReportModal from '@/app/components/CitizenReportModal';
import MarketplaceModal from '@/app/components/MarketplaceModal';
import { getAIActionPlan, suggestBinLocations, analyzeOperations } from '@/app/actions';

// Indian Cities Data
const INDIAN_CITIES = [
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
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [showHealthOverlay, setShowHealthOverlay] = useState(false);

  const [dumpyardLocation, setDumpyardLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlacingDumpyard, setIsPlacingDumpyard] = useState(false);
  const [selectedCity, setSelectedCity] = useState(INDIAN_CITIES[0]);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);
  const [festivals, setFestivals] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [solvedAlerts, setSolvedAlerts] = useState<Record<string, string>>({});
  const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);

  // Simulation Loop State Tracking with Refs for synchronous updates
  const vehiclesRef = useRef<Vehicle[]>([]);
  const binsRef = useRef<Bin[]>([]);
  const alertsRef = useRef<Alert[]>([]);
  const workersRef = useRef<Worker[]>([]);
  const dumpyardRef = useRef<{ lat: number, lng: number } | null>(null);

  // Sync refs with state
  useEffect(() => { vehiclesRef.current = vehicles; }, [vehicles]);
  useEffect(() => { binsRef.current = bins; }, [bins]);
  useEffect(() => { workersRef.current = workers; }, [workers]);
  useEffect(() => { dumpyardRef.current = dumpyardLocation; }, [dumpyardLocation]);
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  // Keep stats in sync with current fleet size
  useEffect(() => {
    setStats(prev => prev ? ({ ...prev, activeTrucks: vehicles.length }) : prev);
  }, [vehicles]);

  // Initial Load
  useEffect(() => {
    initializeCity(selectedCity);
    checkFestivals();
  }, []);

  const checkFestivals = async () => {
    try {
      const result = await analyzeOperations(
        `What major festivals or public holidays are coming up in India in the next 10 days? List them with dates. Briefly mention waste management impact. 2-3 sentences.`,
        { vehicleCount: 8, activeAlerts: 0, criticalAlerts: 0 }
      );
      setFestivals(result.text);
    } catch (e) {
      setFestivals("Monitoring local events for waste surge risks...");
    }
  };

  // City change handler
  const initializeCity = (city: typeof INDIAN_CITIES[0]) => {
    SimulationEngine.setCenter(city.lat, city.lng);

    const initialBins = SimulationEngine.initializeBins(50);
    const initialVehicles = SimulationEngine.initializeVehicles(8);
    const initialWorkers = SimulationEngine.initializeWorkers(12);

    setBins(initialBins);
    binsRef.current = initialBins;

    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;

    setWorkers(initialWorkers);
    workersRef.current = initialWorkers;

    setAlerts([]);
    alertsRef.current = [];
    setDumpyardLocation(null);
    dumpyardRef.current = null;

    setStats({
      totalWasteCollected: 124.5,
      efficiency: 88,
      activeTrucks: 8,
      pendingComplaints: 2,
      greenScore: 78.5,
      costSaved: 12050
    });
  };

  const handleCityChange = (city: typeof INDIAN_CITIES[0]) => {
    setSelectedCity(city);
    setIsCitySelectorOpen(false);
    initializeCity(city);
  };

  // Main Simulation Tick
  useEffect(() => {
    const interval = setInterval(() => {
      // Use Refs to get latest state without closure staleness
      const currentVehicles = vehiclesRef.current;
      const currentBins = binsRef.current;
      const currentWorkers = workersRef.current;
      const currentDumpyard = dumpyardRef.current;

      const result = SimulationEngine.tick(currentVehicles, currentBins, currentDumpyard, currentWorkers);

      // Update State
      if (result.vehicles !== currentVehicles) { // Only update if changed (Reference check might pass if mutated, but tick returns new array usually)
        setVehicles(result.vehicles);
      }
      setBins(result.bins);
      setWorkers(result.workers);

      // Handle New Alerts from Simulation (AI operation log)
      if (result.newAlerts && result.newAlerts.length > 0) {
        setAlerts(prev => [...result.newAlerts, ...prev].slice(0, 50)); // Cap at 50
      }

      // Update stats
      if (result.statsUpdate.totalWasteCollected! > 0) {
        setStats(prev => prev ? ({ ...prev, totalWasteCollected: prev.totalWasteCollected + result.statsUpdate.totalWasteCollected! }) : null);
      }

    }, 1500); // 1.5s tick

    return () => clearInterval(interval);
  }, []);

  // Poll for citizen and driver reports from their portals
  useEffect(() => {
    const pollReports = setInterval(() => {
      try {
        const citizenReports = JSON.parse(localStorage.getItem('citizen_reports') || '[]');
        const driverReports = JSON.parse(localStorage.getItem('driver_reports') || '[]');

        if (citizenReports.length === 0 && driverReports.length === 0) return;

        const newAlerts: Alert[] = [];
        const processedIds = new Set<string>();

        citizenReports.forEach((r: any) => {
          processedIds.add(r.id);
          const exists = alertsRef.current.some(a => a.id === r.id);
          if (!exists && r.coordinates) {
            newAlerts.push({
              id: r.id,
              type: 'citizen_report',
              severity: r.analysis?.hazardLevel === 'High' ? 'critical' : 'high',
              location: r.location || r.city || 'Unknown',
              timestamp: r.timestamp,
              message: `📢 CITIZEN: ${r.type} — ${r.description || 'Photo report'} (${r.userName})`,
              coordinates: r.coordinates,
            });
          }
        });

        driverReports.forEach((r: any) => {
          processedIds.add(r.id);
          const exists = alertsRef.current.some(a => a.id === r.id);
          if (!exists && r.coordinates) {
            newAlerts.push({
              id: r.id,
              type: r.issueType === 'breakdown' ? 'breakdown' : 'hazard',
              severity: r.severity === 'critical' ? 'critical' : 'high',
              location: r.location || r.city || 'Unknown',
              timestamp: r.timestamp,
              message: `🚛 DRIVER (${r.truckId}): ${r.issueLabel} — ${r.description}`,
              coordinates: r.coordinates,
            });
          }
        });

        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev]);
        }

        // Clean up localStorage: remove only the ones we've "seen" in this tick
        const latestCitizen = JSON.parse(localStorage.getItem('citizen_reports') || '[]');
        const remainingCitizen = latestCitizen.filter((r: any) => !processedIds.has(r.id));
        if (remainingCitizen.length === 0) localStorage.removeItem('citizen_reports');
        else localStorage.setItem('citizen_reports', JSON.stringify(remainingCitizen));

        const latestDriver = JSON.parse(localStorage.getItem('driver_reports') || '[]');
        const remainingDriver = latestDriver.filter((r: any) => !processedIds.has(r.id));
        if (remainingDriver.length === 0) localStorage.removeItem('driver_reports');
        else localStorage.setItem('driver_reports', JSON.stringify(remainingDriver));

      } catch (e) {
        // Ignore parsing errors
      }
    }, 3000);

    return () => clearInterval(pollReports);
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

    // Call ChatGPT AI for Decision Making
    // User requirement: "solve the problem with using ai"
    const aiDecision = await getAIActionPlan(description);
    console.log("🤖 AI Decision:", aiDecision);

    // 1. EXECUTE AI ACTION
    if (aiDecision.actionType === 'REROUTE_FLEET') {
      // User Requirement: "AI... reasigning the routes if the problem was truck breakdown"
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

  const handleSolveAlert = async (alert: Alert) => {
    setIsAiLoading(true);
    try {
      const plan = await getAIActionPlan(alert.message);
      setSolvedAlerts(prev => ({ ...prev, [alert.id]: plan.action }));

      // Add a follow-up system alert
      const followUp: Alert = {
        id: `AI-SOLVE-${Date.now()}`,
        type: 'delay',
        severity: 'low',
        location: alert.location,
        timestamp: new Date().toLocaleTimeString(),
        message: `🤖 GEMINI PLAN: ${plan.action || 'Deploying extra truck to location.'}`
      };
      setAlerts(prev => [followUp, ...prev]);
    } catch (e) {
      console.error("AI Solve Error", e);
    } finally {
      setIsAiLoading(false);
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
    // Execute actions recommended by ChatGPT
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
      <aside className="w-20 hidden lg:flex flex-col items-center py-8 gap-8 bg-slate-900/40 backdrop-blur-3xl border-r border-slate-800/50 z-50 sticky top-0 h-screen shrink-0 shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 mb-4 transition-transform hover:scale-105 cursor-pointer">
          <Activity size={28} className="text-white" />
        </div>

        <div className="flex flex-col gap-5">
          <NavIcon icon={<LayoutDashboard size={22} />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
          <NavIcon icon={<MapIcon size={22} />} active={activeTab === 'map'} onClick={() => setActiveTab('map')} label="Digital Twin" />
          <NavIcon icon={<Navigation size={22} />} active={activeTab === 'routes'} onClick={() => setActiveTab('routes')} label="Routes" />
          <NavIcon icon={<AlertTriangle size={22} />} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} label="Risks" alertCount={alerts.length} />
          <NavIcon icon={<Truck size={22} />} active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} label="Fleet" />
          <NavIcon icon={<Users size={22} />} active={activeTab === 'workforce'} onClick={() => setActiveTab('workforce')} label="Workforce" />
          <NavIcon icon={<Target size={22} />} active={activeTab === 'community'} onClick={() => setActiveTab('community')} label="Community" />
        </div>

        <div className="mt-auto pb-4 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer group relative">
            <Zap size={18} />
            <div className="absolute left-14 bg-slate-900 border border-slate-700 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">System Health: 98%</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-auto relative">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/60 flex items-center justify-between px-8 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-black tracking-[0.2em] text-white flex items-center gap-3">
              <span className="text-primary italic">GEMINI</span> <span className="opacity-40 font-light">|</span> OPS
            </h1>

            {/* City Selector */}
            <div className="relative ml-4">
              <button
                onClick={() => setIsCitySelectorOpen(!isCitySelectorOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300 text-xs font-semibold hover:bg-slate-800/80 transition-all group"
              >
                <MapIcon size={14} className="group-hover:text-primary transition-colors" />
                <span>{selectedCity.name}</span>
                <ChevronDown size={14} className={cn("transition-transform duration-300 opacity-50", isCitySelectorOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isCitySelectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-3 w-64 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] p-2"
                  >
                    <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1">
                      Resource Jurisdiction
                    </div>
                    <div className="grid gap-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                      {INDIAN_CITIES.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => handleCityChange(city)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all group",
                            selectedCity.name === city.name
                              ? "bg-primary text-white font-bold shadow-lg shadow-primary/20"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <MapIcon size={12} className={selectedCity.name === city.name ? "text-white" : "text-slate-500 group-hover:text-primary"} />
                            {city.name}
                          </div>
                          {selectedCity.name === city.name && <CheckCircle size={12} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setIsOpsMenuOpen(!isOpsMenuOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                  isOpsMenuOpen ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-800"
                )}
              >
                <Zap size={14} /> Quick Ops <ChevronDown size={14} className={cn("transition-transform", isOpsMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isOpsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 w-64 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[100]"
                  >
                    <div className="grid gap-1">
                      <button onClick={() => { setIsOpsMenuOpen(false); handleAISuggestion(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/30">
                        <Leaf size={14} className="text-emerald-400" /> AI Strategy Analysis
                      </button>
                      <button onClick={() => { setIsOpsMenuOpen(false); handleSimulateIncident(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-400 transition-all border border-transparent hover:border-yellow-500/30">
                        <Zap size={14} className="text-yellow-400" /> Simulate Drill/Alert
                      </button>
                      <button onClick={() => { setIsOpsMenuOpen(false); setIsReportOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/30">
                        <Search size={14} className="text-blue-400" /> Remote Citizen Audit
                      </button>
                      <button onClick={() => { setIsOpsMenuOpen(false); setIsPlacingDumpyard(!isPlacingDumpyard); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all border border-transparent", isPlacingDumpyard ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "text-slate-300 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30")}>
                        <Trash2 size={14} className="text-purple-400" /> {isPlacingDumpyard ? "Stop Station Placement" : "Optimize Station Pin"}
                      </button>
                      <button onClick={() => { setIsOpsMenuOpen(false); setIsMarketplaceOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:bg-green-500/10 hover:text-green-400 transition-all border border-transparent hover:border-green-500/30">
                        <DollarSign size={14} className="text-green-400" /> Trash-to-Cash Hub
                      </button>
                      <button onClick={() => { setIsOpsMenuOpen(false); setShowHealthOverlay(!showHealthOverlay); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all border border-transparent", showHealthOverlay ? "bg-red-500/20 text-red-400 border-red-500/30" : "text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30")}>
                        <Activity size={14} className="text-red-400" /> Predictive Health View
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-[1px] bg-slate-800 mx-2"></div>

            <div className="flex items-center gap-3">
              <a href="/customer" className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
                Citizen
              </a>
              <a href="/driver" className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">
                Driver
              </a>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Live Monitor</span>
                <span className="text-xs font-mono font-bold text-primary tabular-nums">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 grid grid-cols-12 gap-6 pb-20">

          {/* Master View Stats */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="System Revenue" value="₹1.4L" icon={<Activity className="text-blue-400" />} trend="+₹8k today" subtext="Fleet efficiency profit" />
            <MetricCard title="Master Fleet" value={vehicles.length.toString()} icon={<Truck className="text-green-400" />} subtext="8 active drivers" />
            <MetricCard title="Citizen Heroes" value="1,242" icon={<Users className="text-emerald-400" />} trend="+12 active" subtext="Top ranking: Rahul S." />
            <MetricCard title="Critical Risks" value={alerts.filter(a => a.severity === 'critical').length.toString()} icon={<AlertTriangle className="text-red-500" />} isCritical={true} subtext="Dispatch required" />
          </div>

          {activeTab === 'overview' || activeTab === 'map' ? (
            <>
              {/* Main Map / Digital Twin */}
              <div className={cn("col-span-12 glass-panel rounded-xl overflow-hidden relative border border-slate-800/50 shadow-2xl transition-all duration-500", activeTab === 'map' ? "h-[70vh]" : "lg:col-span-8 h-[500px]")}>
                <div className="absolute top-4 left-4 z-[400] bg-black/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-primary border border-primary/30">
                  LIVE OPS: {selectedCity.name.toUpperCase()} {isPlacingDumpyard && "- SETTING DUMPYARD"}
                </div>
                <Map
                  bins={bins}
                  vehicles={vehicles}
                  alerts={alerts}
                  dumpyardLocation={dumpyardLocation}
                  onMapClick={isPlacingDumpyard ? handleMapClick : undefined}
                  showHealthOverlay={showHealthOverlay}
                  center={[selectedCity.lat, selectedCity.lng]}
                  onSolveAlert={handleSolveAlert}
                />
              </div>

              {/* Right Panel: AI & Awareness */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* Festival Awareness Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all duration-700"></div>
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-500">Regional Intelligence</h3>
                      <p className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold">Proactive Event Monitoring</p>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-amber-500/10 relative z-10">
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      {festivals || "Connecting to regional intelligence nodes..."}
                    </p>
                  </div>
                </motion.div>

                {/* AI Assistant or solved alerts display */}
                {Object.keys(solvedAlerts).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
                  >
                    <h3 className="text-xs font-bold text-emerald-400 uppercase mb-3 flex items-center gap-2">
                      <CheckCircle size={14} /> AI Resolved Risks
                    </h3>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                      {Object.entries(solvedAlerts).reverse().map(([id, plan]) => (
                        <div key={id} className="text-[11px] p-2 bg-slate-900/80 rounded border border-emerald-500/10 text-slate-400">
                          <span className="text-emerald-400 font-bold block mb-1">Issue {id.substring(0, 6)}:</span>
                          {plan}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <AIAssistant
                  vehicles={vehicles}
                  alerts={alerts}
                  onAction={handleAIAction}
                />
              </div>

              {/* Right Panel: Alerts & Priority List - Only show in overview when map is not expanded */}
              {activeTab === 'overview' && (
                <div className="col-span-12 lg:col-span-12 space-y-6 mt-6">
                  {/* Alert Feed */}
                  {/* AI Operations Log */}
                  <div className="flex-1 glass-panel rounded-xl p-4 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                      AI Operations Log <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">{alerts.length} Events</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin max-h-[400px]">
                      {alerts.map(alert => {
                        // Color scheme per alert type
                        const colorMap: Record<string, { border: string, badge: string, badgeText: string, bg: string }> = {
                          'citizen_report': { border: 'border-blue-500/40', badge: 'bg-blue-500/20', badgeText: 'text-blue-400', bg: 'bg-blue-950/20' },
                          'breakdown': { border: 'border-orange-500/40', badge: 'bg-orange-500/20', badgeText: 'text-orange-400', bg: 'bg-orange-950/20' },
                          'overflow': { border: 'border-red-500/40', badge: 'bg-red-500/20', badgeText: 'text-red-400', bg: 'bg-red-950/20' },
                          'hazard': { border: 'border-yellow-500/40', badge: 'bg-yellow-500/20', badgeText: 'text-yellow-400', bg: 'bg-yellow-950/20' },
                          'delay': { border: 'border-purple-500/40', badge: 'bg-purple-500/20', badgeText: 'text-purple-400', bg: 'bg-purple-950/20' },
                          'fraud': { border: 'border-pink-500/40', badge: 'bg-pink-500/20', badgeText: 'text-pink-400', bg: 'bg-pink-950/20' },
                        };
                        const colors = colorMap[alert.type] || colorMap['overflow'];

                        return (
                          <div
                            key={alert.id}
                            className={`p-3 rounded-lg ${colors.bg} border ${colors.border} hover:border-opacity-80 transition-all group`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-black uppercase ${colors.badge} ${colors.badgeText} px-1.5 py-0.5 rounded border border-current/20`}>
                                {alert.type.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold uppercase px-1 rounded ${alert.severity === 'critical' ? 'bg-red-500/30 text-red-300' :
                                  alert.severity === 'high' ? 'bg-orange-500/30 text-orange-300' :
                                    alert.severity === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                                      'bg-slate-500/30 text-slate-400'
                                  }`}>
                                  {alert.severity}
                                </span>
                                <span className="text-[10px] text-slate-500">{alert.timestamp}</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-200 font-medium leading-snug">{alert.message}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <MapIcon size={10} /> {alert.location}
                              </div>
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                              >
                                Acknowledge
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
                  center={[selectedCity.lat, selectedCity.lng]}
                  onSolveAlert={handleSolveAlert}
                />
              </div>
            </div>
          )}

          {activeTab === 'workforce' && (
            <div className="col-span-12 h-[75vh]">
              <WorkforceView workers={workers} />
            </div>
          )}

          {activeTab === 'community' && (
            <div className="col-span-12 h-[75vh]">
              <Leaderboard citizens={[
                { id: '1', name: 'Rohan Sharma', points: 1250, rank: 1, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan' },
                { id: '2', name: 'Priya Patel', points: 980, rank: 2, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' },
                { id: '3', name: 'Amit Singh', points: 850, rank: 3, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit' },
                { id: '4', name: 'Sneha Gupta', points: 720, rank: 4 },
                { id: '5', name: 'Vikram Malhotra', points: 650, rank: 5 },
                { id: '6', name: 'Anjali Desai', points: 590, rank: 6 },
                { id: '7', name: 'Rahul Verma', points: 540, rank: 7 },
                { id: '8', name: 'Kavita Reddy', points: 480, rank: 8 },
              ]} />
            </div>
          )}

          {/* Bottom Floating Bar */}
          <AIAssistant vehicles={vehicles} alerts={alerts} onAction={handleAIAction} />

          {/* Modals */}
          <AnimatePresence>
            {isReportOpen && <CitizenReportModal onClose={() => setIsReportOpen(false)} onReport={handleUserReport} />}
            {isMarketplaceOpen && <MarketplaceModal onClose={() => setIsMarketplaceOpen(false)} />}
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
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative group",
        active
          ? "bg-primary text-white shadow-[0_10px_25px_rgba(0,136,255,0.3)] scale-110"
          : "text-slate-500 hover:bg-slate-800/80 hover:text-slate-200"
      )}
    >
      <div className={cn("transition-transform duration-500", active && "scale-110")}>
        {icon}
      </div>

      {alertCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-tr from-red-600 to-red-400 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-[#0a0c14] font-black shadow-lg animate-bounce">
          {alertCount}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute left-16 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-x-[-10px] group-hover:translate-x-0 z-50 shadow-2xl">
        {label}
      </div>

      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute -left-4 w-1 h-8 bg-primary rounded-r-full shadow-[4px_0_15px_rgba(0,136,255,0.8)]"
        />
      )}
    </button>
  );
}

function MetricCard({ title, value, icon, trend, subtext, isCritical }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden group",
        isCritical
          ? "bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
          : "bg-slate-900/40 backdrop-blur-xl border-slate-800/50 hover:border-primary/40 hover:shadow-[0_15px_35px_rgba(0,0,0,0.4)]"
      )}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white tabular-nums tracking-tight">{value}</h3>
            {trend && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded">
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
          isCritical ? "bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "bg-slate-800/80 text-primary border border-slate-700/50"
        )}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 relative z-10">
        {subtext ? (
          <p className="text-[10px] font-medium text-slate-400">{subtext}</p>
        ) : (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={cn("w-1 h-3 rounded-full", i < 4 ? "bg-primary/40" : "bg-slate-800")} />
            ))}
          </div>
        )}
      </div>

      {/* Decorative Background Glows */}
      <div className={cn(
        "absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity group-hover:opacity-40",
        isCritical ? "bg-red-500" : "bg-primary"
      )} />
    </motion.div>
  );
}
