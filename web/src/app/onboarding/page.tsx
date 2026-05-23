'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SPECIALTIES = [
  { value: 'cardiologue', label: 'Cardiologue', icon: '❤️' },
  { value: 'interne', label: 'Interne', icon: '🏥' },
  { value: 'urgentiste', label: 'Urgentiste', icon: '🚨' },
  { value: 'etudiant', label: 'Étudiant', icon: '📚' },
  { value: 'autre', label: 'Autre', icon: '⚕️' },
]

const GOALS = [
  { value: 1, label: '1 cas / jour', sub: 'Débutant', icon: '🌱' },
  { value: 3, label: '3 cas / jour', sub: 'Régulier', icon: '💪' },
  { value: 5, label: '5 cas / jour', sub: 'Intensif', icon: '🔥' },
  { value: 10, label: '10 cas / jour', sub: 'Expert', icon: '⚡' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [specialty, setSpecialty] = useState('')
  const [goal, setGoal] = useState<number | null>(null)

  function handleFinish() {
    localStorage.setItem('mediq_onboarding', JSON.stringify({ specialty, goal, completed: true }))
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f7f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 18,
            background: 'linear-gradient(135deg,#0F766E,#0891b2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, marginBottom: 10,
          }}>❤️</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#09090b' }}>MEDIQ</div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>Bienvenue — Configurons votre profil</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s === step ? 28 : 10,
              height: 10,
              borderRadius: 99,
              background: s <= step ? '#0F766E' : '#e4e4e7',
              transition: 'all 0.25s',
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: 22,
          border: '1px solid #e4e4e7',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '32px 28px',
        }}>
          {step === 1 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>
                ÉTAPE 1 / 3
              </div>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b', marginBottom: 6 }}>
                Votre spécialité
              </div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 22 }}>
                Cela nous permet d'adapter votre expérience d'apprentissage.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SPECIALTIES.map(sp => (
                  <button
                    key={sp.value}
                    onClick={() => setSpecialty(sp.value)}
                    style={{
                      padding: '16px 14px',
                      borderRadius: 16,
                      border: `2px solid ${specialty === sp.value ? '#0F766E' : '#e4e4e7'}`,
                      background: specialty === sp.value ? '#f0fdf4' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{sp.icon}</div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: specialty === sp.value ? '#0F766E' : '#09090b' }}>
                      {sp.label}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => specialty && setStep(2)}
                disabled={!specialty}
                style={{
                  marginTop: 22,
                  width: '100%',
                  background: specialty ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#e4e4e7',
                  color: specialty ? 'white' : '#94a3b8',
                  border: 'none',
                  borderRadius: 16,
                  borderBottom: specialty ? '4px solid #0a5550' : '4px solid #d4d4d8',
                  padding: '14px 20px',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: specialty ? 'pointer' : 'not-allowed',
                }}
              >
                Continuer →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>
                ÉTAPE 2 / 3
              </div>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b', marginBottom: 6 }}>
                Objectif quotidien
              </div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 22 }}>
                Combien de cas souhaitez-vous étudier chaque jour ?
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 16,
                      border: `2px solid ${goal === g.value ? '#0F766E' : '#e4e4e7'}`,
                      background: goal === g.value ? '#f0fdf4' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{g.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: goal === g.value ? '#0F766E' : '#09090b' }}>
                        {g.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#71717a' }}>{g.sub}</div>
                    </div>
                    {goal === g.value && (
                      <span style={{ marginLeft: 'auto', color: '#0F766E', fontWeight: 900 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    background: 'white',
                    color: '#71717a',
                    border: '2px solid #e4e4e7',
                    borderRadius: 16,
                    padding: '13px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ← Retour
                </button>
                <button
                  onClick={() => goal && setStep(3)}
                  disabled={!goal}
                  style={{
                    flex: 2,
                    background: goal ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#e4e4e7',
                    color: goal ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: 16,
                    borderBottom: goal ? '4px solid #0a5550' : '4px solid #d4d4d8',
                    padding: '13px 18px',
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: goal ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continuer →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: '#09090b', marginBottom: 8 }}>
                  Tout est prêt !
                </div>
                <div style={{ fontSize: 14, color: '#71717a', lineHeight: 1.5, marginBottom: 28 }}>
                  Votre profil est configuré.<br/>
                  Commencez votre premier cas maintenant !
                </div>

                <div style={{
                  background: '#f4f7f8',
                  borderRadius: 16,
                  padding: '16px 20px',
                  marginBottom: 24,
                  textAlign: 'left',
                }}>
                  {[
                    { label: 'Spécialité', value: SPECIALTIES.find(s => s.value === specialty)?.label ?? specialty },
                    { label: 'Objectif', value: GOALS.find(g => g.value === goal)?.label ?? `${goal} cas/jour` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#71717a', fontWeight: 700 }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#09090b' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleFinish}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 16,
                    borderBottom: '4px solid #0a5550',
                    padding: '16px 24px',
                    fontSize: 15,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  Commencer →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
