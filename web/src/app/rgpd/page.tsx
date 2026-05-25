export default function RgpdPage() {
  const section = (title: string, content: React.ReactNode) => (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b', marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #f4f4f5' }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75 }}>{content}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f8', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#0F766E,#134e4a)', padding: '40px 32px', color: 'white' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(167,243,208,0.7)', marginBottom: 8 }}>
            Légal
          </div>
          <div style={{ fontWeight: 900, fontSize: 28, marginBottom: 6 }}>Politique de confidentialité</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            Dernière mise à jour : 25 mai 2026 · Conforme au Règlement Général sur la Protection des Données (RGPD)
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ background: 'white', borderRadius: 22, border: '1px solid #e4e4e7', padding: '36px 40px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {section('1. Responsable du traitement', <>
            <p style={{ margin: '0 0 8px' }}>
              <strong>MEDIQ</strong> est une plateforme de formation médicale destinée aux professionnels de santé.
            </p>
            <p style={{ margin: 0 }}>
              Contact : <a href="mailto:contact@mediq.app" style={{ color: '#0F766E', fontWeight: 700 }}>contact@mediq.app</a>
            </p>
          </>)}

          {section('2. Données collectées', <>
            <p style={{ margin: '0 0 12px' }}>Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme :</p>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Données d&apos;identification</strong> : adresse email (obligatoire pour la création de compte)</li>
              <li><strong>Données de profil</strong> : pseudo, titre professionnel, genre (optionnel), établissement (optionnel)</li>
              <li><strong>Données de progression</strong> : réponses aux quiz, scores, streaks, XP, dates d&apos;activité</li>
              <li><strong>Données techniques</strong> : cookies de session Supabase Auth (authentification uniquement)</li>
            </ul>
            <p style={{ margin: '12px 0 0', color: '#71717a', fontSize: 13 }}>
              Nous ne collectons pas de données de localisation, de données médicales personnelles, ni de données de navigation tiers.
            </p>
          </>)}

          {section('3. Finalités du traitement', <>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Authentification et gestion de votre compte</li>
              <li>Suivi de votre progression pédagogique (algorithme de répétition espacée)</li>
              <li>Affichage dans le classement et mise en relation avec des collègues</li>
              <li>Amélioration de la plateforme (analyse agrégée et anonymisée)</li>
            </ul>
          </>)}

          {section('4. Base légale', <>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : données nécessaires au fonctionnement du service</li>
              <li><strong>Consentement</strong> (art. 6.1.a RGPD) : données de profil optionnelles et partage dans le classement</li>
            </ul>
          </>)}

          {section('5. Partage des données', <>
            <p style={{ margin: '0 0 12px' }}>Vos données ne sont <strong>jamais vendues</strong> à des tiers. Elles peuvent être partagées avec :</p>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Supabase</strong> (infrastructure de base de données et authentification) — hébergement en Europe</li>
              <li><strong>Autres utilisateurs MEDIQ</strong> : pseudo, titre professionnel et établissement (sauf si mode anonyme activé)</li>
            </ul>
          </>)}

          {section('6. Durée de conservation', <>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Données de compte : conservées pendant la durée d&apos;utilisation du service + 3 ans après la dernière connexion</li>
              <li>Données de progression : conservées pendant la durée d&apos;utilisation du service</li>
              <li>En cas de suppression de compte : toutes les données sont effacées sous 30 jours</li>
            </ul>
          </>)}

          {section('7. Vos droits (RGPD)', <>
            <p style={{ margin: '0 0 12px' }}>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong>Droit de rectification</strong> : corriger vos informations depuis les Paramètres</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de votre compte et de toutes vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
              <li><strong>Droit de retrait du consentement</strong> : à tout moment pour les données optionnelles</li>
            </ul>
            <p style={{ margin: '12px 0 0' }}>
              Pour exercer ces droits : <a href="mailto:contact@mediq.app" style={{ color: '#0F766E', fontWeight: 700 }}>contact@mediq.app</a>
              {' '}— réponse sous 30 jours. En cas de litige, vous pouvez saisir la{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#0F766E', fontWeight: 700 }}>CNIL</a>.
            </p>
          </>)}

          {section('8. Sécurité', <>
            <p style={{ margin: 0 }}>
              Les données sont chiffrées en transit (HTTPS/TLS) et au repos. L&apos;authentification est gérée par Supabase Auth avec des tokens sécurisés. Les mots de passe ne sont jamais stockés en clair.
            </p>
          </>)}

          {section('9. Cookies', <>
            <p style={{ margin: 0 }}>
              Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service (session d&apos;authentification). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.
            </p>
          </>)}

          {section('10. Modifications', <>
            <p style={{ margin: 0 }}>
              Toute modification substantielle de cette politique vous sera notifiée par email ou à la prochaine connexion. La date de mise à jour est indiquée en haut de cette page.
            </p>
          </>)}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#94a3b8' }}>
          <a href="/dashboard" style={{ color: '#0F766E', fontWeight: 700, textDecoration: 'none' }}>← Retour à l&apos;application</a>
        </div>
      </div>
    </div>
  )
}
