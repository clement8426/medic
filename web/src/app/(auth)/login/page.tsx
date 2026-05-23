'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  async function handleMagicLink() {
    if (!email) { setError("Entrez votre email d'abord"); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { setError(error.message); setLoading(false) }
    else { setMagicSent(true); setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid #e4e4e7',
    fontSize: 14, fontWeight: 600, color: '#09090b', outline: 'none',
    boxSizing: 'border-box', background: '#fafafa', fontFamily: 'system-ui,sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#0F766E,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>❤️</div>
          <h1 style={{ fontWeight: 900, fontSize: 26, color: '#09090b', margin: '0 0 6px', letterSpacing: -0.5 }}>Bienvenue sur MEDIQ</h1>
          <p style={{ color: '#71717a', fontSize: 14, fontWeight: 600, margin: 0 }}>Connectez-vous pour continuer à apprendre</p>
        </div>

        <div style={{ background: 'white', borderRadius: 24, padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e4e4e7' }}>
          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontWeight: 900, fontSize: 20, color: '#09090b', margin: '0 0 8px' }}>Lien envoyé !</h2>
              <p style={{ color: '#71717a', fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>Vérifiez votre boîte mail à <strong>{email}</strong>.</p>
              <button onClick={() => setMagicSent(false)} style={{ marginTop: 24, color: '#0F766E', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Revenir à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '12px 16px', color: '#991b1b', fontSize: 13, fontWeight: 700 }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: 12, color: '#52525b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@hopital.fr" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: 12, color: '#52525b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
              </div>

              <button type="submit" disabled={loading}
                style={{ padding: '16px 0', borderRadius: 16, border: 'none', borderBottom: '4px solid #0a5550', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#0F766E,#0891b2)', color: 'white', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(15,118,110,0.25)' }}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#e4e4e7' }} />
                <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>ou</span>
                <div style={{ flex: 1, height: 1, background: '#e4e4e7' }} />
              </div>

              <button type="button" onClick={handleMagicLink} disabled={loading}
                style={{ padding: '14px 0', borderRadius: 16, border: '2px solid #e4e4e7', background: 'white', color: '#52525b', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                ✉️ Lien magique par email
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
          Pas encore de compte ?{' '}
          <Link href="/signup" style={{ color: '#0F766E', fontWeight: 900, textDecoration: 'none' }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
