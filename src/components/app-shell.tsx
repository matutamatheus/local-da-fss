'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { OnboardingTour, ONBOARDING_KEY } from './onboarding-tour'
import { UserRole } from '@/lib/types'
import { Menu, HelpCircle } from 'lucide-react'
import { ToastContainer } from '@/components/ui/toast'

interface AppShellProps {
  role: UserRole
  userName: string
  userId: string
  children: React.ReactNode
}

export function AppShell({ role, userName, userId, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY(userId))
    if (!done) setTourOpen(true)
  }, [userId])

  function openTour() {
    localStorage.removeItem(ONBOARDING_KEY(userId))
    setTourOpen(true)
  }

  function closeTour() {
    localStorage.setItem(ONBOARDING_KEY(userId), '1')
    setTourOpen(false)
  }

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--gray-200)] flex items-center px-4 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold text-[var(--primary)] ml-3 flex-1">Local da FSS</h1>
        <button
          onClick={openTour}
          className="p-2 rounded-lg text-[var(--gray-500)] hover:bg-[var(--gray-100)] hover:text-[var(--primary)] transition-colors"
          title="Abrir guia"
        >
          <HelpCircle size={20} />
        </button>
      </header>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar role={role} userName={userName} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Help button — desktop only, fixed top-right */}
      <button
        onClick={openTour}
        className="hidden lg:flex fixed top-4 right-6 z-50 items-center gap-1.5 bg-white border border-[var(--gray-200)] text-[var(--gray-500)] hover:text-[var(--primary)] hover:border-[var(--primary)] px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition-colors"
        title="Abrir guia de uso"
      >
        <HelpCircle size={14} /> Guia
      </button>

      <main className="lg:ml-[var(--sidebar-width)] p-4 pt-18 lg:pt-6 lg:p-8">
        {children}
      </main>

      <OnboardingTour open={tourOpen} onClose={closeTour} role={role} />
      <ToastContainer />
    </div>
  )
}
