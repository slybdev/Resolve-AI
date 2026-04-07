import React from 'react';
import { MessageSquare, Slack, Calendar, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export const BentoSection = () => {
  const logos = [
    { name: 'MODE', icon: <div className="w-8 h-8 bg-white text-black rounded flex items-center justify-center font-bold text-xs">M</div> },
    { name: 'INTERCOM', icon: <MessageSquare className="w-6 h-6" /> },
    { name: 'Mosaic', icon: null, className: 'italic' },
    { name: 'replicant', icon: <Zap className="w-6 h-6 fill-current" /> },
    { name: 'Canopy', icon: <Users className="w-6 h-6" /> },
  ];

  // Duplicate logos for seamless loop
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <section className="w-full py-24 px-6 bg-black text-white relative">
      {/* Top Gradient Fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-20">
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[240px]">
          
          {/* Integrations Card */}
          <div className="md:col-span-1 bg-white/5 rounded-3xl p-8 flex flex-col justify-between border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <Slack className="w-5 h-5 text-orange-400" />
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <Calendar className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">Integrations</h3>
              <p className="text-neutral-400 text-sm leading-snug">
                Seamlessly connects with your existing workflow and tools.
              </p>
            </div>
          </div>

          {/* Transcript Card (Tall) */}
          <div className="md:col-span-1 md:row-span-2 relative overflow-hidden rounded-3xl group">
            <img 
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800" 
              alt="Portrait" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-8 left-8">
              <span className="text-white/90 text-xl font-medium">Transcript</span>
            </div>
          </div>

          {/* 83% Card */}
          <div className="md:col-span-1 bg-[#D9F27E] rounded-3xl p-8 flex flex-col justify-center border border-black/5 shadow-sm">
            <span className="text-6xl font-bold tracking-tighter text-black">83%</span>
            <p className="mt-4 text-black/70 font-medium leading-tight">
              Up to 83% of conversations autonomously resolved
            </p>
          </div>

          {/* Portrait Card (Small) */}
          <div className="md:col-span-1 relative overflow-hidden rounded-3xl group">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800" 
              alt="Portrait 2" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* 5.5B Card */}
          <div className="md:col-span-1 bg-white/5 rounded-3xl p-8 flex flex-col justify-center border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <span className="text-5xl font-bold tracking-tighter">5.5B</span>
            <p className="mt-4 text-neutral-400 text-sm font-medium leading-tight">
              more efficient than human representatives
            </p>
          </div>

          {/* Automated Quality Card (Wide) */}
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/50 to-blue-950/50 rounded-3xl p-8 flex flex-col justify-between border border-white/10 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-semibold mb-2 max-w-[200px]">Automated Customer Service Quality</h3>
            </div>
            
            {/* Avatars visualization */}
            <div className="absolute right-8 bottom-8 flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-black overflow-hidden shadow-lg">
                  <img 
                    src={`https://i.pravatar.cc/150?u=${i + 10}`} 
                    alt="User" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
            
            {/* Decorative wave pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <path d="M0 100 Q 100 50 200 100 T 400 100" fill="none" stroke="white" strokeWidth="1" />
                <path d="M0 120 Q 100 70 200 120 T 400 120" fill="none" stroke="white" strokeWidth="1" />
                <path d="M0 140 Q 100 90 200 140 T 400 140" fill="none" stroke="white" strokeWidth="1" />
              </svg>
            </div>
          </div>

        </div>

        {/* Logo Cloud Banner */}
        <div className="mt-32 relative overflow-hidden py-10 border-y border-white/5">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
          
          <motion.div 
            className="flex gap-16 items-center whitespace-nowrap"
            animate={{ x: [0, -1000] }}
            transition={{ 
              duration: 30, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          >
            {duplicatedLogos.map((logo, idx) => (
              <div key={idx} className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300">
                {logo.icon}
                <span className={`text-xl font-bold tracking-tight ${logo.className || ''}`}>
                  {logo.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
