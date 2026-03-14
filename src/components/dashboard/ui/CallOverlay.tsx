import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MonitorUp, 
  Maximize2, 
  Minimize2,
  MoreVertical,
  Volume2,
  VolumeX,
  User
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  participantAvatar: string;
}

export const CallOverlay = ({ isOpen, onClose, participantName, participantAvatar }: CallOverlayProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isOpen) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl"
      >
        <div className="relative w-full max-w-5xl aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
          
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{formatDuration(callDuration)}</span>
              </div>
              <h3 className="text-sm font-medium text-white/90">Call with {participantName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 hover:bg-white/10 rounded-full text-white/70 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main View Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {/* Background / Main Video Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isVideoOn ? (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <img 
                    src="https://picsum.photos/seed/call/1280/720" 
                    className="w-full h-full object-cover opacity-80" 
                    alt="Video stream"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-8 left-8 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <span className="text-xs font-medium text-white">{participantName}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                    <img 
                      src={participantAvatar} 
                      className="w-32 h-32 rounded-full border-4 border-white/10 shadow-2xl relative z-10" 
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-1">{participantName}</h2>
                    <p className="text-sm text-white/40">Voice calling...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Self View (Picture-in-Picture) */}
            <motion.div 
              drag
              dragConstraints={{ left: -400, right: 400, top: -200, bottom: 200 }}
              className="absolute top-24 right-8 w-48 aspect-video bg-zinc-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden cursor-move group"
            >
              <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                <User className="w-8 h-8 text-white/20" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded border border-white/10">
                  <span className="text-[10px] font-medium text-white">You</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Controls */}
          <div className="p-8 flex items-center justify-center gap-4 z-10 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center gap-4 px-6 py-4 bg-zinc-800/80 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 btn-press",
                  isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button 
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 btn-press",
                  isVideoOn ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button 
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 btn-press",
                  isScreenSharing ? "bg-blue-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <MonitorUp className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 btn-press",
                  !isSpeakerOn ? "bg-zinc-700 text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <div className="w-px h-8 bg-white/10 mx-2" />

              <button 
                onClick={onClose}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-all duration-200 btn-press shadow-lg shadow-red-600/20"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
