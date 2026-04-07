import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, LogIn } from 'lucide-react';
import { api } from '@/src/lib/api';

export const InviteAcceptPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login-required'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link — no token found.');
      return;
    }

    // Check if user is logged in (api client stores token as xentraldesk_token)
    const authToken = localStorage.getItem('xentraldesk_token');
    if (!authToken) {
      setStatus('login-required');
      setMessage('You need to log in or sign up to accept this invite.');
      return;
    }

    acceptInvite(token);
  }, [token]);

  const acceptInvite = async (inviteToken: string) => {
    try {
      const response = await api.workspaces.acceptInvite(inviteToken);
      setStatus('success');
      setWorkspaceName(response?.workspace?.name || 'the workspace');
      setMessage('You have been added to the team!');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to accept invite. It may have expired or already been used.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl shadow-2xl p-8 text-center space-y-6">
          {/* Logo */}
          <h1 className="text-xl font-black tracking-tight text-foreground">
            <span>XentralDesk</span>
          </h1>

          {status === 'loading' && (
            <div className="space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground font-bold">Accepting your invite...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">You're in! 🎉</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You've successfully joined <span className="font-bold text-foreground">{workspaceName}</span>.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Invite Failed</h2>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all"
              >
                Go to Login
              </button>
            </div>
          )}

          {status === 'login-required' && (
            <div className="space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center mx-auto">
                <LogIn className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Login Required</h2>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/login?invite_token=${token}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-2xl text-sm font-bold text-foreground hover:bg-muted/50 transition-all"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate(`/signup?invite_token=${token}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
