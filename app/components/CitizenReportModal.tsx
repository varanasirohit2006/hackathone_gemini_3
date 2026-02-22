'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, MapPin, Send, Mic, Loader, CheckCircle, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { SimulationEngine } from '@/app/lib/simulation';
import { analyzeImage } from '@/app/actions';

export default function CitizenReportModal({ onClose, onReport }: { onClose: () => void, onReport: (data: any) => void }) {
    const [step, setStep] = useState(1);
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [desc, setDesc] = useState('');

    // Hardware/Process States
    const [isRecording, setIsRecording] = useState(false);
    const [audioTranscript, setAudioTranscript] = useState<string>('');
    const [transcribing, setTranscribing] = useState(false);
    const [locationState, setLocationState] = useState<'idle' | 'finding' | 'pinned'>('idle');
    const [gpsCoords, setGpsCoords] = useState<{ lat: number, lng: number } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const handleCapture = () => {
        fileInputRef.current?.click();
    };

    // Compress image to reduce payload size for server action
    const compressImage = (dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if too large
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

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const src = ev.target?.result as string;
                // Compress before sending to server
                const compressed = await compressImage(src);
                console.log(`📏 Image compressed: ${(src.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB`);
                processImage(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const useDemoImage = async () => {
        const demoImg = "https://placehold.co/600x400?text=Overflowing+Dumpster";
        processImage(demoImg);
    };

    const processImage = async (imgSrc: string) => {
        setImage(imgSrc);
        setAnalyzing(true);
        console.log("🖼️ Starting Image Analysis...");

        try {
            // Real ChatGPT Action
            let res = await analyzeImage(imgSrc);
            console.log("📊 ChatGPT Response:", res);

            // Fallback if API key missing or error
            if (res.error) {
                console.warn("⚠️ ChatGPT Error:", res.message);
                console.log("🔄 Falling back to simulation...");
                res = await SimulationEngine.aiAnalysis('image', imgSrc);
            }

            setAnalysis(res);

            // Auto-fill Logic: Start with Image Summary
            setDesc((prev) => {
                const imgSummary = `📸 Visual Report:\nWaste Type: ${res.wasteType}\nHazard Level: ${res.hazardLevel}\nRecommendation: ${res.recommendation}\nConfidence: ${Math.round((res.confidence || 0.98) * 100)}%`;
                return prev ? prev + "\n\n" + imgSummary : imgSummary;
            });

            setStep(2);
        } catch (e: any) {
            console.error("❌ Analysis Failed:", e);
            alert("Image analysis failed: " + (e.message || "Unknown error"));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleAudioRecord = async () => {
        if (isRecording) {
            // STOP RECORDING
            console.log("🛑 Stopping speech recognition...");
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsRecording(false);
        } else {
            // START RECORDING using Web Speech API
            console.log("🎙️ Starting speech recognition...");

            // Check if browser supports speech recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                alert("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
                return;
            }

            try {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                let finalTranscript = '';
                let interimTranscript = '';

                recognition.onstart = () => {
                    console.log("✅ Speech recognition started");
                    setIsRecording(true);
                    setTranscribing(false);
                };

                recognition.onresult = (event: any) => {
                    interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                            console.log("📝 Final transcript chunk:", transcript);
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    setAudioTranscript(finalTranscript + interimTranscript);
                };

                recognition.onerror = (event: any) => {
                    console.error("❌ Speech recognition error:", event.error);
                    if (event.error === 'no-speech') {
                        console.warn("⚠️ No speech detected, please speak clearly");
                    }
                    setIsRecording(false);
                };

                recognition.onend = () => {
                    console.log("🏁 Speech recognition ended");
                    console.log("📄 Final transcript:", finalTranscript);
                    setIsRecording(false);
                    setTranscribing(true);

                    // Add to description
                    setTimeout(() => {
                        if (finalTranscript.trim()) {
                            setDesc(prev => {
                                const label = "\n\n🎤 Voice Report:\n";
                                return prev + label + finalTranscript.trim();
                            });
                        } else {
                            setDesc(prev => {
                                const label = "\n\n🎤 Voice Report:\n";
                                return prev + label + "No speech detected. Please try again or type your report manually.";
                            });
                        }
                        setTranscribing(false);
                    }, 500);
                };

                recognitionRef.current = recognition;
                recognition.start();

                // Auto-stop after 30 seconds
                setTimeout(() => {
                    if (recognitionRef.current && isRecording) {
                        console.log("⏱️ Auto-stopping after 30s");
                        recognitionRef.current.stop();
                    }
                }, 30000);

            } catch (error: any) {
                console.error("❌ Speech recognition failed:", error);
                alert("Speech recognition failed: " + error.message);
                setIsRecording(false);
            }
        }
    };

    const handlePinLocation = () => {
        if (locationState === 'pinned') {
            setLocationState('idle');
            setGpsCoords(null);
            return;
        }

        setLocationState('finding');

        // Try to get real location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log("📍 GPS Location obtained:", coords);
                    setGpsCoords(coords);
                    setLocationState('pinned');
                },
                (error) => {
                    console.warn("⚠️ Location access denied:", error.message);
                    console.log("📍 Using simulated location");
                    // Use mock coordinates for demo
                    setGpsCoords({ lat: 40.7128, lng: -74.0060 }); // NYC coordinates as fallback
                    setLocationState('pinned');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            console.warn("⚠️ Geolocation not supported");
            setGpsCoords({ lat: 40.7128, lng: -74.0060 });
            setTimeout(() => setLocationState('pinned'), 600);
        }
    };

    const handleSubmit = () => {
        // Ensure we always send something meaningful to ChatGPT / alert engine
        const finalDesc = desc || (audioTranscript ? `🎤 Voice Report:\n${audioTranscript.trim()}` : 'Citizen reported an issue');

        onReport({
            type: analysis?.wasteType || 'Reported Issue',
            desc: finalDesc,
            analysis,
            hasAudio: !!audioTranscript,
            voiceTranscript: audioTranscript,
            hasLocation: locationState === 'pinned',
            location: gpsCoords,
            timestamp: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-4 bg-slate-950 border-b border-primary/20 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-primary" size={20} /> ChatGPT AI Citizen App
                        <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Live
                        </span>
                    </h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={onFileChange}
                            />

                            <div
                                onClick={handleCapture}
                                className="h-48 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 hover:border-primary transition-colors group relative overflow-hidden"
                            >
                                <Camera size={32} className="text-slate-500 group-hover:text-primary mb-2 relative z-10" />
                                <div className="text-slate-400 group-hover:text-white font-medium relative z-10">Capture/Upload Photo</div>
                                <div className="text-xs text-slate-600 relative z-10 text-center mt-2 px-4">
                                    Tap to upload or <span onClick={(e) => { e.stopPropagation(); useDemoImage(); }} className="underline hover:text-primary z-20 cursor-pointer">use demo image</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleAudioRecord}
                                    disabled={transcribing}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${audioTranscript ? 'bg-green-500/10 border-green-500 text-green-400' : (isRecording ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' : 'bg-slate-800 border-slate-700 hover:border-primary text-slate-300 hover:text-white')}`}
                                >
                                    {transcribing ? <Loader className="animate-spin" /> : (isRecording ? <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" /> : (audioTranscript ? <CheckCircle /> : <Mic />))}
                                    <span className="text-sm">
                                        {transcribing ? "Processing..." : (audioTranscript ? "Voice Captured" : (isRecording ? "Listening..." : "Record Voice"))}
                                    </span>
                                </button>

                                <button
                                    onClick={handlePinLocation}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${locationState === 'pinned' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 hover:border-primary text-slate-300 hover:text-white'}`}
                                >
                                    {locationState === 'finding' ? <Loader className="animate-spin" /> : (locationState === 'pinned' ? <CheckCircle /> : <MapPin />)}
                                    <span className="text-sm">
                                        {locationState === 'finding' ? "Locating..." : (locationState === 'pinned' ? "Location Pinned" : "Pin Location")}
                                    </span>
                                </button>
                            </div>

                            {/* Live Speech Transcript */}
                            {isRecording && audioTranscript && (
                                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
                                    <div className="font-bold text-blue-400 mb-1 text-xs uppercase flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        Live Transcription
                                    </div>
                                    <p className="text-white text-sm italic">{audioTranscript}</p>
                                </div>
                            )}

                            {/* Status */}
                            <div className="flex flex-col gap-2 text-[10px] text-slate-600 items-center">
                                <div className="flex gap-2">
                                    <span>{audioTranscript ? "🎤 Audio Ready" : "🎤 No Audio"}</span>
                                    <span>•</span>
                                    <span>{locationState === 'pinned' ? "📍 GPS Locked" : "📍 No GPS"}</span>
                                </div>
                                {gpsCoords && (
                                    <div className="text-green-400 text-[9px] font-mono">
                                        {gpsCoords.lat.toFixed(4)}° N, {gpsCoords.lng.toFixed(4)}° W
                                    </div>
                                )}
                            </div>

                            {/* Live Preview */}
                            {desc && (
                                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-xs text-slate-300">
                                    <p className="font-bold text-slate-500 mb-2 text-[10px] uppercase">Report Preview:</p>
                                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{desc}</pre>
                                </div>
                            )}

                            {/* Allow voice-only or quick flow without image by moving to review step */}
                            <button
                                onClick={() => setStep(2)}
                                disabled={!audioTranscript && !desc && !analysis}
                                className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border transition-colors ${(!audioTranscript && !desc && !analysis)
                                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                                    }`}
                            >
                                <Send size={14} /> Next: Review & Submit
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Optional image + AI analysis card */}
                            {image && analysis && (
                                <>
                                    <div className="relative h-40 rounded-xl overflow-hidden border border-slate-700">
                                        <img src={image} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 right-2 bg-black/80 text-green-400 text-xs px-2 py-1 rounded flex items-center gap-1">
                                            <Sparkles size={10} /> ChatGPT AI
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 p-4 rounded-lg border border-primary/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Identified Issue</div>
                                                <div className="text-white font-bold text-lg">{analysis.wasteType}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">AI Confidence</div>
                                                <div className="text-green-400 font-mono">{Math.round((analysis.confidence || 0.98) * 100)}%</div>
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-300 mt-2 bg-black/20 p-2 rounded border border-white/5">
                                            AI Recommendation: {analysis.recommendation || "Schedule pickup"}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* If no image/analysis, show a simple summary so it's not blank */}
                            {!image && !analysis && (
                                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-xs text-slate-300">
                                    <div className="font-bold text-slate-400 text-[10px] uppercase mb-1">Citizen Voice Report</div>
                                    <p className="whitespace-pre-wrap font-mono text-[11px]">
                                        {desc || audioTranscript || "No details yet. You can type a short description before submitting."}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Full Incident Report</label>
                                <textarea
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder={audioTranscript ? "Edit or add more details to your voice report..." : "Type what the problem is..."}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary h-40 resize-none font-mono leading-relaxed"
                                ></textarea>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                            >
                                <Send size={18} /> Submit Issue
                            </button>
                        </div>
                    )}
                </div>

                {analyzing && (
                    <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-50">
                        <div className="relative mb-4">
                            <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-primary animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                        </div>
                        <div className="text-white font-bold text-lg mb-1">ChatGPT AI Processing</div>
                        <div className="text-slate-400 text-sm">Analyzing image with AI vision...</div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
