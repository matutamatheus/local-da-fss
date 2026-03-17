'use client'

import { Sidebar } from './sidebar'
import { UserRole } from '@/lib/types'

interface AppShellProps {
  role: UserRole
  userName: string
  children: React.ReactNode
}

export function AppShell({ role, userName, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar role={role} userName={userName} />
      <main className="ml-[var(--sidebar-width)] p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
