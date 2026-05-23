'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminReports, updateReportStatus, checkIsAdmin, getAdminFeedback, updateFeedbackStatus } from '@/lib/queries'
import { Flag, CheckCircle, Clock, XCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink, MessageSquare } from 'lucide-react'
import type { AdminReport, ReportStatus, AdminFeedback, FeedbackStatus } from '@/lib/types'

// ── Shared config ─────────────────────────────────────────────────────────────

type StatusCfg = { label: string; color: string; bg: string; Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }

const STATUS_CONFIG: Record<string, StatusCfg> = {
  open:        { label: 'Ouvert',   color: '#c2410c', bg: '#fff7ed', Icon: AlertCircle },
  in_progress: { label: 'En cours', color: '#b45309', bg: '#fffbeb', Icon: Clock        },
  resolved:    { label: 'Résolu',   color: '#166534', bg: '#f0fdf4', Icon: CheckCircle  },
  dismissed:   { label: 'Rejeté',   color: '#71717a', bg: '#f4f4f5', Icon: XCircle      },
}

const FILTER_TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'Tous'     },
  { value: 'open',        label: 'Ouverts'  },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved',    label: 'Résolus'  },
  { value: 'dismissed',   label: 'Rejetés'  },
]

const REPORT_REASON_LABELS: Record<string, string> = {
  wrong_answer:     'Réponse incorrecte',
  bad_translation:  'Mauvaise traduction',
  unclear_question: 'Question ambiguë',
  wrong_options:    'Options incorrectes',
  wrong_difficulty: 'Difficulté erronée',
  other:            'Autre',
}

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug:        'Bug',
  suggestion: 'Suggestion',
  content:    'Contenu',
  other:      'Autre',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const router = useRouter()
  const [tab, setTab]               = useState<'reports' | 'feedback'>('reports')
  const [reports, setReports]       = useState<AdminReport[]>([])
  const [feedbacks, setFeedbacks]   = useState<AdminFeedback[]>([])
  const [loading, setLoading]       = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [filter, setFilter]         = useState<ReportStatus | 'all'>('all')
  const [fbFilter, setFbFilter]     = useState<FeedbackStatus | 'all'>('all')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [editNote, setEditNote]     = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const ok = await checkIsAdmin()
      if (!ok) { setUnauthorized(true); setLoading(false); return }
      try {
        const [rData, fData] = await Promise.all([getAdminReports(), getAdminFeedback()])
        setReports(rData)
        setFeedbacks(fData)
        const notes: Record<string, string> = {}
        for (const r of rData) notes[r.id] = r.admin_note ?? ''
        for (const f of fData) notes[f.id] = f.admin_note ?? ''
        setEditNote(notes)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleReportStatus(id: string, status: ReportStatus) {
    setSaving(id)
    try {
      await updateReportStatus(id, status, editNote[id] || undefined)
      setReports(prev => prev.map(r => r.id === id ? { ...r, status, admin_note: editNote[id] || r.admin_note } : r))
    } finally { setSaving(null) }
  }

  async function handleReportNote(id: string) {
    setSaving(id + '_note')
    try {
      await updateReportStatus(id, reports.find(r => r.id === id)!.status, editNote[id])
      setReports(prev => prev.map(r => r.id === id ? { ...r, admin_note: editNote[id] } : r))
    } finally { setSaving(null) }
  }

  async function handleFeedbackStatus(id: string, status: FeedbackStatus) {
    setSaving(id)
    try {
      await updateFeedbackStatus(id, status, editNote[id] || undefined)
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status, admin_note: editNote[id] || f.admin_note } : f))
    } finally { setSaving(null) }
  }

  async function handleFeedbackNote(id: string) {
    setSaving(id + '_note')
    try {
      await updateFeedbackStatus(id, feedbacks.find(f => f.id === id)!.status, editNote[id])
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, admin_note: editNote[id] } : f))
    } finally { setSaving(null) }
  }

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter)
  const filteredFb      = fbFilter === 'all' ? feedbacks : feedbacks.filter(f => f.status === fbFilter)

  const rCounts = {
    open:        reports.filter(r => r.status === 'open').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved:    reports.filter(r => r.status === 'resolved').length,
    dismissed:   reports.filter(r => r.status === 'dismissed').length,
  }
  const fCounts = {
    open:        feedbacks.filter(f => f.status === 'open').length,
    in_progress: feedbacks.filter(f => f.status === 'in_progress').length,
    resolved:    feedbacks.filter(f => f.status === 'resolved').length,
    dismissed:   feedbacks.filter(f => f.status === 'dismissed').length,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#71717a' }}>
      Chargement…
    </div>
  )

  if (unauthorized) return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Flag size={48} color="#e4e4e7" strokeWidth={1.5} />
      <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b' }}>Accès refusé</div>
      <div style={{ fontSize: 14, color: '#71717a' }}>Vous n'avez pas les droits administrateur.</div>
      <button
        onClick={() => router.push('/dashboard')}
        style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: '#0F766E', color: 'white', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Retour au tableau de bord
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8' }}>
      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e4e7',
        padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, fontSize: 18, color: '#09090b' }}>
          <Flag size={20} color="#0F766E" strokeWidth={2} />
          Dashboard Admin
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '7px 16px', borderRadius: 10, border: '1px solid #e4e4e7',
            background: 'white', fontWeight: 700, fontSize: 13, color: '#71717a',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Application
        </button>
      </div>

      {/* Header gradient with tabs */}
      <div style={{ background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)', padding: '28px 32px', color: 'white' }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
          {([
            { key: 'open'        as const, label: 'Ouverts',  color: '#fed7aa' },
            { key: 'in_progress' as const, label: 'En cours', color: '#fde68a' },
            { key: 'resolved'    as const, label: 'Résolus',  color: '#bbf7d0' },
            { key: 'dismissed'   as const, label: 'Rejetés',  color: '#e4e4e7' },
          ]).map(s => {
            const count = tab === 'reports' ? rCounts[s.key] : fCounts[s.key]
            return (
              <div key={s.key} style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 14,
                padding: '14px 20px', minWidth: 90, backdropFilter: 'blur(8px)',
              }}>
                <div style={{ fontWeight: 900, fontSize: 26 }}>{count}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { setTab('reports'); setExpanded(null) }}
            style={{
              padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 900, fontSize: 13,
              background: tab === 'reports' ? 'white' : 'rgba(255,255,255,0.15)',
              color: tab === 'reports' ? '#0F766E' : 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
            }}
          >
            <Flag size={14} color={tab === 'reports' ? '#0F766E' : 'rgba(255,255,255,0.85)'} strokeWidth={2} />
            Signalements Quiz
            {rCounts.open > 0 && (
              <span style={{
                background: tab === 'reports' ? '#fee2e2' : 'rgba(255,255,255,0.25)',
                color: tab === 'reports' ? '#dc2626' : 'white',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 900,
              }}>{rCounts.open}</span>
            )}
          </button>
          <button
            onClick={() => { setTab('feedback'); setExpanded(null) }}
            style={{
              padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 900, fontSize: 13,
              background: tab === 'feedback' ? 'white' : 'rgba(255,255,255,0.15)',
              color: tab === 'feedback' ? '#0F766E' : 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
            }}
          >
            <MessageSquare size={14} color={tab === 'feedback' ? '#0F766E' : 'rgba(255,255,255,0.85)'} strokeWidth={2} />
            Retours Utilisateurs
            {fCounts.open > 0 && (
              <span style={{
                background: tab === 'feedback' ? '#fee2e2' : 'rgba(255,255,255,0.25)',
                color: tab === 'feedback' ? '#dc2626' : 'white',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 900,
              }}>{fCounts.open}</span>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {tab === 'reports' ? (
          <ReportsTab
            reports={filteredReports}
            allReports={reports}
            filter={filter}
            setFilter={setFilter}
            expanded={expanded}
            setExpanded={setExpanded}
            editNote={editNote}
            setEditNote={setEditNote}
            saving={saving}
            onStatusChange={handleReportStatus}
            onSaveNote={handleReportNote}
            counts={rCounts}
          />
        ) : (
          <FeedbackTab
            feedbacks={filteredFb}
            allFeedbacks={feedbacks}
            filter={fbFilter}
            setFilter={setFbFilter}
            expanded={expanded}
            setExpanded={setExpanded}
            editNote={editNote}
            setEditNote={setEditNote}
            saving={saving}
            onStatusChange={handleFeedbackStatus}
            onSaveNote={handleFeedbackNote}
            counts={fCounts}
          />
        )}
      </div>
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab({
  reports, allReports, filter, setFilter, expanded, setExpanded,
  editNote, setEditNote, saving, onStatusChange, onSaveNote, counts,
}: {
  reports: AdminReport[]
  allReports: AdminReport[]
  filter: ReportStatus | 'all'
  setFilter: (f: ReportStatus | 'all') => void
  expanded: string | null
  setExpanded: (id: string | null) => void
  editNote: Record<string, string>
  setEditNote: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  saving: string | null
  onStatusChange: (id: string, status: ReportStatus) => void
  onSaveNote: (id: string) => void
  counts: Record<string, number>
}) {
  return (
    <>
      <FilterBar filter={filter} setFilter={setFilter} counts={counts} />
      {reports.length === 0 ? (
        <EmptyState icon={<Flag size={40} color="#d4d4d8" strokeWidth={1.5} />} label="Aucun signalement" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => {
            const isOpen = expanded === r.id
            const sc = STATUS_CONFIG[r.status]
            const StatusIcon = sc.Icon
            return (
              <div key={r.id} style={{
                background: 'white', borderRadius: 18,
                border: `1px solid ${r.status === 'open' ? '#fed7aa' : '#e4e4e7'}`,
                boxShadow: r.status === 'open' ? '0 2px 12px rgba(234,88,12,0.08)' : '0 1px 6px rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 99,
                    background: sc.bg, color: sc.color,
                    fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 2,
                  }}>
                    <StatusIcon size={12} color={sc.color} strokeWidth={2.5} />
                    {sc.label}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontWeight: 900, fontSize: 12,
                        background: '#f0f9ff', color: '#0891b2',
                        border: '1px solid #bae6fd', borderRadius: 8,
                        padding: '2px 9px',
                      }}>
                        {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                      </span>
                      <span style={{ fontSize: 12, color: '#71717a' }}>
                        {r.module_name} — Cas #{r.case_number}
                        {r.quiz_step != null && ` — Q${r.quiz_step}`}
                        {r.quiz_theme && ` (${r.quiz_theme})`}
                      </span>
                    </div>
                    {r.quiz_question && (
                      <div style={{ fontSize: 13, color: '#09090b', fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.quiz_question}
                      </div>
                    )}
                    {r.details && (
                      <div style={{ fontSize: 12, color: '#71717a', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{r.details}"
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {r.reporter_email} · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {r.status === 'open' && (
                      <button onClick={e => { e.stopPropagation(); onStatusChange(r.id, 'in_progress') }} disabled={saving === r.id}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Prendre en charge
                      </button>
                    )}
                    {(r.status === 'open' || r.status === 'in_progress') && (
                      <button onClick={e => { e.stopPropagation(); onStatusChange(r.id, 'resolved') }} disabled={saving === r.id}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Résoudre
                      </button>
                    )}
                    {isOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f4f4f5' }}>
                    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {r.quiz_question && (
                        <DetailBlock label="QUESTION">
                          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#09090b', fontWeight: 700, lineHeight: 1.5 }}>
                            {r.quiz_question}
                          </div>
                        </DetailBlock>
                      )}
                      {r.details && (
                        <DetailBlock label="DÉTAILS DU SIGNALEMENT">
                          <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#78350f', fontStyle: 'italic', lineHeight: 1.5 }}>
                            "{r.details}"
                          </div>
                        </DetailBlock>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <LinkButton href={`/case/${r.case_id}`} label="Voir le cas" />
                        <LinkButton href={`/quiz/${r.case_id}`} label="Aller au quiz" />
                      </div>
                      <AdminNoteBlock
                        value={editNote[r.id] ?? ''}
                        onChange={v => setEditNote(prev => ({ ...prev, [r.id]: v }))}
                        onSave={() => onSaveNote(r.id)}
                        saving={saving === r.id + '_note'}
                      />
                      <StatusActions
                        currentStatus={r.status as ReportStatus}
                        saving={saving === r.id}
                        onChange={s => onStatusChange(r.id, s as ReportStatus)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────

function FeedbackTab({
  feedbacks, allFeedbacks, filter, setFilter, expanded, setExpanded,
  editNote, setEditNote, saving, onStatusChange, onSaveNote, counts,
}: {
  feedbacks: AdminFeedback[]
  allFeedbacks: AdminFeedback[]
  filter: FeedbackStatus | 'all'
  setFilter: (f: FeedbackStatus | 'all') => void
  expanded: string | null
  setExpanded: (id: string | null) => void
  editNote: Record<string, string>
  setEditNote: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  saving: string | null
  onStatusChange: (id: string, status: FeedbackStatus) => void
  onSaveNote: (id: string) => void
  counts: Record<string, number>
}) {
  return (
    <>
      <FilterBar filter={filter} setFilter={setFilter} counts={counts} />
      {feedbacks.length === 0 ? (
        <EmptyState icon={<MessageSquare size={40} color="#d4d4d8" strokeWidth={1.5} />} label="Aucun retour utilisateur" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feedbacks.map(f => {
            const isOpen = expanded === f.id
            const sc = STATUS_CONFIG[f.status]
            const StatusIcon = sc.Icon
            return (
              <div key={f.id} style={{
                background: 'white', borderRadius: 18,
                border: `1px solid ${f.status === 'open' ? '#c7d2fe' : '#e4e4e7'}`,
                boxShadow: f.status === 'open' ? '0 2px 12px rgba(99,102,241,0.08)' : '0 1px 6px rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : f.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 99,
                    background: sc.bg, color: sc.color,
                    fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 2,
                  }}>
                    <StatusIcon size={12} color={sc.color} strokeWidth={2.5} />
                    {sc.label}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontWeight: 900, fontSize: 12,
                        background: '#f5f3ff', color: '#7c3aed',
                        border: '1px solid #ddd6fe', borderRadius: 8,
                        padding: '2px 9px',
                      }}>
                        {FEEDBACK_TYPE_LABELS[f.type] ?? f.type}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: f.platform === 'mobile' ? '#fdf4ff' : '#f0f9ff',
                        color: f.platform === 'mobile' ? '#a21caf' : '#0891b2',
                        border: `1px solid ${f.platform === 'mobile' ? '#f0abfc' : '#bae6fd'}`,
                        borderRadius: 8, padding: '2px 9px',
                      }}>
                        {f.platform === 'mobile' ? 'Mobile' : 'Web'}
                      </span>
                      {f.page_url && (
                        <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {f.page_url}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#09090b', fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {f.reporter_email ?? 'Anonyme'} · {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {f.status === 'open' && (
                      <button onClick={e => { e.stopPropagation(); onStatusChange(f.id, 'in_progress') }} disabled={saving === f.id}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Prendre en charge
                      </button>
                    )}
                    {(f.status === 'open' || f.status === 'in_progress') && (
                      <button onClick={e => { e.stopPropagation(); onStatusChange(f.id, 'resolved') }} disabled={saving === f.id}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Résoudre
                      </button>
                    )}
                    {isOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f4f4f5' }}>
                    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <DetailBlock label="MESSAGE">
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#09090b', fontWeight: 700, lineHeight: 1.6 }}>
                          {f.message}
                        </div>
                      </DetailBlock>
                      <AdminNoteBlock
                        value={editNote[f.id] ?? ''}
                        onChange={v => setEditNote(prev => ({ ...prev, [f.id]: v }))}
                        onSave={() => onSaveNote(f.id)}
                        saving={saving === f.id + '_note'}
                      />
                      <StatusActions
                        currentStatus={f.status as ReportStatus}
                        saving={saving === f.id}
                        onChange={s => onStatusChange(f.id, s as FeedbackStatus)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function FilterBar({ filter, setFilter, counts }: {
  filter: string
  setFilter: (f: ReportStatus | 'all') => void
  counts: Record<string, number>
}) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {FILTER_TABS.map(tab => (
        <button key={tab.value} onClick={() => setFilter(tab.value)}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: filter === tab.value ? 900 : 700, fontSize: 13,
            background: filter === tab.value ? '#09090b' : 'white',
            color: filter === tab.value ? 'white' : '#71717a',
            fontFamily: 'inherit',
          }}>
          {tab.label}
          {tab.value !== 'all' && counts[tab.value] > 0 && (
            <span style={{
              marginLeft: 6,
              background: filter === tab.value ? 'rgba(255,255,255,0.2)' : '#f4f4f5',
              color: filter === tab.value ? 'white' : '#71717a',
              borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 900,
            }}>{counts[tab.value]}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: 22, border: '1px solid #e4e4e7' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 16, color: '#09090b' }}>{label}</div>
    </div>
  )
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '7px 14px', borderRadius: 10,
      border: '1px solid #e4e4e7', background: 'white',
      fontSize: 12, fontWeight: 700, color: '#09090b', textDecoration: 'none',
    }}>
      <ExternalLink size={12} color="#71717a" />
      {label}
    </a>
  )
}

function AdminNoteBlock({ value, onChange, onSave, saving }: {
  value: string; onChange: (v: string) => void; onSave: () => void; saving: boolean
}) {
  return (
    <DetailBlock label="NOTE ADMIN">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Ajouter une note interne…"
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 12px', borderRadius: 10,
          border: '1px solid #e4e4e7', background: '#f9fafb',
          fontSize: 13, color: '#09090b', resize: 'vertical',
          outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button onClick={onSave} disabled={saving}
        style={{
          marginTop: 8, padding: '7px 14px', borderRadius: 10, border: '1px solid #e4e4e7',
          background: 'white', fontWeight: 700, fontSize: 12, color: '#09090b',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
        {saving ? 'Sauvegarde…' : 'Sauvegarder note'}
      </button>
    </DetailBlock>
  )
}

function StatusActions({ currentStatus, saving, onChange }: {
  currentStatus: ReportStatus
  saving: boolean
  onChange: (s: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(['open', 'in_progress', 'resolved', 'dismissed'] as ReportStatus[]).map(s => (
        <button key={s} onClick={() => onChange(s)} disabled={currentStatus === s || saving}
          style={{
            padding: '8px 14px', borderRadius: 10, border: `2px solid ${STATUS_CONFIG[s].bg}`,
            background: currentStatus === s ? STATUS_CONFIG[s].bg : 'white',
            color: STATUS_CONFIG[s].color,
            fontWeight: currentStatus === s ? 900 : 700, fontSize: 12,
            cursor: currentStatus === s ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
          }}>
          {STATUS_CONFIG[s].label}
        </button>
      ))}
    </div>
  )
}
