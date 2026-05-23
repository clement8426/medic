'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import type { Lang } from '@/lib/types'

const LANGUAGES: { value: Lang; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userInitials, setUserInitials] = useState('?')
  const [language, setLanguage] = useState<Lang>('fr')
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [saveMsg, setSaveMsg] = useState('')
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user
      if (u) {
        setEmail(u.email ?? '')
        setUserInitials((u.email ?? '?').slice(0, 2).toUpperCase())
      }
    })
    const saved = localStorage.getItem('mediq_language') as Lang | null
    if (saved) setLanguage(saved)
    const notif = localStorage.getItem('mediq_notifications')
    if (notif !== null) setNotifEnabled(notif === 'true')
  }, [])

  function handleLanguageChange(lang: Lang) {
    setLanguage(lang)
    localStorage.setItem('mediq_language', lang)
    setSaveMsg('Langue sauvegardée !')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  function handleNotifToggle() {
    const next = !notifEnabled
    setNotifEnabled(next)
    localStorage.setItem('mediq_notifications', String(next))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
          fontWeight: 900,
          fontSize: 18,
          color: '#09090b',
        }}>
          Paramètres ⚙️
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '28px 32px',
          color: 'white',
        }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Paramètres</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            Personnalisez votre expérience MEDIQ
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 620 }}>
          {saveMsg && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#166534', borderRadius: 12, padding: '10px 16px',
              fontWeight: 700, fontSize: 13,
            }}>
              ✓ {saveMsg}
            </div>
          )}

          {/* Language */}
          <div style={{
            background: 'white',
            borderRadius: 22,
            border: '1px solid #e4e4e7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            padding: '22px 24px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              LANGUE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  style={{
                    padding: '13px 16px',
                    borderRadius: 14,
                    border: `2px solid ${language === lang.value ? '#0F766E' : '#e4e4e7'}`,
                    background: language === lang.value ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{lang.flag}</span>
                  <span style={{
                    fontWeight: 900, fontSize: 14,
                    color: language === lang.value ? '#0F766E' : '#09090b',
                  }}>
                    {lang.label}
                  </span>
                  {language === lang.value && (
                    <span style={{ marginLeft: 'auto', color: '#0F766E', fontSize: 14 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div style={{
            background: 'white',
            borderRadius: 22,
            border: '1px solid #e4e4e7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            padding: '22px 24px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              NOTIFICATIONS
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
            }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#09090b' }}>Rappels quotidiens</div>
                <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                  Recevoir un rappel pour vos révisions quotidiennes
                </div>
              </div>
              <button
                onClick={handleNotifToggle}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 99,
                  border: 'none',
                  background: notifEnabled ? '#0F766E' : '#d4d4d8',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  marginLeft: 16,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 3,
                  left: notifEnabled ? 24 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>

          {/* Account */}
          <div style={{
            background: 'white',
            borderRadius: 22,
            border: '1px solid #e4e4e7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            padding: '22px 24px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              COMPTE
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 14px',
              background: '#f9fafb',
              borderRadius: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: 'white', fontSize: 14, flexShrink: 0,
              }}>
                {userInitials}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  EMAIL
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#09090b', marginTop: 1 }}>
                  {email || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div style={{
            background: 'white',
            borderRadius: 22,
            border: '1px solid #e4e4e7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            padding: '22px 24px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              DÉCONNEXION
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                borderRadius: 14,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'
              }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
