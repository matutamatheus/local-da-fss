'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.target === overlayRef.current && onClose()}
        >
          {/* Backdrop blur */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal content */}
          <motion.div
            className={`relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full ${maxWidth} max-h-[85vh] sm:max-h-[90vh] flex flex-col`}
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--gray-200)]">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--gray-900)]">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[var(--gray-400)] hover:text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
