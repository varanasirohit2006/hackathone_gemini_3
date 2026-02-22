// Advanced Simulation Engine with VRP (Vehicle Routing Problem) & AI Integration

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

// Configurable city center
let CENTER_LAT = 28.6139;
let CENTER_LNG = 77.2090;

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
    const current = { ...start };

    if (Math.random() > 0.5) {
        path.push({ lat: end.lat, lng: current.lng });
    } else {
        path.push({ lat: current.lat, lng: end.lng });
    }
    path.push(end);
    return path;
}

// -- INTELLIGENT ROUTING LOGIC --
const HISTORICAL_HOTSPOTS = [
    { lat: 28.62, lng: 77.21, weight: 1.5 },
    { lat: 28.61, lng: 77.20, weight: 1.2 }
];

type PriorityTier = 'risk' | 'overflow' | 'normal';

function getBinPriorityTier(bin: Bin): PriorityTier {
    if (bin.status === 'reported' || bin.type === 'citizen_report' || bin.type === 'hazardous') return 'risk';
    if (bin.status === 'overflow' || bin.fillLevel >= 80 || bin.status === 'critical') return 'overflow';
    return 'normal';
}

function isTargetBin(bin: Bin): boolean {
    const tier = getBinPriorityTier(bin);
    if (tier === 'risk' || tier === 'overflow') return true;

    const isHotspot = HISTORICAL_HOTSPOTS.some(h => distance(bin, h) < 0.01);
    if (isHotspot) return bin.fillLevel >= 25 && bin.fillLevel < 80;
    return bin.fillLevel >= 40 && bin.fillLevel < 80;
}

// Nearest-neighbor shortest path builder — uses Manhattan (road-like) paths
function buildNearestNeighborRoute(startLoc: Location, targetBins: Bin[], maxStops: number = 5): { route: Location[], ids: string[] } {
    const route: Location[] = [];
    const ids: string[] = [];
    let current: Location = { lat: startLoc.lat, lng: startLoc.lng };
    let remaining = [...targetBins];

    while (remaining.length > 0 && ids.length < maxStops) {
        let nearest: Bin | null = null;
        let nearestDist = Infinity;
        for (const b of remaining) {
            const d = distance(current, b);
            if (d < nearestDist) { nearestDist = d; nearest = b; }
        }
        if (!nearest) break;

        // Insert Manhattan waypoint (road-like L-turn) before destination
        // Alternate between lat-first and lng-first for variety
        if (ids.length % 2 === 0) {
            // Move horizontally first, then vertically
            route.push({ lat: current.lat, lng: nearest.lng });
        } else {
            // Move vertically first, then horizontally
            route.push({ lat: nearest.lat, lng: current.lng });
        }
        route.push({ lat: nearest.lat, lng: nearest.lng });

        ids.push(nearest.id);
        current = nearest;
        remaining = remaining.filter(b => b.id !== nearest!.id);
    }

    return { route, ids };
}

// Calculate total route distance in approximate km
function routeDistanceKm(start: Location, route: Location[]): string {
    let total = 0;
    let current = start;
    for (const point of route) {
        total += distance(current, point);
        current = point;
    }
    return (total * 111).toFixed(1); // ~111km per degree
}

