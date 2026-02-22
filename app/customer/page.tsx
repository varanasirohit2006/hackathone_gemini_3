'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MapPin, Send, LogIn, ArrowLeft, Loader2, AlertTriangle, CheckCircle, Trash2, Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { analyzeImage } from '@/app/actions';

// Indian Cities
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

const CHAMPIONS = [
    { name: 'Rahul Sharma', reports: 42, impact: 850, city: 'New Delhi', rank: 1 },
    { name: 'Ananya Iyer', reports: 38, impact: 720, city: 'Bengaluru', rank: 2 },
    { name: 'Vikram Singh', reports: 35, impact: 680, city: 'Mumbai', rank: 3 },
    { name: 'Sanya Mirza', reports: 31, impact: 590, city: 'Hyderabad', rank: 4 },
    { name: 'Amit Patel', reports: 28, impact: 510, city: 'Ahmedabad', rank: 5 },
];

export default function CustomerPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginForm, setLoginForm] = useState({ name: '', phone: '', city: CITIES[0].name });
    const [user, setUser] = useState<{ name: string; phone: string; city: string } | null>(null);

    const [activeTab, setActiveTab] = useState<'report' | 'leaderboard'>('report');

    // Report State
    const [reportStep, setReportStep] = useState<'form' | 'analyzing' | 'result'>('form');
    const [reportType, setReportType] = useState('Waste Overflow');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [userPoints, setUserPoints] = useState(120);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginForm.name || !loginForm.phone) return;
        setUser(loginForm);
        setIsLoggedIn(true);
    };

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const raw = ev.target?.result as string;
                const compressed = await compressImage(raw);
                setImage(compressed);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmitReport = async () => {
        setReportStep('analyzing');

        let aiResult = null;
        if (image) {
            try {
                aiResult = await analyzeImage(image);
            } catch {
                aiResult = { wasteType: 'General Waste', hazardLevel: 'Low', recommendation: 'Dispatch standard vehicle', confidence: 0.8 };
            }
        }

        setAnalysis(aiResult);
        const city = CITIES.find(c => c.name === user?.city) || CITIES[0];

        const report = {
            id: `CIT-${Date.now()}`,
            userName: user?.name,
            phone: user?.phone,
            city: user?.city,
            type: reportType,
            description,
            location,
            coordinates: {
                lat: city.lat + (Math.random() - 0.5) * 0.02,
                lng: city.lng + (Math.random() - 0.5) * 0.02,
            },
            analysis: aiResult,
            timestamp: new Date().toLocaleTimeString(),
            status: 'pending',
        };

        setReports(prev => [report, ...prev]);
        setUserPoints(prev => prev + 50); // Points for reporting

        const existing = JSON.parse(localStorage.getItem('citizen_reports') || '[]');
        existing.push(report);
        localStorage.setItem('citizen_reports', JSON.stringify(existing));

        setReportStep('result');
        setSubmitted(true);
    };

    const resetForm = () => {
        setReportStep('form');
        setReportType('Waste Overflow');
        setDescription('');
        setLocation('');
        setImage(null);
        setAnalysis(null);
        setSubmitted(false);
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                            <Trash2 size={32} className="text-emerald-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter">CITIZEN<span className="text-emerald-500">HERO</span></h1>
                        <p className="text-slate-400 text-sm">Clean your city, earn badges, save nature.</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                            <input type="text" value={loginForm.name} onChange={e => setLoginForm({ ...loginForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white mt-1 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="John Doe" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone</label>
                            <input type="tel" value={loginForm.phone} onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white mt-1 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="+91" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Your City</label>
                            <select value={loginForm.city} onChange={e => setLoginForm({ ...loginForm, city: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white mt-1 outline-none">
                                {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                            Start Helping <Send size={18} />
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {/* Nav */}
            <header className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-md z-50 border-b border-slate-800">
                <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="font-black text-xl italic tracking-tighter">C<span className="text-emerald-500">H</span></div>
                    <div className="flex gap-4">
                        <button onClick={() => setActiveTab('report')} className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'report' ? 'text-emerald-400' : 'text-slate-500'}`}>Report</button>
                        <button onClick={() => setActiveTab('leaderboard')} className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'leaderboard' ? 'text-emerald-400' : 'text-slate-500'}`}>Champions</button>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Star size={12} className="text-emerald-400 fill-emerald-400" />
                        <span className="text-xs font-black text-emerald-400">{userPoints}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 pt-24 pb-12">
                {activeTab === 'report' ? (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 text-white shadow-xl">
                            <h2 className="text-2xl font-black italic">MAKE AN IMPACT</h2>
                            <p className="text-emerald-100 text-sm opacity-80">Spotted trash? Snap it. Our AI handles the rest.</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {reportStep === 'form' ? (
                                <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                                    <div className="relative group cursor-pointer border-2 border-dashed border-slate-700 rounded-3xl p-8 text-center hover:border-emerald-500 transition-all">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {image ? (
                                            <img src={image} className="w-full h-40 object-cover rounded-2xl" />
                                        ) : (
                                            <div className="space-y-2">
                                                <Camera size={40} className="mx-auto text-slate-600 group-hover:text-emerald-400 transition-colors" />
                                                <p className="text-sm font-bold text-slate-500">Snap the waste overflow</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-sm">
                                            <option>Waste Overflow</option>
                                            <option>Illegal Dumping</option>
                                            <option>Toxic Leakage</option>
                                            <option>Damaged Bin</option>
                                        </select>
                                        <input type="text" placeholder="Where is this? (e.g. Near Metro Gate 3)" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-sm" />
                                        <textarea placeholder="Any specific details for the AI..." value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-sm resize-none"></textarea>
                                    </div>

                                    <button onClick={handleSubmitReport} disabled={!image && !description} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                                        SUBMIT REPORT <Send size={18} />
                                    </button>
                                </motion.div>
                            ) : reportStep === 'analyzing' ? (
                                <div className="py-20 text-center animate-pulse">
                                    <Loader2 className="mx-auto mb-4 animate-spin text-emerald-400" size={48} />
                                    <h3 className="text-xl font-black italic">GEMINI AI ANALYZING...</h3>
                                    <p className="text-slate-500 text-sm">Identifying hazard levels and waste category</p>
                                </div>
                            ) : (
                                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 rounded-3xl p-6 border border-emerald-500/30 text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle size={32} className="text-emerald-400" />
                                    </div>
                                    <h3 className="text-2xl font-black">MISSION LOGGED!</h3>
                                    <div className="bg-slate-800 p-4 rounded-2xl text-left border border-slate-700">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">AI Summary</div>
                                        <div className="text-sm text-slate-300">{analysis?.recommendation || "AI has alerted the nearest truck for immediate cleanup."}</div>
                                        <div className="mt-2 flex gap-4">
                                            <div className="text-xs text-emerald-400 font-bold">TYPE: {analysis?.wasteType || 'General'}</div>
                                            <div className="text-xs text-red-400 font-bold">RISK: {analysis?.hazardLevel || 'High'}</div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-emerald-500/10 text-emerald-400 font-black text-xs rounded-xl border border-emerald-500/20">
                                        +50 IMPACT POINTS ADDED TO YOUR RANKING
                                    </div>
                                    <button onClick={resetForm} className="w-full py-3 bg-slate-800 rounded-xl font-bold text-sm">Log Another Incident</button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Recent History */}
                        <div className="space-y-3 pt-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Your Impact History</h4>
                            {reports.map((r, i) => (
                                <div key={i} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                                    <div className="flex gap-3 items-center">
                                        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400"><Trash2 size={16} /></div>
                                        <div>
                                            <div className="text-sm font-bold">{r.type}</div>
                                            <div className="text-[10px] text-slate-500">{r.timestamp} • {r.location || 'Reported Loc'}</div>
                                        </div>
                                    </div>
                                    <div className="text-emerald-400 font-black text-xs tracking-tighter">SUCCESS</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-yellow-500/10 rounded-2xl"><Trophy className="text-yellow-500" size={32} /></div>
                                <div>
                                    <h2 className="text-2xl font-black italic">CHAMPIONS</h2>
                                    <p className="text-slate-500 text-xs">Top CleanCity heroes this month</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {CHAMPIONS.map((champ, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border ${i === 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-slate-800/30 border-slate-700/50'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-400'}`}>
                                            {champ.rank}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">{champ.name}</div>
                                            <div className="text-[10px] text-slate-500">{champ.city} • {champ.reports} Reports</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-emerald-400 italic">IMPACT</div>
                                            <div className="text-sm font-black text-white">{champ.impact}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                                <div className="text-xs font-black text-emerald-400 mb-1">YOU ARE CURRENTLY RANKED #14</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Report 2 more incidents to enter Top 10</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 text-center">
                                <TrendingUp size={24} className="mx-auto text-blue-400 mb-2" />
                                <div className="text-[10px] text-slate-500 uppercase font-black">City Goal</div>
                                <div className="text-lg font-black tracking-tighter text-white">82% CLEAN</div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 text-center">
                                <Medal size={24} className="mx-auto text-emerald-400 mb-2" />
                                <div className="text-[10px] text-slate-500 uppercase font-black">Next Milestone</div>
                                <div className="text-lg font-black tracking-tighter text-white">RECYCLER III</div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Back Nav */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 px-6 py-3 rounded-full shadow-2xl">
                <a href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2">
                    <ArrowLeft size={12} /> Console
                </a>
                <div className="w-px h-4 bg-slate-800"></div>
                <a href="/driver" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Driver Mode</a>
            </div>
        </div>
    );
}
