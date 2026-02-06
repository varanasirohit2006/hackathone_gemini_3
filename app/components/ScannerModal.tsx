'use client';

import { useState } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulationEngine } from '@/app/lib/simulation';

export default function ScannerModal({ onClose }: { onClose: () => void }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [image, setImage] = useState<string | null>(null);

    const handleUpload = async () => {
        // Simulate upload
        const mockImage = "https://placehold.co/600x400?text=Waste+Sample";
        setImage(mockImage);
        setAnalyzing(true);

        const res = await SimulationEngine.geminiAnalysis('image', mockImage);
        setResult(res);
        setAnalyzing(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Camera className="text-primary" /> Multimodal Waste Intelligence
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {!image ? (
                        <div
                            onClick={handleUpload}
                            className="border-2 border-dashed border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-slate-900/50 transition-all text-slate-400 hover:text-white h-64"
                        >
                            <Upload size={48} className="mb-4" />
                            <div className="font-semibold text-lg">Upload Waste Image</div>
                            <div className="text-sm text-slate-500">or Drag & Drop here</div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video">
                                <img src={image} alt="Analyzed" className="w-full h-full object-cover" />
                                {analyzing && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-primary">
                                        <Loader size={48} className="animate-spin mb-4" />
                                        <div className="font-mono animate-pulse">Running Gemini Vision Analysis...</div>
                                    </div>
                                )}

                                {!analyzing && result && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur p-4 rounded-xl border border-primary/20">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-slate-400 uppercase">Detection</div>
                                                <div className="text-lg font-bold text-white">{result.wasteType}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400 uppercase">Confidence</div>
                                                <div className="text-lg font-mono text-green-400">{(result.confidence * 100).toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!analyzing && result && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                        <div className="text-sm font-semibold text-slate-300 mb-2">Analysis Report</div>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2">
                                                {result.hazardLevel === 'High' ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle size={16} className="text-green-500" />}
                                                <span className="text-slate-400">Hazard Level:</span>
                                                <span className={result.hazardLevel === 'High' ? "text-red-400 font-bold" : "text-green-400"}>{result.hazardLevel}</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="text-slate-400">Anomaly:</span>
                                                <span className="text-white">{result.anomalyDetected ? 'Yes' : 'No'}</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                        <div className="text-sm font-semibold text-slate-300 mb-2">Recommended Actions</div>
                                        <div className="flex gap-2 flex-wrap">
                                            <button className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-xs hover:bg-primary/30">
                                                Dispatch Response Team
                                            </button>
                                            <button className="px-3 py-1 bg-slate-700 text-white rounded text-xs hover:bg-slate-600">
                                                Flag location
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
