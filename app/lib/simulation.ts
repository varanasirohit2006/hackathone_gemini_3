// Advanced Simulation Engine with VRP (Vehicle Routing Problem) & Gemini Integration

// Types
export interface Location {
    lat: number;
    lng: number;
}

export interface Bin {
    id: string;
    lat: number;
    lng: number;
    fillLevel: number; // 0-100
    status: 'normal' | 'high' | 'critical' | 'overflow' | 'reported';
    lastCollection: string;
    type: 'general' | 'recyclable' | 'hazardous' | 'citizen_report';
    imageUrl?: string;
}

export interface Vehicle {
    id: string;
    lat: number;
    lng: number;
    driver: string;
    fuel: number;
    load: number;
    capacity: number;
    status: 'active' | 'idle' | 'breakdown' | 'returning';
    routeExcellence: number;
    currentRoute: Location[]; // The path of points to visit
    assignedBinIds: string[]; // List of bins to collect
    color: string; // Dynamic Route Color
    // Total waste collected by this vehicle (tons)
    totalCollectedTonnage?: number;
}

export interface Alert {
    id: string;
    type: 'overflow' | 'breakdown' | 'hazard' | 'delay' | 'fraud' | 'citizen_report';
    severity: 'low' | 'medium' | 'high' | 'critical';
    location: string;
    timestamp: string;
    message: string;
    coordinates?: Location;
}

export interface Worker {
    id: string;
    name: string;
    role: 'driver' | 'collector' | 'supervisor';
    status: 'on-duty' | 'break' | 'off-duty';
    zone: string;
    fatigue: number;
    efficiency: number;
}

export interface DistrictStats {
    totalWasteCollected: number;
    efficiency: number;
    activeTrucks: number;
    pendingComplaints: number;
    greenScore: number;
    costSaved: number;
}

// Constants
const CENTER_LAT = 28.6139;
const CENTER_LNG = 77.2090;

// Neon/High-Contrast Colors for Dark Mode Routes
const ROUTE_COLORS = [
    '#00ffea', // Cyan
    '#00ffa2', // Spring Green
    '#ff00d4', // Magenta
    '#ffea00', // Yellow
    '#ff6600', // Orange
    '#9d00ff', // Vivid Violet
    '#00aaff', // Dodge Blue
    '#ff0055'  // Red/Pink
];

// Helpers
function distance(p1: Location, p2: Location): number {
    return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
}

function randomLocation(centerLat: number, centerLng: number, radius: number = 0.05): Location {
    return {
        lat: centerLat + (Math.random() - 0.5) * radius,
        lng: centerLng + (Math.random() - 0.5) * radius,
    };
}

// Generate Manhattan-style "Road" segments between two points
function generateManhattanPath(start: Location, end: Location, steps: number = 2): Location[] {
    const path: Location[] = [];
    let current = { ...start };

    // Simple L-shape or Z-shape logic
    if (Math.random() > 0.5) {
        // Move Lat then Lng
        path.push({ lat: end.lat, lng: current.lng });
    } else {
        // Move Lng then Lat
        path.push({ lat: current.lat, lng: end.lng });
    }
    path.push(end);
    return path;
}

// Generate a direct (shortest) path for clearer, faster routing
function generateDirectPath(end: Location): Location[] {
    return [end];
}

// -- INTELLIGENT ROUTING LOGIC (Clustering + Nearest Neighbor) --
// -- HISTORICAL DATA MOCK --
// "Previous Day" data suggests these areas are always high load
const HISTORICAL_HOTSPOTS = [
    { lat: 28.62, lng: 77.21, weight: 1.5 },
    { lat: 28.61, lng: 77.20, weight: 1.2 }
];

type PriorityTier = 'risk' | 'overflow' | 'normal';

function getBinPriorityTier(bin: Bin): PriorityTier {
    // 1) Risk first (citizen reported / hazardous)
    if (bin.status === 'reported' || bin.type === 'citizen_report' || bin.type === 'hazardous') return 'risk';

    // 2) Overflow / high-fill next
    if (bin.status === 'overflow' || bin.fillLevel >= 80 || bin.status === 'critical') return 'overflow';

    // 3) Normal (below 80%) last
    return 'normal';
}

function isTargetBin(bin: Bin): boolean {
    // Always target risk & overflow bins
    const tier = getBinPriorityTier(bin);
    if (tier === 'risk' || tier === 'overflow') return true;

    // Normal pickup (<80%) only if it's worth it
    const isHotspot = HISTORICAL_HOTSPOTS.some(h => distance(bin, h) < 0.01);
    if (isHotspot) return bin.fillLevel >= 25 && bin.fillLevel < 80;
    return bin.fillLevel >= 40 && bin.fillLevel < 80;
}