// Old optimizeRoutes kept for manual actions only (add/remove vehicle, breakdown handler)
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

    const riskBins = targetBins.filter(b => getBinPriorityTier(b) === 'risk');
    const overflowBins = targetBins.filter(b => getBinPriorityTier(b) === 'overflow');
    const normalBins = targetBins.filter(b => getBinPriorityTier(b) === 'normal');
    const binsInPriorityOrder = [...riskBins, ...overflowBins, ...normalBins];

    const MAX_STOPS = 5;
    const neededTrucks = Math.min(
        availableVehicles.length,
        Math.max(1, Math.ceil(binsInPriorityOrder.length / MAX_STOPS))
    );

    const selectedVehicles = [...availableVehicles]
        .sort((a, b) => (a.load - b.load))
        .slice(0, neededTrucks);

    const buckets: Record<string, Bin[]> = {};
    selectedVehicles.forEach(v => { buckets[v.id] = []; });

    for (const bin of binsInPriorityOrder) {
        let bestVehicle: Vehicle | null = null;
        let bestDist = Infinity;
        for (const v of selectedVehicles) {
            if ((buckets[v.id]?.length || 0) >= MAX_STOPS) continue;
            const d = distance(v, bin);
            if (d < bestDist) { bestDist = d; bestVehicle = v; }
        }
        if (!bestVehicle) break;
        buckets[bestVehicle.id].push(bin);
    }

    const updatedSelected = selectedVehicles.map(v => {
        const { route, ids } = buildNearestNeighborRoute(v, buckets[v.id], MAX_STOPS);
        return {
            ...v,
            status: ids.length > 0 ? ('active' as const) : ('idle' as const),
            assignedBinIds: ids,
            currentRoute: route
        };
    });

    const updatedSelectedById = new Map(updatedSelected.map(v => [v.id, v]));
    const selectedIds = new Set(updatedSelected.map(v => v.id));

    return vehicles.map(v => {
        if (v.status === 'breakdown') return v;
        const updated = updatedSelectedById.get(v.id);
        if (updated) return updated;
        if (selectedIds.has(v.id)) return v;
        return { ...v, status: 'idle' as const, currentRoute: [], assignedBinIds: [] };
    });
}

