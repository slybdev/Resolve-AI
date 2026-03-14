'use client'

import { SplineScene } from "@/src/components/ui/splite";
import { Card } from "@/src/components/ui/card"
import { Spotlight } from "@/src/components/ui/spotlight"
 
export function SplineSceneBasic() {
  return (
    <Card className="w-full min-h-[600px] md:h-screen bg-black/[0.96] relative overflow-hidden border-none rounded-none">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex flex-col md:flex-row h-full pt-32 md:pt-0 relative overflow-hidden">
        {/* Left content */}
        <div className="flex-[1] p-8 md:p-16 relative z-20 flex flex-col justify-center">
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500 leading-tight">
            AI Support <br />
            <span className="text-white">Redefined.</span>
          </h1>
          <p className="mt-6 text-neutral-400 text-lg md:text-xl max-w-lg leading-relaxed">
            Empower your business with intelligent, 24/7 customer support. 
            Our AI agents handle complex queries with human-like empathy and 
            unmatched speed.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <button className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-all flex items-center gap-2 group">
              Get Started
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-full hover:bg-white/5 transition-all">
              Book a Demo
            </button>
          </div>
        </div>

        {/* Right content - Bot */}
        <div className="absolute inset-0 md:relative md:flex-[1.2] z-10 min-h-[400px] pointer-events-none md:pointer-events-auto">
          <div className="absolute inset-0 md:-right-[20%] opacity-50 md:opacity-100">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-30 pointer-events-none" />
    </Card>
  )
}
