import React from 'react';
import { motion } from 'framer-motion';
import { Check, Bot, Zap, Shield, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: '$49',
    description: 'Perfect for small teams starting with AI.',
    features: ['1,000 AI messages/mo', '2 Team members', 'Basic analytics', 'Website widget'],
    color: 'border-white/10',
    button: 'Start 14-day Free Trial'
  },
  {
    name: 'Pro',
    price: '$129',
    description: 'Advanced features for growing businesses.',
    features: ['10,000 AI messages/mo', '10 Team members', 'Advanced analytics', 'Custom branding', 'Priority support'],
    color: 'border-primary shadow-lg shadow-primary/20',
    popular: true,
    button: 'Get Started'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Scale without limits and full control.',
    features: ['Unlimited messages', 'Unlimited members', 'Custom AI training', 'SLA & Dedicated support', 'API Access'],
    color: 'border-white/10',
    button: 'Contact Sales'
  }
];

export const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 z-10"
      >
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-6">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Simple Pricing</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Choose the right plan for your team</h1>
        <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
          Start with a 14-day free trial. No credit card required.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl z-10">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-neutral-900/50 backdrop-blur-xl border rounded-3xl p-8 flex flex-col ${plan.color}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-neutral-500 text-sm">/mo</span>}
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">{plan.description}</p>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              {plan.features.map(feature => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="bg-primary/10 p-1 rounded-full">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-neutral-300">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate(`/signup?plan=${plan.name.toLowerCase()}`)}
              className={`w-full py-3 rounded-xl font-bold transition-all active:scale-[0.98] ${
                plan.popular 
                  ? 'bg-primary text-primary-foreground hover:opacity-90' 
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              {plan.button}
            </button>
          </motion.div>
        ))}
      </div>

      <p className="mt-12 text-neutral-500 text-sm z-10">
        All plans include 256-bit SSL encryption and 99.9% uptime guarantee.
      </p>
    </div>
  );
};
