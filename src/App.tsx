/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { SignUp } from './components/auth/SignUp';
import { PricingPage } from './components/auth/PricingPage';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { ToastProvider } from './components/ui/Toast';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </ToastProvider>
  );
}
