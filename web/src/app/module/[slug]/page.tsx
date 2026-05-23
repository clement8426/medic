'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getModuleBySlug, getCasesByModule } from '@/lib/queries'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import type { Module, Case } from '@/lib/types'

function DifficultyDots({ level }: { level: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i <= level ? '#0F766E' : '#e4e4e7',
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

export default function ModuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [mod, setMod] = useState<Module | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const m = await getModuleBySlug(slug)
        if (!m) { setError('Module introuvable'); setLoading(false); return }
        setMod(m)
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .eq('module_id', m.id)
          .order('case_number')
        if (error) {
          setError(error.message)
        } else {
          setCases(data ?? [])
        }
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
  }, [slug])

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
          gap: 16,
        }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: '#f4f4f5',
              border: 'none',
              borderRadius: 10,
              padding: '7px 14px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              color: '#09090b',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Retour
          </button>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b' }}>
            {mod?.name_fr ?? '…'}
          </div>
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

        {mod && (
          <>
            {/* Module header */}
            <div style={{
              background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
              padding: '32px',
              color: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ModuleIcon icon={mod.icon} size={28} color="white" strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{mod.name_fr}</div>
                  <div style={{ fontSize: 13, color: 'rgba(167,243,208,0.8)', marginTop: 2 }}>
                    {cases.length} cas disponibles
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 600, lineHeight: 1.5 }}>
                {mod.description_fr}
              </div>
            </div>

            {/* Cases list */}
            <div style={{ padding: '28px 32px' }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
                CAS CLINIQUES — {cases.length} cas
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cases.map(c => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/case/${c.id}`)}
                    style={{
                      background: 'white',
                      borderRadius: 18,
                      border: '1px solid #e4e4e7',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      padding: '18px 22px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 18px rgba(15,118,110,0.12)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    {/* Case number */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, color: 'white', fontSize: 15,
                    }}>
                      {c.case_number}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: '#09090b' }}>
                          Cas #{c.case_number}
                        </span>
                        <span style={{ fontSize: 12, color: '#71717a', fontWeight: 600 }}>
                          {c.age} ans — {c.sex}
                        </span>
                        <DifficultyDots level={c.difficulty} />
                      </div>
                      {c.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {c.tags.slice(0, 4).map(tag => (
                            <span key={tag} style={{
                              background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                              borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 700,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Validated badge */}
                    <div style={{ flexShrink: 0 }}>
                      {c.validated ? (
                        <span style={{
                          background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                          borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 900,
                        }}>
                          ✓ Validé
                        </span>
                      ) : (
                        <span style={{
                          background: '#f4f4f5', color: '#71717a', border: '1px solid #e4e4e7',
                          borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700,
                        }}>
                          À faire
                        </span>
                      )}
                    </div>

                    <div style={{ color: '#94a3b8', fontSize: 18, flexShrink: 0 }}>›</div>
                  </div>
                ))}
              </div>

              {cases.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontWeight: 700 }}>
                  Aucun cas disponible pour ce module.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
