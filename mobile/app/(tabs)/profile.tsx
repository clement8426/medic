import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Image, Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native'
import { Star, Flame, Target, Users, MessageSquare, Pencil, Camera } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { getUserAllModuleStats, getProfile, upsertProfile } from '../../lib/queries'
import { colors } from '../../constants/colors'
import type { Profile, ProfTitle } from '../../lib/types'

const TITLES: { value: ProfTitle; label: string; emoji: string }[] = [
  { value: 'medecin',       label: 'Médecin',         emoji: '🩺' },
  { value: 'infirmier',     label: 'Infirmier(ère)',   emoji: '💉' },
  { value: 'sage_femme',    label: 'Sage-femme',       emoji: '👶' },
  { value: 'aide_soignant', label: 'Aide-soignant(e)', emoji: '🏥' },
  { value: 'etudiant',      label: 'Étudiant(e)',      emoji: '📚' },
  { value: 'autre',         label: 'Autre',            emoji: '✨' },
]

const TITLE_COLORS: Record<ProfTitle, { color: string; bg: string }> = {
  medecin:       { color: '#166534', bg: '#f0fdf4' },
  infirmier:     { color: '#0c4a6e', bg: '#f0f9ff' },
  sage_femme:    { color: '#4c1d95', bg: '#faf5ff' },
  aide_soignant: { color: '#9a3412', bg: '#fff7ed' },
  etudiant:      { color: '#374151', bg: '#f9fafb' },
  autre:         { color: '#71717a', bg: '#fafafa' },
}

