import { useState, useEffect } from 'react'
import { View, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getCaseById } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { Case } from '../../lib/types'
import { resolveImageUrl } from '../../lib/image-utils'

export default function ImageFullscreenScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadImage()
  }, [id])

  async function loadImage() {
    const c = await getCaseById(id as string)
    if (c) {
      // Fetch module slug for correct bucket resolution
      const { data: mod } = await supabase
        .from('modules')
        .select('slug')
        .eq('id', c.module_id)
        .single()
      const slug = mod?.slug ?? 'ecg'
      setImageUrl(resolveImageUrl(c.image_url, slug))
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {loading ? (
        <ActivityIndicator size="large" color="white" />
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    flex: 1,
    resizeMode: 'contain',
  } as any,
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900' as any,
  },
})
