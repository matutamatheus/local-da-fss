'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  ClipboardList,
  FilePlus,
  Home,
  LogOut,
  MapPin,
  Users,
  Link2,
  Image,
  X,
} from 'lucide-react'
import { UserRole } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  role: UserRole
  userName: string
  open: boolean
  onClose: () => void
}

const solicitanteLinks = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/solicitacoes/nova', label: 'Nova Solicitação', icon: FilePlus },
  { href: '/solicitacoes', label: 'Minhas Solicitações', icon: ClipboardList },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/especificacoes', label: 'Especificações', icon: Image },
]

const adminLinks = [
  { href: '/admin', label: 'Painel Admin', icon: Home },
  { href: '/admin/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { href: '/admin/calendario', label: 'Calendário', icon: Calendar },
  { href: '/admin/espacos', label: 'Espaços', icon: MapPin },
  { href: '/admin/convites', label: 'Convites', icon: Link2 },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/especificacoes', label: 'Especificações', icon: Image },
]

export function Sidebar({ role, userName, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const links = role === 'admin' ? adminLinks : solicitanteLinks

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick() {
    onClose()
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-[var(--sidebar-width)] bg-white border-r border-[var(--gray-200)] flex flex-col z-50 transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="px-6 py-5 border-b border-[var(--gray-200)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--primary)]">Local da FSS</h1>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">Gerenciamento de Eventos</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-[var(--gray-400)] hover:text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && link.href !== '/admin' && pathname.startsWith(link.href))
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]'
                  }`}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-[var(--gray-200)]">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-[var(--gray-900)] truncate">{userName}</p>
          <p className="text-xs text-[var(--gray-500)] capitalize">{role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:text-[var(--danger)] transition-colors w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
