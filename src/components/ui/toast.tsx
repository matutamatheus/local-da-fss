'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, X, Undo2 } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  undoAction?: () => void
  createdAt: number
  duration: number
}

let addToastFn: ((toast: Omit<Toast, 'id' | 'createdAt' | 'duration'>) => void) | null = null

export function showToast(type: ToastType, message: string, undoAction?: () => void) {
  addToastFn?.({ type, message, undoAction })
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
}

const COLORS = {
  success: { bg: 'bg-[#d4efdf]', border: 'border-[#27AE60]', text: 'text-[#1e8449]', icon: '#27AE60' },
  error: { bg: 'bg-[#f5d0cc]', border: 'border-[#C0392B]', text: 'text-[#922b21]', icon: '#C0392B' },
  warning: { bg: 'bg-[#fdebd0]', border: 'border-[#F39C12]', text: 'text-[#b7770a]', icon: '#F39C12' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = ICONS[toast.type]
  const colors = COLORS[toast.type]
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const remainingRef = useRef(toast.duration)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    timerRef.current = setTimeout(() => onRemove(toast.id), remainingRef.current)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, onRemove])

  function handleMouseEnter() {
    clearTimeout(timerRef.current)
    remainingRef.current -= Date.now() - startRef.current
  }

  function handleMouseLeave() {
    startRef.current = Date.now()
    timerRef.current = setTimeout(() => onRemove(toast.id), Math.max(remainingRef.current, 1000))
  }

  return (
    <motion.div
      className={`pointer-events-auto ${colors.bg} ${colors.border} border rounded-xl px-4 py-3 shadow-lg flex items-start gap-3`}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="status"
      aria-live="polite"
    >
      <Icon size={18} color={colors.icon} className="shrink-0 mt-0.5" />
      <p className={`text-sm font-medium ${colors.text} flex-1`}>{toast.message}</p>
      {toast.undoAction && (
        <button
          onClick={() => { toast.undoAction?.(); onRemove(toast.id) }}
          className={`shrink-0 flex items-center gap-1 text-xs font-semibold ${colors.text} hover:opacity-70 transition-opacity`}
        >
          <Undo2 size={13} /> Desfazer
        </button>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-50 hover:opacity-100"
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'createdAt' | 'duration'>) => {
    const id = Math.random().toString(36).slice(2)
    const duration = toast.undoAction ? 10000 : 4000
    setToasts(prev => [...prev, { ...toast, id, createdAt: Date.now(), duration }])
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
