import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, User, Github, Chrome, Eye, EyeOff, Check, X, Zap } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

export const SignUp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  
  const [formData, setFormData] = React.useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const passwordStrength = React.useMemo(() => {
    const password = formData.password;
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    return strength;
  }, [formData.password]);

  const strengthColor = [
    'bg-neutral-800',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500'
  ][passwordStrength];

  const strengthText = [
    'Empty',
    'Weak',
    'Fair',
    'Good',
    'Strong'
  ][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (passwordStrength < 2 || formData.password.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      setError('Password must be at least 8 characters and contain a special character.');
      setIsLoading(false);
      return;
    }

    try {
      await api.auth.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName
      });
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="bg-neutral-900/50 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 mx-auto shadow-sm">
                <div className="w-5 h-5 rounded-md bg-primary/20" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Create your account</h1>
            {selectedPlan ? (
              <div className="mt-2 flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  Selected Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                </span>
              </div>
            ) : (
              <p className="text-neutral-400 text-xs mt-1">Start your 14-day free trial today.</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-11 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Strength Meter */}
              <div className="px-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 h-1 flex-1 mr-4">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step}
                        className={cn(
                          "h-full flex-1 rounded-full transition-all duration-500",
                          step <= passwordStrength ? strengthColor : "bg-neutral-800"
                        )}
                      />
                    ))}
                  </div>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", strengthColor.replace('bg-', 'text-'))}>
                    {strengthText}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1">
                  <div className="flex items-center gap-1.5">
                    {formData.password.length >= 8 ? <Check className="w-2.5 h-2.5 text-green-500" /> : <X className="w-2.5 h-2.5 text-neutral-600" />}
                    <span className="text-[9px] text-neutral-500">Min. 8 chars</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? <Check className="w-2.5 h-2.5 text-green-500" /> : <X className="w-2.5 h-2.5 text-neutral-600" />}
                    <span className="text-[9px] text-neutral-500">Special char</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || formData.password.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoading && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" />}
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-neutral-900/50 px-2 text-neutral-500 font-medium tracking-widest">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-2 text-xs font-semibold text-white hover:bg-white/10 transition-all active:scale-[0.98]">
              <Chrome className="w-3.5 h-3.5" />
              Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-2 text-xs font-semibold text-white hover:bg-white/10 transition-all active:scale-[0.98]">
              <Github className="w-3.5 h-3.5" />
              Microsoft
            </button>
          </div>

          <p className="text-center text-neutral-500 text-[10px] mt-6 leading-relaxed">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-neutral-300 hover:underline">Terms</a> and{' '}
            <a href="#" className="text-neutral-300 hover:underline">Privacy</a>.
          </p>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-neutral-400 text-xs text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-bold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
