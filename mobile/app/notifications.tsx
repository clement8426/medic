import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors } from '../constants/colors'

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    icon: '🔥',
    title: 'Streak en danger !',
    body: 'Vous n\'avez pas encore étudié aujourd\'hui. Ne perdez pas votre streak de 3 jours !',
    time: 'Il y a 2h',
    urgent: true,
  },
  {
    id: '2',
    icon: '🆕',
    title: 'Nouveau cas disponible',
    body: 'Un nouveau cas ECG vient d\'être ajouté dans le module Arythmies.',
    time: 'Hier',
    urgent: false,
  },
  {
    id: '3',
    icon: '👥',
    title: 'Votre ami vous dépasse !',
    body: 'Pierre D. vous a dépassé au classement. Étudiez pour reprendre la tête !',
    time: 'Il y a 2j',
    urgent: false,
  },
]

export default function NotificationsScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{MOCK_NOTIFICATIONS.length} notifications</Text>

        {MOCK_NOTIFICATIONS.map(notif => (
          <View key={notif.id} style={[styles.card, notif.urgent && styles.cardUrgent]}>
            <View style={styles.notifRow}>
              <View style={[styles.iconCircle, notif.urgent && styles.iconCircleUrgent]}>
                <Text style={styles.iconEmoji}>{notif.icon}</Text>
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifHeaderRow}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                <Text style={styles.notifBody}>{notif.body}</Text>
              </View>
            </View>
          </View>
        ))}
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleUrgent: {
    backgroundColor: colors.errorBg,
  },
  iconEmoji: {
    fontSize: 22,
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notifTitle: {
    fontWeight: '900' as any,
    fontSize: 15,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  notifTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600' as any,
  },
  notifBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
})
