"use client";

import { Database, Code, Bot, Headset, BarChart3 } from "lucide-react";
import RadialOrbitalTimeline from "./ui/radial-orbital-timeline";

const timelineData = [
  {
    id: 1,
    title: "Connect Knowledge",
    date: "Step 1",
    content: "Upload your company documents—PDFs, FAQs, Notion pages, or website content. Your AI learns your business instantly.",
    category: "Setup",
    icon: Database,
    relatedIds: [2],
    status: "completed" as const,
    energy: 100,
  },
  {
    id: 2,
    title: "Embed Chat",
    date: "Step 2",
    content: "Copy a tiny snippet of code to your website or app. A sleek chat widget appears for your customers.",
    category: "Integration",
    icon: Code,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 3,
    title: "AI Support",
    date: "Step 3",
    content: "When customers ask questions, the AI responds immediately using your company’s knowledge. It answers common questions and collects context.",
    category: "Automation",
    icon: Bot,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 75,
  },
  {
    id: 4,
    title: "Human Escalation",
    date: "Step 4",
    content: "If a customer needs a real person, the system creates a ticket. Agents are notified and see the full AI conversation history.",
    category: "Support",
    icon: Headset,
    relatedIds: [3, 5],
    status: "pending" as const,
    energy: 40,
  },
  {
    id: 5,
    title: "Track & Improve",
    date: "Step 5",
    content: "Get real-time dashboards showing AI vs human responses, satisfaction, and resolution times to improve efficiency.",
    category: "Analytics",
    icon: BarChart3,
    relatedIds: [4],
    status: "pending" as const,
    energy: 20,
  },
];

export function HowItWorks() {
  return (
    <section className="w-full py-24 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Five simple steps to transform your customer support with XentralDesk.
          </p>
        </div>
        
        <div className="h-[600px] w-full overflow-hidden">
          <RadialOrbitalTimeline timelineData={timelineData} />
        </div>
      </div>
      
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
    </section>
  );
}
