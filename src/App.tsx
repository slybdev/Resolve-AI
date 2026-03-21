/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { Spinner } from './components/ui/ios-spinner';

// Lazy load components
const LandingPage = lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SignUp = lazy(() => import('./components/auth/SignUp').then(module => ({ default: module.SignUp })));
const Login = lazy(() => import('./components/auth/Login').then(module => ({ default: module.Login })));
const PricingPage = lazy(() => import('./components/auth/PricingPage').then(module => ({ default: module.PricingPage })));
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })));

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-black">
    <Spinner size="lg" />
  </div>
);


export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </ToastProvider>

  );
}
