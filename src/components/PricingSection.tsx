import { ModernPricingPage, PricingCardProps } from "./ui/animated-glassy-pricing";

const pricingPlans: PricingCardProps[] = [
  { 
    planName: 'Starter', 
    description: 'Perfect for small businesses starting with AI support.', 
    price: '49', 
    features: [
      'Up to 1,000 AI responses / month',
      '1 company knowledge base',
      'Chat widget + email support',
      'Basic analytics dashboard'
    ], 
    buttonText: 'Get Started', 
    buttonVariant: 'secondary'
  },
  { 
    planName: 'Growth', 
    description: 'Scale your support with advanced AI features.', 
    price: '149', 
    features: [
      'Up to 10,000 AI responses / month',
      'Unlimited knowledge bases',
      'Chat widget + agent dashboard',
      'Advanced analytics + performance tracking',
      'Multiple agent accounts'
    ], 
    buttonText: 'Start Growth', 
    isPopular: true, 
    buttonVariant: 'primary' 
  },
  { 
    planName: 'Enterprise', 
    description: 'Custom solutions for large organizations.', 
    price: 'Custom', 
    features: [
      'Unlimited AI responses',
      'Priority support',
      'SLA & dedicated account manager',
      'Advanced integrations (API, CRM, Slack)',
      'Custom AI fine-tuning'
    ], 
    buttonText: 'Contact Sales', 
    buttonVariant: 'primary' 
  },
];

export const PricingSection = () => {
  return (
    <div id="pricing" className="w-full">
      <ModernPricingPage
        title={
          <>
            Simple, <span className="text-cyan-400">Transparent</span> Pricing
          </>
        }
        subtitle="Choose the plan that fits your business needs. All plans include our core AI engine."
        plans={pricingPlans}
        showAnimatedBackground={false} // We already have background effects in the main app
      />
    </div>
  );
};
