import {
  Heart, Scan, ScanFace, Eye, Microscope, FlaskConical,
  Brain, Waves, Bone, Monitor, Box, Bug, Droplet,
  TestTube, ShieldAlert, Accessibility, HeartPulse,
  Activity, Zap, Pill, LayoutGrid,
} from 'lucide-react-native'
import type { LucideProps } from 'lucide-react-native'

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'heart':         Heart,
  'scan':          Scan,
  'scan-face':     ScanFace,
  'eye':           Eye,
  'microscope':    Microscope,
  'flask-conical': FlaskConical,
  'brain':         Brain,
  'waves':         Waves,
  'bone':          Bone,
  'monitor':       Monitor,
  'box':           Box,
  'bug':           Bug,
  'droplet':       Droplet,
  'test-tube':     TestTube,
  'shield-alert':  ShieldAlert,
  'accessibility': Accessibility,
  'heart-pulse':   HeartPulse,
  'activity':      Activity,
  'zap':           Zap,
  'pill':          Pill,
}

interface ModuleIconProps {
  icon: string | null | undefined
  size?: number
  color?: string
  strokeWidth?: number
}

export function ModuleIcon({ icon, size = 24, color = '#0F766E', strokeWidth = 2 }: ModuleIconProps) {
  const Component = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : LayoutGrid
  return <Component size={size} color={color} strokeWidth={strokeWidth} />
}
