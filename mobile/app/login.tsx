import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HeartPulse } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/queries'
import { colors } from '../constants/colors'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      Alert.alert('Connexion impossible', error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const profile = user ? await getProfile(user.id) : null
      router.replace(profile ? '/(tabs)/learn' : '/onboarding')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <HeartPulse size={52} color={colors.primary} strokeWidth={1.5} />
          <Text style={styles.logoText}>MEDIQ</Text>
        </View>

        <Text style={styles.title}>Se connecter</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/signup')}>
            <Text style={styles.linkText}>
              Pas encore de compte ?{' '}
              <Text style={styles.linkTextBold}>Créer un compte</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900' as any,
    color: colors.primary,
    letterSpacing: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900' as any,
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 8,
  },
  label: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 16,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: '700' as any,
  },
})
