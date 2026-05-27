import { useRef, useState, useEffect } from 'react'
import { View, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, StatusBar, Animated, PanResponder, Dimensions } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getCaseById } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { Case } from '../../lib/types'
import { resolveImageUrl } from '../../lib/image-utils'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

function getDistance(t0: { pageX: number; pageY: number }, t1: { pageX: number; pageY: number }) {
  const dx = t0.pageX - t1.pageX
  const dy = t0.pageY - t1.pageY
  return Math.sqrt(dx * dx + dy * dy)
}

function clampTranslation(x: number, y: number, s: number) {
  const maxX = Math.max(0, (SCREEN_W * s - SCREEN_W) / 2)
  const maxY = Math.max(0, (SCREEN_H * s - SCREEN_H) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}

export default function ImageFullscreenScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const scale = useRef(new Animated.Value(1)).current
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current

  // These refs track the CURRENT live values during gestures
  const curScale = useRef(1)
  const curX = useRef(0)
  const curY = useRef(0)
  const lastDist = useRef(0)
  const lastTouchX = useRef(0)
  const lastTouchY = useRef(0)
  const isPinching = useRef(false)

  useEffect(() => {
    if (!id) return
    loadImage()
  }, [id])

  async function loadImage() {
    const c = await getCaseById(id as string)
    if (c) {
      const { data: mod } = await supabase
        .from('modules')
        .select('slug')
        .eq('id', c.module_id)
        .single()
      setImageUrl(resolveImageUrl(c.image_url, mod?.slug ?? 'ecg'))
    }
    setLoading(false)
  }

  function resetZoom() {
    curScale.current = 1
    curX.current = 0
    curY.current = 0
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false }),
    ]).start()
  }

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches
      if (touches.length >= 2) {
        isPinching.current = true
        lastDist.current = getDistance(touches[0] as any, touches[1] as any)
      } else {
        isPinching.current = false
        lastTouchX.current = touches[0].pageX
        lastTouchY.current = touches[0].pageY
      }
    },

    onPanResponderMove: (evt) => {
      const touches = evt.nativeEvent.touches

      if (touches.length >= 2) {
        // --- PINCH ---
        isPinching.current = true
        const dist = getDistance(touches[0] as any, touches[1] as any)

        if (lastDist.current > 0) {
          const ratio = dist / lastDist.current
          const newScale = Math.min(10, Math.max(1, curScale.current * ratio))

          const clamped = clampTranslation(curX.current, curY.current, newScale)

          // Update live refs immediately — this is the key fix
          curScale.current = newScale
          curX.current = clamped.x
          curY.current = clamped.y

          scale.setValue(newScale)
          translateX.setValue(clamped.x)
          translateY.setValue(clamped.y)
        }

        lastDist.current = dist
        // Keep midpoint for when we transition back to single finger
        lastTouchX.current = (touches[0].pageX + touches[1].pageX) / 2
        lastTouchY.current = (touches[0].pageY + touches[1].pageY) / 2

      } else if (touches.length === 1) {
        if (isPinching.current) {
          // Finger lifted during pinch — reset reference to current touch
          isPinching.current = false
          lastDist.current = 0
          lastTouchX.current = touches[0].pageX
          lastTouchY.current = touches[0].pageY
          return
        }

        if (curScale.current <= 1.05) return

        // --- PAN ---
        const dx = touches[0].pageX - lastTouchX.current
        const dy = touches[0].pageY - lastTouchY.current
        const clamped = clampTranslation(curX.current + dx, curY.current + dy, curScale.current)

        curX.current = clamped.x
        curY.current = clamped.y
        translateX.setValue(clamped.x)
        translateY.setValue(clamped.y)

        lastTouchX.current = touches[0].pageX
        lastTouchY.current = touches[0].pageY
      }
    },

    onPanResponderRelease: () => {
      isPinching.current = false
      lastDist.current = 0

      if (curScale.current <= 1.05) {
        resetZoom()
      }
    },

    onPanResponderTerminate: () => {
      isPinching.current = false
      lastDist.current = 0
    },
  })).current

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" hidden />

      {loading ? (
        <ActivityIndicator size="large" color="white" />
      ) : (
        <View style={styles.imageWrapper} {...panResponder.panHandlers}>
          <Animated.Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              { transform: [{ scale }, { translateX }, { translateY }] },
            ]}
            resizeMode="contain"
          />
        </View>
      )}

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.hint}>
        <Text style={styles.hintText}>Pince pour zoomer · Glisse pour déplacer</Text>
      </View>
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
  imageWrapper: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
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
  hint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600' as any,
  },
})
