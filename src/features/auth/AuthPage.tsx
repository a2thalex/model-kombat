import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Mail,
  Lock,
  User,
  ArrowRight,
  Github,
  Chrome,
  Sparkles,
  Shield,
  CheckCircle,
  Brain,
  Trophy,
  Crown,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { motion } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth'

const features = [
  { icon: Brain, text: '200+ AI Models' },
  { icon: Trophy, text: 'Head-to-Head Competitions' },
  { icon: Crown, text: 'Flagship Model Access' },
  { icon: Shield, text: 'Enterprise Security' }
]

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSignup = searchParams.get('signup') === 'true'
  const [mode, setMode] = useState<'signin' | 'signup'>(isSignup ? 'signup' : 'signin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub } = useAuthStore()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        await signUpWithEmail(formData.email, formData.password)
        toast({
          title: 'Account created successfully!',
          description: 'Welcome to Model Kombat',
        })
      } else {
        await signInWithEmail(formData.email, formData.password)
        toast({
          title: 'Welcome back!',
          description: 'Successfully signed in',
        })
      }
      navigate('/ai-studio')
    } catch (error: any) {
      toast({
        title: mode === 'signup' ? 'Sign up failed' : 'Sign in failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true)
    try {
      if (provider === 'google') {
        await signInWithGoogle()
      } else {
        await signInWithGithub()
      }
      toast({
        title: 'Welcome!',
        description: `Successfully signed in with ${provider}`,
      })
      navigate('/ai-studio')
    } catch (error: any) {
      toast({
        title: 'Authentication failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div
            className="flex items-center gap-3 mb-8 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <Zap className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Model Kombat
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-gray-400">
              {mode === 'signup'
                ? 'Start comparing AI models in seconds'
                : 'Sign in to continue to your dashboard'
              }
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <Chrome className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <Github className="mr-2 h-5 w-5" />
              Continue with GitHub
            </Button>
          </div>

          <div className="relative mb-6">
            <Separator className="bg-white/10" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-3 text-sm text-gray-400">
              or
            </span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="name" className="text-gray-300">Name</Label>
                <div className="mt-1.5 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    required={mode === 'signup'}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-white/20 bg-white/5" />
                  <span className="text-gray-300">Remember me</span>
                </label>
                <a href="#" className="text-sm text-purple-400 hover:text-purple-300">
                  Forgot password?
                </a>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {mode === 'signup' && (
            <p className="mt-4 text-xs text-center text-gray-500">
              By signing up, you agree to our{' '}
              <a href="#" className="text-purple-400 hover:text-purple-300">Terms of Service</a>
              {' and '}
              <a href="#" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
            </p>
          )}
        </motion.div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div
          className="absolute inset-0 opacity-30 transition-opacity duration-300"
          style={{
            backgroundImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.15) 0%, transparent 50%)`
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * 100 + '%',
                y: Math.random() * 100 + '%'
              }}
              animate={{
                x: [null, `${Math.random() * 100}%`],
                y: [null, `${Math.random() * 100}%`],
              }}
              transition={{
                duration: 20 + Math.random() * 20,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="h-1 w-1 bg-purple-400/30 rounded-full" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg"
          >
            <Badge className="mb-4 bg-purple-900/50 text-purple-300 border-purple-500/50">
              <Sparkles className="mr-2 h-3 w-3" />
              AI Competition Platform
            </Badge>

            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Where AI Models Battle
              </span>
            </h2>

            <p className="text-lg text-gray-300 mb-8">
              Test, compare, and optimize responses from 200+ language models.
              Let the best AI win.
            </p>

            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30">
                    <feature.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-gray-300">{feature.text}</span>
                  <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                </motion.div>
              ))}
            </div>

            {/* Platform Highlight */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <Zap className="h-5 w-5 text-purple-400" />
                <span className="font-semibold text-purple-300">Get Started in Seconds</span>
              </div>
              <p className="text-gray-300 text-sm">
                No credit card required. Free tier includes 100 comparisons per month.
                Start testing AI models immediately after signup.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}