import React, { useState } from 'react';
import { Cpu, Sliders, Zap, ShieldCheck, AlertCircle, Save, RefreshCw, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const AISettings = ({ workspaceId }: { workspaceId: string }) => {
  const [model, setModel] = useState('gemini-3.1-pro-preview');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [confidence, setConfidence] = useState(0.8);

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-4xl w-full mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Settings</h1>
            <p className="text-muted-foreground">Configuration panel for AI model and behavior.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-xl text-sm font-bold hover:bg-accent transition-colors">
              <RefreshCw className="w-4 h-4" />
              Reset Defaults
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors">
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-foreground">Model Selection</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Best for complex reasoning and coding tasks.' },
              { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fastest response time, best for simple Q&A.' },
              { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Balanced performance and speed.' },
              { id: 'custom-model', name: 'Custom Fine-tuned', description: 'Use your own fine-tuned model.', disabled: true }
            ].map((m) => (
              <div 
                key={m.id}
                onClick={() => !m.disabled && setModel(m.id)}
                className={cn(
                  "p-6 rounded-3xl border transition-all cursor-pointer",
                  model === m.id ? "bg-blue-500/10 border-blue-500/50" : "bg-card border-border hover:border-primary/50",
                  m.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-foreground">{m.name}</h3>
                  {model === m.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-foreground">Model Parameters</h2>
          </div>

          <div className="grid gap-6">
            <div className="bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Temperature</h3>
                  <p className="text-xs text-muted-foreground">Controls randomness: Lower is more deterministic, higher is more creative.</p>
                </div>
                <span className="text-lg font-mono font-bold text-purple-500">{temperature}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={temperature} 
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Max Output Tokens</h3>
                  <p className="text-xs text-muted-foreground">Maximum length of the AI response.</p>
                </div>
                <span className="text-lg font-mono font-bold text-purple-500">{maxTokens}</span>
              </div>
              <input 
                type="range" 
                min="256" 
                max="4096" 
                step="256"
                value={maxTokens} 
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Agent Controls */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-foreground">Agent Controls</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-6 rounded-3xl space-y-6 shadow-sm">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tone of Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Professional', 'Friendly', 'Concise', 'Empathetic'].map((tone) => (
                    <button 
                      key={tone}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                        tone === 'Friendly' ? "bg-blue-500/10 border-blue-500/50 text-blue-600" : "bg-muted border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Response Length</label>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-muted-foreground">Short</span>
                  <input type="range" className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <span className="text-[10px] text-muted-foreground">Long</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-3xl space-y-6 shadow-sm">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Escalation Behavior</label>
              <div className="space-y-4">
                {[
                  { label: "Escalate on low confidence", icon: ShieldCheck },
                  { label: "Escalate on user request", icon: MessageSquare },
                  { label: "Escalate on negative sentiment", icon: AlertCircle }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Escalation Triggers */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-foreground">Confidence & Escalation</h2>
          </div>

          <div className="bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Confidence Threshold</h3>
                <p className="text-xs text-muted-foreground">Escalate to human if AI confidence is below this level.</p>
              </div>
              <span className="text-lg font-mono font-bold text-green-600">{confidence * 100}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={confidence} 
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Escalate on user request", icon: Zap, active: true },
              { label: "Escalate on negative sentiment", icon: AlertCircle, active: true },
              { label: "Escalate on long wait time", icon: Zap, active: false },
              { label: "Escalate on complex topics", icon: AlertCircle, active: false }
            ].map((trigger, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-3xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                    <trigger.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{trigger.label}</h3>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={trigger.active} />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
