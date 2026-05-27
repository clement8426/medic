'use client'
import { useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getActiveModules, getCaseCountsByModule, getUserAllModuleStats, getProfile, upsertProfile, getModuleQuizCounts, getModuleQuizMasteredCounts } from '@/lib/queries'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { Star, Flame, Target, Pencil, Camera } from 'lucide-react'
import type { Module, UserModuleStats, Profile, ProfTitle } from '@/lib/types'
import { getModuleName } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

const TITLES: { value: ProfTitle; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'medecin',       label: 'Médecin',         emoji: '🩺', color: '#166534', bg: '#f0fdf4' },
  { value: 'infirmier',     label: 'Infirmier(ère)',   emoji: '💉', color: '#0c4a6e', bg: '#f0f9ff' },
  { value: 'sage_femme',    label: 'Sage-femme',       emoji: '👶', color: '#4c1d95', bg: '#faf5ff' },
  { value: 'aide_soignant', label: 'Aide-soignant(e)', emoji: '🏥', color: '#9a3412', bg: '#fff7ed' },
  { value: 'etudiant',      label: 'Étudiant(e)',      emoji: '📚', color: '#374151', bg: '#f9fafb' },
  { value: 'autre',         label: 'Autre',            emoji: '✨', color: '#71717a', bg: '#fafafa' },
]

function TitleBadge({ title }: { title: ProfTitle | null }) {
  const t = TITLES.find(t => t.value === title)
  if (!t) return null
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: t.bg, color: t.color, border: `1px solid ${t.color}33` }}>
      {t.emoji} {t.label}
    </span>
  )
}

