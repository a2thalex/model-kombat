import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Check,
  X,
  Zap,
  ArrowRight,
  Sparkles,
  Brain,
  Trophy,
  Shield,
  Rocket,
  Crown,
  Users,
  Building2,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { motion } from 'framer-motion'

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for trying out Model Kombat',
    icon: Sparkles,
    color: 'from-gray-600 to-gray-700',
    features: [
      { text: '100 comparisons per month', included: true },
      { text: 'Access to 50+ models', included: true },
      { text: 'Basic competition modes', included: true },
      { text: 'Community support', included: true },
      { text: 'Export results (CSV)', included: true },
      { text: 'AI Studio (5 refinements/day)', included: false },
      { text: 'Priority processing', included: false },
      { text: 'API access', included: false },
      { text: 'Custom models', included: false },
      { text: 'Team collaboration', included: false }
    ]
  },
  {
    name: 'Pro',
    price: '29',
    description: 'For professionals and small teams',
    icon: Rocket,
    color: 'from-purple-600 to-pink-600',
    popular: true,
    features: [
      { text: '5,000 comparisons per month', included: true },
      { text: 'Access to all 200+ models', included: true },
      { text: 'All competition modes', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Export results (CSV, JSON, PDF)', included: true },
      { text: 'AI Studio (Unlimited)', included: true },
      { text: 'Priority processing', included: true },
      { text: 'API access (1000 req/day)', included: true },
      { text: 'Custom models', included: false },
      { text: 'Team collaboration', included: false }
    ]
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large teams and organizations',
    icon: Building2,
    color: 'from-blue-600 to-cyan-600',
    features: [
      { text: 'Unlimited comparisons', included: true },
      { text: 'Access to all models + exclusives', included: true },
      { text: 'Custom competition modes', included: true },
      { text: 'Dedicated support team', included: true },
      { text: 'Advanced analytics & reporting', included: true },
      { text: 'AI Studio (Unlimited + Custom)', included: true },
      { text: 'Guaranteed uptime SLA', included: true },
      { text: 'Unlimited API access', included: true },
      { text: 'Custom model integration', included: true },
      { text: 'Unlimited team members', included: true }
    ]
  }
]

const faqs = [
  {
    question: 'How do comparisons work?',
    answer: 'Each comparison runs your prompt through selected AI models and displays the results side-by-side. You can then vote on the best response or use our AI judge for automated evaluation.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.'
  },
  {
    question: 'What models are included?',
    answer: 'We provide access to 200+ models from OpenAI, Anthropic, Google, Meta, Mistral, and many more providers through our OpenRouter integration.'
  },
  {
    question: 'Do you offer educational discounts?',
    answer: 'Yes! We offer 50% off for students and educators. Contact us with your .edu email to get started.'
  },
  {
    question: 'Is there an API?',
    answer: 'Pro and Enterprise plans include API access. Pro plans get 1000 requests per day, while Enterprise plans have unlimited access.'
  },
  {
    question: 'How does AI Studio work?',
    answer: 'AI Studio (formerly Lazy Mode) automatically refines your prompts by having different models critique and improve each other\'s responses iteratively.'
  }
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [isAnnual, setIsAnnual] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const getPriceDisplay = (price: string) => {
    if (price === 'Custom') return price
    const numPrice = parseInt(price)
    if (isAnnual && numPrice > 0) {
      return Math.floor(numPrice * 0.8).toString()
    }
    return price
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                <Zap className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Model Kombat
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-white hover:text-white/80"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/auth?signup=true')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <Badge className="mb-4 bg-purple-900/50 text-purple-300 border-purple-500/50">
            <Crown className="mr-2 h-3 w-3" />
            Simple, Transparent Pricing
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Choose Your Plan
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-8">
            Start free, upgrade when you're ready. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={cn(
              "text-lg",
              !isAnnual ? "text-white" : "text-gray-400"
            )}>
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-purple-600"
            />
            <span className={cn(
              "text-lg",
              isAnnual ? "text-white" : "text-gray-400"
            )}>
              Annual
              <Badge className="ml-2 bg-green-900/50 text-green-300 border-green-500/50">
                Save 20%
              </Badge>
            </span>
          </div>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative p-8 rounded-2xl backdrop-blur border",
                  plan.popular
                    ? "bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50"
                    : "bg-white/5 border-white/10"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                    <Trophy className="mr-2 h-3 w-3" />
                    Most Popular
                  </Badge>
                )}

                <div className={cn(
                  "inline-flex p-3 rounded-xl mb-4",
                  `bg-gradient-to-br ${plan.color}`
                )}>
                  <plan.icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  {plan.price === 'Custom' ? (
                    <div className="text-3xl font-bold">Custom Pricing</div>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">
                        ${getPriceDisplay(plan.price)}
                      </span>
                      <span className="text-gray-400 ml-2">
                        /{isAnnual ? 'year' : 'month'}
                      </span>
                      {isAnnual && plan.price !== '0' && (
                        <div className="text-sm text-gray-400 mt-1">
                          <s>${parseInt(plan.price) * 12}/year</s>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Button
                  className={cn(
                    "w-full mb-6",
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  )}
                  onClick={() => {
                    if (plan.price === 'Custom') {
                      window.location.href = 'mailto:sales@modelkombat.ai'
                    } else {
                      navigate(`/auth?signup=true&plan=${plan.name.toLowerCase()}`)
                    }
                  }}
                >
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-600 mt-0.5" />
                      )}
                      <span className={cn(
                        "text-sm",
                        feature.included ? "text-gray-300" : "text-gray-600"
                      )}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </span>
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
                >
                  <span className="font-semibold">{faq.question}</span>
                  <ChevronRight className={cn(
                    "h-5 w-5 transition-transform",
                    expandedFaq === i && "rotate-90"
                  )} />
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-4 text-gray-400">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">Still have questions?</p>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => window.location.href = 'mailto:support@modelkombat.ai'}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="p-12 rounded-3xl bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Compare AI Models?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Start with our free plan. No credit card required.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/auth?signup=true')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}