export const SimulationEngine = {
    setCenter: (lat: number, lng: number) => {
        CENTER_LAT = lat;
        CENTER_LNG = lng;
    },

    getCenter: (): Location => ({
        lat: CENTER_LAT,
        lng: CENTER_LNG
    }),

    // Initial State Generators — FIXED deterministic positions (no randomness)
    initializeBins: (count: number = 50): Bin[] => {
        // Use a deterministic grid pattern around city center
        // This ensures bins NEVER change position on reload
        const bins: Bin[] = [];
        const gridSize = Math.ceil(Math.sqrt(count)); // e.g. 8x8 for 50 bins
        const spacing = 0.008; // ~0.9km spacing between bins
        const startLat = CENTER_LAT - (gridSize / 2) * spacing;
        const startLng = CENTER_LNG - (gridSize / 2) * spacing;

        // Deterministic offsets to make the grid look more natural (like real city streets)
        const offsets = [
            0.0000, 0.0012, -0.0008, 0.0015, -0.0003, 0.0009, -0.0011, 0.0006,
            -0.0014, 0.0002, 0.0010, -0.0005, 0.0013, -0.0007, 0.0004, -0.0012,
            0.0008, -0.0001, 0.0011, -0.0009, 0.0003, -0.0013, 0.0007, -0.0004,
            0.0014, -0.0006, 0.0001, -0.0010, 0.0005, -0.0015, 0.0009, -0.0002,
            0.0012, -0.0008, 0.0000, 0.0015, -0.0003, 0.0006, -0.0011, 0.0010,
            -0.0014, 0.0004, 0.0013, -0.0007, 0.0002, -0.0012, 0.0008, -0.0001,
            0.0011, -0.0009
        ];

        // Deterministic fill levels (initial state — always the same)
        const fillLevels = [
            15, 22, 8, 45, 30, 12, 55, 18, 35, 48,
            5, 28, 42, 10, 38, 20, 50, 14, 32, 25,
            40, 7, 52, 16, 33, 46, 11, 27, 44, 9,
            36, 21, 53, 13, 31, 47, 6, 29, 43, 17,
            34, 24, 49, 8, 26, 41, 19, 37, 23, 54
        ];

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const latOffset = offsets[i % offsets.length];
            const lngOffset = offsets[(i + 7) % offsets.length];

            bins.push({
                id: `BIN-${1000 + i}`,
                lat: startLat + row * spacing + latOffset,
                lng: startLng + col * spacing + lngOffset,
                fillLevel: fillLevels[i % fillLevels.length],
                status: 'normal' as const,
                lastCollection: '4 hrs ago',
                type: (i % 3 === 0 ? 'general' : 'recyclable') as Bin['type'],
            });
        }

        return bins;
    },

    initializeVehicles: (count: number = 8): Vehicle[] => {
        // Fixed positions — trucks start at deterministic depot locations around city center
        const truckOffsets = [
            { lat: 0.010, lng: 0.010 },
            { lat: -0.010, lng: 0.010 },
            { lat: 0.010, lng: -0.010 },
            { lat: -0.010, lng: -0.010 },
            { lat: 0.015, lng: 0.000 },
            { lat: -0.015, lng: 0.000 },
            { lat: 0.000, lng: 0.015 },
            { lat: 0.000, lng: -0.015 },
            { lat: 0.012, lng: 0.008 },
            { lat: -0.012, lng: -0.008 },
        ];

        const driverNames = [
            'Driver A', 'Driver B', 'Driver C', 'Driver D',
            'Driver E', 'Driver F', 'Driver G', 'Driver H',
            'Driver I', 'Driver J'
        ];

        return Array.from({ length: count }).map((_, i) => ({
            id: `TRK-${i + 1}`,
            lat: CENTER_LAT + truckOffsets[i % truckOffsets.length].lat,
            lng: CENTER_LNG + truckOffsets[i % truckOffsets.length].lng,
            driver: driverNames[i % driverNames.length],
            fuel: 100,
            load: 0,
            capacity: 100,
            status: 'idle' as const,
            routeExcellence: 100,
            currentRoute: [],
            assignedBinIds: [],
            color: ROUTE_COLORS[i % ROUTE_COLORS.length],
            totalCollectedTonnage: 0
        }));
    },

    initializeWorkers: (count: number = 10): Worker[] => {
        const workerData = [
            { role: 'driver' as const, zone: 'Zone A', fatigue: 12 },
            { role: 'driver' as const, zone: 'Zone B', fatigue: 18 },
            { role: 'driver' as const, zone: 'Zone A', fatigue: 10 },
            { role: 'collector' as const, zone: 'Zone C', fatigue: 22 },
            { role: 'collector' as const, zone: 'Zone A', fatigue: 15 },
            { role: 'driver' as const, zone: 'Zone B', fatigue: 20 },
            { role: 'collector' as const, zone: 'Zone C', fatigue: 14 },
            { role: 'supervisor' as const, zone: 'Zone A', fatigue: 8 },
            { role: 'driver' as const, zone: 'Zone B', fatigue: 25 },
            { role: 'collector' as const, zone: 'Zone C', fatigue: 16 },
        ];

        return Array.from({ length: count }).map((_, i) => ({
            id: `W-${5000 + i}`,
            name: `Staff Member ${i + 1}`,
            role: workerData[i % workerData.length].role,
            status: 'on-duty' as const,
            zone: workerData[i % workerData.length].zone,
            fatigue: workerData[i % workerData.length].fatigue,
            efficiency: 90
        }));
    },

    // -- ACTIONS --

    // 1. Dynamic Re-routing upon breakdown
    handleBreakdown: (vehicleId: string, allVehicles: Vehicle[], bins: Bin[]): { updatedVehicles: Vehicle[], newAlert: Alert } => {
        let clonedVehicles = JSON.parse(JSON.stringify(allVehicles));
        const targetIndex = clonedVehicles.findIndex((v: Vehicle) => v.id === vehicleId);

        if (targetIndex === -1) throw new Error("Vehicle not found");

        const brokenTruck = clonedVehicles[targetIndex];
        const orphanedBinIds = [...brokenTruck.assignedBinIds];

        // Disable vehicle
        clonedVehicles[targetIndex].status = 'breakdown';
        clonedVehicles[targetIndex].currentRoute = [];
        clonedVehicles[targetIndex].assignedBinIds = [];

        // Find nearest available truck for reassignment
        let rescueTruckId = '';
        let rescueDist = Infinity;
        for (const v of clonedVehicles) {
            if (v.id === vehicleId || v.status === 'breakdown' || v.load >= 100) continue;
            const d = distance(v, brokenTruck);
            if (d < rescueDist) { rescueDist = d; rescueTruckId = v.id; }
        }

        let message = `🔧 BREAKDOWN: ${vehicleId} (${brokenTruck.driver}) is down!`;

        if (rescueTruckId && orphanedBinIds.length > 0) {
            const rescueIdx = clonedVehicles.findIndex((v: Vehicle) => v.id === rescueTruckId);
            const rescueTruck = clonedVehicles[rescueIdx];
            const orphanBins = orphanedBinIds.map((id: string) => bins.find(b => b.id === id)).filter(Boolean) as Bin[];
            const { route, ids } = buildNearestNeighborRoute(rescueTruck, orphanBins, 5);

            clonedVehicles[rescueIdx] = {
                ...rescueTruck,
                status: 'active',
                currentRoute: [...route, ...rescueTruck.currentRoute],
                assignedBinIds: [...ids, ...rescueTruck.assignedBinIds]
            };

            const distKm = (rescueDist * 111).toFixed(1);
            message += ` AI reassigned ${ids.length} bin(s) to nearest truck ${rescueTruckId} (${rescueTruck.driver}) — ${distKm}km away via shortest path.`;
        } else {
            // Full re-optimize as fallback
            clonedVehicles = optimizeRoutes(clonedVehicles, bins);
            message += ` Fleet re-optimized.`;
        }

        return {
            updatedVehicles: clonedVehicles,
            newAlert: {
                id: `AL-BD-${Date.now()}`,
                type: 'breakdown',
                severity: 'critical',
                location: `Near ${brokenTruck.lat.toFixed(4)}, ${brokenTruck.lng.toFixed(4)}`,
                timestamp: new Date().toLocaleTimeString(),
                message
            }
        };
    },

    // 1b. Add Vehicle
    addVehicle: (allVehicles: Vehicle[], bins: Bin[]): Vehicle[] => {
        const newId = `TRK-${allVehicles.length + 1}`;
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
        return optimizeRoutes(updatedList, bins);
    },

    // 1c. Remove Vehicle
    removeVehicle: (vehicleId: string, allVehicles: Vehicle[], bins: Bin[]): Vehicle[] => {
        const filtered = allVehicles.filter(v => v.id !== vehicleId);
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

    // 3. Main Tick Loop — AI-Driven Auto-Dispatch Engine
    tick: (vehicles: Vehicle[], bins: Bin[], dumpyardLocation: Location | null, workers: Worker[]): { vehicles: Vehicle[], bins: Bin[], workers: Worker[], statsUpdate: Partial<DistrictStats>, newAlerts: Alert[] } => {
        const generatedAlerts: Alert[] = [];
        let updatedWorkers = [...workers];

        // A. Worker Fatigue Management
        updatedWorkers = updatedWorkers.map(w => {
            if (w.status === 'on-duty' && w.role === 'driver') {
                const newFatigue = w.fatigue + (Math.random() * 0.5);
                return { ...w, fatigue: Math.min(100, newFatigue) };
            } else if (w.status === 'break' || w.status === 'off-duty') {
                return { ...w, fatigue: Math.max(0, w.fatigue - 2) };
            }
            return w;
        });

        // B. Fill Bins Slowly — cap at 90, overflow only via citizen/driver reports
        const updatedBins = bins.map(b => {
            if (b.type === 'citizen_report') return b;
            if (b.status === 'overflow') return b;

            const fillInc = Math.random() > 0.9 ? 5 : 0;
            const newFill = Math.min(90, b.fillLevel + fillInc);
            let status: Bin['status'] = b.status;

            if (status !== 'reported') {
                status = 'normal';
                if (newFill > 70) status = 'high';
                if (newFill > 85) status = 'critical';
            }

            return { ...b, fillLevel: newFill, status };
        });

        let nextVehicles = [...vehicles];

        // C. Auto-handle BREAKDOWNS — reassign broken truck's bins to nearest truck
        const brokenWithWork = nextVehicles.filter(v => v.status === 'breakdown' && v.assignedBinIds.length > 0);
        for (const broken of brokenWithWork) {
            const orphanBins = broken.assignedBinIds
                .map(id => updatedBins.find(b => b.id === id))
                .filter(Boolean) as Bin[];

            if (orphanBins.length === 0) continue;

            // Find nearest available truck using shortest distance
            let rescueTruck: Vehicle | null = null;
            let rescueDist = Infinity;
            for (const v of nextVehicles) {
                if (v.id === broken.id || v.status === 'breakdown' || v.status === 'returning' || v.load >= 100) continue;
                const d = distance(v, broken);
                if (d < rescueDist) { rescueDist = d; rescueTruck = v; }
            }

            if (rescueTruck) {
                const { route, ids } = buildNearestNeighborRoute(rescueTruck, orphanBins, 5);
                const rescueIdx = nextVehicles.findIndex(v => v.id === rescueTruck!.id);
                if (rescueIdx !== -1) {
                    nextVehicles[rescueIdx] = {
                        ...nextVehicles[rescueIdx],
                        status: 'active' as const,
                        currentRoute: [...route, ...nextVehicles[rescueIdx].currentRoute],
                        assignedBinIds: [...ids, ...nextVehicles[rescueIdx].assignedBinIds]
                    };
                }

                // Clear broken truck's assignments
                const brokenIdx = nextVehicles.findIndex(v => v.id === broken.id);
                if (brokenIdx !== -1) {
                    nextVehicles[brokenIdx] = { ...nextVehicles[brokenIdx], assignedBinIds: [], currentRoute: [] };
                }

                const distKm = (rescueDist * 111).toFixed(1);
                generatedAlerts.push({
                    id: `BD-RESCUE-${Date.now()}-${broken.id}`,
                    type: 'breakdown',
                    severity: 'critical',
                    location: `Near ${broken.lat.toFixed(4)}, ${broken.lng.toFixed(4)}`,
                    timestamp: new Date().toLocaleTimeString(),
                    message: `🔧 BREAKDOWN RECOVERY: ${broken.id} (${broken.driver}) is down. AI reassigned ${ids.length} bin(s) to nearest truck ${rescueTruck.id} (${rescueTruck.driver}) — ${distKm}km away via shortest path.`
                });
            }
        }

        // D. Full trucks → return to dumpyard
        nextVehicles = nextVehicles.map(v => {
            if (v.status === 'breakdown') return v;

            const driver = updatedWorkers.find(w => w.name === v.driver);
            if (driver && driver.fatigue > 95) {
                return { ...v, status: 'idle' as const, currentRoute: [], assignedBinIds: [] };
            }

            if (v.load >= 100 && v.status !== 'returning') {
                if (dumpyardLocation) {
                    generatedAlerts.push({
                        id: `RTN-${Date.now()}-${v.id}`,
                        type: 'delay',
                        severity: 'low',
                        location: 'Dumpyard',
                        timestamp: new Date().toLocaleTimeString(),
                        message: `🚛 LOAD FULL: ${v.id} (${v.driver}) reached 100% capacity. Returning to dumpyard for unloading.`
                    });
                    return {
                        ...v,
                        status: 'returning' as const,
                        currentRoute: generateManhattanPath(v, dumpyardLocation, 3),
                        assignedBinIds: []
                    };
                }
            }
            return v;
        });

        // E. AI AUTO-DISPATCH — Smart Routing Engine
        const allAssignedIds = new Set(nextVehicles.flatMap(v => v.assignedBinIds || []));

        // E1. Detect unassigned URGENT bins (risk + overflow)
        const unassignedUrgentBins = updatedBins.filter(b => {
            const tier = getBinPriorityTier(b);
            return (tier === 'risk' || tier === 'overflow') && !allAssignedIds.has(b.id);
        });

        const idleTrucks = nextVehicles.filter(v => v.status === 'idle' && v.load < 100);
        const allTrucksBusy = nextVehicles.every(v => v.status !== 'idle' || v.load >= 100);

        // E2. IMMEDIATE DISPATCH for urgent bins
        if (unassignedUrgentBins.length > 0 && idleTrucks.length > 0) {
            const urgentAssignments = new Map<string, Bin[]>();

            for (const urgentBin of unassignedUrgentBins) {
                let bestTruck: Vehicle | null = null;
                let bestDist = Infinity;

                for (const truck of idleTrucks) {
                    const assigned = urgentAssignments.get(truck.id)?.length || 0;
                    if (assigned >= 5) continue;
                    const d = distance(truck, urgentBin);
                    if (d < bestDist) { bestDist = d; bestTruck = truck; }
                }

                if (bestTruck) {
                    if (!urgentAssignments.has(bestTruck.id)) urgentAssignments.set(bestTruck.id, []);
                    urgentAssignments.get(bestTruck.id)!.push(urgentBin);
                }
            }

            nextVehicles = nextVehicles.map(v => {
                const assignedBins = urgentAssignments.get(v.id);
                if (!assignedBins || assignedBins.length === 0) return v;

                const { route, ids } = buildNearestNeighborRoute(v, assignedBins, 5);
                const dist = routeDistanceKm(v, route);

                // Categorize the type of risk for the AI message
                const riskTypes = assignedBins.map(b => {
                    if (b.type === 'citizen_report' || b.status === 'reported') return 'CITIZEN RISK';
                    if (b.status === 'overflow') return 'OVERFLOW';
                    if (b.type === 'hazardous') return 'HAZARDOUS';
                    return 'HIGH PRIORITY';
                });
                const uniqueTypes = [...new Set(riskTypes)];

                generatedAlerts.push({
                    id: `AI-DISPATCH-${Date.now()}-${v.id}`,
                    type: uniqueTypes.includes('CITIZEN RISK') ? 'citizen_report' : 'overflow',
                    severity: 'high',
                    location: `${ids.length} location(s)`,
                    timestamp: new Date().toLocaleTimeString(),
                    message: `🤖 AI DISPATCH: ${uniqueTypes.join(' + ')} detected! ${v.id} assigned to ${v.driver} → collecting ${ids.length} bin(s) [${ids.join(', ')}]. Route: ${dist}km via shortest path algorithm.`
                });

                ids.forEach(id => allAssignedIds.add(id));

                return {
                    ...v,
                    status: 'active' as const,
                    currentRoute: route,
                    assignedBinIds: ids
                };
            });
        }

        // E3. Normal routine collection for truly idle trucks
        const stillIdleTrucks = nextVehicles.filter(v => v.status === 'idle' && v.load < 100 && v.currentRoute.length === 0);
        const normalWorkBins = updatedBins.filter(b => {
            if (allAssignedIds.has(b.id)) return false;
            return isTargetBin(b);
        });

        if (stillIdleTrucks.length > 0 && normalWorkBins.length > 0) {
            const MAX_STOPS = 5;
            for (const truck of stillIdleTrucks) {
                const availableBins = normalWorkBins.filter(b => !allAssignedIds.has(b.id));
                if (availableBins.length === 0) break;

                const { route, ids } = buildNearestNeighborRoute(truck, availableBins, MAX_STOPS);

                if (ids.length > 0) {
                    const idx = nextVehicles.findIndex(v => v.id === truck.id);
                    if (idx !== -1) {
                        nextVehicles[idx] = {
                            ...nextVehicles[idx],
                            status: 'active' as const,
                            currentRoute: route,
                            assignedBinIds: ids
                        };

                        const dist = routeDistanceKm(truck, route);
                        generatedAlerts.push({
                            id: `ROUTE-${Date.now()}-${truck.id}`,
                            type: 'delay',
                            severity: 'low',
                            location: `${ids.length} bins`,
                            timestamp: new Date().toLocaleTimeString(),
                            message: `📋 ROUTE ASSIGNED: ${truck.id} (${truck.driver}) dispatched for routine collection of ${ids.length} bin(s). Route: ${dist}km via shortest path.`
                        });
                    }
                    ids.forEach(id => allAssignedIds.add(id));
                }
            }
        }

        // E4. AI ALERT: All trucks busy + pending urgent work
        if (allTrucksBusy && unassignedUrgentBins.length > 0) {
            generatedAlerts.push({
                id: `AI-DEPLOY-${Date.now()}`,
                type: 'delay',
                severity: 'critical',
                location: 'District Wide',
                timestamp: new Date().toLocaleTimeString(),
                message: `🤖 AI CRITICAL: All ${nextVehicles.length} trucks occupied! Deploy additional truck and assign driver immediately — ${unassignedUrgentBins.length} urgent risk alert(s) pending.`
            });
        }

        // F. Move Vehicles & Collect Waste
        let collectedAmount = 0;

        nextVehicles = nextVehicles.map(v => {
            if (v.status === 'breakdown') return v;
            if (v.currentRoute.length === 0) {
                // Route finished — return to dumpyard if carrying load
                if (v.load > 0 && v.status === 'active' && dumpyardLocation) {
                    generatedAlerts.push({
                        id: `COMPLETE-${Date.now()}-${v.id}`,
                        type: 'delay',
                        severity: 'low',
                        location: 'Route Complete',
                        timestamp: new Date().toLocaleTimeString(),
                        message: `✅ ROUTE COMPLETE: ${v.id} (${v.driver}) finished collection. Load: ${v.load}%. Heading to dumpyard.`
                    });
                    return {
                        ...v,
                        status: 'returning' as const,
                        currentRoute: generateManhattanPath(v, dumpyardLocation, 3),
                        assignedBinIds: []
                    };
                }
                return { ...v, status: 'idle' as const };
            }

            const target = v.currentRoute[0];
            const distCode = distance(v, target);

            if (distCode < 0.002) {
                const newRoute = v.currentRoute.slice(1);

                // Arrived at dumpyard
                if (v.status === 'returning' && newRoute.length === 0) {
                    generatedAlerts.push({
                        id: `DUMP-${Date.now()}-${v.id}`,
                        type: 'delay',
                        severity: 'low',
                        location: 'Dumpyard',
                        timestamp: new Date().toLocaleTimeString(),
                        message: `✅ UNLOADED: ${v.id} (${v.driver}) arrived at dumpyard. Load cleared. Truck idle — ready for new assignment.`
                    });
                    return {
                        ...v,
                        lat: target.lat,
                        lng: target.lng,
                        currentRoute: [],
                        load: 0,
                        status: 'idle' as const,
                        assignedBinIds: []
                    };
                }

                let newAssigned = v.assignedBinIds;
                let newCollected = v.totalCollectedTonnage ?? 0;
                let newLoad = v.load;

                if (v.status === 'active') {
                    const binIndex = updatedBins.findIndex(b => distance(b, target) < 0.002);
                    if (binIndex !== -1) {
                        const bin = updatedBins[binIndex];

                        const isJunkPoint =
                            bin.type === 'citizen_report' ||
                            bin.id.startsWith('PILE-') ||
                            bin.id.startsWith('TEMP-BIN-');

                        if (isJunkPoint) {
                            updatedBins.splice(binIndex, 1);
                        } else {
                            updatedBins[binIndex] = { ...bin, fillLevel: 0, status: 'normal' };
                        }

                        collectedAmount += 0.5;
                        newCollected += 0.5;
                        newAssigned = (v.assignedBinIds || []).filter(id => id !== bin.id);
                        newLoad = Math.min(100, v.load + 20);
                    }
                }

                // Full after collection → immediately head to dumpyard
                if (newLoad >= 100 && v.status === 'active' && dumpyardLocation) {
                    return {
                        ...v,
                        lat: target.lat,
                        lng: target.lng,
                        currentRoute: generateManhattanPath(target, dumpyardLocation, 3),
                        assignedBinIds: [],
                        totalCollectedTonnage: newCollected,
                        load: newLoad,
                        status: 'returning' as const
                    };
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
                const dLat = (target.lat - v.lat) * 0.015;
                const dLng = (target.lng - v.lng) * 0.015;
                return { ...v, lat: v.lat + dLat, lng: v.lng + dLng, fuel: Math.max(0, v.fuel - 0.02) };
            }
        });

        return {
            vehicles: nextVehicles,
            bins: updatedBins,
            workers: updatedWorkers,
            statsUpdate: { totalWasteCollected: collectedAmount },
            newAlerts: generatedAlerts
        };
    },

    // Mock AI API Analysis
    aiAnalysis: async (type: 'image' | 'text', input: string) => {
        await new Promise(r => setTimeout(r, 1500));

        if (type === 'image') {
            const isHazard = Math.random() > 0.7;
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
            return {
                response: `[AI]: Based on current sensor data, I recommend re-routing the nearest truck to the risk zone. The traffic density is low, and waste accumulation is high.`,
                sentiment: 'Urgent'
            };
        }
    }
};
