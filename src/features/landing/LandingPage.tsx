import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  Brain,
  Trophy,
  
  
  Globe,
  
  CheckCircle,
  PlayCircle,
  ChevronRight,
  Github,
  Twitter,
  Linkedin,
  MessageSquare,
  
  Layers,
  Target,
  Flame,
  Rocket,
  Crown,
  Award,
  
  
  CloudLightning,
  Gauge,
  Bot,
  
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { motion } from 'framer-motion'

const stats = [
  { label: 'AI Models', value: '200+', icon: Bot },
  { label: 'Competition Modes', value: '3', icon: Trophy },
  { label: 'Model Providers', value: '15+', icon: Layers },
  { label: 'Response Time', value: '<2s', icon: CloudLightning }
]

const features = [
  {
    icon: Brain,
    title: 'AI Studio',
    description: 'Iteratively refine answers with multiple AI models for superior results',
    gradient: 'from-purple-600 to-pink-600'
  },
  {
    icon: Trophy,
    title: '3-Phase Competitions',
    description: 'Adversarial refinement, competitive generation, and anonymous judging',
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    icon: Crown,
    title: 'Flagship Models',
    description: 'Auto-detection of premium models from OpenAI, Anthropic, Google, and more',
    gradient: 'from-orange-600 to-red-600'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption and data isolation',
    gradient: 'from-green-600 to-emerald-600'
  },
  {
    icon: Gauge,
    title: 'Real-time Analytics',
    description: 'Track performance, quality scores, and improvement metrics',
    gradient: 'from-indigo-600 to-purple-600'
  },
  {
    icon: Globe,
    title: 'Global Infrastructure',
    description: 'Low latency access with distributed edge computing',
    gradient: 'from-slate-600 to-zinc-600'
  }
]

const useCases = [
  {
    title: 'Content Creation',
    description: 'Compare models to find the best one for your creative writing, marketing copy, or technical documentation needs.',
    icon: '✍️'
  },
  {
    title: 'Code Generation',
    description: 'Test which AI produces the cleanest, most efficient code for your specific programming tasks and languages.',
    icon: '💻'
  },
  {
    title: 'Data Analysis',
    description: 'Identify the most accurate model for data interpretation, statistical analysis, and insight generation.',
    icon: '📊'
  }
]

const providers = [
  { name: 'OpenAI', icon: Brain, color: 'text-green-500' },
  { name: 'Anthropic', icon: Shield, color: 'text-orange-500' },
  { name: 'Google', icon: Target, color: 'text-blue-500' },
  { name: 'Meta', icon: Layers, color: 'text-purple-500' },
  { name: 'Mistral', icon: Flame, color: 'text-red-500' },
  { name: 'xAI', icon: Rocket, color: 'text-gray-500' }
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.15) 0%, transparent 50%)`
          }}
        />
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            >
              <div className="h-1 w-1 bg-white/20 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Premium Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                <Zap className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Model Kombat
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#use-cases" className="text-gray-300 hover:text-white transition">Use Cases</a>
              <a href="/pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
              <a href="https://github.com/modelkombat" className="text-gray-300 hover:text-white transition">Docs</a>
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
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto text-center"
        >
          <Badge className="mb-4 bg-purple-900/50 text-purple-300 border-purple-500/50">
            <Sparkles className="mr-2 h-3 w-3" />
            Powered by 200+ AI Models
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Where AI Models
            </span>
            <br />
            <span className="text-white">
              Compete for Excellence
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            The ultimate platform for AI model comparison, refinement, and competition.
            Test, compare, and optimize responses from the world's leading language models.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate('/auth?signup=true')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6"
              onClick={() => window.open('https://github.com/yourusername/model-kombat', '_blank')}
            >
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
          </div>

          {/* Provider Logos */}
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-60">
            {providers.map((provider) => (
              <motion.div
                key={provider.name}
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-2"
              >
                <provider.icon className={cn("h-6 w-6", provider.color)} />
                <span className="text-sm text-gray-400">{provider.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronRight className="h-8 w-8 rotate-90 text-gray-400" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 border-y border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <stat.icon className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Enterprise-Grade Features
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Everything you need to evaluate and optimize AI models at scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur border border-white/10 hover:border-purple-500/50 transition-all"
              >
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  `bg-gradient-to-br ${feature.gradient}`
                )} style={{ filter: 'blur(40px)' }} />

                <div className="relative">
                  <div className={cn(
                    "inline-flex p-3 rounded-xl mb-4",
                    `bg-gradient-to-br ${feature.gradient}`
                  )}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Studio Showcase */}
      <section className="py-32 px-6 bg-gradient-to-b from-purple-900/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <Badge className="mb-4 bg-purple-900/50 text-purple-300 border-purple-500/50">
                <Award className="mr-2 h-3 w-3" />
                Most Popular Feature
              </Badge>
              <h2 className="text-4xl font-bold mb-6">
                AI Studio
                <span className="block text-2xl text-gray-400 mt-2">
                  Automated Refinement Engine
                </span>
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Our flagship feature that automatically refines answers through multiple AI models,
                delivering superior results through iterative improvement.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-semibold">Automatic Refinement</div>
                    <div className="text-gray-400 text-sm">Each model improves upon the previous answer</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-semibold">Prompt Enhancement</div>
                    <div className="text-gray-400 text-sm">AI-powered optimization of your questions</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-semibold">Quality Scoring</div>
                    <div className="text-gray-400 text-sm">Track improvement with real-time metrics</div>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => navigate('/ai-studio')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Try AI Studio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 blur-3xl" />
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 backdrop-blur">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-green-500" />
                      <div className="flex-1 h-2 bg-green-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" />
                      </div>
                      <span className="text-sm text-green-500">GPT-4</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-orange-500" />
                      <div className="flex-1 h-2 bg-orange-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-5/6 bg-gradient-to-r from-orange-500 to-red-500 animate-pulse" />
                      </div>
                      <span className="text-sm text-orange-500">Claude</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-blue-500" />
                      <div className="flex-1 h-2 bg-blue-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-11/12 bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse" />
                      </div>
                      <span className="text-sm text-blue-500">Gemini</span>
                    </div>
                  </div>
                  <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-purple-300">Quality Score</span>
                      <span className="text-2xl font-bold text-purple-400">96%</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      3 rounds completed • 2.4s average • Best answer selected
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Perfect For Every Use Case
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Discover how Model Kombat can optimize your AI workflows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur border border-white/10 hover:border-purple-500/50 transition-all"
              >
                <div className="text-5xl mb-6">{useCase.icon}</div>
                <h3 className="text-2xl font-semibold mb-4">{useCase.title}</h3>
                <p className="text-gray-300">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative p-16 rounded-3xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur border border-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-3xl blur-xl" />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Transform Your AI Workflow?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Start your free trial today. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/auth?signup=true')}
                  className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-6"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6"
                  onClick={() => navigate('/pricing')}
                >
                  View Pricing
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="font-bold">Model Kombat</span>
              </div>
              <p className="text-sm text-gray-400">
                The ultimate platform for AI model competition and refinement.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Features</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Pricing</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Documentation</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">API Reference</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-gray-400 hover:text-white">About</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Blog</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Careers</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Contact</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Privacy</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Terms</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Security</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white">Compliance</a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-gray-400">
              © 2024 Model Kombat. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="https://github.com" className="text-gray-400 hover:text-white">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" className="text-gray-400 hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" className="text-gray-400 hover:text-white">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://discord.com" className="text-gray-400 hover:text-white">
                <MessageSquare className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}