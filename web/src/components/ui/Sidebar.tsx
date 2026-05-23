'use client'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Home, BookOpen, Trophy, User, Settings, HeartPulse, LogOut, Users, Star, Flame, Flag } from 'lucide-react'
import { checkIsAdmin } from '@/lib/queries'
import { useEffect, useState } from 'react'
import type { LucideProps } from 'lucide-react'

type NavItem = { href: string; Icon: React.ComponentType<LucideProps>; label: string }

const NAV: NavItem[] = [
  { href: '/dashboard',   Icon: Home,      label: 'Tableau de bord' },
  { href: '/review',      Icon: BookOpen,  label: 'Révision SRS'    },
  { href: '/leaderboard', Icon: Trophy,    label: 'Classement'      },
  { href: '/friends',     Icon: Users,     label: 'Amis'            },
  { href: '/profile',     Icon: User,      label: 'Profil'          },
  { href: '/settings',    Icon: Settings,  label: 'Paramètres'      },
]

export function Sidebar({ xp = 0, streak = 0, initials = '?' }: {
  xp?: number; streak?: number; initials?: string
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkIsAdmin().then(setIsAdmin).catch(() => {})
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop" style={{
        width: 220, flexShrink: 0,
        background: 'linear-gradient(180deg,#0F766E,#0c4a43)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 13,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HeartPulse size={20} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: 'white', fontSize: 16 }}>MEDIQ</div>
              <div style={{ color: 'rgba(167,243,208,0.6)', fontSize: 10, fontWeight: 700 }}>Medical Training</div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: 'rgba(167,243,208,0.7)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Star size={10} color="rgba(167,243,208,0.7)" strokeWidth={2} />
                {xp.toLocaleString()} XP
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Flame size={10} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                {streak} j
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${Math.min((xp % 1000) / 10, 100)}%`, background: 'rgba(255,255,255,0.55)', borderRadius: 99 }} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px' }}>
          {NAV.map(({ href, Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <button key={href}
                onClick={() => router.push(href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  marginBottom: 2, textAlign: 'left',
                  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: active ? 'white' : 'rgba(167,243,208,0.55)',
                  fontWeight: active ? 900 : 700, fontSize: 14,
                }}>
                <Icon
                  size={18}
                  color={active ? 'white' : 'rgba(167,243,208,0.55)'}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                {label}
              </button>
            )
          })}
          {isAdmin && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 4px' }} />
              <button
                onClick={() => router.push('/admin/reports')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  marginBottom: 2, textAlign: 'left',
                  background: pathname.startsWith('/admin') ? 'rgba(239,68,68,0.2)' : 'transparent',
                  color: pathname.startsWith('/admin') ? '#fca5a5' : 'rgba(252,165,165,0.6)',
                  fontWeight: 700, fontSize: 14,
                }}>
                <Flag size={18} color={pathname.startsWith('/admin') ? '#fca5a5' : 'rgba(252,165,165,0.6)'} strokeWidth={1.75} />
                Admin
              </button>
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: 'white', fontSize: 13,
            }}>
              {initials}
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(167,243,208,0.55)', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <LogOut size={14} color="rgba(167,243,208,0.55)" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <div className="mobile-nav">
        {NAV.slice(0, 4).map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: active ? 'white' : 'rgba(167,243,208,0.5)',
                padding: '8px 4px',
              }}
            >
              <Icon
                size={22}
                color={active ? 'white' : 'rgba(167,243,208,0.5)'}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span style={{ fontSize: 9, fontWeight: active ? 900 : 600, letterSpacing: '0.03em' }}>
                {label.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
