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
      description: 'Gere propostas profissionais com logo Full Sales e regras comerciais diretamente de uma reserva, com um clique. O PDF inclui todos os valores e condições.',
    },
    {
      icon: '⚙️',
      title: 'Painel Administrativo',
      description: 'No painel Admin você aprova solicitações de espaço, gerencia usuários, configura regras de preço (diárias, multiplicadores, descontos), espacos e convida novos usuários.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Você já conhece o essencial. Use o menu lateral para navegar entre os módulos. Qualquer dúvida, acesse as configurações ou entre em contato com o suporte.',
    },
  ],
  comercial: [
    {
      icon: '👋',
      title: 'Bem-vindo ao Local da FSS!',
      description: 'Você tem acesso às ferramentas comerciais do sistema. Em poucos passos, mostramos como funciona cada módulo.',
    },
    {
      icon: '📅',
      title: 'Calendário',
      description: 'Consulte a disponibilidade do espaço e clique em qualquer data para ver os eventos do dia ou iniciar um agendamento diretamente pelo calendário.',
    },
    {
      icon: '📋',
      title: 'Bookar Data',
      description: 'Crie reservas com cálculo automático de preço: o sistema aplica diárias por dia da semana, multiplicadores de ocupação e proximidade, além de descontos configuráveis.',
    },
    {
      icon: '🗂️',
      title: 'Clientes & CRM',
      description: 'Gerencie sua carteira de clientes e acompanhe o funil comercial no Kanban. O perfil de cada cliente mostra histórico de reservas, propostas geradas e próximos eventos.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Use o menu lateral para navegar entre Calendário, Bookar Data, Clientes e CRM. Para dúvidas sobre permissões ou configurações, fale com o Admin.',
    },
  ],
  parceiro: [
    {
      icon: '👋',
      title: 'Bem-vindo ao Local da FSS!',
      description: 'Como Parceiro, você pode consultar a disponibilidade do espaço e criar pré-reservas para seus clientes.',
    },
    {
      icon: '📅',
      title: 'Calendário',
      description: 'Confira as datas disponíveis antes de fazer uma pré-reserva. Clique em qualquer data para ver os eventos agendados naquele dia.',
    },
    {
      icon: '🔒',
      title: 'Nova Pré-reserva',
      description: 'Inicie uma pré-reserva para um cliente. Ela fica com status "Pré-reservada" no calendário e deve ser confirmada pela equipe comercial para ser efetivada.',
    },
    {
      icon: '👥',
      title: 'Clientes',
      description: 'Cadastre e consulte informações dos seus clientes — dados de contato, próximos eventos e histórico.',
    },
    {
      icon: '✅',
      title: 'Pronto para começar!',
      description: 'Use o menu lateral para navegar. Para qualquer dúvida ou para confirmar uma pré-reserva, entre em contato com a equipe comercial.',
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

const STORAGE_KEY = (userId: string) => `onboarding_done_${userId}`

export function OnboardingTour({ userId, role }: { userId: string; role: UserRole }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const steps = STEPS[role] ?? STEPS.solicitante

  useEffect(() => {
    if (typeof window === 'undefined') return
    const done = localStorage.getItem(STORAGE_KEY(userId))
    if (!done) setVisible(true)
  }, [userId])

  function finish() {
    localStorage.setItem(STORAGE_KEY(userId), '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = steps[step]
  const isLast = step === steps.length - 1
  const accentColor = ROLE_COLOR[role]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={finish} />

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
            onClick={finish}
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
                onClick={finish}
                className="px-4 py-2.5 text-sm text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
              >
                Pular
              </button>
            )}

            <button
              onClick={isLast ? finish : () => setStep(s => s + 1)}
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
