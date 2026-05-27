import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Image, Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native'
import { Star, Flame, Target, Users, MessageSquare, Pencil, Camera, Mail, Settings, Bell, Stethoscope, Syringe, Baby, HeartHandshake, GraduationCap, Sparkles, Building2, LogOut } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { getUserAllModuleStats, getProfile, upsertProfile, getActiveModules, getCaseCountsByModule, getModuleQuizCounts, getModuleQuizMasteredCounts } from '../../lib/queries'
import { ModuleIcon } from '../../components/ModuleIcon'
import { colors } from '../../constants/colors'
import { useI18n } from '../../lib/i18n'
import type { Module, Profile, ProfTitle } from '../../lib/types'

const TITLES: { value: ProfTitle; label: string; Icon: React.ComponentType<any> }[] = [
  { value: 'medecin',       label: 'Médecin',         Icon: Stethoscope    },
  { value: 'infirmier',     label: 'Infirmier(ère)',   Icon: Syringe        },
  { value: 'sage_femme',    label: 'Sage-femme',       Icon: Baby           },
  { value: 'aide_soignant', label: 'Aide-soignant(e)', Icon: HeartHandshake },
  { value: 'etudiant',      label: 'Étudiant(e)',      Icon: GraduationCap  },
  { value: 'autre',         label: 'Autre',            Icon: Sparkles       },
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
  const { t } = useI18n()
  const [userId, setUserId]     = useState('')
  const [email, setEmail]       = useState('')
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [xp, setXp]             = useState(0)
  const [streak, setStreak]     = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [modules, setModules]           = useState<Module[]>([])
  const [moduleStats, setModuleStats]   = useState<Record<string, number>>({})
  const [caseCounts, setCaseCounts]     = useState<Record<string, number>>({})
  const [quizCounts, setQuizCounts]     = useState<Record<string, number>>({})
  const [masteredCounts, setMasteredCounts] = useState<Record<string, number>>({})

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Edit modal
  const [editing, setEditing]                 = useState(false)
  const [editPseudo, setEditPseudo]           = useState('')
  const [editTitle, setEditTitle]             = useState<ProfTitle | null>(null)
  const [editGender, setEditGender]           = useState<'homme' | 'femme' | 'autre' | null>(null)
  const [editInstitution, setEditInstitution] = useState('')
  const [editAnonymous, setEditAnonymous]     = useState(false)
  const [editShowEmail, setEditShowEmail]     = useState(true)
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

    const [stats, prof, mods] = await Promise.all([
      getUserAllModuleStats(u.id),
      getProfile(u.id),
      getActiveModules(),
    ])
    setProfile(prof)
    setModules(mods)
    const statsMap: Record<string, number> = {}
    for (const s of stats) statsMap[s.module_id] = s.cases_completed ?? 0
    setModuleStats(statsMap)
    setXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
    setStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
    const totalQ = stats.reduce((acc, s) => acc + (s.total_quizzes_answered ?? 0), 0)
    const totalCorrect = stats.reduce((acc, s) => acc + Math.round((s.correct_rate ?? 0) * (s.total_quizzes_answered ?? 0)), 0)
    setAccuracy(totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0)

    const classicIds = mods.filter(m => m.category === 'classic').map(m => m.id)
    const [counts, qCounts, mastered] = await Promise.all([
      getCaseCountsByModule(mods.map(m => m.id)),
      getModuleQuizCounts(classicIds),
      classicIds.length > 0 ? getModuleQuizMasteredCounts(u.id, classicIds) : Promise.resolve({}),
    ])
    setCaseCounts(counts)
    setQuizCounts(qCounts)
    setMasteredCounts(mastered)
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
    setEditShowEmail(profile?.show_email ?? true)
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
        show_email: editShowEmail,
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
    Alert.alert(t.signOutTitle, t.signOutConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.signOutShort, style: 'destructive', onPress: async () => {
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
            <Text style={s.editBtnText}>{t.edit}</Text>
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
              <View style={[s.titleBadge, { backgroundColor: titleMeta.bg, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                <titleDef.Icon size={12} color={titleMeta.color} strokeWidth={2} />
                <Text style={[s.titleBadgeText, { color: titleMeta.color }]}>{titleDef.label}</Text>
              </View>
            )}
            {profile?.institution && !profile.is_anonymous && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <Building2 size={12} color={colors.textSecondary} strokeWidth={2} />
                <Text style={s.institutionText}>{profile.institution}</Text>
              </View>
            )}
            {profile?.is_anonymous && <Text style={s.anonText}>Mode anonyme</Text>}
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>{t.statistics}</Text>
        <View style={s.statsRow}>
          {[
            { Icon: Star, color: '#f59e0b', value: xp.toLocaleString(), label: t.xpTotal },
            { Icon: Flame, color: '#f97316', value: String(streak), label: t.streak },
            { Icon: Target, color: colors.primary, value: `${accuracy}%`, label: t.accuracy },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <stat.Icon size={16} color={stat.color} strokeWidth={2} style={{ marginBottom: 4 }} />
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>{t.moduleProgress}</Text>
        {modules.filter(mod => (mod.category ?? 'clinical') === 'clinical' && (caseCounts[mod.id] ?? 0) > 0).map(mod => {
          const count = caseCounts[mod.id] ?? 0
          const completed = moduleStats[mod.id] ?? 0
          const pct = count > 0 ? Math.min(100, Math.round((completed / count) * 100)) : 0
          return (
            <View key={mod.id} style={s.moduleCard}>
              <ModuleIcon icon={mod.icon} size={18} color="#0F766E" strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <Text style={s.moduleName}>{mod.name_fr}</Text>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
              <Text style={s.moduleScore}>{completed} / {count}</Text>
            </View>
          )
        })}
        {modules.filter(mod => mod.category === 'classic' && (quizCounts[mod.id] ?? 0) > 0).map(mod => {
          const qTotal = quizCounts[mod.id] ?? 0
          const qMastered = masteredCounts[mod.id] ?? 0
          const pct = qTotal > 0 ? Math.min(100, Math.round((qMastered / qTotal) * 100)) : 0
          return (
            <View key={mod.id} style={s.moduleCard}>
              <ModuleIcon icon={mod.icon} size={18} color="#0891b2" strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={s.moduleName}>{mod.name_fr}</Text>
                  <View style={s.classicBadge}><Text style={s.classicBadgeText}>Classique</Text></View>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFillClassic, { width: `${pct}%` as any }]} />
                </View>
              </View>
              <Text style={[s.moduleScore, { color: '#0891b2' }]}>{qMastered} / {qTotal}</Text>
            </View>
          )
        })}

        <Text style={s.sectionLabel}>{t.account}</Text>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
            <Mail size={18} color={colors.textMuted} strokeWidth={2} />
            <Text style={s.emailRow}>{email || '—'}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/friends')}>
          <View style={s.menuIcon}><Users size={20} color={colors.primary} strokeWidth={2} /></View>
          <Text style={s.menuText}>{t.friends}</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/feedback')}>
          <View style={s.menuIcon}><MessageSquare size={20} color={colors.primary} strokeWidth={2} /></View>
          <Text style={s.menuText}>{t.feedback}</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/settings')}>
          <View style={s.menuIcon}><Settings size={20} color={colors.primary} strokeWidth={2} /></View>
          <Text style={s.menuText}>{t.settings}</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/notifications')}>
          <View style={s.menuIcon}><Bell size={20} color={colors.primary} strokeWidth={2} /></View>
          <Text style={s.menuText}>{t.notifications}</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LogOut size={18} color={colors.errorText} strokeWidth={2} />
            <Text style={s.signOutText}>{t.signOut}</Text>
          </View>
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
                  <t.Icon size={20} color={editTitle === t.value ? colors.primary : colors.textMuted} strokeWidth={1.75} />
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
                <Text style={s.toggleSub}>Seul le pseudo est visible dans le classement</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toggleRow, { marginTop: 10 }, editShowEmail && s.toggleRowActive]}
              onPress={() => setEditShowEmail(!editShowEmail)}
            >
              <View style={[s.checkbox, editShowEmail && s.checkboxActive]}>
                {editShowEmail && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Afficher mon email</Text>
                <Text style={s.toggleSub}>Visible par tes amis uniquement</Text>
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
  card: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  emailRow: { fontSize: 15, color: colors.text },
  menuItem: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  menuIcon: { width: 34, alignItems: 'center' },
  menuText: { flex: 1, fontSize: 16, fontWeight: '700' as any, color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted },
  signOutBtn: { backgroundColor: colors.errorBg, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: colors.error },
  signOutText: { color: colors.errorText, fontWeight: '700' as any, fontSize: 16 },
  moduleCard: { backgroundColor: 'white', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  moduleName: { fontWeight: '700' as any, fontSize: 13, color: colors.text, marginBottom: 4 },
  moduleScore: { fontSize: 11, fontWeight: '900' as any, color: '#0F766E', minWidth: 36, textAlign: 'right' as any },
  progressBg: { height: 4, backgroundColor: colors.bg, borderRadius: 4 },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 4 },
  progressFillClassic: { height: 4, backgroundColor: '#0891b2', borderRadius: 4 },
  classicBadge: { backgroundColor: '#f0f9ff', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#bae6fd' },
  classicBadgeText: { fontSize: 9, fontWeight: '700' as any, color: '#0c4a6e' },
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
