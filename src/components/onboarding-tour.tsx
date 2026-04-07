'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { UserRole } from '@/lib/types'

interface Step {
  icon: string
  title: string
  description: string
}

const STEPS: Record<UserRole, Step[]> = {
  admin: [
    {
      icon: '👋',
      title: 'Bem-vindo ao Local da FSS!',
      description: 'Você tem acesso total ao sistema. Em poucos passos, mostramos os recursos essenciais para você aproveitar tudo.',
    },
    {
      icon: '📅',
      title: 'Calendário',
      description: 'Visualize todas as reservas num calendário interativo de 12 meses. Clique em qualquer data para ver os eventos do dia ou iniciar um agendamento diretamente.',
    },
    {
      icon: '📋',
      title: 'Bookar Data',
      description: 'Crie reservas completas: selecione o cliente, defina datas, número de participantes e audiovisual. O valor é calculado automaticamente com base nas regras de preço configuradas.',
    },
    {
      icon: '🗂️',
      title: 'Clientes & CRM',
      description: 'Cadastre clientes e acompanhe o funil comercial no Kanban. Arraste os cards entre as colunas para atualizar a etapa de cada cliente em tempo real.',
    },
    {
      icon: '📄',
      title: 'Propostas em PDF',
      description: 'Gere propostas profissionais com logo Full Sales diretamente de uma reserva. O PDF é salvo no sistema e pode ser enviado por email ao cliente com um clique.',
    },
    {
      icon: '📊',
      title: 'Relatórios',
      description: 'Acompanhe a ocupação e receita dos últimos 6 meses em Relatórios. Visualize gráficos de receita, taxa de ocupação e detalhamento mensal.',
    },
    {
      icon: '⚙️',
      title: 'Painel Administrativo',
      description: 'Aprove solicitações, gerencie usuários, configure regras de preço, bloqueie datas no calendário (manutenção) e convide novos usuários pelo menu Admin.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Use o menu lateral para navegar. O botão "?" no canto superior abre este guia novamente a qualquer momento.',
    },
  ],
  comercial: [
    {
      icon: '👋',
      title: 'Bem-vindo ao Local da FSS!',
      description: 'Você tem acesso às ferramentas comerciais. Veja como usar o sistema em poucos passos.',
    },
    {
      icon: '📅',
      title: 'Calendário — consulte disponibilidade',
      description: 'Veja 12 meses de agenda. Clique em qualquer data para ver reservas do dia ou criar uma nova. Cores indicam o status: verde = aberta, amarelo = pré-reservada, vermelho = agendada.',
    },
    {
      icon: '📋',
      title: 'Bookar Data — crie reservas',
      description: 'Siga os 4 passos: cliente → datas → detalhes → proposta. O preço é calculado automaticamente. Se houver conflito, o sistema sugere datas alternativas.',
    },
    {
      icon: '🗂️',
      title: 'Clientes & CRM — gerencie o funil',
      description: 'Cadastre clientes e arraste os cards no Kanban para acompanhar cada negociação. O perfil do cliente mostra reservas, propostas e histórico completo.',
    },
    {
      icon: '📄',
      title: 'Propostas — envie por email',
      description: 'Gere propostas em PDF com valores e regras comerciais. O PDF é salvo no sistema e pode ser enviado por email diretamente ao cliente.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Use o menu lateral para navegar. O botão "?" reabre este guia a qualquer momento. Para dúvidas sobre permissões, fale com o Admin.',
    },
  ],
  parceiro: [
    {
      icon: '👋',
      title: 'Bem-vindo ao Local da FSS!',
      description: 'Como Parceiro, você pode consultar disponibilidade, simular preços, criar pré-reservas e gerar propostas para seus clientes.',
    },
    {
      icon: '📅',
      title: 'Calendário — veja disponibilidade',
      description: 'Confira as datas disponíveis. Verde = aberta, amarelo = pré-reservada, vermelho = agendada (confirmada), cinza = bloqueada.',
    },
    {
      icon: '🧮',
      title: 'Simulador de Preço — saiba o valor',
      description: 'Use o Simulador para calcular o valor de uma reserva antes de criar. Basta informar datas e participantes — o preço é calculado automaticamente.',
    },
    {
      icon: '🔒',
      title: 'Nova Pré-reserva + Proposta',
      description: 'Crie uma pré-reserva e gere uma proposta em PDF com valores e regras comerciais. Você pode enviar a proposta por email diretamente ao cliente.',
    },
    {
      icon: '👥',
      title: 'Clientes — cadastre e acompanhe',
      description: 'Cadastre clientes, veja histórico de reservas e propostas, e acompanhe próximos eventos.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Use o menu lateral para navegar. O botão "?" reabre este guia. Para confirmar uma pré-reserva, entre em contato com a equipe comercial.',
    },
  ],
  solicitante: [
    {
      icon: '👋',
      title: 'Bem-vindo ao Local da FSS!',
      description: 'Aqui você pode solicitar o uso do espaço para eventos corporativos de forma rápida e simples.',
    },
    {
      icon: '📝',
      title: 'Nova Solicitação',
      description: 'Preencha o formulário com as datas desejadas, número de participantes e detalhes do evento. Você também pode anexar arquivos de referência.',
    },
    {
      icon: '📊',
      title: 'Acompanhar Solicitações',
      description: 'Veja o status de cada pedido em tempo real: Pendente, Aprovado ou Recusado. Caso haja recusa, o motivo sempre será informado.',
    },
    {
      icon: '📅',
      title: 'Calendário',
      description: 'Consulte a disponibilidade do espaço antes de fazer uma solicitação. Datas já ocupadas aparecem coloridas no calendário.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Clique em "Nova Solicitação" no menu para começar. Assim que sua solicitação for avaliada, você poderá acompanhar o status aqui.',
    },
  ],
}

