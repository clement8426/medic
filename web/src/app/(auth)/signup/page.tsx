'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [done,     setDone]     = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8)  { setError('Mot de passe trop court (min. 8 caractères)'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { setDone(true); setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid #e4e4e7',
    fontSize: 14, fontWeight: 600, color: '#09090b', outline: 'none',
    boxSizing: 'border-box', background: '#fafafa', fontFamily: 'system-ui,sans-serif',
  }

  const FIELDS = [
    { label: 'Email',                    type: 'email',    value: email,    setter: setEmail,    placeholder: 'vous@hopital.fr' },
    { label: 'Mot de passe',             type: 'password', value: password, setter: setPassword, placeholder: '8 caractères minimum' },
    { label: 'Confirmer le mot de passe', type: 'password', value: confirm,  setter: setConfirm,  placeholder: '••••••••' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#0F766E,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>❤️</div>
          <h1 style={{ fontWeight: 900, fontSize: 26, color: '#09090b', margin: '0 0 6px', letterSpacing: -0.5 }}>Créer un compte</h1>
          <p style={{ color: '#71717a', fontSize: 14, fontWeight: 600, margin: 0 }}>Commencez à apprendre gratuitement</p>
        </div>

        <div style={{ background: 'white', borderRadius: 24, padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e4e4e7' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontWeight: 900, fontSize: 20, color: '#09090b', margin: '0 0 8px' }}>Confirmez votre email</h2>
              <p style={{ color: '#71717a', fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>Un lien a été envoyé à <strong>{email}</strong>.</p>
              <button onClick={() => router.push('/login')}
                style={{ marginTop: 24, background: 'linear-gradient(135deg,#0F766E,#0891b2)', color: 'white', border: 'none', borderRadius: 14, padding: '12px 28px', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                Aller à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '12px 16px', color: '#991b1b', fontSize: 13, fontWeight: 700 }}>
                  {error}
                </div>
              )}
              {FIELDS.map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: 12, color: '#52525b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} required placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <button type="submit" disabled={loading}
                style={{ padding: '16px 0', borderRadius: 16, border: 'none', borderBottom: '4px solid #0a5550', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#0F766E,#0891b2)', color: 'white', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(15,118,110,0.25)' }}>
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color: '#0F766E', fontWeight: 900, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
