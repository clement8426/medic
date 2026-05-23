import { useEffect } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'

export default function QuizFeedbackScreen() {
  const router = useRouter()
  useEffect(() => {
    router.back()
  }, [])
  return <View />
}
