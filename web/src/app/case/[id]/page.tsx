'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getCaseById, getModuleBySlug } from '@/lib/queries'
import { resolveImageUrl, resolveFocusUrl } from '@/lib/image-utils'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import type { Module, Case } from '@/lib/types'

function DifficultyDots({ level }: { level: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: i <= level ? '#0F766E' : '#e4e4e7',
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

function EcgViewer({ caseData, moduleSlug }: { caseData: Case; moduleSlug: string }) {
  const [showFull, setShowFull] = useState(false) // false = D2 band, true = 12 dérivations
  const [modalOpen, setModalOpen] = useState(false)
  const isEcg = moduleSlug === 'ecg'

  const fullUrl = resolveImageUrl(caseData.image_url || '', moduleSlug)
  const d2Url = resolveFocusUrl(caseData.focus_urls, 'd2_band', moduleSlug) || fullUrl
  const currentUrl = showFull ? fullUrl : d2Url

  return (
    <div style={{ position: 'relative' }}>
      {/* Toggle buttons */}
      {isEcg && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'DII', value: false },
            { label: '12 Dérivations', value: true },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setShowFull(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
                background: showFull === opt.value ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#f4f4f5',
                color: showFull === opt.value ? 'white' : '#71717a',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Image */}
      <div style={{
        background: '#0a0a0a',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #27272a',
      }}>
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="ECG"
            style={{
              width: '100%',
              height: showFull ? 'auto' : 160,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
            Aucune image
          </div>
        )}

        {/* Loupe button */}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            fontSize: 16,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🔍
        </button>
      </div>

      {/* Full-screen modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
            <button
              onClick={e => { e.stopPropagation(); setModalOpen(false) }}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕ Fermer
            </button>
            {fullUrl && (
              <img
                src={fullUrl}
                alt="ECG plein écran"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [mod, setMod] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const c = await getCaseById(id)
        if (!c) { setError('Cas introuvable'); setLoading(false); return }
        setCaseData(c)

        // Get module by its ID — we search by known modules
        const { data: modData } = await (await import('@/lib/supabase')).supabase
          .from('modules')
          .select('*')
          .eq('id', c.module_id)
          .single()
        if (modData) setMod(modData)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email ?? ''
      if (email) setUserInitials(email.slice(0, 2).toUpperCase())
    })
  }, [id])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e4e4e7',
          padding: '16px 32px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <button
            onClick={() => mod ? router.push(`/module/${mod.slug}`) : router.push('/dashboard')}
            style={{
              background: '#f4f4f5', border: 'none', borderRadius: 10,
              padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#09090b',
            }}
          >
            ← Retour
          </button>
          <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b' }}>
            {caseData ? `Cas #${caseData.case_number}` : '…'}
          </div>
          {mod && (
            <span style={{
              background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '3px 11px', fontSize: 11, fontWeight: 700,
            }}>
              <ModuleIcon icon={mod.icon} size={16} color="#0F766E" strokeWidth={2} /> {mod.name_fr}
            </span>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#71717a', fontWeight: 700 }}>
            Chargement…
          </div>
        )}
        {error && (
          <div style={{
            margin: '24px 32px',
            background: '#fef2f2', border: '1px solid #fca5a5',
            color: '#991b1b', borderRadius: 14, padding: '14px 18px', fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        {caseData && (
          <div className="case-grid" style={{
            padding: '28px 32px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            alignItems: 'start',
          }}>
            {/* Left: ECG viewer */}
            <div>
              <div style={{
                background: 'white',
                borderRadius: 22,
                border: '1px solid #e4e4e7',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                padding: 20,
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 12 }}>
                  {mod?.slug === 'ecg' ? 'ECG' : 'IMAGE CLINIQUE'}
                </div>
                <EcgViewer caseData={caseData} moduleSlug={mod?.slug ?? ''} />
              </div>
            </div>

            {/* Right: Patient info + report */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Patient header */}
              <div style={{
                background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
                borderRadius: 22,
                padding: '22px 24px',
                color: 'white',
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(167,243,208,0.7)', marginBottom: 8 }}>
                  PATIENT
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{caseData.age} ans</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Âge</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{caseData.sex === 'Homme' ? '♂ Homme' : '♀ Femme'}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Sexe</div>
                  </div>
                  <div>
                    <DifficultyDots level={caseData.difficulty} />
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Difficulté</div>
                  </div>
                  {caseData.weight_kg && (
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>{caseData.weight_kg} kg</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Poids</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {caseData.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {caseData.tags.map(tag => (
                    <span key={tag} style={{
                      background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                      borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Données cliniques */}
              {caseData.data_fr && Object.keys(caseData.data_fr).length > 0 && (
                <div style={{
                  background: 'white',
                  borderRadius: 22,
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '20px 24px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
                    DONNÉES CLINIQUES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(caseData.data_fr).map(([key, value]) => (
                      <div key={key} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '10px 14px', borderRadius: 12,
                        background: '#f9fafb', border: '1px solid #f0f0f0',
                      }}>
                        <span style={{ fontSize: 13, color: '#71717a', fontWeight: 700, textTransform: 'capitalize' as const, flex: '0 0 auto', marginRight: 12 }}>
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: 13, color: '#09090b', fontWeight: 900, textAlign: 'right' as const }}>
                          {Array.isArray(value)
                            ? (value as unknown[]).join(', ')
                            : typeof value === 'object' && value !== null
                              ? JSON.stringify(value)
                              : String(value ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => router.push(`/quiz/${caseData.id}`)}
                style={{
                  background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 16,
                  borderBottom: '4px solid #0a5550',
                  padding: '16px 28px',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                  transition: 'opacity 0.15s',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                🎯 Commencer le quiz
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
