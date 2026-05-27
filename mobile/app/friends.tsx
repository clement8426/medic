import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import {
  searchUsersByEmail, getFriendsWithStats,
  sendFriendRequest, respondToFriendRequest,
  getUserAllModuleStats,
} from '../lib/queries'
import { Users, Search, UserPlus, Check, X, Star, Flame, BookOpen, ChevronLeft } from 'lucide-react-native'
import { colors } from '../constants/colors'
import type { FriendWithStats, UserSearchResult } from '../lib/types'
import { useI18n } from '../lib/i18n'

export default function FriendsScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const [userId, setUserId] = useState('')
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
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      loadFriends(data.user.id)
    })
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
    } catch {
      Alert.alert('Erreur', t.searchError)
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
      Alert.alert('Erreur', t.sendError)
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.friends}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search ── */}
        <Text style={styles.sectionLabel}>{t.searchFriend}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder={t.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={[styles.searchBtn, (!searchQuery.trim() || searching) && styles.btnDisabled]}
            onPress={handleSearch}
            disabled={!searchQuery.trim() || searching}
          >
            {searching
              ? <ActivityIndicator size="small" color="white" />
              : <Search size={18} color="white" strokeWidth={2} />
            }
          </TouchableOpacity>
        </View>

        {searchDone && (
          <View style={{ marginBottom: 8 }}>
            {searchResults.length === 0 ? (
              <Text style={styles.emptyText}>{t.noUserFound}</Text>
            ) : searchResults.map(u => {
              const alreadySent = sentRequests.has(u.user_id)
              const alreadyFriend = friends.some(f => f.friend_id === u.user_id)
              return (
                <View key={u.user_id} style={styles.card}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{u.email.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardEmail} numberOfLines={1}>{u.email}</Text>
                    <View style={styles.statRow}>
                      <Star size={10} color="#f59e0b" fill="#f59e0b" />
                      <Text style={styles.statText}>{Number(u.total_xp).toLocaleString()} XP</Text>
                      <Flame size={10} color="#f97316" fill="#f97316" />
                      <Text style={styles.statText}>{u.max_streak} {t.shortDays}</Text>
                    </View>
                  </View>
                  {alreadyFriend ? (
                    <View style={styles.tagFriend}><Text style={styles.tagFriendText}>{t.alreadyFriend}</Text></View>
                  ) : alreadySent ? (
                    <View style={styles.tagSent}><Text style={styles.tagSentText}>{t.requestSent}</Text></View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleSendRequest(u.user_id)}
                      disabled={actionLoading === u.user_id}
                    >
                      {actionLoading === u.user_id
                        ? <ActivityIndicator size="small" color="white" />
                        : <UserPlus size={16} color="white" strokeWidth={2} />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {/* ── Pending requests ── */}
        {pendingRequests.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              {t.pendingRequests} ({pendingRequests.length})
            </Text>
            {pendingRequests.map(req => (
              <View key={req.friendship_id} style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{req.email.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardEmail} numberOfLines={1}>{req.email}</Text>
                  <Text style={styles.cardMeta}>{t.friendRequest}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.successBg }]}
                    onPress={() => handleRespond(req.friendship_id, 'accepted')}
                    disabled={actionLoading === req.friendship_id}
                  >
                    <Check size={16} color={colors.primary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.errorBg }]}
                    onPress={() => handleRespond(req.friendship_id, 'declined')}
                    disabled={actionLoading === req.friendship_id}
                  >
                    <X size={16} color={colors.errorText} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Friends list ── */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
          {t.myFriends} ({friends.length})
        </Text>

        {loadingFriends ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={44} color={colors.border} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>{t.noFriendsYet}</Text>
            <Text style={styles.emptySubtitle}>{t.noFriendsDesc}</Text>
          </View>
        ) : friends.map(f => (
          <View key={f.friendship_id} style={[styles.card, styles.friendCard]}>
            <View style={[styles.avatar, styles.avatarFriend]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {f.email.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardEmail} numberOfLines={1}>{f.email}</Text>
              <View style={styles.statRow}>
                <Star size={10} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.statText}>{Number(f.total_xp).toLocaleString()} XP</Text>
                <Flame size={10} color="#f97316" fill="#f97316" />
                <Text style={styles.statText}>{f.max_streak} {t.shortDays}</Text>
                <BookOpen size={10} color={colors.primary} />
                <Text style={styles.statText}>{Number(f.cases_completed)} {t.cases.toLowerCase()}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontWeight: '900' as any, fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontWeight: '800' as any, fontSize: 11, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
  },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchInput: {
    flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 14,
    fontSize: 14, color: colors.text,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  searchBtn: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  friendCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#f4f4f5',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarFriend: { backgroundColor: '#f0fdf4' },
  avatarText: { fontWeight: '900' as any, fontSize: 14, color: colors.text },
  cardInfo: { flex: 1, minWidth: 0 },
  cardEmail: { fontWeight: '800' as any, fontSize: 14, color: colors.text },
  cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statText: { fontSize: 11, color: colors.textMuted, marginRight: 4 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tagFriend: {
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  tagFriendText: { color: colors.primary, fontSize: 11, fontWeight: '700' as any },
  tagSent: { backgroundColor: '#f4f4f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagSentText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' as any },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' as any, paddingVertical: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900' as any, fontSize: 16, color: colors.text, marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
})