export default function ProfileScreen() {
  const router = useRouter()
  const [userId, setUserId]     = useState('')
  const [email, setEmail]       = useState('')
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [xp, setXp]             = useState(0)
  const [streak, setStreak]     = useState(0)
  const [accuracy, setAccuracy] = useState(0)

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Edit modal
  const [editing, setEditing]                 = useState(false)
  const [editPseudo, setEditPseudo]           = useState('')
  const [editTitle, setEditTitle]             = useState<ProfTitle | null>(null)
  const [editGender, setEditGender]           = useState<'homme' | 'femme' | 'autre' | null>(null)
  const [editInstitution, setEditInstitution] = useState('')
  const [editAnonymous, setEditAnonymous]     = useState(false)
  const [saving, setSaving]                   = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data } = await supabase.auth.getUser()
    const u = data.user
    if (!u) { setLoading(false); return }
    setEmail(u.email ?? '')
    setUserId(u.id)

    const [stats, prof] = await Promise.all([
      getUserAllModuleStats(u.id),
      getProfile(u.id),
    ])
    setProfile(prof)
    setXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
    setStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
    const totalQ = stats.reduce((acc, s) => acc + (s.total_quizzes_answered ?? 0), 0)
    const totalCorrect = stats.reduce((acc, s) => acc + Math.round((s.correct_rate ?? 0) * (s.total_quizzes_answered ?? 0)), 0)
    setAccuracy(totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0)
    setLoading(false)
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie dans les paramètres.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    setUploadingAvatar(true)
    try {
      const asset = result.assets[0]
      const ext = asset.uri.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`

      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
        upsert: true,
        contentType: asset.mimeType ?? `image/${ext}`,
      })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await upsertProfile(userId, { avatar_url: publicUrl })
      const updated = await getProfile(userId)
      setProfile(updated)
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger la photo.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  function openEdit() {
    setEditPseudo(profile?.pseudo ?? '')
    setEditTitle(profile?.title ?? null)
    setEditGender(profile?.gender ?? null)
    setEditInstitution(profile?.institution ?? '')
    setEditAnonymous(profile?.is_anonymous ?? false)
    setEditing(true)
  }

  async function handleSave() {
    if (!editPseudo.trim()) { Alert.alert('Erreur', 'Le pseudo est obligatoire'); return }
    setSaving(true)
    try {
      await upsertProfile(userId, {
        pseudo: editPseudo.trim(),
        title: editTitle,
        gender: editGender,
        institution: editInstitution.trim() || null,
        is_anonymous: editAnonymous,
      })
      const updated = await getProfile(userId)
      setProfile(updated)
      setEditing(false)
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        router.replace('/')
      }},
    ])
  }

  const displayName = profile?.pseudo || email || '?'
  const initial = profile?.pseudo?.slice(0, 1).toUpperCase() ?? email.slice(0, 1).toUpperCase() ?? '?'
  const avatarUrl = profile?.avatar_url ?? null
  const titleMeta = profile?.title ? TITLE_COLORS[profile.title] : null
  const titleDef = profile?.title ? TITLES.find(t => t.value === profile.title) : null

  if (loading) return (
    <SafeAreaView style={s.container}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTopRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.editBtn} onPress={openEdit}>
            <Pencil size={14} color={colors.primary} strokeWidth={2} />
            <Text style={s.editBtnText}>Modifier</Text>
          </TouchableOpacity>
        </View>

        <View style={s.avatarRow}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar} style={s.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={s.cameraBtn}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Camera size={14} color={colors.primary} strokeWidth={2} />
              }
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={s.displayName}>{displayName}</Text>
            {titleDef && titleMeta && (
              <View style={[s.titleBadge, { backgroundColor: titleMeta.bg }]}>
                <Text style={[s.titleBadgeText, { color: titleMeta.color }]}>{titleDef.emoji} {titleDef.label}</Text>
              </View>
            )}
            {profile?.institution && !profile.is_anonymous && (
              <Text style={s.institutionText}>🏥 {profile.institution}</Text>
            )}
            {profile?.is_anonymous && <Text style={s.anonText}>Mode anonyme</Text>}
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Statistiques</Text>
        <View style={s.statsRow}>
          {[
            { Icon: Star, color: '#f59e0b', value: xp.toLocaleString(), label: 'XP total' },
            { Icon: Flame, color: '#f97316', value: String(streak), label: 'Streak' },
            { Icon: Target, color: colors.primary, value: `${accuracy}%`, label: 'Précision' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <stat.Icon size={16} color={stat.color} strokeWidth={2} style={{ marginBottom: 4 }} />
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>Compte</Text>
        <View style={s.card}>
          <Text style={s.emailRow}>📧  {email || '—'}</Text>
        </View>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/friends')}>
          <View style={s.menuIcon}><Users size={20} color={colors.primary} strokeWidth={2} /></View>
          <Text style={s.menuText}>Amis</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/feedback')}>
          <View style={s.menuIcon}><MessageSquare size={20} color={colors.primary} strokeWidth={2} /></View>
          <Text style={s.menuText}>Donner mon avis</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/settings')}>
          <Text style={s.menuEmoji}>⚙️</Text>
          <Text style={s.menuText}>Paramètres</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/notifications')}>
          <Text style={s.menuEmoji}>🔔</Text>
          <Text style={s.menuText}>Notifications</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Modifier le profil</Text>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLabel}>Pseudo *</Text>
            <TextInput
              style={s.textInput}
              value={editPseudo}
              onChangeText={setEditPseudo}
              maxLength={40}
              autoCapitalize="none"
            />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Titre</Text>
            <View style={s.titleGrid}>
              {TITLES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.titleOpt, editTitle === t.value && s.titleOptSelected]}
                  onPress={() => setEditTitle(editTitle === t.value ? null : t.value)}
                >
                  <Text style={s.titleOptEmoji}>{t.emoji}</Text>
                  <Text style={[s.titleOptLabel, editTitle === t.value && { color: colors.primary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Genre</Text>
            <View style={s.genderRow}>
              {([['homme', 'Homme'], ['femme', 'Femme'], ['autre', 'Autre']] as const).map(([v, l]) => (
                <TouchableOpacity
                  key={v}
                  style={[s.genderOpt, editGender === v && s.genderOptSelected]}
                  onPress={() => setEditGender(editGender === v ? null : v)}
                >
                  <Text style={[s.genderOptText, editGender === v && { color: colors.primary }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Établissement</Text>
            <TextInput
              style={s.textInput}
              value={editInstitution}
              onChangeText={setEditInstitution}
              placeholder="CHU de Lyon…"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />

            <TouchableOpacity
              style={[s.toggleRow, editAnonymous && s.toggleRowActive]}
              onPress={() => setEditAnonymous(!editAnonymous)}
            >
              <View style={[s.checkbox, editAnonymous && s.checkboxActive]}>
                {editAnonymous && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Mode anonyme</Text>
                <Text style={s.toggleSub}>Seul le pseudo est visible</Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <TouchableOpacity style={[s.modalBtn, { flex: 1, backgroundColor: '#f4f4f5' }]} onPress={() => setEditing(false)}>
                <Text style={[s.modalBtnText, { color: '#374151' }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { flex: 2 }]} onPress={handleSave} disabled={saving}>
                <Text style={s.modalBtnText}>{saving ? 'Enregistrement…' : 'Sauvegarder'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.primary, paddingBottom: 20, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: Platform.OS === 'ios' ? 4 : 8, marginBottom: 16 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '700' as any, color: colors.primary },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: 'white', fontWeight: '900' as any, fontSize: 28 },
  cameraBtn: { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  displayName: { color: 'white', fontWeight: '900' as any, fontSize: 20, marginBottom: 6 },
  titleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginBottom: 4 },
  titleBadgeText: { fontSize: 12, fontWeight: '700' as any },
  institutionText: { color: 'rgba(167,243,208,0.85)', fontSize: 13, fontWeight: '600' as any },
  anonText: { color: 'rgba(167,243,208,0.7)', fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontWeight: '800' as any, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statValue: { fontWeight: '900' as any, fontSize: 20, color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' as any },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  emailRow: { fontSize: 15, color: colors.text },
  menuItem: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  menuIcon: { width: 34, alignItems: 'center' },
  menuEmoji: { fontSize: 20, marginRight: 14, width: 34, textAlign: 'center' },
  menuText: { flex: 1, fontSize: 16, fontWeight: '700' as any, color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted },
  signOutBtn: { backgroundColor: colors.errorBg, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: colors.error },
  signOutText: { color: colors.errorText, fontWeight: '700' as any, fontSize: 16 },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '900' as any, color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  modalScroll: { padding: 20, paddingBottom: 48 },
  fieldLabel: { fontWeight: '700' as any, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  textInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.bg, marginBottom: 4 },
  titleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  titleOpt: { width: '47%', backgroundColor: colors.bg, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', gap: 8 },
  titleOptSelected: { backgroundColor: '#e6f4f3', borderColor: colors.primary },
  titleOptEmoji: { fontSize: 18 },
  titleOptLabel: { fontSize: 13, fontWeight: '700' as any, color: colors.text },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderOpt: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', backgroundColor: 'white' },
  genderOptSelected: { borderColor: colors.primary, backgroundColor: '#e6f4f3' },
  genderOptText: { fontWeight: '700' as any, fontSize: 14, color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 12 },
  toggleRowActive: { borderColor: colors.primary, backgroundColor: '#e6f4f3' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d4d4d8', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: 'white', fontSize: 13, fontWeight: '900' as any },
  toggleLabel: { fontWeight: '700' as any, fontSize: 14, color: colors.text },
  toggleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  modalBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  modalBtnText: { color: 'white', fontWeight: '900' as any, fontSize: 15 },
})
