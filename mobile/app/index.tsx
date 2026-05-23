import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors } from '../constants/colors'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>❤️</Text>
          <Text style={styles.logoText}>MEDIQ</Text>
        </View>

        <Text style={styles.title}>Apprenez la médecine autrement</Text>
        <Text style={styles.description}>
          Maîtrisez l'ECG et la médecine clinique grâce à des cas réels et des quiz adaptatifs.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/signup')}>
          <Text style={styles.primaryButtonText}>Commencer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.secondaryButtonText}>J'ai déjà un compte</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900' as any,
    color: colors.primary,
    letterSpacing: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900' as any,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700' as any,
    fontSize: 16,
  },
})
