import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, CheckCircle2, Plus, Minus } from 'lucide-react';

const ImpactCard = ({ name, role, avatar, color }: { name: string, role: string, avatar: string, color: string }) => (
  <div className={`w-full ${color} rounded-3xl p-4 md:p-6 flex items-center justify-between border border-white/10 shadow-lg group hover:scale-[1.01] transition-transform duration-300`}>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-white/20">
        <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div>
        <h4 className="text-black font-bold text-lg md:text-xl">{name}</h4>
        <p className="text-black/60 text-sm md:text-base font-medium">{role}</p>
      </div>
    </div>
    <button className="bg-black text-white px-4 py-2 md:px-6 md:py-3 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors">
      View Case Study
      <span className="hidden md:inline">→</span>
    </button>
  </div>
);

const StatCard = ({ value, label, sublabel }: { value: string, label: string, sublabel: string }) => (
  <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-8 rounded-3xl flex flex-col justify-center hover:bg-white/10 transition-colors">
    <span className="text-5xl font-bold tracking-tighter text-white mb-2">{value}</span>
    <p className="text-neutral-300 font-semibold text-lg leading-tight">{label}</p>
    <p className="text-neutral-500 text-sm mt-2">{sublabel}</p>
  </div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-xl font-medium text-white group-hover:text-neutral-300 transition-colors">{question}</span>
        <div className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180 bg-white text-black' : 'text-white'}`}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-neutral-400 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FeaturesSection = () => {
  return (
    <div className="w-full bg-black text-white pb-24">
      <div className="max-w-7xl mx-auto px-6 space-y-24">
        
        {/* Impact Section */}
        <section className="py-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Drive Transformative <br /> Impact with AI
            </h2>
          </div>
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <ImpactCard 
              name="Allison Herwitz" 
              role="Product Manager" 
              avatar="https://i.pravatar.cc/150?u=allison" 
              color="bg-[#E5D5F2]/90" 
            />
            <ImpactCard 
              name="Corey Ekstrom" 
              role="Product Manager" 
              avatar="https://i.pravatar.cc/150?u=corey" 
              color="bg-[#FDF2B3]/90" 
            />
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-8 bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2 flex flex-col justify-center lg:pr-12">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                Unleash the power of AI to turn your innovative <span className="text-neutral-500">concepts into game-changing solutions!</span>
              </h2>
            </div>
            <StatCard value="42%" label="lower average handle time" sublabel="Efficiency boost across all channels" />
            <StatCard value="60k" label="monthly labor hours saved" sublabel="Automated repetitive tasks" />
            <StatCard value="5x" label="increase in support capacity" sublabel="Scale without adding headcount" />
            <StatCard value="80%" label="CSAT score" sublabel="Customer satisfaction maintained" />
          </div>
        </section>

        {/* Feature Split Section */}
        <section className="py-16 px-8 bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8">
                Transitioning your customer support to a fresh platform is effortless.
              </h2>
              <p className="text-neutral-400 text-lg mb-10">
                Discover a seamless journey with our intuitive software and committed support team, completely free of charge!
              </p>
              <ul className="space-y-6">
                {[
                  { title: 'Free Migration', desc: 'Improve lead management to prioritize promising opportunities and include Free Migration services.' },
                  { title: 'Transparent Pricing', desc: 'Boost your efficiency with automated follow-ups that enhance engagement and offer transparent pricing.' },
                  { title: 'Personalized Support', desc: 'Create customized lead nurturing workflows to ensure supportive and engaging interactions.' }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="mt-1">
                      <CheckCircle2 className="w-6 h-6 text-[#D9F27E]" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                      <p className="text-neutral-500">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000" 
                  alt="Team working" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Floating UI element */}
              <div className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-md p-6 rounded-[1.5rem] shadow-2xl hidden md:block max-w-xs border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">AI</div>
                  <span className="text-black font-bold">Sales Pipeline</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black w-[80%]" />
                  </div>
                  <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black w-[60%]" />
                  </div>
                  <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black w-[40%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-8 bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">FAQ's</h2>
            <p className="text-neutral-500">Everything you need to know about our AI support platform.</p>
          </div>
          <div className="space-y-2">
            <FAQItem 
              question="Do I need to know how to code?" 
              answer="No, our platform is designed to be completely no-code. You can set up your AI agents, integrate with your tools, and customize your workflows using our intuitive visual builder." 
            />
            <FAQItem 
              question="How long does migration take?" 
              answer="Most migrations are completed within 24-48 hours. Our dedicated team handles the heavy lifting, ensuring your data and workflows are transitioned smoothly without any downtime." 
            />
            <FAQItem 
              question="Can I use it with my custom domain?" 
              answer="Yes, you can easily connect your custom domain to our platform. We provide full SSL support and global CDN delivery for your support portal." 
            />
            <FAQItem 
              question="What kind of support do you offer?" 
              answer="We offer 24/7 priority support to all our customers. Whether you need help with setup, integration, or optimizing your AI agents, our team is always here to help." 
            />
          </div>
        </section>
      </div>
    </div>
  );
};
