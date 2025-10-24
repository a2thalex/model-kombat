import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Brain,
  User,
  Crown,
  Activity,
  ChevronRight,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { useToast } from '@/hooks/use-toast'

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  description: string
  badge?: string
  badgeColor?: string
}

export default function MainLayout() {
  const { user, signOut, isAuthenticated } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      toast({
        title: 'Signed out successfully',
        description: 'Come back soon!',
      })
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: 'Error signing out',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const navigation: NavigationItem[] = [
    {
      name: 'FFA',
      href: '/ffa',
      icon: Brain,
      description: 'Free-For-All: Refine with multiple AI models'
    },
    {
      name: 'Model Config',
      href: '/llm-config',
      icon: Settings,
      description: 'Configure AI models'
    },
  ]

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
      {/* Premium Header */}
      <header className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm"
          : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/ffa" className="flex items-center space-x-3 group">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl transition-transform group-hover:scale-110">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Model Kombat
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI Competition Platform</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group',
                      isActive
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <Badge className={cn("text-xs px-1.5 py-0.5", item.badgeColor)}>
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />
                    )}
                    {/* Hover tooltip */}
                    {item.description && !isActive && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block">
                        <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {item.description}
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* User menu */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Activity Indicator */}
              <Button variant="ghost" size="sm" className="gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-xs">Active</span>
              </Button>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-black" />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-800"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
            <nav className="px-4 py-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                        isActive
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 dark:text-purple-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <Badge className={cn("text-xs", item.badgeColor)}>
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </Link>
                  )
                })}
              </div>

              {/* Mobile User Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content with fade animation */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fadeIn">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>© 2024 Model Kombat</span>
              <span>•</span>
              <span>AI Competition Platform</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                200+ Models
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3 text-yellow-500" />
                Premium
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}