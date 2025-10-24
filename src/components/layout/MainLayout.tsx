import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, signOut } from '@/services/firebase'
import { Button } from '@/components/ui/button'
import { Trophy, Settings, LogOut, Menu, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/cn'
import { useToast } from '@/hooks/use-toast'

export default function MainLayout() {
  const [user] = useAuthState(auth)
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      toast({
        title: 'Signed out successfully',
        variant: 'default',
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

  const navigation = [
    { name: 'Lazy Mode', href: '/lazy', icon: Zap },
    { name: 'Projects', href: '/projects', icon: Trophy },
    { name: 'LLM Configuration', href: '/llm-config', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Model Kombat</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex mx-6 flex-1">
            <ul className="flex space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{user.displayName || user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden ml-auto p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container py-4">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname.startsWith(item.href)
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {user && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="px-4 text-sm text-muted-foreground">
                    {user.displayName || user.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full justify-start"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  )
}