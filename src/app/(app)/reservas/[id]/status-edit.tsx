'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Edit2 } from 'lucide-react'
import { RESERVA_STATUS_HEX, RESERVA_STATUS_LABEL } from '@/lib/status-colors'

const statusOptions = ['aberta', 'pre_reservada', 'agendada', 'cancelada']

export default function ReservaStatusEdit({
  reservaId,
  currentStatus,
}: {
  reservaId: string
  currentStatus: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function changeStatus(newStatus: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('reservas').update({ status: newStatus }).eq('id', reservaId)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)] transition-colors"
      >
        <Edit2 size={15} /> Alterar Status
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-[var(--gray-200)] rounded-lg shadow-lg z-10 overflow-hidden min-w-[160px]">
          {statusOptions.filter(s => s !== currentStatus).map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={loading}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--gray-50)] transition-colors flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RESERVA_STATUS_HEX[s] }} />
              {RESERVA_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
