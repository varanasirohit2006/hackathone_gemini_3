'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, DollarSign, Camera, CheckCircle } from 'lucide-react';
import { analyzeItemValue } from '@/app/actions';

interface MarketplaceModalProps {
    onClose: () => void;
}

export default function MarketplaceModal({ onClose }: MarketplaceModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Compress image to reduce payload size for server action
    const compressImage = (dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const raw = reader.result as string;
                const compressed = await compressImage(raw);
                console.log(`📏 Marketplace image compressed: ${(raw.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB`);
                setImagePreview(compressed);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleAnalyze = async () => {
        if (!imagePreview) return;
        setAnalyzing(true);

        try {
            const analysis = await analyzeItemValue(imagePreview);

            // If there's an error, still show the fallback data
            if (analysis.error) {
                console.warn("⚠️ Marketplace AI Error:", analysis.message);
            }

            setResult(analysis);
        } catch (e: any) {
            console.error("❌ Marketplace analysis failed:", e);
            // Show fallback result
            setResult({
                itemName: "Recyclable Item",
                category: "General Waste",
                estimatedValue: 0.50,
                currency: "USD",
                condition: "Scrap",
                recyclingPotential: "Medium",
                marketDemand: "Medium"
            });
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-green-950/20">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-green-400" /> Trash-to-Cash Marketplace
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {!result ? (
                        <div className="space-y-6">
                            <p className="text-slate-400 text-sm">
                                Scan items to identify their recycling value. Our AI estimates the market price for scrap, metal, and plastic.
                            </p>

                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-800/20 hover:bg-slate-800/40 transition-colors cursor-pointer relative hover:border-green-500/50 group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                {imagePreview ? (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-600">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-slate-800 rounded-full mb-3 group-hover:bg-green-500/20 text-green-400 transition-colors">
                                            <Camera size={32} />
                                        </div>
                                        <span className="text-slate-300 font-medium">Click to Upload Photo</span>
                                        <span className="text-slate-500 text-xs mt-1">Supports JPG, PNG</span>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!file || analyzing}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
                            >
                                {analyzing ? <Loader2 className="animate-spin" /> : <DollarSign size={20} />}
                                {analyzing ? 'Analyzing Value...' : 'Estimate Price'}
                            </button>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <div className="w-24 h-24 rounded-lg overflow-hidden bg-black border border-slate-600 shrink-0">
                                    <img src={imagePreview!} alt="Result" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{result.itemName}</h3>
                                    <div className="text-sm text-slate-400">{result.category} • {result.condition}</div>
                                    <div className="mt-2 flex gap-2">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                                            Demand: {result.marketDemand}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                    <div className="text-slate-400 text-xs uppercase mb-1">Estimated Value</div>
                                    <div className="text-3xl font-bold text-green-400 shadow-glow-green">
                                        ${result.estimatedValue?.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-green-600 mt-1">per unit / kg</div>
                                </div>
                                <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-center">
                                    <div className="text-slate-400 text-xs uppercase mb-1">Recycle Potential</div>
                                    <div className="text-xl font-bold text-white mt-1">
                                        {result.recyclingPotential}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setResult(null)} className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-medium transition-colors">
                                    Scan Another
                                </button>
                                <button onClick={onClose} className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors">
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
