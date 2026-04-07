'use client'

import React from 'react';
import { Card } from "@/src/components/ui/card"
import { Spotlight } from "@/src/components/ui/spotlight"
 
export function LightweightHero() {
  return (
    <Card className="w-full min-h-[700px] md:h-screen bg-black relative overflow-hidden border-none rounded-none flex items-center justify-center">
      {/* Background soft glow - Right side */}
      <div className="absolute top-0 right-0 w-full md:w-[60%] h-full bg-[radial-gradient(circle_at_70%_50%,rgba(100,149,237,0.1),transparent_70%)] pointer-events-none z-0" />
      
      {/* Falling Light Beams (Streaks) */}
      <div className="absolute inset-0 z-1 pointer-events-none opacity-20">
        <div className="absolute left-[20%] top-[-20%] w-[1px] h-[40%] bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-[falling_4s_linear_infinite]" />
        <div className="absolute left-[40%] top-[-20%] w-[1px] h-[40%] bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-[falling_6s_linear_infinite_1s]" />
        <div className="absolute left-[60%] top-[-20%] w-[1px] h-[40%] bg-gradient-to-b from-transparent via-indigo-400 to-transparent animate-[falling_5s_linear_infinite_2s]" />
        <div className="absolute left-[80%] top-[-20%] w-[1px] h-[40%] bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-[falling_7s_linear_infinite_0.5s]" />
      </div>

      <style jsx>{`
        @keyframes falling {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(5px); }
        }
      `}</style>

      {/* Spotlight for depth */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      {/* Content Container */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-5xl">
        
        {/* Top Badge (Cyber Spark) */}
        <div className="mb-8 flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full animate-pulse">
           <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]" />
           <span className="text-[10px] md:text-xs font-medium text-white/70 uppercase tracking-widest leading-none">
             Unlock your AI Spark
           </span>
        </div>

        {/* Main Header */}
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-white leading-[0.9] mb-6">
          AI Support <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-400 to-neutral-600">Redefined.</span>
        </h1>

        {/* Subtext */}
        <p className="text-neutral-400 text-lg md:text-xl max-w-2xl leading-relaxed mb-12">
          Empower your business with intelligent, 24/7 customer support. 
          Our AI agents handle complex queries with human-like empathy and 
          unmatched speed.
        </p>

        {/* Buttons (Maintained as requested) */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button 
            onClick={() => window.location.href = '/signup'}
            className="px-10 py-4 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-all flex items-center gap-2 group cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Start Free Trial
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <button className="px-10 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-full hover:bg-white/10 backdrop-blur-sm transition-all">
            Book a Demo
          </button>
        </div>
      </div>

      {/* Floating Tech Nodes (Aelf, Cortex, etc. style) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
         
         {/* Top Left Node (Neural Node) */}
         <div className="absolute left-[10%] top-[25%] animate-[float_8s_ease-in-out_infinite]">
            <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                <div className="absolute left-4 top-[-10px] flex flex-col">
                   <span className="text-white text-[11px] font-bold tracking-widest uppercase">Neural</span>
                   <span className="text-neutral-500 text-[9px]">01 // Active</span>
                </div>
                <svg className="absolute left-1 top-1 w-32 h-32 overflow-visible" opacity="0.2">
                   <path d="M 0 0 L -60 -40" stroke="white" strokeWidth="0.5" fill="none" />
                </svg>
            </div>
         </div>

         {/* Bottom Left Node (Cortex Node) */}
         <div className="absolute left-[15%] bottom-[20%] animate-[float_10s_ease-in-out_infinite_reverse]">
            <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_15px_cyan]" />
                <div className="absolute left-4 top-[-10px] flex flex-col">
                   <span className="text-white text-[11px] font-bold tracking-widest uppercase opacity-80">Cortex</span>
                   <span className="text-neutral-500 text-[9px]">20.945</span>
                </div>
                <svg className="absolute left-1 top-1 w-32 h-32 overflow-visible" opacity="0.2">
                   <path d="M 0 0 L -80 40" stroke="cyan" strokeWidth="0.5" fill="none" />
                </svg>
            </div>
         </div>

         {/* Top Right Node (Quant Hub) */}
         <div className="absolute right-[15%] top-[20%] animate-[float_9s_ease-in-out_infinite_1s]">
            <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-white/50 shadow-[0_0_10px_white]" />
                <div className="absolute right-4 top-[-10px] flex flex-col items-end">
                   <span className="text-white text-[11px] font-bold tracking-widest uppercase">Quant</span>
                   <span className="text-neutral-500 text-[9px]">2.945</span>
                </div>
                <svg className="absolute right-1 top-1 w-32 h-32 overflow-visible rotate-180" opacity="0.2">
                   <path d="M 0 0 L -100 -50" stroke="white" strokeWidth="0.5" fill="none" />
                </svg>
            </div>
         </div>

         {/* Bottom Right Node (Meeton Hub) */}
         <div className="absolute right-[10%] bottom-[25%] animate-[float_11s_ease-in-out_infinite_0.5s_reverse]">
            <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full border border-cyan-400/50 shadow-[0_0_5px_cyan]" />
                <div className="absolute right-4 top-[-10px] flex flex-col items-end">
                   <span className="text-white text-[11px] font-bold tracking-widest uppercase opacity-60">Meeton</span>
                   <span className="text-neutral-500 text-[9px]">440.0</span>
                </div>
                <svg className="absolute right-1 top-1 w-32 h-32 overflow-visible rotate-180" opacity="0.2">
                   <path d="M 0 0 L -120 60" stroke="cyan" strokeWidth="0.5" fill="none" />
                </svg>
            </div>
         </div>

      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent z-30 pointer-events-none" />
    </Card>
  )
}
