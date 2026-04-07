"use client";

import React, { useState, useEffect } from "react";
import { Zap, Shield, Cpu, Sparkles } from "lucide-react";

const steps = [
  {
    id: "01",
    title: "Knowledge Base",
    status: "+ KB 1.0",
    description: "AI ingests your documents, FAQs, and website data.",
    cards: [
      { type: "Processed", label: "PDF Document", val: "24.5 MB", pos: "top-[-20%] right-[-10%]", color: "white" },
      { type: "Indexed", label: "Knowledge Nodes", val: "1,240 Sites", pos: "bottom-[-10%] left-[-5%]", color: "cyan" },
      { type: "Analyzed", label: "Vector Space", val: "99.8% Sync", pos: "top-[20%] left-[-20%]", color: "white" },
    ],
  },
  {
    id: "02",
    title: "Live Deployment",
    status: "+ LIVE 2.0",
    description: "Launch your custom AI agent on your website instantly.",
    cards: [
      { type: "Active", label: "Chat Widget", val: "Live", pos: "top-[-10%] right-[0%]", color: "cyan" },
      { type: "Synced", label: "Auto-Flow", val: "Enabled", pos: "bottom-[0%] left-[10%]", color: "white" },
      { type: "Secure", label: "Encryption", val: "AES-256", pos: "top-[30%] left-[-15%]", color: "cyan" },
    ],
  },
  {
    id: "03",
    title: "Smart Support",
    status: "+ AI 3.0",
    description: "AI resolves 80%+ of inquiries without human help.",
    cards: [
      { type: "Resolved", label: "User Query", val: "Success", pos: "top-[-20%] right-[-10%]", color: "white" },
      { type: "Escalated", label: "Agent Handover", val: "To Human", pos: "bottom-[-10%] left-[-5%]", color: "cyan" },
      { type: "Learning", label: "RLHF Model", val: "Optimized", pos: "top-[20%] left-[-20%]", color: "white" },
    ],
  },
];

