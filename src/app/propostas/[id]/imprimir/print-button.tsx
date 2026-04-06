'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: 'white',
        color: '#0B3D91',
        border: 'none',
        padding: '8px 20px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
      }}
    >
      Imprimir / Salvar PDF
    </button>
  )
}