const ROLE_COLOR: Record<UserRole, string> = {
  admin: 'var(--primary)',
  comercial: '#0ea5e9',
  parceiro: '#f97316',
  solicitante: '#10b981',
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  comercial: 'Comercial',
  parceiro: 'Parceiro',
  solicitante: 'Solicitante',
}

export const ONBOARDING_KEY = (userId: string) => `onboarding_done_${userId}`

export function OnboardingTour({
  open,
  onClose,
  role,
}: {
  open: boolean
  onClose: () => void
  role: UserRole
}) {
  const [step, setStep] = useState(0)
  const steps = STEPS[role] ?? STEPS.solicitante

  // Reset step when tour opens
  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  if (!open) return null

  const current = steps[step]
  const isLast = step === steps.length - 1
  const accentColor = ROLE_COLOR[role]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: accentColor }}
          >
            {ROLE_LABEL[role]}
          </span>
          <button
            onClick={onClose}
            className="text-[var(--gray-400)] hover:text-[var(--gray-700)] transition-colors"
            title="Pular tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            {current.icon}
          </div>

          <h2 className="text-xl font-bold text-[var(--gray-900)] mb-3 leading-tight">
            {current.title}
          </h2>
          <p className="text-[var(--gray-500)] text-sm leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  backgroundColor: i === step ? accentColor : '#e5e7eb',
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-[var(--gray-200)] rounded-xl text-sm text-[var(--gray-600)] hover:bg-[var(--gray-50)] transition-colors"
              >
                <ArrowLeft size={15} /> Anterior
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
              >
                Pular
              </button>
            )}

            <button
              onClick={isLast ? onClose : () => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              {isLast ? (
                <><Check size={15} /> Começar</>
              ) : (
                <>Próximo <ArrowRight size={15} /></>
              )}
            </button>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-[var(--gray-400)] mt-3">
            {step + 1} de {steps.length}
          </p>
        </div>
      </div>
    </div>
  )
}
