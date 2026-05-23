import Link from 'next/link'
import { HeartPulse, Activity, FlaskConical, Stethoscope, RefreshCw, BarChart3, Globe, BookOpen } from 'lucide-react'

const FEATURES = [
  {
    Icon: Activity,
    color: '#ef4444', bg: '#fef2f2',
    title: 'ECG & Cardiologie',
    desc: 'Lisez un ECG comme un cardiologue sénior. 347 cas réels PTB-XL.',
  },
  {
    Icon: FlaskConical,
    color: '#8b5cf6', bg: '#f5f3ff',
    title: 'Biochimie clinique',
    desc: 'Interprétez bilans sanguins et ionogrammes avec confiance.',
  },
  {
    Icon: Stethoscope,
    color: '#0891b2', bg: '#f0f9ff',
    title: '7 modules médicaux',
    desc: 'Dermato, Pneumo, Néphro, COVID, Pharmacologie et plus.',
  },
  {
    Icon: RefreshCw,
    color: '#0F766E', bg: '#f0fdf4',
    title: 'Révision espacée SRS',
    desc: 'Algorithme SM-2 pour mémoriser durablement chaque cas.',
  },
]

const STATS = [
  { val: '347',   label: 'Cas cliniques réels', Icon: BookOpen  },
  { val: '1 388', label: 'QCM validés',         Icon: BarChart3 },
  { val: '7',     label: 'Modules actifs',       Icon: Stethoscope },
  { val: '4',     label: 'Langues disponibles',  Icon: Globe    },
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
            textDecoration: 'none', borderBottom: '3px solid #0a5550',
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
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <span style={{
            background: 'rgba(255,255,255,0.15)', color: 'rgba(167,243,208,0.9)',
            fontSize: 12, fontWeight: 900, padding: '6px 18px', borderRadius: 99,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            display: 'inline-block', marginBottom: 28,
          }}>
            Medical Learning Platform
          </span>
          <h1 style={{ color: 'white', fontSize: 52, fontWeight: 900, margin: '0 0 20px', letterSpacing: -1.5, lineHeight: 1.1 }}>
            Apprenez la médecine<br />comme Duolingo
          </h1>
          <p style={{ color: 'rgba(167,243,208,0.8)', fontSize: 18, fontWeight: 600, lineHeight: 1.7, margin: '0 0 40px' }}>
            Cas cliniques réels, QCM experts, révision espacée intelligente.<br />
            Progressez 5 minutes par jour sur 7 modules médicaux.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              background: 'white', color: '#0F766E', padding: '16px 36px',
              borderRadius: 18, fontWeight: 900, fontSize: 16, textDecoration: 'none',
              borderBottom: '4px solid #d4d4d8', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              Essayer gratuitement →
            </Link>
            <Link href="/login" style={{
              background: 'rgba(255,255,255,0.1)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.2)',
              padding: '16px 36px', borderRadius: 18, fontWeight: 800, fontSize: 16, textDecoration: 'none',
            }}>
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e4e7', padding: '28px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <s.Icon size={20} color="#0F766E" strokeWidth={1.75} />
              </div>
              <div style={{ fontWeight: 900, fontSize: 32, color: '#0F766E', letterSpacing: -0.5 }}>{s.val}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ padding: '80px 48px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontWeight: 900, fontSize: 36, color: '#09090b', margin: '0 0 12px', textAlign: 'center', letterSpacing: -0.5 }}>
          Tout ce dont vous avez besoin
        </h2>
        <p style={{ color: '#71717a', fontSize: 16, fontWeight: 600, textAlign: 'center', margin: '0 0 56px' }}>
          Conçu par des médecins, pour des médecins et des étudiants.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'white', borderRadius: 24, padding: '28px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid #e4e4e7',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
              }}>
                <f.Icon size={26} color={f.color} strokeWidth={1.75} />
              </div>
              <h3 style={{ fontWeight: 900, fontSize: 18, color: '#09090b', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#71717a', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: 'linear-gradient(135deg,#0F766E,#0891b2)',
        padding: '64px 48px', textAlign: 'center',
        margin: '0 48px 80px', borderRadius: 32,
      }}>
        <h2 style={{ color: 'white', fontSize: 32, fontWeight: 900, margin: '0 0 16px', letterSpacing: -0.5 }}>
          Prêt à progresser ?
        </h2>
        <p style={{ color: 'rgba(167,243,208,0.8)', fontSize: 16, fontWeight: 600, margin: '0 0 32px' }}>
          Gratuit, sans carte bancaire. Commencez avec le module ECG.
        </p>
        <Link href="/signup" style={{
          background: 'white', color: '#0F766E', padding: '16px 40px',
          borderRadius: 18, fontWeight: 900, fontSize: 16, textDecoration: 'none',
          borderBottom: '4px solid #d4d4d8', display: 'inline-block',
        }}>
          Créer un compte gratuit
        </Link>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
        © 2026 MEDIQ · Pour professionnels de santé et étudiants
      </footer>
    </div>
  )
}
