'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Bin, Vehicle, Alert, Location } from '@/app/lib/simulation';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';

// Fix for default marker icons in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const customIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

// Helper for dynamic truck icons with number label
const createTruckIcon = (color: string, num: number) => L.divIcon({
    html: `<div style="background-color: ${color}; box-shadow: 0 0 12px ${color};" class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-black">${num}</div>`,
    className: 'custom-truck-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const binCriticalIcon = L.divIcon({
    html: '<div class="bg-red-600 rounded-full w-4 h-4 border-2 border-white shadow-[0_0_10px_red] w-full h-full"></div>',
    className: 'custom-div-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const binNormalIcon = L.divIcon({
    html: '<div class="bg-green-500 rounded-full w-3 h-3 border border-white opacity-60"></div>',
    className: 'custom-div-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const binHighIcon = L.divIcon({
    html: '<div class="bg-yellow-500 rounded-full w-3 h-3 border border-white opacity-80"></div>',
    className: 'custom-div-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

interface MapProps {
    bins: Bin[];
    vehicles: Vehicle[];
    alerts: Alert[];
    dumpyardLocation?: Location | null;
    onMapClick?: (lat: number, lng: number) => void;
    showHealthOverlay?: boolean;
    center?: [number, number];
    onSolveAlert?: (alert: Alert) => void;
}


function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
}

// Helper to recenter map when truck is focused or city changes
function MapUpdater({ center, zoom }: { center: [number, number] | null, zoom?: number }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 13, { animate: true, duration: 1.5 });
        }
    }, [center?.[0], center?.[1], map, zoom]);
    return null;
}

