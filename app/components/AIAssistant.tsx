'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, X, Sparkles, Play, Trash, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import { analyzeOperations } from '@/app/actions';

import { Vehicle, Alert, SimulationEngine } from '@/app/lib/simulation';

interface AIAssistantProps {
    vehicles: Vehicle[];
    alerts: Alert[];
    onAction: (action: string, data?: any) => void;
}

export default function AIAssistant({ vehicles, alerts, onAction }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, actions?: any[] }[]>([
        { role: 'ai', text: 'Hello Commander. I am your AI Operations Assistant. How can I help optimize the district today?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg = query;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery('');
        setIsTyping(true);

        // Real ChatGPT Integration
        const context = {
            vehicleCount: vehicles.length,
            activeAlerts: alerts.length,
            criticalAlerts: alerts.filter(a => a.severity === 'critical').length
        };

        const res = await analyzeOperations(userMsg, context);

        setMessages(prev => [...prev, {
            role: 'ai',
            text: res.text,
            actions: res.suggestedActions
        }]);
        setIsTyping(false);
    };

    const executeAction = (actionType: string, target: string) => {
        onAction(actionType, target);
        setMessages(prev => [...prev, { role: 'ai', text: `Executing: ${actionType}...` }]);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-24 right-6 w-96 h-[500px] glass-panel rounded-xl border border-primary/30 z-[999] flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-primary/20 bg-primary/10 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <Bot size={20} /> AI MAYOR ASSISTANT
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "")}>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        msg.role === 'ai' ? "bg-primary/20 text-primary" : "bg-slate-700 text-white"
                                    )}>
                                        {msg.role === 'ai' ? <Bot size={14} /> : <div className="text-xs">You</div>}
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-xl text-sm max-w-[80%]",
                                        msg.role === 'ai' ? "bg-slate-800/80 text-slate-200" : "bg-primary text-white"
                                    )}>
                                        {msg.text}

                                        {/* Action Proposals */}
                                        {msg.actions && msg.actions.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {msg.actions.map((action: any, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => executeAction(action.type, action.target)}
                                                        className="w-full flex items-center gap-2 p-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs text-white transition-colors"
                                                    >
                                                        {action.type === 'ADD_TRUCK' && <Plus size={14} className="text-green-400" />}
                                                        {action.type === 'REMOVE_TRUCK' && <Trash size={14} className="text-red-400" />}
                                                        {action.type === 'REROUTE' && <Play size={14} className="text-blue-400" />}
                                                        <span>{action.type}: {action.target}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                        <Bot size={14} />
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-800/80 flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-slate-700 bg-black/20 flex gap-2">
                            <input
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                placeholder="Ask anything about ops..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                className="p-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Send size={18} />
                            </button>
                            <button className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white border border-slate-700">
                                <Mic size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-purple-600 shadow-[0_0_20px_rgba(0,100,255,0.5)] flex items-center justify-center text-white z-[990] hover:scale-110 transition-transform group"
                >
                    <Sparkles className="animate-pulse" />
                    <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                        Ask AI Assistant
                    </span>
                </motion.button>
            )}
        </>
    );
}
