'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X, Send, CheckCircle } from 'lucide-react'
import { submitFeedback } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import type { FeedbackType } from '@/lib/types'

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug',        label: 'Bug'         },
  { value: 'suggestion', label: 'Suggestion'  },
  { value: 'content',    label: 'Contenu'     },
  { value: 'other',      label: 'Autre'       },
]

const HIDDEN_PATHS = ['/', '/login', '/signup']

export function FeedbackWidget() {
  const pathname = usePathname()
  const [open, setOpen]             = useState(false)
  const [type, setType]             = useState<FeedbackType>('suggestion')
  const [message, setMessage]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)

  if (HIDDEN_PATHS.includes(pathname)) return null

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await submitFeedback({
        reporter_id: user?.id ?? null,
        page_url: pathname,
        type,
        message: message.trim(),
        platform: 'web',
      })
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setMessage('')
        setType('suggestion')
      }, 2000)
    } catch {
      // silently ignore
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Donner mon avis"
        style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 9000,
          width: 48, height: 48, borderRadius: 24,
          background: open ? '#09090b' : '#0F766E',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
          transition: 'background 0.15s',
        }}
      >
        {open
          ? <X size={20} color="white" strokeWidth={2.5} />
          : <MessageSquare size={20} color="white" strokeWidth={2} />
        }
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 140, right: 24, zIndex: 8999,
          width: 320, background: 'white',
          borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          border: '1px solid #e4e4e7', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#0F766E,#0c4a43)',
            padding: '16px 18px', color: 'white',
          }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>Donner mon avis</div>
            <div style={{ fontSize: 12, color: 'rgba(167,243,208,0.8)', marginTop: 2 }}>
              Aide-nous à améliorer MEDIQ
            </div>
          </div>

          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {done ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 0' }}>
                <CheckCircle size={36} color="#16a34a" strokeWidth={1.5} />
                <div style={{ fontWeight: 900, fontSize: 15, color: '#09090b' }}>Merci pour ton retour !</div>
              </div>
            ) : (
              <>
                {/* Type chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FEEDBACK_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      style={{
                        padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700,
                        background: type === t.value ? '#0F766E' : '#f4f4f5',
                        color: type === t.value ? 'white' : '#71717a',
                        fontFamily: 'inherit',
                        transition: 'background 0.1s, color 0.1s',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Décris ton problème ou ta suggestion…"
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px', borderRadius: 12,
                    border: '1px solid #e4e4e7', background: '#f9fafb',
                    fontSize: 13, color: '#09090b', resize: 'none',
                    outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />

                {/* Page hint */}
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Page : <span style={{ color: '#71717a', fontWeight: 700 }}>{pathname}</span>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                    background: message.trim() && !submitting ? '#0F766E' : '#d4d4d8',
                    color: 'white', fontWeight: 900, fontSize: 14, cursor: message.trim() && !submitting ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'inherit',
                  }}
                >
                  <Send size={15} color="white" strokeWidth={2} />
                  {submitting ? 'Envoi…' : 'Envoyer'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
