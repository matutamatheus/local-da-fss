import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const PRIMARY = '#0B3D91'
const GRAY_600 = '#4a5568'
const GRAY_400 = '#8d99a8'
const BG_LIGHT = '#F4F6F8'

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 11, color: '#2C3E50' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 3, borderBottomColor: PRIMARY, paddingBottom: 20, marginBottom: 28 },
  brandName: { fontSize: 26, fontWeight: 'bold', color: PRIMARY, fontFamily: 'Helvetica-Bold' },
  brandSub: { fontSize: 10, color: GRAY_600, marginTop: 2 },
  docTitle: { fontSize: 10, fontWeight: 'bold', color: GRAY_600, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' },
  docSubtitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginTop: 4, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, color: PRIMARY, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#dce1e8', fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 24 },
  grid2: { flexDirection: 'row', gap: 16 },
  gridCol: { flex: 1 },
  fieldLabel: { fontSize: 9, fontWeight: 'bold', color: GRAY_400, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  fieldValue: { fontSize: 12, color: '#2C3E50', marginTop: 2 },
  bulletItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
  bulletDot: { color: PRIMARY, fontWeight: 'bold', marginRight: 8, fontSize: 12, fontFamily: 'Helvetica-Bold' },
  bulletText: { fontSize: 11, color: '#374151', flex: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ebeef2', paddingVertical: 7, paddingHorizontal: 10 },
  tableLabel: { flex: 1, color: GRAY_600, fontSize: 11 },
  tableValue: { textAlign: 'right', fontSize: 11, fontWeight: 'medium' },
  totalRow: { flexDirection: 'row', backgroundColor: '#d6e4f7', paddingVertical: 10, paddingHorizontal: 10 },
  totalLabel: { flex: 1, fontSize: 14, fontWeight: 'bold', color: PRIMARY, fontFamily: 'Helvetica-Bold' },
  totalValue: { textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: PRIMARY, fontFamily: 'Helvetica-Bold' },
  regrasBlock: { backgroundColor: BG_LIGHT, borderWidth: 1, borderColor: '#dce1e8', borderRadius: 6, padding: 14 },
  regrasText: { fontSize: 9, color: '#374151', lineHeight: 1.6 },
  footer: { marginTop: 36, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#dce1e8', textAlign: 'center' },
  footerText: { fontSize: 9, color: GRAY_400 },
})

function formatDate(d: string) {
  if (!d) return '—'
  const date = new Date(d + 'T12:00:00')
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

function formatCurrency(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface PropostaPDFData {
  clienteNome: string
  clienteEmpresa: string | null
  clienteEmail: string | null
  clienteTelefone: string | null
  espacoNome: string
  dataEntrada: string
  dataSaida: string
  numParticipantes: number
  audiovisual: boolean
  valorDiaria: number | null
  valorTotal: number
  descontoAplicado: number
  descritivo: string
  regrasTexto: string
  criadoEm: string
}

export function PropostaPDF(data: PropostaPDFData) {
  const descritivo = data.descritivo
    ? data.descritivo.split('\n').map(l => l.trim()).filter(Boolean)
    : []

  const subtotal = data.descontoAplicado > 0
    ? data.valorTotal / (1 - data.descontoAplicado / 100)
    : data.valorTotal

  const dataGerada = new Date(data.criadoEm)
  const dataFormatada = `${dataGerada.getDate().toString().padStart(2, '0')}/${(dataGerada.getMonth() + 1).toString().padStart(2, '0')}/${dataGerada.getFullYear()}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>FULL SALES</Text>
            <Text style={styles.brandSub}>Locação de Espaço para Eventos</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>Documento</Text>
            <Text style={styles.docSubtitle}>PROPOSTA COMERCIAL</Text>
          </View>
        </View>

        {/* Dados do evento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Evento</Text>
          <View style={styles.grid2}>
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Espaço</Text>
              <Text style={styles.fieldValue}>{data.espacoNome}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Período</Text>
              <Text style={styles.fieldValue}>{formatDate(data.dataEntrada)} até {formatDate(data.dataSaida)}</Text>
            </View>
          </View>
          <View style={[styles.grid2, { marginTop: 12 }]}>
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Participantes</Text>
              <Text style={styles.fieldValue}>{data.numParticipantes} pessoas</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Audiovisual</Text>
              <Text style={styles.fieldValue}>{data.audiovisual ? 'Incluso' : 'Não incluso'}</Text>
            </View>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.grid2}>
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Nome</Text>
              <Text style={styles.fieldValue}>{data.clienteNome}</Text>
            </View>
            {data.clienteEmpresa && (
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Empresa</Text>
                <Text style={styles.fieldValue}>{data.clienteEmpresa}</Text>
              </View>
            )}
          </View>
          <View style={[styles.grid2, { marginTop: 12 }]}>
            {data.clienteEmail && (
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <Text style={styles.fieldValue}>{data.clienteEmail}</Text>
              </View>
            )}
            {data.clienteTelefone && (
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Telefone</Text>
                <Text style={styles.fieldValue}>{data.clienteTelefone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Descritivo */}
        {descritivo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escopo do Evento</Text>
            {descritivo.map((item, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item.replace(/^[•\-]\s*/, '')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Valores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valores</Text>
          {data.valorDiaria != null && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Valor da diária</Text>
              <Text style={styles.tableValue}>{formatCurrency(data.valorDiaria)}</Text>
            </View>
          )}
          {data.descontoAplicado > 0 && (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Subtotal</Text>
                <Text style={styles.tableValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Desconto ({data.descontoAplicado}%)</Text>
                <Text style={[styles.tableValue, { color: '#C0392B' }]}>− {formatCurrency(subtotal - data.valorTotal)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VALOR TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.valorTotal)}</Text>
          </View>
        </View>

        {/* Regras comerciais */}
        {data.regrasTexto && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Regras Comerciais</Text>
            <View style={styles.regrasBlock}>
              <Text style={styles.regrasText}>{data.regrasTexto}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Proposta gerada em {dataFormatada} · Full Sales © {new Date().getFullYear()}</Text>
        </View>
      </Page>
    </Document>
  )
}
