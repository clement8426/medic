import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { colors } from '../constants/colors'

const LANGUAGES = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
]

export default function SettingsScreen() {
  const router = useRouter()
  const [lang, setLang] = useState('fr')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  async function handleSignOut() {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            await supabase.auth.signOut()
            setLoading(false)
            router.replace('/')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Langue</Text>
        <View style={styles.card}>
          {LANGUAGES.map((l, idx) => (
            <TouchableOpacity
              key={l.code}
              style={[
                styles.langOption,
                idx < LANGUAGES.length - 1 && styles.langOptionBorder,
              ]}
              onPress={() => setLang(l.code)}
            >
              <Text style={styles.langLabel}>{l.label}</Text>
              {lang === l.code && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkCircleText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Compte</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <Text style={styles.accountIcon}>📧</Text>
            <View>
              <Text style={styles.accountLabel}>Email</Text>
              <Text style={styles.accountValue}>{email || '—'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.signOutText}>
            {loading ? 'Déconnexion...' : '🚪 Se déconnecter'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  backIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: '700' as any,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900' as any,
    color: 'white',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 4,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  langOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  langLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600' as any,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 13,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  accountIcon: {
    fontSize: 22,
  },
  accountLabel: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600' as any,
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: colors.errorBg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  signOutText: {
    color: colors.errorText,
    fontWeight: '700' as any,
    fontSize: 16,
  },
})
