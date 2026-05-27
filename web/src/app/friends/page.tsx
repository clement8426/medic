'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import {
  getUserAllModuleStats,
  searchUsersByEmail,
  getFriendsWithStats,
  sendFriendRequest,
  respondToFriendRequest,
} from '@/lib/queries'
import { Users, Search, UserPlus, Check, X, Star, Flame, BookOpen } from 'lucide-react'
import type { FriendWithStats, UserSearchResult } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

export default function FriendsPage() {
  const { t } = useI18n()
  const [userId, setUserId] = useState('')
  const [userInitials, setUserInitials] = useState('?')
  const [userXp, setUserXp] = useState(0)
  const [userStreak, setUserStreak] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchDone, setSearchDone] = useState(false)

  const [friends, setFriends] = useState<FriendWithStats[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendWithStats[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setUserInitials((user.email ?? '?').slice(0, 2).toUpperCase())
      const stats = await getUserAllModuleStats(user.id)
      setUserXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
      setUserStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
      await loadFriends(user.id)
    }
    load()
  }, [])

  async function loadFriends(uid: string) {
    setLoadingFriends(true)
    try {
      const all = await getFriendsWithStats(uid)
      setFriends(all.filter(f => f.status === 'accepted'))
      setPendingRequests(all.filter(f => f.status === 'pending' && !f.is_requester))
    } finally {
      setLoadingFriends(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchDone(false)
    try {
      const results = await searchUsersByEmail(searchQuery.trim())
      setSearchResults(results)
      setSearchDone(true)
    } finally {
      setSearching(false)
    }
  }

  async function handleSendRequest(addresseeId: string) {
    setActionLoading(addresseeId)
    try {
      await sendFriendRequest(userId, addresseeId)
      setSentRequests(prev => new Set(prev).add(addresseeId))
    } catch {
      // already sent or duplicate — silently ignore
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRespond(friendshipId: string, status: 'accepted' | 'declined') {
    setActionLoading(friendshipId)
    try {
      await respondToFriendRequest(friendshipId, status)
      await loadFriends(userId)
    } finally {
      setActionLoading(null)
    }
  }

  const avatarStyle = (bg = '#f4f4f5', color = '#09090b'): React.CSSProperties => ({
    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 14, color,
  })

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 12,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: 'white', borderBottom: '1px solid #e4e4e7',
          padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 10,
          fontWeight: 900, fontSize: 18, color: '#09090b',
        }}>
          <Users size={20} color="#0F766E" strokeWidth={2} />
          {t.friendsTitle}
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '36px 32px', color: 'white',
        }}>
          <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 6 }}>{t.friendsHeader}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            {t.friendsSubtitle}
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Search ── */}
          <div>
            <div style={sectionLabel}>{t.searchFriend}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={t.searchPlaceholder}
                  style={{
                    width: '100%', padding: '13px 16px 13px 42px',
                    borderRadius: 14, border: '1px solid #e4e4e7',
                    background: 'white', fontSize: 14, color: '#09090b',
                    outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                style={{
                  padding: '13px 24px', borderRadius: 14, border: 'none',
                  background: '#0F766E', color: 'white', fontWeight: 900,
                  fontSize: 14, cursor: searching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                  opacity: searching || !searchQuery.trim() ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {searching ? '…' : t.search}
              </button>
            </div>

            {searchDone && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: 14, fontWeight: 700, padding: '10px 0' }}>
                    {t.noUserFound}
                  </div>
                ) : searchResults.map(u => {
                  const alreadySent = sentRequests.has(u.user_id)
                  const alreadyFriend = friends.some(f => f.friend_id === u.user_id)
                  const displayName = u.pseudo || u.email.split('@')[0]
                  return (
                    <div key={u.user_id} style={{
                      background: 'white', borderRadius: 14, border: '1px solid #e4e4e7',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={avatarStyle()}>{displayName.slice(0, 2).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#09090b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </div>
                        <div style={{ fontSize: 12, color: '#71717a', marginTop: 2, display: 'flex', gap: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Star size={10} color="#f59e0b" fill="#f59e0b" />
                            {Number(u.total_xp).toLocaleString()} XP
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Flame size={10} color="#f97316" fill="#f97316" />
                            {u.max_streak} {t.shortDays}
                          </span>
                        </div>
                      </div>
                      {alreadyFriend ? (
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: '#0F766E',
                          background: '#f0fdf4', borderRadius: 8, padding: '4px 10px',
                          border: '1px solid #bbf7d0',
                        }}>{t.alreadyFriend}</span>
                      ) : alreadySent ? (
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: '#94a3b8',
                          background: '#f4f4f5', borderRadius: 8, padding: '4px 10px',
                        }}>{t.requestSent}</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.user_id)}
                          disabled={actionLoading === u.user_id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 10, border: 'none',
                            background: '#0F766E', color: 'white',
                            fontWeight: 900, fontSize: 13, cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <UserPlus size={14} color="white" />
                          {t.addFriend}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Pending requests ── */}
          {pendingRequests.length > 0 && (
            <div>
              <div style={sectionLabel}>{t.pendingRequests} ({pendingRequests.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingRequests.map(req => {
                  const displayName = req.pseudo || req.email.split('@')[0]
                  return (
                  <div key={req.friendship_id} style={{
                    background: 'white', borderRadius: 14, border: '1px solid #e4e4e7',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={avatarStyle()}>{displayName.slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: '#09090b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                        {t.wantsToAdd}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleRespond(req.friendship_id, 'accepted')}
                        disabled={actionLoading === req.friendship_id}
                        style={{
                          width: 36, height: 36, borderRadius: 10, border: 'none',
                          background: '#f0fdf4', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Check size={16} color="#0F766E" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handleRespond(req.friendship_id, 'declined')}
                        disabled={actionLoading === req.friendship_id}
                        style={{
                          width: 36, height: 36, borderRadius: 10, border: 'none',
                          background: '#fef2f2', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={16} color="#991b1b" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* ── Friends list ── */}
          <div>
            <div style={sectionLabel}>{t.myFriends} ({friends.length})</div>
            {loadingFriends ? (
              <div style={{ color: '#71717a', fontWeight: 700, padding: '12px 0' }}>{t.loading}</div>
            ) : friends.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 18, border: '1px solid #e4e4e7',
                padding: '48px 24px', textAlign: 'center',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Users size={44} color="#d4d4d8" strokeWidth={1.5} />
                </div>
                <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b', marginBottom: 6 }}>
                  {t.noFriendsYet}
                </div>
                <div style={{ fontSize: 13, color: '#71717a' }}>
                  {t.noFriendsDesc}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {friends.map(f => {
                  const displayName = f.pseudo || f.email.split('@')[0]
                  const showEmail = f.show_email && f.email
                  return (
                  <div key={f.friendship_id} style={{
                    background: 'white', borderRadius: 16,
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={avatarStyle('linear-gradient(135deg,#0F766E22,#0891b222)', '#0F766E')}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: '#09090b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </div>
                      {showEmail && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.email}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#71717a' }}>
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />
                          {Number(f.total_xp).toLocaleString()} XP
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#71717a' }}>
                          <Flame size={11} color="#f97316" fill="#f97316" />
                          {f.max_streak} {t.shortDays} {t.streak.toLowerCase()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#71717a' }}>
                          <BookOpen size={11} color="#0F766E" />
                          {Number(f.cases_completed)} {t.cases.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
