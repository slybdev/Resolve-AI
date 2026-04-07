import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  User, 
  Check,
  Shield,
  Star,
  Users,
  Lock
} from 'lucide-react';
import { api } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { useToast } from '@/src/components/ui/Toast';

interface Member {
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar?: string;
  };
  role: string;
}

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId: string;
  teamId?: string | null;
  currentAssigneeId?: string | null;
  onAssigned: (user: any) => void;
}

export const AssignMemberModal = ({ 
  isOpen, 
  onClose, 
  workspaceId, 
  conversationId,
  teamId,
  currentAssigneeId,
  onAssigned 
}: AssignMemberModalProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchCurrentUser();
    }
  }, [isOpen]);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.auth.getMe();
      setCurrentUserId(user.id);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const data = await api.team.members(workspaceId, teamId || undefined);
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      toast("Error", "Failed to load team members", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    try {
      setIsAssigning(userId);
      await api.conversations.update(conversationId, { assigned_to: userId });
      
      const member = members.find(m => m.user.id === userId);
      onAssigned(member?.user);
      
      toast(
        "Assignment Updated", 
        `Conversation assigned to ${member?.user.full_name}`, 
        "success"
      );
      onClose();
    } catch (err: any) {
      toast("Assignment Failed", err.message || "Something went wrong", "error");
    } finally {
      setIsAssigning(null);
    }
  };

  const filteredMembers = members.filter(m => 
    m.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl shadow-primary/10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Assign Member</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-70">Transfer Ownership</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search team members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              {/* Members List */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Spinner size="lg" />
                    <p className="text-xs text-muted-foreground animate-pulse font-bold uppercase tracking-widest">Loading Team...</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">No members found</p>
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isMe = member.user.id === currentUserId;
                    
                    return (
                      <button
                        key={member.user.id}
                        onClick={() => handleAssign(member.user.id)}
                        disabled={!!isAssigning || isMe}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all group active:scale-[0.98]",
                          currentAssigneeId === member.user.id 
                            ? "bg-primary/5 border-primary/20 pointer-events-none" 
                            : isMe
                              ? "opacity-50 grayscale cursor-not-allowed border-border/30 bg-accent/5"
                              : "bg-accent/20 border-border/50 hover:bg-accent hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                              {member.user.avatar ? (
                                <img src={member.user.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                member.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                              )}
                            </div>
                            {currentAssigneeId === member.user.id && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center ring-2 ring-card">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              {member.user.full_name}
                              {member.role === 'admin' && <Shield className="w-3 h-3 text-orange-500" />}
                              {isMe && (
                                <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted/20 px-1.5 py-0.5 rounded ml-1 border border-border/50">You</span>
                              )}
                            </h4>
                            <p className="text-[10px] text-muted-foreground font-medium">{member.user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAssigning === member.user.id ? (
                            <Spinner size="sm" />
                          ) : currentAssigneeId === member.user.id ? (
                            <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md">Assigned</span>
                          ) : isMe ? (
                            <div className="p-2 rounded-xl bg-accent/10 border border-border/30">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-card border border-border group-hover:border-primary/50 group-hover:text-primary transition-all">
                              <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-accent/10 border-t border-border flex items-center justify-center">
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Star className="w-3 h-3 text-primary" />
                Assignment will be logged in the timeline
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