export default function Map({ bins, vehicles, alerts, dumpyardLocation, onMapClick, showHealthOverlay, center, onSolveAlert }: MapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [mapKey] = useState(`map-${Date.now()}`);

    // Simple UI state to make the map more interactive & less cluttered
    const [showBins, setShowBins] = useState(true);
    const [showRoutes, setShowRoutes] = useState(true);
    const [showAlerts, setShowAlerts] = useState(true);
    const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const focusedVehicle = useMemo(
        () => vehicles.find(v => v.id === focusedTruckId) || null,
        [vehicles, focusedTruckId]
    );

    if (!isMounted) {
        return (
            <div className="h-full w-full bg-slate-900 animate-pulse rounded-lg text-white flex items-center justify-center">
                Loading Geospatial Data...
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            {/* Top-right interactive controls */}
            <div className="absolute top-3 right-3 z-[500] bg-black/75 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 shadow-lg space-y-1">
                <div className="font-semibold text-[11px] text-slate-300 mb-1">Layers</div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showBins}
                        onChange={e => setShowBins(e.target.checked)}
                        className="accent-emerald-400"
                    />
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Bins
                    </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showRoutes}
                        onChange={e => setShowRoutes(e.target.checked)}
                        className="accent-sky-400"
                    />
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-0.5 bg-sky-400 inline-block" /> Routes
                    </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showAlerts}
                        onChange={e => setShowAlerts(e.target.checked)}
                        className="accent-red-400"
                    />
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Alerts
                    </span>
                </label>

                {focusedVehicle && (
                    <button
                        className="mt-2 w-full text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200"
                        onClick={() => setFocusedTruckId(null)}
                    >
                        Clear focus: {focusedVehicle.id}
                    </button>
                )}
            </div>

            {/* Legend bottom-right */}
            <div className="absolute bottom-3 right-3 z-[500] bg-black/80 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-300 space-y-1">
                <div className="font-semibold text-[11px] mb-1">Legend</div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 border border-white/60 inline-block" /> Normal Bin
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 border border-white/60 inline-block" /> High Fill
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 border border-white/60 inline-block" /> Overflow / Junk
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-sky-400 inline-block" /> Truck Route
                </div>
                <div className="border-t border-slate-700 my-1 pt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alert Types</div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[8px] font-black flex items-center justify-center border border-white">C</span> Citizen Report
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[8px] font-black flex items-center justify-center border border-white">B</span> Breakdown
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center border border-white">!</span> Overflow Alert
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-yellow-500 text-black text-[8px] font-black flex items-center justify-center border border-white">H</span> Hazardous
                </div>
            </div>

            <MapContainer
                key={mapKey}
                center={center || [28.6139, 77.2090]}
                zoom={13}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
            >
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    className="map-tiles"
                />

                {/* City Center + Focus Logic */}
                <MapUpdater
                    center={center || (focusedVehicle ? [focusedVehicle.lat, focusedVehicle.lng] : null)}
                    zoom={focusedVehicle ? 15 : 13}
                />

                {/* Render Bins */}
                {showBins && bins.map((bin) => {
                    let icon = binNormalIcon;
                    if (bin.fillLevel > 70) icon = binHighIcon;
                    if (bin.fillLevel > 90 || bin.status === 'overflow') icon = binCriticalIcon;

                    return (
                        <Marker
                            key={bin.id}
                            position={[bin.lat, bin.lng]}
                            icon={icon}
                        >
                            <Popup className="glass-popup">
                                <div className="p-2 text-slate-800">
                                    <strong className='text-md block border-b border-slate-200 pb-1 mb-1'>{bin.id}</strong>
                                    <div className="text-sm">Status: <span className="font-bold uppercase">{bin.status}</span></div>
                                    <div className="text-sm mt-1">Fill: <span className={bin.fillLevel > 90 ? 'text-red-600 font-bold' : 'text-green-600'}>{bin.fillLevel}%</span></div>
                                    <div className="text-xs text-gray-500 mt-1">Type: {bin.type}</div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Render Alerts (Citizen Reports, Hazards) */}
                {showAlerts && alerts.map((alert) => {
                    if (!alert.coordinates) return null;

                    const isCritical = alert.severity === 'critical';
                    const pulseClass = isCritical ? 'animate-ping' : '';

                    // Color-coded alert icons by type
                    const alertColors: Record<string, { bg: string, ring: string, label: string }> = {
                        'citizen_report': { bg: 'bg-blue-600', ring: 'bg-blue-400', label: 'C' },
                        'breakdown': { bg: 'bg-orange-600', ring: 'bg-orange-400', label: 'B' },
                        'overflow': { bg: 'bg-red-600', ring: 'bg-red-500', label: '!' },
                        'hazard': { bg: 'bg-yellow-500', ring: 'bg-yellow-400', label: 'H' },
                        'delay': { bg: 'bg-purple-600', ring: 'bg-purple-400', label: 'D' },
                        'fraud': { bg: 'bg-pink-600', ring: 'bg-pink-400', label: 'F' },
                    };
                    const colors = alertColors[alert.type] || alertColors['overflow'];

                    const alertIcon = L.divIcon({
                        html: `<div class="relative flex items-center justify-center w-7 h-7">
                             <div class="absolute w-full h-full ${colors.ring} rounded-full opacity-50 ${pulseClass}"></div>
                             <div class="relative z-10 text-white ${colors.bg} rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-lg text-[10px] font-black">
                               ${colors.label}
                             </div>
                           </div>`,
                        className: 'custom-alert-icon',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    });

                    return (
                        <Marker
                            key={alert.id}
                            position={[alert.coordinates.lat, alert.coordinates.lng]}
                            icon={alertIcon}
                        >
                            <Popup className="glass-popup">
                                <div className="p-2 text-slate-900 min-w-[200px]">
                                    <div className="flex items-center gap-2 border-b border-red-200 pb-1 mb-1">
                                        <span className="text-red-600 font-bold uppercase text-xs">{alert.type}</span>
                                        <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded border border-red-200">{alert.severity}</span>
                                    </div>
                                    <p className="text-sm font-medium leading-tight mb-1">{alert.message}</p>
                                    <div className="text-xs text-slate-500 mb-2">{alert.timestamp}</div>
                                    {onSolveAlert && (
                                        <button
                                            onClick={() => onSolveAlert(alert)}
                                            className="w-full py-1.5 bg-slate-900 border border-slate-700 text-white rounded text-[10px] font-bold hover:bg-black transition-colors flex items-center justify-center gap-1"
                                        >
                                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            SOLVE WITH GEMINI AI
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Render Vehicles and their Routes */}
                {vehicles.map((v) => {
                    const isFocused = focusedTruckId === v.id;
                    const shouldDim = focusedTruckId !== null && !isFocused;
                    const isReturning = v.status === 'returning';

                    // Build the full path: truck position → each waypoint
                    const fullPath: [number, number][] = [
                        [v.lat, v.lng],
                        ...v.currentRoute.map(p => [p.lat, p.lng] as [number, number])
                    ];

                    return (
                        <div key={v.id}>
                            {/* Route Line */}
                            {(showRoutes || isReturning) && v.currentRoute.length > 0 && (
                                <Polyline
                                    positions={fullPath}
                                    pathOptions={{
                                        color: isReturning ? '#ef4444' : (v.color || '#3b82f6'),
                                        weight: isFocused ? 6 : 3,
                                        dashArray: isReturning ? '10, 8' : undefined,
                                        opacity: shouldDim ? 0.1 : (isReturning ? 0.7 : 0.9),
                                        lineCap: 'round',
                                        lineJoin: 'round'
                                    }}
                                />
                            )}

                            {/* Destination stop markers (small dots at each assigned bin location) */}
                            {showRoutes && !isReturning && v.currentRoute.map((stop, idx) => (
                                <Circle
                                    key={`${v.id}-stop-${idx}`}
                                    center={[stop.lat, stop.lng]}
                                    radius={40}
                                    pathOptions={{
                                        color: v.color || '#3b82f6',
                                        fillColor: v.color || '#3b82f6',
                                        fillOpacity: shouldDim ? 0.05 : 0.6,
                                        weight: shouldDim ? 0 : 2,
                                        opacity: shouldDim ? 0 : 0.8
                                    }}
                                />
                            ))}

                            <Marker
                                position={[v.lat, v.lng]}
                                icon={createTruckIcon(v.color || '#3b82f6', vehicles.indexOf(v) + 1)}
                                eventHandlers={{
                                    click: () => setFocusedTruckId(isFocused ? null : v.id)
                                }}
                            >
                                <Popup>
                                    <div className="p-2 text-slate-800">
                                        <strong className="block border-b border-slate-200 pb-1 mb-1" style={{ color: v.color || 'black' }}>
                                            {v.id}
                                        </strong>
                                        <div className="text-sm">Driver: {v.driver}</div>
                                        <div className="text-sm">Load: {v.load}%</div>
                                        <div className="text-sm">
                                            Status: <span className={v.status === 'returning' ? 'text-red-600 font-bold uppercase' : 'uppercase font-semibold'}>{v.status}</span>
                                        </div>
                                        <div className="text-xs text-green-600 mt-1 font-mono">
                                            Assigned Bins: {v.assignedBinIds.length}
                                        </div>
                                        {typeof v.totalCollectedTonnage === 'number' && (
                                            <div className="text-xs text-slate-600 mt-1 font-mono">
                                                Collected: {v.totalCollectedTonnage.toFixed(1)} T
                                            </div>
                                        )}
                                        <button
                                            className="mt-2 w-full text-[11px] px-2 py-1 rounded bg-slate-900 text-slate-100 border border-slate-700 hover:bg-slate-800"
                                            onClick={() => setFocusedTruckId(v.id)}
                                        >
                                            Focus this route
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        </div>
                    );
                })}

                {/* Render Dumpyard */}
                {dumpyardLocation && (
                    <Marker
                        position={[dumpyardLocation.lat, dumpyardLocation.lng]}
                        icon={L.divIcon({
                            html: '<div class="w-8 h-8 flex items-center justify-center bg-purple-600 rounded-md border-2 border-white text-white font-bold text-xs shadow-lg">DUMP</div>',
                            className: 'custom-dump-icon',
                            iconSize: [32, 32],
                            iconAnchor: [16, 32]
                        })}
                    >
                        <Popup>
                            <div className="text-slate-900 font-bold">Central Dumpyard</div>
                        </Popup>
                    </Marker>
                )}

                {/* Click Handler for manual placement */}
                {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

                {/* Health Overlay (Heatmap Simulation) */}
                {showHealthOverlay && bins.filter(b => b.fillLevel > 50).map((bin) => (
                    <Circle
                        key={`health-${bin.id}`}
                        center={[bin.lat, bin.lng]}
                        radius={300 + (bin.fillLevel * 5)} // Larger radius for higher fill
                        pathOptions={{
                            color: 'red',
                            fillColor: '#ef4444',
                            fillOpacity: 0.2,
                            weight: 0
                        }}
                    />
                ))}

                {/* Map Attribution */}
                <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'none', marginBottom: '20px', marginLeft: '10px' }}>
                    <div className="bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-300 shadow border border-slate-700">
                        Satellite Imagery © Esri
                    </div>
                </div>
            </MapContainer>
        </div>
    );
}