export function ProcessSystem() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="w-full py-40 bg-black relative overflow-hidden flex flex-col items-center">
      
      {/* Header Area - Bold & High Impact */}
      <div className="text-center mb-32 relative z-20">
        <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter mb-4">
          XentralDesk Logic
        </h2>
        <p className="text-white/40 max-w-2xl mx-auto text-lg lowercase tracking-tight">
          Exploratory mission with ResolveAI & navigating through the vast possibilities
        </p>
        <div className="mt-10">
            <button className="bg-white/10 border border-white/20 backdrop-blur-md text-white px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all cursor-pointer">
                How it works?
            </button>
        </div>
      </div>

      <div className="max-w-7xl w-full px-6 grid grid-cols-1 md:grid-cols-2 gap-24 items-center relative z-10">
        
        {/* Left Side: Staggered Activity System (Option 1 Design) */}
        <div className="relative h-[450px] flex items-center justify-center">
          
          {/* Stretched Horizontal Oval */}
          <div className="absolute w-[120%] h-[80%] border border-white/5 rounded-[100%] rotate-3 scale-110 pointer-events-none" />
          <div className="absolute w-[100%] h-[70%] border border-white/10 rounded-[100%] rotate-[-2deg] pointer-events-none" />
          
          {/* Large Center Status Text */}
          <div className="relative text-center animate-in fade-in duration-1000 key={activeStep}">
             <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-2">System Status</p>
             <h3 className="text-6xl md:text-8xl font-black text-white/90 tracking-tighter">
                {steps[activeStep].status}
             </h3>
          </div>

          {/* Staggered Cards with Connector Lines */}
          <div className="absolute inset-0">
             {steps[activeStep].cards.map((card, idx) => (
                <div 
                  key={idx}
                  className={`absolute ${card.pos} z-30 transition-all duration-1000 ease-in-out cursor-default transform hover:scale-105`}
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                   {/* Connection Line (SVG) */}
                   <svg className="absolute top-1/2 left-1/2 w-[300px] h-[300px] pointer-events-none -translate-x-1/2 -translate-y-1/2 overflow-visible" opacity="0.1">
                      <line 
                        x1="50%" y1="50%" x2={idx === 0 ? "150%" : idx === 1 ? "-50%" : "-80%"} y2={idx === 0 ? "-80%" : idx === 1 ? "150%" : "20%"} 
                        stroke="white" strokeWidth="0.5" strokeDasharray="4 4"
                      />
                   </svg>

                   <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl min-w-[200px]">
                      <div className="flex items-center justify-between gap-12 text-[9px] uppercase tracking-widest font-medium">
                         <span className={card.color === 'cyan' ? 'text-cyan-400' : 'text-neutral-500'}>{card.type}</span>
                         <span className="text-white opacity-80">{card.val}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${card.color === 'cyan' ? 'bg-cyan-500 shadow-[0_0_8px_cyan]' : 'bg-white/80 shadow-[0_0_8px_white]'}`} />
                         <p className="text-white font-bold tracking-tight">{card.label}</p>
                      </div>
                   </div>
                </div>
             ))}
          </div>

          {/* Pending / Done Labels with Leader Lines */}
          <div className="absolute bottom-[-10%] left-[10%] flex flex-col items-center gap-2">
             <div className="w-[0.5px] h-24 bg-gradient-to-b from-white/20 to-transparent" />
             <span className="text-white/30 text-[8px] font-bold uppercase tracking-[0.3em] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">Pending</span>
          </div>
          <div className="absolute top-[0%] right-[20%] flex flex-col items-center gap-2">
             <span className="text-white/60 text-[8px] font-bold uppercase tracking-[0.3em] bg-white/10 px-4 py-1.5 rounded-full border border-white/10">Done</span>
             <div className="w-[0.5px] h-20 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          </div>
        </div>

        {/* Right Side: High-Detail Segmented Gauge (Option 1 Design) */}
        <div className="relative flex items-center justify-center">
          
          <div className="w-80 h-80 rounded-full flex items-center justify-center relative">
             
             {/* Outer Faint Rings Cluster */}
             <div className="absolute inset-[-40px] border border-white/[0.03] rounded-full scale-110" />
             <div className="absolute inset-[-20px] border border-white/[0.05] rounded-full" />
             
             {/* Main Background Disc */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#111,transparent)] rounded-full border border-white/10" />

             {/* Rotating Segmented Ring */}
             <div className="absolute inset-[15%] border-[1px] border-transparent border-t-white/40 border-r-white/10 rounded-full animate-[spin_12s_linear_infinite]" />
             
             {/* The "DeFi Step" Core */}
             <div className="w-48 h-48 rounded-full bg-black/90 border border-white/20 shadow-[0_0_60px_-15px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center relative z-10">
                <Zap className="w-6 h-6 text-white mb-2 animate-pulse" />
                <span className="text-white font-black text-2xl tracking-tighter">Step {steps[activeStep].id}</span>
                <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mt-1 opacity-60">
                   {steps[activeStep].title}
                </p>

                {/* Progress Highlight Segment (Image 1 style) */}
                <div className="absolute inset-[-4px] border-r-4 border-white rounded-full z-20 pointer-events-none transition-all duration-700" 
                     style={{ transform: `rotate(${activeStep * 120}deg)` }} />
             </div>

             {/* Peripheral Tech Labels */}
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40 uppercase tracking-[0.2em] text-[8px] text-white">
                <span>AU - 98</span>
                <div className="w-[30px] h-[0.5px] bg-white/50" />
             </div>
             <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 flex flex-col items-start gap-1 opacity-20 uppercase tracking-tighter text-[8px] font-medium text-white max-w-[60px]">
                <span>Target 2024</span>
                <div className="w-full h-[0.5px] bg-white/20" />
                <span>Resolv API</span>
             </div>
          </div>

          {/* Large blurred cyan/white glow for depth */}
          <div className="absolute w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none" />
        </div>

      </div>

      {/* Bottom Pillars/Badges (Final design matches Option 1) */}
      <div className="mt-40 max-w-6xl w-full px-6 flex flex-wrap justify-center gap-3 relative z-10">
         {[
           { label: "2.7k Assets", icon: Sparkles },
           { label: "Success", icon: Shield },
           { label: "Autonomous", icon: Cpu },
           { label: "Enterprise", icon: Zap }
         ].map((badge, i) => (
           <div 
             key={i} 
             className={`flex items-center gap-4 px-8 py-3 rounded-xl border transition-all duration-700 ${i === activeStep ? 'bg-white border-white text-black' : 'bg-[#0c0c0c] border-white/5 text-white/50 hover:border-white/20'}`}
           >
              <badge.icon className={`w-3.5 h-3.5 ${i === activeStep ? 'text-black' : 'text-neutral-600'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{badge.label}</span>
           </div>
         ))}
      </div>

    </section>
  );
}