// -- INTELLIGENT ROUTING LOGIC (Clustering + Nearest Neighbor + Historical Weights) --
function optimizeRoutes(vehicles: Vehicle[], bins: Bin[]): Vehicle[] {
    const availableVehicles = vehicles.filter(v => v.status !== 'breakdown' && v.status !== 'returning' && v.load < 100);
    if (availableVehicles.length === 0) return vehicles;

    const targetBins = bins.filter(isTargetBin);
    if (targetBins.length === 0) {
        return vehicles.map(v => (
            v.status === 'breakdown'
                ? v
                : { ...v, status: 'idle' as const, currentRoute: [], assignedBinIds: [] }
        ));
    }

    // Prioritize: risk -> overflow/high-fill -> normal (<80%)
    const riskBins = targetBins.filter(b => getBinPriorityTier(b) === 'risk');
    const overflowBins = targetBins.filter(b => getBinPriorityTier(b) === 'overflow');
    const normalBins = targetBins.filter(b => getBinPriorityTier(b) === 'normal');

    const binsInPriorityOrder = [...riskBins, ...overflowBins, ...normalBins];

    // Limited truck usage: only use as many trucks as needed
    const MAX_STOPS = 12;
    const neededTrucks = Math.min(
        availableVehicles.length,
        Math.max(1, Math.ceil(binsInPriorityOrder.length / MAX_STOPS))
    );

    const statusRank: Record<Vehicle['status'], number> = {
        active: 0,
        returning: 1,
        idle: 2,
        breakdown: 99
    };

    const selectedVehicles = [...availableVehicles]
        .sort((a, b) => (statusRank[a.status] ?? 10) - (statusRank[b.status] ?? 10))
        .slice(0, neededTrucks);

    // Assignment buckets per vehicle
    const buckets: Record<string, Bin[]> = {};
    const bucketCounts: Record<string, number> = {};
    selectedVehicles.forEach(v => {
        buckets[v.id] = [];
        bucketCounts[v.id] = 0;
    });

    // Assign bins (in priority order) to nearest selected vehicle with remaining capacity
    for (const bin of binsInPriorityOrder) {
        let bestVehicle: Vehicle | null = null;
        let bestDist = Infinity;

        for (const v of selectedVehicles) {
            if (bucketCounts[v.id] >= MAX_STOPS) continue;
            const d = distance(v, bin);
            if (d < bestDist) {
                bestDist = d;
                bestVehicle = v;
            }
        }

        if (!bestVehicle) break;
        buckets[bestVehicle.id].push(bin);
        bucketCounts[bestVehicle.id] += 1;
    }

    const tierOrder: PriorityTier[] = ['risk', 'overflow', 'normal'];

    // Build each selected vehicle route: always finish higher tier bins first, using nearest neighbor
    const updatedSelected = selectedVehicles.map(v => {
        let remaining = [...buckets[v.id]];
        const assignedBinIds: string[] = [];
        const currentRoute: Location[] = [];
        let currentLocation: Location = { lat: v.lat, lng: v.lng };

        while (remaining.length > 0 && assignedBinIds.length < MAX_STOPS) {
            // Pick the highest tier that still has bins remaining
            let candidates: Bin[] = [];
            for (const tier of tierOrder) {
                const tierBins = remaining.filter(b => getBinPriorityTier(b) === tier);
                if (tierBins.length > 0) {
                    candidates = tierBins;
                    break;
                }
            }

            // Nearest candidate from current location
            let nearest: Bin | null = null;
            let nearestDist = Infinity;
            for (const b of candidates) {
                const d = distance(currentLocation, b);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = b;
                }
            }
            if (!nearest) break;

            assignedBinIds.push(nearest.id);
            currentRoute.push(...generateDirectPath(nearest));
            currentLocation = nearest;
            remaining = remaining.filter(b => b.id !== nearest!.id);
        }

        return {
            ...v,
            status: assignedBinIds.length > 0 ? ('active' as const) : ('idle' as const),
            assignedBinIds,
            currentRoute
        };
    });

    const updatedSelectedById = new Map(updatedSelected.map(v => [v.id, v]));
    const selectedIds = new Set(updatedSelected.map(v => v.id));

    // Unused vehicles stay idle (limited usage)
    return vehicles.map(v => {
        if (v.status === 'breakdown') return v;
        const updated = updatedSelectedById.get(v.id);
        if (updated) return updated;
        if (selectedIds.has(v.id)) return v;
        return { ...v, status: 'idle' as const, currentRoute: [], assignedBinIds: [] };
    });
}

