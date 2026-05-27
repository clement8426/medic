import { Stack } from 'expo-router'
import { LanguageProvider } from '../lib/i18n'

export default function RootLayout() {
  return (
    <LanguageProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="module/[slug]" />
      <Stack.Screen name="case/[id]" />
      <Stack.Screen name="quiz/[id]" />
      <Stack.Screen name="session/recap" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="image/[id]" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
    </LanguageProvider>
  )
}
