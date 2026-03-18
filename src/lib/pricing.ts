import type { RegrasDiaria, MultiplicadorOcupacao, MultiplicadorProximidade } from './types'

export interface PricingInput {
  dataEntrada: Date
  dataSaida: Date
  numParticipantes: number
  descontoPercent?: number
}

export interface DiariaDetalhe {
  data: Date
  diaSemana: number
  nomeDia: string
  valorBase: number
  valorFinal: number
}

export interface PricingResult {
  numDiarias: number
  diariasDetalhes: DiariaDetalhe[]
  subtotal: number
  descontoValor: number
  total: number
  multOcupacaoAplicado: number
  multProximidadeAplicado: number
  multOcupacaoLabel: string
  multProximidadeLabel: string
}

export function calcularPrecificacao(
  input: PricingInput,
  regrasDiarias: RegrasDiaria[],
  multOcupacao: MultiplicadorOcupacao[],
  multProximidade: MultiplicadorProximidade[]
): PricingResult {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const entrada = new Date(input.dataEntrada)
  entrada.setHours(0, 0, 0, 0)

  const saida = new Date(input.dataSaida)
  saida.setHours(0, 0, 0, 0)

  const diasAntecedencia = Math.max(0, Math.floor((entrada.getTime() - hoje.getTime()) / 86400000))

  // Multiplicador de ocupação (baseado em participantes)
  const mOcup = [...multOcupacao].sort((a, b) => a.ordem - b.ordem).find(
    m => input.numParticipantes >= m.faixa_min && input.numParticipantes <= m.faixa_max
  )
  const multOcupVal = mOcup?.multiplicador ?? 1.0
  const multOcupLabel = mOcup ? `${mOcup.faixa_min}–${mOcup.faixa_max} pessoas` : '—'

  // Multiplicador de proximidade
  const mProx = [...multProximidade].sort((a, b) => a.ordem - b.ordem).find(m => {
    const min = m.dias_min ?? 0
    const max = m.dias_max ?? Infinity
    return diasAntecedencia >= min && diasAntecedencia <= max
  })
  const multProxVal = mProx?.multiplicador ?? 1.0
  const multProxLabel = mProx?.label ?? '—'

  // Calcular por dia (data_entrada inclusive até data_saida exclusive)
  const diariasDetalhes: DiariaDetalhe[] = []
  const cursor = new Date(entrada)

  while (cursor < saida) {
    const diaSemana = cursor.getDay()
    const regra = regrasDiarias.find(r => r.dia_semana === diaSemana)
    const valorBase = regra?.valor ?? 0
    const valorFinal = valorBase * multOcupVal * multProxVal

    diariasDetalhes.push({
      data: new Date(cursor),
      diaSemana,
      nomeDia: regra?.nome_dia ?? '',
      valorBase,
      valorFinal,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  const subtotal = diariasDetalhes.reduce((acc, d) => acc + d.valorFinal, 0)
  const descontoPercent = input.descontoPercent ?? 0
  const descontoValor = subtotal * (descontoPercent / 100)
  const total = subtotal - descontoValor

  return {
    numDiarias: diariasDetalhes.length,
    diariasDetalhes,
    subtotal,
    descontoValor,
    total,
    multOcupacaoAplicado: multOcupVal,
    multProximidadeAplicado: multProxVal,
    multOcupacaoLabel: multOcupLabel,
    multProximidadeLabel: multProxLabel,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