export const SimulationEngine = {
    // Initial State Generators
    initializeBins: (count: number = 50): Bin[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: `BIN-${1000 + i}`,
            ...randomLocation(CENTER_LAT, CENTER_LNG),
            fillLevel: Math.floor(Math.random() * 60),
            status: 'normal',
            lastCollection: '4 hrs ago',
            type: Math.random() > 0.6 ? 'general' : 'recyclable',
        }));
    },

    initializeVehicles: (count: number = 8): Vehicle[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: `TRK-${200 + i}`,
            ...randomLocation(CENTER_LAT, CENTER_LNG),
            driver: `Driver ${String.fromCharCode(65 + i)}`,
            fuel: 100,
            load: 0,
            capacity: 100,
            status: 'idle',
            routeExcellence: 100,
            currentRoute: [],
            assignedBinIds: [],
            color: ROUTE_COLORS[i % ROUTE_COLORS.length],
            totalCollectedTonnage: 0
        }));
    },

    initializeWorkers: (count: number = 10): Worker[] => {
        const roles: Worker['role'][] = ['driver', 'collector', 'supervisor'];
        return Array.from({ length: count }).map((_, i) => ({
            id: `W-${5000 + i}`,
            name: `Staff Member ${i + 1}`,
            role: roles[Math.floor(Math.random() * roles.length)],
            status: 'on-duty',
            zone: `Zone ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
            fatigue: 10 + Math.floor(Math.random() * 20),
            efficiency: 90
        }));
    },

    // -- ACTIONS --

    // 1. Dynamic Re-routing upon breakdown
    handleBreakdown: (vehicleId: string, allVehicles: Vehicle[], bins: Bin[]): { updatedVehicles: Vehicle[], newAlert: Alert } => {
        // Deep clone to avoid mutation issues
        let clonedVehicles = JSON.parse(JSON.stringify(allVehicles));
        const targetIndex = clonedVehicles.findIndex((v: Vehicle) => v.id === vehicleId);

        if (targetIndex === -1) throw new Error("Vehicle not found");

        // Disable vehicle
        clonedVehicles[targetIndex].status = 'breakdown';
        clonedVehicles[targetIndex].currentRoute = [];
        clonedVehicles[targetIndex].assignedBinIds = [];

        // Reroute OTHERS
        const reOptimizedVehicles = optimizeRoutes(clonedVehicles, bins);

        return {
            updatedVehicles: reOptimizedVehicles,
            newAlert: {
                id: `AL-BD-${Date.now()}`,
                type: 'breakdown',
                severity: 'critical',
                location: `Near ${(clonedVehicles[targetIndex].lat).toFixed(4)}, ${(clonedVehicles[targetIndex].lng).toFixed(4)}`,
                timestamp: new Date().toLocaleTimeString(),
                message: `CRITICAL: ${vehicleId} Breakdown! Route dropped. Re-optimizing Fleet...`
            }
        };
    },

    // 1b. Add Vehicle
    addVehicle: (allVehicles: Vehicle[], bins: Bin[]): Vehicle[] => {
        const newId = `TRK-${200 + allVehicles.length + Math.floor(Math.random() * 1000)}`;
        // Position at "Depot" (Center)
        const newVehicle: Vehicle = {
            id: newId,
            lat: CENTER_LAT,
            lng: CENTER_LNG,
            driver: 'Unassigned',
            fuel: 100,
            load: 0,
            capacity: 100,
            status: 'active',
            routeExcellence: 100,
            currentRoute: [],
            assignedBinIds: [],
            color: ROUTE_COLORS[allVehicles.length % ROUTE_COLORS.length],
            totalCollectedTonnage: 0
        };

        const updatedList = [...allVehicles, newVehicle];
        // Trigger optimization to include new truck in workload
        return optimizeRoutes(updatedList, bins);
    },

    // 1c. Remove Vehicle
    removeVehicle: (vehicleId: string, allVehicles: Vehicle[], bins: Bin[]): Vehicle[] => {
        const filtered = allVehicles.filter(v => v.id !== vehicleId);
        // Re-distribute work
        return optimizeRoutes(filtered, bins);
    },

    // 1d. Force Re-optimization (e.g. from AI or Button)
    reoptimizeFleet: (allVehicles: Vehicle[], bins: Bin[]): Vehicle[] => {
        return optimizeRoutes(allVehicles, bins);
    },

    // 2. Citizen Report -> Adds Alert & Potentially a "Virtual Bin"
    reportIssue: (type: string, description: string, lat?: number, lng?: number, recommendation?: string): { alert: Alert, newBin: Bin | null } => {
        const loc = (lat && lng) ? { lat, lng } : randomLocation(CENTER_LAT, CENTER_LNG);

        const alert: Alert = {
            id: `RPT-${Date.now()}`,
            type: 'citizen_report',
            severity: 'high',
            location: 'User Pinned Location',
            timestamp: new Date().toLocaleTimeString(),
            message: `CITIZEN REPORT: ${type} - ${description}`,
            coordinates: loc
        };

        // If Recommendation says "Add Bin", create one
        let newBin: Bin | null = null;
        if (recommendation && recommendation.includes('Install Bin')) {
            newBin = {
                id: `TEMP-BIN-${Date.now()}`,
                ...loc,
                fillLevel: 100,
                status: 'reported',
                lastCollection: 'Never',
                type: 'citizen_report'
            };
        } else {
            // Treat as a one-time overflow pile
            newBin = {
                id: `PILE-${Date.now()}`,
                ...loc,
                fillLevel: 100,
                status: 'overflow',
                lastCollection: 'Never',
                type: 'general'
            };
        }

        return { alert, newBin };
    },

    // 3. Main Tick Loop (called every few seconds by frontend)
    tick: (vehicles: Vehicle[], bins: Bin[], dumpyardLocation: Location | null): { vehicles: Vehicle[], bins: Bin[], statsUpdate: Partial<DistrictStats>, newAlerts: Alert[] } => {
        const generatedAlerts: Alert[] = [];

        // A. Fill Bins Randomly
        const updatedBins = bins.map(b => {
            if (b.type === 'citizen_report') return b; // Static until collected

            const fillInc = Math.random() > 0.9 ? 5 : 0; // Slower fill rate
            let newFill = Math.min(100, b.fillLevel + fillInc);
            let status: Bin['status'] = b.status;

            if (status !== 'reported') { // Preserve reported status
                status = 'normal';
                if (newFill > 70) status = 'high';
                if (newFill > 90) status = 'critical';
                if (newFill === 100) status = 'overflow';
            }

            return { ...b, fillLevel: newFill, status };
        });

        // B. Dynamic re-optimization:
        // - if any risk/overflow exists and isn't assigned yet, OR
        // - if trucks are idle while work exists
        const highPriorityBinIds = updatedBins
            .filter(b => {
                const tier = getBinPriorityTier(b);
                return tier === 'risk' || tier === 'overflow';
            })
            .map(b => b.id);

        const assignedIds = new Set(vehicles.flatMap(v => v.assignedBinIds || []));
        const hasUnassignedHighPriority = highPriorityBinIds.some(id => !assignedIds.has(id));

        const hasAnyWork = updatedBins.some(isTargetBin);
        const hasIdleTruck = vehicles.some(v => v.status === 'idle');

        // Only re-optimize vehicles that are available (not full, not returning, not broken)
        const needsOptimization = (hasAnyWork && hasIdleTruck) || hasUnassignedHighPriority;

        // We pass the full list to optimization, but the optimizeRoutes function ensures it handles status correctly
        // But we should refine optimizeRoutes or handle the return logic here first.

        let nextVehicles = [...vehicles];

        // CHECK LOADS & SET RETURNING STATUS BEFORE OPTIMIZATION
        nextVehicles = nextVehicles.map(v => {
            if (v.status === 'breakdown') return v;

            // If full and not already returning, Go to Dumpyard
            if (v.load >= 100 && v.status !== 'returning') {
                // If no dumpyard yet, we can't really return, so maybe stay active/idle but allow no more pickup?
                // For now, assume if dumpyardLocation is null, they just stay full (blocking).
                if (dumpyardLocation) {
                     // Trigger Real-time Alert
                     generatedAlerts.push({
                        id: `LOG-RET-${Date.now()}-${v.id}`,
                        type: 'delay', // Using 'delay' as a proxy for 'logistics/status update'
                        severity: 'low',
                        location: `Near ${(v.lat).toFixed(3)}, ${(v.lng).toFixed(3)}`,
                        timestamp: new Date().toLocaleTimeString(),
                        message: `🚛 LOGISTICS: ${v.id} reached 100% Load. Returning to Dumpyard.`,
                        coordinates: { lat: v.lat, lng: v.lng }
                     });

                    return {
                        ...v,
                        status: 'returning',
                        currentRoute: generateManhattanPath(v, dumpyardLocation, 3), // Plan route to dumpyard
                        assignedBinIds: [] // Drop assignments
                    };
                }
            }
            return v;
        });

        if (needsOptimization) {
            // We need to make sure optimizeRoutes doesn't assign to 'returning' trucks
            nextVehicles = optimizeRoutes(nextVehicles, updatedBins);
        }


        // C. Move Vehicles & Collect Waste
        let collectedAmount = 0;

        nextVehicles = nextVehicles.map(v => {
            if (v.status === 'breakdown') return v;
            if (v.currentRoute.length === 0) return { ...v, status: 'idle' as const };

            // Move towards first point
            const target = v.currentRoute[0];
            const distCode = distance(v, target);

            if (distCode < 0.002) { // "Arrived" at waypoint
                // Remove reached point
                const newRoute = v.currentRoute.slice(1);

                // CHECK IF ARRIVED AT DUMPYARD
                if (v.status === 'returning' && newRoute.length === 0) {
                    // Dumped
                    return {
                        ...v,
                        lat: target.lat,
                        lng: target.lng,
                        currentRoute: [],
                        load: 0,
                        status: 'idle',
                        assignedBinIds: []
                    };
                }

                let newAssigned = v.assignedBinIds;
                let newCollected = v.totalCollectedTonnage ?? 0;
                let newLoad = v.load;

                // If this was a bin or junk point (and we are NOT returning), collect it
                if (v.status === 'active') {
                    // Find bin at this location (rough match)
                    const binIndex = updatedBins.findIndex(b => distance(b, target) < 0.002);
                    if (binIndex !== -1) {
                        const bin = updatedBins[binIndex];

                        // Junk points (citizen piles / temporary bins) are removed once collected
                        const isJunkPoint =
                            bin.type === 'citizen_report' ||
                            bin.id.startsWith('PILE-') ||
                            bin.id.startsWith('TEMP-BIN-');

                        if (isJunkPoint) {
                            updatedBins.splice(binIndex, 1);
                        } else {
                            updatedBins[binIndex] = {
                                ...bin,
                                fillLevel: 0,
                                status: 'normal'
                            };
                        }

                        collectedAmount += 0.5; // Tons

                        // Track per-truck
                        newCollected = newCollected + 0.5;
                        newAssigned = (v.assignedBinIds || []).filter(id => id !== bin.id);
                        newLoad = Math.min(100, v.load + 20); // Each bin = 20% load (5 bins = 100%)
                    }
                }

                return {
                    ...v,
                    lat: target.lat,
                    lng: target.lng,
                    currentRoute: newRoute,
                    assignedBinIds: newAssigned,
                    totalCollectedTonnage: newCollected,
                    load: newLoad
                };
            } else {
                // Move 15% of the way (Faster speed)
                const dLat = (target.lat - v.lat) * 0.15;
                const dLng = (target.lng - v.lng) * 0.15;
                return { ...v, lat: v.lat + dLat, lng: v.lng + dLng, fuel: Math.max(0, v.fuel - 0.05) };
            }
        });

        return {
            vehicles: nextVehicles,
            bins: updatedBins,
            statsUpdate: { totalWasteCollected: collectedAmount },
            newAlerts: generatedAlerts
        };
    },

    // Mock Gemini 3 API Analysis
    geminiAnalysis: async (type: 'image' | 'text', input: string) => {
        // Simulate API Latency
        await new Promise(r => setTimeout(r, 1500));

        if (type === 'image') {
            const isHazard = Math.random() > 0.7;
            // Bin placement logic mock
            const recommendBin = Math.random() > 0.4 ? "High waste density detected. Action: Install Bin." : "One-off obstruction. Action: Clear Pile.";

            return {
                wasteType: isHazard ? 'Hazardous Construction Material' : 'Unsegregated Municipal Waste',
                hazardLevel: isHazard ? 'High' : 'Low',
                confidence: 0.98,
                recyclable: !isHazard,
                recommendation: recommendBin,
                actions: ['Segregate immediately', 'Schedule pickup']
            };
        } else {
            // Chatbot / Text
            return {
                response: `[Gemini 3]: Based on current sensor data, I recommend re-routing Truck 4 to Sector 7. The traffic density is low, and waste accumulation is high.`,
                sentiment: 'Urgent'
            };
        }
    }
};
