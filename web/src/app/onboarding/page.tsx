'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { upsertProfile } from '@/lib/queries'
import type { ProfTitle } from '@/lib/types'
import { HeartPulse, Stethoscope, Syringe, Baby, HeartHandshake, GraduationCap, Sparkles } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const TITLES: { value: ProfTitle; label: string; Icon: React.ComponentType<LucideProps>; color: string; bg: string }[] = [
  { value: 'medecin',       label: 'Médecin',         Icon: Stethoscope,   color: '#166534', bg: '#f0fdf4' },
  { value: 'infirmier',     label: 'Infirmier(ère)',   Icon: Syringe,       color: '#0c4a6e', bg: '#f0f9ff' },
  { value: 'sage_femme',    label: 'Sage-femme',       Icon: Baby,          color: '#4c1d95', bg: '#faf5ff' },
  { value: 'aide_soignant', label: 'Aide-soignant(e)', Icon: HeartHandshake,color: '#9a3412', bg: '#fff7ed' },
  { value: 'etudiant',      label: 'Étudiant(e)',      Icon: GraduationCap, color: '#374151', bg: '#f9fafb' },
  { value: 'autre',         label: 'Autre',            Icon: Sparkles,      color: '#71717a', bg: '#fafafa' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [pseudo, setPseudo] = useState('')
  const [title, setTitle] = useState<ProfTitle | null>(null)
  const [gender, setGender] = useState<'homme' | 'femme' | 'autre' | null>(null)
  const [institution, setInstitution] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [rgpdConsent, setRgpdConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!rgpdConsent) { setError('Vous devez accepter la politique de confidentialité'); return }
    setLoading(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')
      await upsertProfile(user.id, {
        pseudo: pseudo.trim(),
        title,
        gender,
        institution: institution.trim() || null,
        show_email: showEmail,
        is_anonymous: isAnonymous,
      })
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 14,
    border: '2px solid #e4e4e7', fontSize: 14, fontWeight: 600,
    color: '#09090b', outline: 'none', boxSizing: 'border-box',
    background: '#fafafa', fontFamily: 'system-ui,sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0F766E,#134e4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><HeartPulse size={28} color="white" strokeWidth={2} /></div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'white' }}>Créez votre profil</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>Étape {step} / 3</div>
        </div>

        <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, marginBottom: 24 }}>
          <div style={{ height: '100%', width: `${(step / 3) * 100}%`, background: 'white', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>

        <div style={{ background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>

          {/* STEP 1 — identité pro */}
          {step === 1 && (
            <>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b', marginBottom: 4 }}>Qui êtes-vous ?</div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 20 }}>Ces infos permettent à vos collègues de vous identifier dans le classement.</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Pseudo *</label>
                <input style={inp} placeholder="Dr. Martin, Inf. Dupont…" value={pseudo} onChange={e => setPseudo(e.target.value)} maxLength={40} />
              </div>

              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 10 }}>Titre professionnel *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TITLES.map(t => (
                  <button key={t.value} onClick={() => setTitle(t.value)} style={{
                    padding: '12px 14px', borderRadius: 14,
                    border: `2px solid ${title === t.value ? t.color : '#e4e4e7'}`,
                    background: title === t.value ? t.bg : 'white',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: 'system-ui,sans-serif',
                  }}>
                    <t.Icon size={20} color={title === t.value ? t.color : '#94a3b8'} strokeWidth={1.75} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: title === t.value ? t.color : '#374151' }}>{t.label}</span>
                  </button>
                ))}
              </div>

              <button onClick={() => { if (pseudo.trim() && title) setStep(2) }} disabled={!pseudo.trim() || !title}
                style={{ width: '100%', marginTop: 24, padding: '14px', borderRadius: 14, background: pseudo.trim() && title ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#e4e4e7', color: 'white', border: 'none', fontWeight: 900, fontSize: 15, cursor: pseudo.trim() && title ? 'pointer' : 'default', fontFamily: 'system-ui,sans-serif' }}>
                Continuer →
              </button>
            </>
          )}

          {/* STEP 2 — infos optionnelles */}
          {step === 2 && (
            <>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b', marginBottom: 4 }}>Infos complémentaires</div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 20 }}>Tout est optionnel — modifiable à tout moment dans votre profil.</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Genre</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['homme','Homme'],['femme','Femme'],['autre','Autre']] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setGender(gender === v ? null : v)} style={{
                      flex: 1, padding: '10px', borderRadius: 12,
                      border: `2px solid ${gender === v ? '#0F766E' : '#e4e4e7'}`,
                      background: gender === v ? '#f0fdf4' : 'white',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      color: gender === v ? '#0F766E' : '#374151', fontFamily: 'system-ui,sans-serif',
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Établissement</label>
                <input style={inp} placeholder="CHU de Lyon, Clinique Saint-Jean…" value={institution} onChange={e => setInstitution(e.target.value)} maxLength={80} />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Visible dans le classement pour retrouver vos collègues du même établissement</div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '2px solid #e4e4e7', background: 'white', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>← Retour</button>
                <button onClick={() => setStep(3)} style={{ flex: 2, padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#0F766E,#0891b2)', color: 'white', border: 'none', fontWeight: 900, fontSize: 15, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>Continuer →</button>
              </div>
            </>
          )}

          {/* STEP 3 — confidentialité + consentement */}
          {step === 3 && (
            <>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b', marginBottom: 4 }}>Confidentialité</div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 20 }}>Contrôlez ce que les autres utilisateurs voient de vous.</div>

              {[
                { label: 'Afficher mon email', sub: 'Votre email sera visible sur votre profil et dans le classement', value: showEmail, set: setShowEmail },
                { label: 'Mode anonyme', sub: 'Seul votre pseudo est visible — titre et établissement masqués', value: isAnonymous, set: setIsAnonymous },
              ].map(({ label, sub, value, set }) => (
                <div key={label} onClick={() => set(!value)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', borderRadius: 14, border: `2px solid ${value ? '#0F766E' : '#e4e4e7'}`, background: value ? '#f0fdf4' : '#fafafa', cursor: 'pointer', marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: value ? '#0F766E' : 'white', border: `2px solid ${value ? '#0F766E' : '#d4d4d8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {value && <span style={{ color: 'white', fontSize: 13, fontWeight: 900 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#09090b' }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}

              <div onClick={() => setRgpdConsent(!rgpdConsent)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', borderRadius: 14, border: `2px solid ${rgpdConsent ? '#0F766E' : '#fca5a5'}`, background: rgpdConsent ? '#f0fdf4' : '#fff5f5', cursor: 'pointer', marginTop: 4 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, background: rgpdConsent ? '#0F766E' : 'white', border: `2px solid ${rgpdConsent ? '#0F766E' : '#fca5a5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rgpdConsent && <span style={{ color: 'white', fontSize: 13, fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  J&apos;ai lu et j&apos;accepte la{' '}
                  <a href="/rgpd" target="_blank" onClick={e => e.stopPropagation()} style={{ color: '#0F766E', fontWeight: 700 }}>
                    politique de confidentialité
                  </a>{' '}
                  de MEDIQ. *
                </div>
              </div>

              {error && <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b', fontWeight: 600 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '2px solid #e4e4e7', background: 'white', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>← Retour</button>
                <button onClick={handleSubmit} disabled={loading || !rgpdConsent}
                  style={{ flex: 2, padding: '14px', borderRadius: 14, background: rgpdConsent ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#e4e4e7', color: 'white', border: 'none', fontWeight: 900, fontSize: 15, cursor: rgpdConsent && !loading ? 'pointer' : 'default', fontFamily: 'system-ui,sans-serif' }}>
                  {loading ? 'Enregistrement…' : 'Commencer →'}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          Vos données sont protégées conformément au RGPD · <a href="/rgpd" target="_blank" style={{ color: 'rgba(255,255,255,0.7)' }}>En savoir plus</a>
        </div>
      </div>
    </div>
  )
}
