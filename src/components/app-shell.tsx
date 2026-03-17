'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { UserRole } from '@/lib/types'
import { Menu } from 'lucide-react'

interface AppShellProps {
  role: UserRole
  userName: string
  children: React.ReactNode
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        <h1 className="text-lg font-bold text-[var(--primary)] ml-3">Local da FSS</h1>
      </header>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar role={role} userName={userName} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-[var(--sidebar-width)] p-4 pt-18 lg:pt-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
