import React from 'react';
import { SplineSceneBasic } from "./SplineSceneBasic";
import { BentoSection } from "./BentoSection";
import { HowItWorks } from "./HowItWorks";
import { PricingSection } from "./PricingSection";
import { SparklesDemo } from "./SparklesDemo";
import { Testimonials } from "./ui/unique-testimonial";
import { Footer } from "./ui/footer-section";
import { NavBar } from "./ui/tube-light-navbar";
import { User, Briefcase, Bot, DollarSign, BookOpen, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/src/lib/api';

export const LandingPage = () => {
  const navItems = [
    { name: 'Product', url: '#', icon: Briefcase },
    { name: 'Pricing', url: '#pricing', icon: DollarSign },
    { name: 'About', url: '#', icon: User }
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center relative">
      {/* Header Container */}
      <div className="fixed top-0 left-0 right-0 z-[201] p-4 md:p-6 flex items-center justify-between w-full pointer-events-none">
        {/* Brand */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-lg py-2 px-3 md:px-4 rounded-full pointer-events-auto shadow-lg transition-all hover:bg-white/10 group cursor-pointer">
            <div className="flex items-center">
              <span className="text-xl font-black tracking-tighter text-white">
                XentralDesk
              </span>
            </div>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 backdrop-blur-lg py-1 px-1 rounded-full pointer-events-auto shadow-lg">
          {api.isAuthenticated() ? (
            <Link to="/dashboard" className="bg-white text-black text-xs md:text-sm font-bold px-4 md:px-6 py-2 rounded-full hover:bg-neutral-200 transition-all cursor-pointer">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-white/80 hover:text-white text-xs md:text-sm font-semibold px-3 md:px-5 py-2 transition-colors cursor-pointer">
                Login
              </Link>
              <Link to="/signup" className="bg-white text-black text-xs md:text-sm font-bold px-3 md:px-5 py-2 rounded-full hover:bg-neutral-200 transition-all cursor-pointer">
                Start Free Trial
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Navigation Bar */}
      <NavBar items={navItems} />

      {/* Main Content */}
      <div className="w-full flex-1 flex flex-col items-center">
        <SplineSceneBasic />
        <BentoSection />
        <SparklesDemo />
        <HowItWorks />
        <Testimonials />
        <PricingSection />
        <Footer />
      </div>
    </div>
  );
};