function Avatar({ url, initials, size = 72, radius = 24, fontSize = 28, border = '3px solid rgba(255,255,255,0.3)' }: {
  url: string | null; initials: string; size?: number; radius?: number; fontSize?: number; border?: string
}) {
  if (url) return (
    <img src={url} alt="avatar" style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', border, display: 'block' }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize, color: 'white', border, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function ProfilePage() {
  const { t, lang } = useI18n()
  const [email, setEmail]           = useState('')
  const [userId, setUserId]         = useState('')
  const [createdAt, setCreatedAt]   = useState('')
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [modules, setModules]       = useState<Module[]>([])
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({})
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({})
  const [masteredCounts, setMasteredCounts] = useState<Record<string, number>>({})
  const [moduleStats, setModuleStats] = useState<Record<string, UserModuleStats>>({})
  const [loading, setLoading]       = useState(true)
  const [xp, setXp]                 = useState(0)
  const [streak, setStreak]         = useState(0)
  const [accuracy, setAccuracy]     = useState(0)

  // Edit state
  const [editing, setEditing]               = useState(false)
  const [editPseudo, setEditPseudo]         = useState('')
  const [editTitle, setEditTitle]           = useState<ProfTitle | null>(null)
  const [editGender, setEditGender]         = useState<'homme' | 'femme' | 'autre' | null>(null)
  const [editInstitution, setEditInstitution] = useState('')
  const [editShowEmail, setEditShowEmail]   = useState(false)
  const [editAnonymous, setEditAnonymous]   = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [saveError, setSaveError]           = useState<string | null>(null)

  // Avatar
  const fileRef                            = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError]      = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser()
      const u = data?.user
      if (!u) { setLoading(false); return }
      setEmail(u.email ?? '')
      setUserId(u.id)
      setCreatedAt(u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '')

      const [mods, stats, prof] = await Promise.all([
        getActiveModules(),
        getUserAllModuleStats(u.id),
        getProfile(u.id),
      ])
      setProfile(prof)
      setModules(mods)
      const classicIds = mods.filter(m => m.category === 'classic').map(m => m.id)
      const [counts, qCounts, mastered] = await Promise.all([
        getCaseCountsByModule(mods.map(m => m.id)),
        getModuleQuizCounts(classicIds),
        u?.id && classicIds.length > 0 ? getModuleQuizMasteredCounts(u.id, classicIds) : Promise.resolve({}),
      ])
      setCaseCounts(counts)
      setQuizCounts(qCounts)
      setMasteredCounts(mastered)

      const statsMap: Record<string, UserModuleStats> = {}
      for (const s of stats) statsMap[s.module_id] = s
      setModuleStats(statsMap)

      const totalXp = stats.reduce((acc, s) => acc + (s.xp ?? 0), 0)
      setXp(totalXp)
      setStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
      const totalQ = stats.reduce((acc, s) => acc + (s.total_quizzes_answered ?? 0), 0)
      const totalCorrect = stats.reduce((acc, s) => acc + Math.round((s.correct_rate ?? 0) * (s.total_quizzes_answered ?? 0)), 0)
      setAccuracy(totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0)
      setLoading(false)
    }
    load()
  }, [])

  function openEdit() {
    setEditPseudo(profile?.pseudo ?? '')
    setEditTitle(profile?.title ?? null)
    setEditGender(profile?.gender ?? null)
    setEditInstitution(profile?.institution ?? '')
    setEditShowEmail(profile?.show_email ?? false)
    setEditAnonymous(profile?.is_anonymous ?? false)
    setSaveError(null)
    setEditing(true)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) { setAvatarError('Format invalide (jpg, png, webp)'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image trop lourde (max 5 Mo)'); return }
    setAvatarError(null)
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await upsertProfile(userId, { avatar_url: publicUrl })
      const updated = await getProfile(userId)
      setProfile(updated)
    } catch {
      setAvatarError('Erreur lors du téléchargement')
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!editPseudo.trim()) { setSaveError('Le pseudo est obligatoire'); return }
    setSaving(true); setSaveError(null)
    try {
      await upsertProfile(userId, {
        pseudo: editPseudo.trim(),
        title: editTitle,
        gender: editGender,
        institution: editInstitution.trim() || null,
        show_email: editShowEmail,
        is_anonymous: editAnonymous,
      })
      const updated = await getProfile(userId)
      setProfile(updated)
      setEditing(false)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile?.pseudo?.slice(0, 1).toUpperCase() ?? email.slice(0, 1).toUpperCase() ?? '?'
  const avatarUrl = profile?.avatar_url ?? null
  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '2px solid #e4e4e7', fontSize: 14, fontWeight: 600, color: '#09090b', outline: 'none', boxSizing: 'border-box', background: '#fafafa', fontFamily: 'system-ui,sans-serif' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={xp} streak={streak} initials={initials} avatarUrl={avatarUrl} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e4e4e7', padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b' }}>Mon Profil</div>
          <button onClick={openEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f4f4f5', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#09090b', fontFamily: 'system-ui,sans-serif' }}>
            <Pencil size={14} strokeWidth={2} />
            Modifier
          </button>
        </div>

        {/* Header */}
        <div style={{ background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)', padding: '32px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar url={avatarUrl} initials={initials} size={72} radius={24} fontSize={28} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Changer la photo de profil"
                style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 26, height: 26, borderRadius: 9,
                  background: 'white', border: '2px solid rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: uploadingAvatar ? 'default' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  opacity: uploadingAvatar ? 0.6 : 1,
                }}
              >
                <Camera size={13} color="#0F766E" strokeWidth={2} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>{profile?.pseudo || email || '…'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                {profile?.title && <TitleBadge title={profile.title} />}
                {profile?.institution && !profile.is_anonymous && (
                  <span style={{ fontSize: 12, color: 'rgba(167,243,208,0.8)', fontWeight: 600 }}>🏥 {profile.institution}</span>
                )}
                {profile?.is_anonymous && (
                  <span style={{ fontSize: 12, color: 'rgba(167,243,208,0.7)', fontWeight: 600 }}>Mode anonyme</span>
                )}
              </div>
              {avatarError && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 6 }}>{avatarError}</div>}
              {uploadingAvatar && <div style={{ fontSize: 11, color: 'rgba(167,243,208,0.8)', marginTop: 6 }}>Téléchargement…</div>}
              {createdAt && <div style={{ fontSize: 12, color: 'rgba(167,243,208,0.65)', marginTop: 6 }}>Membre depuis le {createdAt}</div>}
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Stats */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>{t.statistics}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {([
                { label: t.xpTotal, value: xp.toLocaleString(), Icon: Star, iconColor: '#f59e0b' },
                { label: t.streak, value: `${streak} ${t.days}`, Icon: Flame, iconColor: '#f97316' },
                { label: t.precision, value: `${accuracy}%`, Icon: Target, iconColor: '#0F766E' },
              ] as const).map(stat => (
                <div key={stat.label} style={{ background: 'white', borderRadius: 18, border: '1px solid #e4e4e7', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '18px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    <stat.Icon size={18} color={stat.iconColor} strokeWidth={2} />
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: '#09090b', marginBottom: 3 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>{t.moduleProgressTitle}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? <div style={{ color: '#71717a', fontWeight: 700 }}>{t.loading}</div> : (
                <>
                  {modules.filter(mod => (mod.category ?? 'clinical') === 'clinical' && (caseCounts[mod.id] ?? 0) > 0).map(mod => {
                    const count = caseCounts[mod.id] ?? 0
                    const completed = moduleStats[mod.id]?.cases_completed ?? 0
                    const pct = count > 0 ? Math.min(100, Math.round((completed / count) * 100)) : 0
                    return (
                      <div key={mod.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e4e4e7', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <ModuleIcon icon={mod.icon} size={20} color="#0F766E" strokeWidth={1.75} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900, fontSize: 13, color: '#09090b', marginBottom: 6 }}>{getModuleName(mod, lang)}</div>
                          <div style={{ height: 5, background: '#f4f4f5', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(135deg,#0F766E,#0891b2)', borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#0F766E', minWidth: 40, textAlign: 'right' }}>{completed} / {count}</span>
                      </div>
                    )
                  })}
                  {modules.filter(mod => mod.category === 'classic' && (quizCounts[mod.id] ?? 0) > 0).map(mod => {
                    const qTotal = quizCounts[mod.id] ?? 0
                    const qMastered = masteredCounts[mod.id] ?? 0
                    const pct = qTotal > 0 ? Math.min(100, Math.round((qMastered / qTotal) * 100)) : 0
                    return (
                      <div key={mod.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e4e4e7', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <ModuleIcon icon={mod.icon} size={20} color="#0891b2" strokeWidth={1.75} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 900, fontSize: 13, color: '#09090b' }}>{getModuleName(mod, lang)}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0c4a6e', border: '1px solid #bae6fd', borderRadius: 99, padding: '1px 7px' }}>{t.classic}</span>
                          </div>
                          <div style={{ height: 5, background: '#f4f4f5', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(135deg,#0891b2,#6366f1)', borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#0891b2', minWidth: 40, textAlign: 'right' }}>{qMastered} / {qTotal}</span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditing(false)}>
          <div style={{ background: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b', marginBottom: 20 }}>Modifier le profil</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Pseudo *</label>
              <input style={inp} value={editPseudo} onChange={e => setEditPseudo(e.target.value)} maxLength={40} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Titre</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TITLES.map(t => (
                  <button key={t.value} onClick={() => setEditTitle(editTitle === t.value ? null : t.value)} style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid ${editTitle === t.value ? t.color : '#e4e4e7'}`, background: editTitle === t.value ? t.bg : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'system-ui,sans-serif' }}>
                    <span style={{ fontSize: 16 }}>{t.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: editTitle === t.value ? t.color : '#374151' }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Genre</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['homme','Homme'],['femme','Femme'],['autre','Autre']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setEditGender(editGender === v ? null : v)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `2px solid ${editGender === v ? '#0F766E' : '#e4e4e7'}`, background: editGender === v ? '#f0fdf4' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: editGender === v ? '#0F766E' : '#374151', fontFamily: 'system-ui,sans-serif' }}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Établissement</label>
              <input style={inp} placeholder="CHU de Lyon…" value={editInstitution} onChange={e => setEditInstitution(e.target.value)} maxLength={80} />
            </div>

            {[
              { label: 'Afficher mon email', sub: 'Email visible sur le profil et dans le classement', value: editShowEmail, set: setEditShowEmail },
              { label: 'Mode anonyme', sub: 'Seul le pseudo est visible', value: editAnonymous, set: setEditAnonymous },
            ].map(({ label, sub, value, set }) => (
              <div key={label} onClick={() => set(!value)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, border: `2px solid ${value ? '#0F766E' : '#e4e4e7'}`, background: value ? '#f0fdf4' : '#fafafa', cursor: 'pointer', marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: value ? '#0F766E' : 'white', border: `2px solid ${value ? '#0F766E' : '#d4d4d8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {value && <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#09090b' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>{sub}</div>
                </div>
              </div>
            ))}

            {saveError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b', fontWeight: 600, marginBottom: 14 }}>{saveError}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '2px solid #e4e4e7', background: 'white', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#0F766E,#0891b2)', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: saving ? 'default' : 'pointer', fontFamily: 'system-ui,sans-serif' }}>
                {saving ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
