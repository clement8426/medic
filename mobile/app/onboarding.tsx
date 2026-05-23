import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors } from '../constants/colors'

const SPECIALTIES = [
  { value: 'cardiologue', label: '🫀 Cardiologue' },
  { value: 'interne', label: '🏥 Interne' },
  { value: 'urgentiste', label: '🚨 Urgentiste' },
  { value: 'etudiant', label: '📚 Étudiant' },
  { value: 'autre', label: '⚕️ Autre' },
]

const GOALS = [
  { value: 1, label: '1 cas/j', sub: 'Détendu' },
  { value: 3, label: '3 cas/j', sub: 'Régulier' },
  { value: 5, label: '5 cas/j', sub: 'Ambitieux' },
  { value: 10, label: '10 cas/j', sub: 'Intensif' },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [goal, setGoal] = useState<number | null>(null)

  function handleContinue() {
    if (step === 1) {
      if (!specialty) return
      setStep(2)
    } else {
      if (!goal) return
      router.replace('/(tabs)/learn')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.title}>Quelle est votre spécialité ?</Text>
            <Text style={styles.subtitle}>Nous adapterons votre expérience</Text>

            <View style={styles.grid}>
              {SPECIALTIES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.optionCard, specialty === s.value && styles.optionCardSelected]}
                  onPress={() => setSpecialty(s.value)}
                >
                  <Text style={[styles.optionLabel, specialty === s.value && styles.optionLabelSelected]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Votre objectif quotidien</Text>
            <Text style={styles.subtitle}>Combien de cas voulez-vous traiter par jour ?</Text>

            <View style={styles.grid}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.optionCard, goal === g.value && styles.optionCardSelected]}
                  onPress={() => setGoal(g.value)}
                >
                  <Text style={[styles.optionValue, goal === g.value && styles.optionValueSelected]}>
                    {g.label}
                  </Text>
                  <Text style={[styles.optionSub, goal === g.value && styles.optionSubSelected]}>
                    {g.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            ((step === 1 && !specialty) || (step === 2 && !goal)) && styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={(step === 1 && !specialty) || (step === 2 && !goal)}
        >
          <Text style={styles.primaryButtonText}>
            {step === 1 ? 'Continuer →' : 'Commencer !'}
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900' as any,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  optionCard: {
    width: '47%',
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#e6f4f3',
    borderColor: colors.primary,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700' as any,
    color: colors.text,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: colors.primaryDark,
  },
  optionValue: {
    fontSize: 18,
    fontWeight: '900' as any,
    color: colors.text,
    marginBottom: 4,
  },
  optionValueSelected: {
    color: colors.primaryDark,
  },
  optionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600' as any,
  },
  optionSubSelected: {
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 16,
  },
})
