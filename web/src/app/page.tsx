import Link from 'next/link'
import {
  HeartPulse, Activity, Brain, Trophy, UserCheck,
  BarChart3, Globe, BookOpen, Stethoscope, ShieldCheck, Flame,
  Syringe, Baby, HeartHandshake, GraduationCap, Sparkles,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const FEATURES = [
  {
    Icon: Activity,
    color: '#ef4444', bg: '#fef2f2',
    title: 'ECG & Cas cliniques',
    desc: '347 cas réels issus de la base PTB-XL. Lisez un ECG, analysez les données patient, répondez aux QCM d\'expert.',
  },
  {
    Icon: Brain,
    color: '#8b5cf6', bg: '#f5f3ff',
    title: 'Révision espacée intelligente',
    desc: 'L\'algorithme SRS (SM-2) programme vos révisions au moment optimal. Un cas raté est verrouillé 24h pour ancrer la mémoire.',
  },
  {
    Icon: Trophy,
    color: '#f59e0b', bg: '#fffbeb',
    title: 'Classement & Communauté',
    desc: 'Comparez votre progression avec vos confrères. Classement global par XP, streaks, et profils professionnels.',
  },
  {
    Icon: ShieldCheck,
    color: '#0F766E', bg: '#f0fdf4',
    title: 'Conforme RGPD',
    desc: 'Mode anonyme, données protégées, droit à l\'effacement. Hébergé sur Supabase (Europe). Aucun cookie publicitaire.',
  },
]

const PROFILES: { Icon: React.ComponentType<LucideProps>; label: string }[] = [
  { Icon: Stethoscope,   label: 'Médecin' },
  { Icon: Syringe,       label: 'Infirmier(ère)' },
  { Icon: Baby,          label: 'Sage-femme' },
  { Icon: HeartHandshake,label: 'Aide-soignant(e)' },
  { Icon: GraduationCap, label: 'Étudiant(e)' },
  { Icon: Sparkles,      label: 'Tout professionnel de santé' },
]

const STATS = [
  { val: '347',   label: 'Cas cliniques réels', Icon: BookOpen },
  { val: '1 388', label: 'QCM validés',         Icon: BarChart3 },
  { val: '7',     label: 'Modules actifs',       Icon: Stethoscope },
  { val: '4',     label: 'Langues',              Icon: Globe },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#f4f7f8', minHeight: '100vh' }}>

      {/* Topbar */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e4e4e7',
        padding: '16px 48px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'linear-gradient(135deg,#0F766E,#0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HeartPulse size={20} color="white" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 900, fontSize: 20, color: '#0F766E', letterSpacing: -0.5 }}>MEDIQ</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{ fontWeight: 700, fontSize: 14, color: '#71717a', textDecoration: 'none' }}>
            Connexion
          </Link>
          <Link href="/signup" style={{
            background: 'linear-gradient(135deg,#0F766E,#0891b2)', color: 'white',
            padding: '10px 22px', borderRadius: 14, fontWeight: 900, fontSize: 14,
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(15,118,110,0.3)',
          }}>
            Commencer gratuitement
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
        padding: '80px 48px 100px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <span style={{
            background: 'rgba(255,255,255,0.12)', color: 'rgba(167,243,208,0.95)',
            fontSize: 12, fontWeight: 900, padding: '6px 18px', borderRadius: 99,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            display: 'inline-block', marginBottom: 28,
            border: '1px solid rgba(167,243,208,0.2)',
          }}>
            Plateforme de formation médicale
          </span>
          <h1 style={{ color: 'white', fontSize: 52, fontWeight: 900, margin: '0 0 20px', letterSpacing: -1.5, lineHeight: 1.1 }}>
            Maîtrisez la médecine<br />clinique, cas après cas
          </h1>
          <p style={{ color: 'rgba(167,243,208,0.85)', fontSize: 18, fontWeight: 600, lineHeight: 1.7, margin: '0 0 48px' }}>
            Cas réels, QCM experts et révision espacée intelligente.<br />
            Conçu pour les professionnels de santé et les étudiants.
          </p>

          {/* Social proof mini */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 40, flexWrap: 'wrap' }}>
            {[
              { Icon: BookOpen, text: '347 cas réels' },
              { Icon: Flame, text: 'Streaks & XP' },
              { Icon: UserCheck, text: 'Profil professionnel' },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(167,243,208,0.8)', fontSize: 14, fontWeight: 700 }}>
                <Icon size={15} color="rgba(167,243,208,0.8)" strokeWidth={2} />
                {text}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              background: 'white', color: '#0F766E', padding: '16px 36px',
              borderRadius: 18, fontWeight: 900, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}>
              Créer un compte gratuit →
            </Link>
            <Link href="/login" style={{
              background: 'rgba(255,255,255,0.1)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.25)',
              padding: '16px 36px', borderRadius: 18, fontWeight: 800, fontSize: 16, textDecoration: 'none',
            }}>
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e4e7', padding: '32px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <s.Icon size={20} color="#0F766E" strokeWidth={1.75} />
              </div>
              <div style={{ fontWeight: 900, fontSize: 32, color: '#0F766E', letterSpacing: -0.5 }}>{s.val}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ padding: '80px 48px', maxWidth: 1040, margin: '0 auto' }}>
        <h2 style={{ fontWeight: 900, fontSize: 36, color: '#09090b', margin: '0 0 12px', textAlign: 'center', letterSpacing: -0.5 }}>
          Une plateforme complète
        </h2>
        <p style={{ color: '#71717a', fontSize: 16, fontWeight: 600, textAlign: 'center', margin: '0 0 56px' }}>
          Conçu par des cliniciens, pour des professionnels de santé et des étudiants.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'white', borderRadius: 24, padding: '28px 32px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid #e4e4e7',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              }}>
                <f.Icon size={26} color={f.color} strokeWidth={1.75} />
              </div>
              <h3 style={{ fontWeight: 900, fontSize: 18, color: '#09090b', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#71717a', fontWeight: 600, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pour qui */}
      <section style={{ background: 'white', padding: '72px 48px', borderTop: '1px solid #e4e4e7', borderBottom: '1px solid #e4e4e7' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 900, fontSize: 32, color: '#09090b', margin: '0 0 12px', letterSpacing: -0.5 }}>
            Pour toute l&apos;équipe soignante
          </h2>
          <p style={{ color: '#71717a', fontSize: 15, fontWeight: 600, margin: '0 0 40px' }}>
            Créez votre profil professionnel et rejoignez la communauté MEDIQ.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {PROFILES.map(p => (
              <div key={p.label} style={{
                background: '#f4f7f8', borderRadius: 99, padding: '10px 20px',
                display: 'flex', alignItems: 'center', gap: 8,
                fontWeight: 700, fontSize: 14, color: '#374151',
                border: '1.5px solid #e4e4e7',
              }}>
                <p.Icon size={16} color="#0F766E" strokeWidth={1.75} />
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{
          background: 'linear-gradient(135deg,#0F766E,#0891b2)',
          padding: '64px 48px', textAlign: 'center',
          borderRadius: 32, maxWidth: 960, margin: '0 auto',
          boxShadow: '0 8px 40px rgba(15,118,110,0.25)',
        }}>
          <h2 style={{ color: 'white', fontSize: 36, fontWeight: 900, margin: '0 0 16px', letterSpacing: -0.5 }}>
            Prêt à progresser ?
          </h2>
          <p style={{ color: 'rgba(167,243,208,0.85)', fontSize: 16, fontWeight: 600, margin: '0 0 36px', lineHeight: 1.6 }}>
            Gratuit, sans carte bancaire. Commencez avec le module ECG<br />et suivez votre progression en temps réel.
          </p>
          <Link href="/signup" style={{
            background: 'white', color: '#0F766E', padding: '16px 44px',
            borderRadius: 18, fontWeight: 900, fontSize: 16, textDecoration: 'none',
            display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            Créer un compte gratuit
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '28px 48px',
        borderTop: '1px solid #e4e4e7', background: 'white',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 24, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
          © 2026 MEDIQ · Pour professionnels de santé et étudiants
        </span>
        <Link href="/rgpd" style={{ color: '#0F766E', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Politique de confidentialité
        </Link>
        <a href="mailto:contact@mediq.app" style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          contact@mediq.app
        </a>
      </footer>
    </div>
  )
}
