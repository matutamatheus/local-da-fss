import { Suspense } from 'react'
import RegistroForm from './registro-form'

export default function RegistroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)]">
        <p className="text-[var(--gray-500)]">Carregando...</p>
      </div>
    }>
      <RegistroForm />
    </Suspense>
  )
}
