// Audit groupé par module
const BASE = 'https://pgvabchefwdnbwkpealg.supabase.co'
const KEY  = 'sb_publishable_0OxZwXAvOP3Dq6gTXMfU3A_vmuG-kjk'
const H    = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function get(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`${r.status} — ${path}`)
  return r.json()
}

function field(quiz, f) {
  return quiz[`${f}_fr`] || quiz[f] || null
}

// ── terminal colors ──────────────────────────────────────────────────────────
const red    = s => `\x1b[31m${s}\x1b[0m`
const green  = s => `\x1b[32m${s}\x1b[0m`
const yellow = s => `\x1b[33m${s}\x1b[0m`
const cyan   = s => `\x1b[36m${s}\x1b[0m`
const bold   = s => `\x1b[1m${s}\x1b[0m`
const gray   = s => `\x1b[90m${s}\x1b[0m`
const magenta= s => `\x1b[35m${s}\x1b[0m`

async function main() {
  const [modules, cases, quizzes] = await Promise.all([
    get('modules?select=*&order=sort_order'),
    get('cases?select=*&order=module_id,case_number'),
    get('quizzes?select=*&order=case_id,step'),
  ])

  // Index quizzes by case_id
  const qByCase = {}
  for (const q of quizzes) {
    if (!qByCase[q.case_id]) qByCase[q.case_id] = []
    qByCase[q.case_id].push(q)
  }

  // Index cases by module_id
  const cByMod = {}
  for (const c of cases) {
    if (!cByMod[c.module_id]) cByMod[c.module_id] = []
    cByMod[c.module_id].push(c)
  }

  console.log(bold('\n══════════════════════════════════════════════════════'))
  console.log(bold('  AUDIT CAS & QUIZ — GROUPÉ PAR MODULE'))
  console.log(bold(`  ${modules.length} modules · ${cases.length} cas · ${quizzes.length} quizzes`))
  console.log(bold('══════════════════════════════════════════════════════\n'))

  const globalStats = {
    casTotal: 0, casOk: 0, casNoQuiz: 0, casNoReport: 0,
    quizTotal: 0, quizOk: 0, quizErreur: 0,
    erreurs: [], difficulty5: [], missingReport: [], noQuiz: []
  }

  for (const mod of modules) {
    const modCases = cByMod[mod.id] ?? []
    if (modCases.length === 0) {
      console.log(`${gray('○')} ${bold(mod.name_fr)} ${gray(`[${mod.slug}]`)} — ${yellow('aucun cas')}\n`)
      continue
    }

    // Stats du module
    let modCasOk = 0, modCasErr = 0
    const modProblems = []

    for (const cas of modCases) {
      const qs    = qByCase[cas.id] ?? []
      const id    = `${mod.slug}/#${cas.case_number}`
      const cErrors = []
      const cWarns  = []

      // ── Vérif cas ──────────────────────────────────────────────────
      if (!cas.report_fr)            cErrors.push('report_fr manquant')
      if (cas.difficulty < 1 || cas.difficulty > 3) cWarns.push(`difficulty=${cas.difficulty} (doit être 1-3)`)
      if (!cas.image_url && !cas.focus_urls) cWarns.push('image_url vide')

      // ── Quizzes ────────────────────────────────────────────────────
      if (qs.length === 0) {
        cErrors.push('0 quiz')
        globalStats.noQuiz.push(id)
      } else {
        // Vérif steps
        const steps = qs.map(q => q.step).sort((a,b)=>a-b)
        for (let i=0; i<steps.length; i++) {
          if (steps[i] !== i+1) { cWarns.push(`steps=[${steps.join(',')}] (attendu 1..${steps.length})`); break }
        }

        for (const quiz of qs) {
          const q   = field(quiz, 'question')
          const ok  = field(quiz, 'correct')
          const ds  = field(quiz, 'distractors') ?? []

          if (!q)  cErrors.push(`step${quiz.step}: question_fr manquante`)
          if (!ok) cErrors.push(`step${quiz.step}: correct_fr manquant`)
          if (!ds || ds.length === 0) cErrors.push(`step${quiz.step}: distractors_fr vide`)

          // correct dans distractors
          if (ok && ds.length > 0) {
            const okLc = ok.trim().toLowerCase()
            const match = ds.find(d => d.trim().toLowerCase() === okLc)
            if (match) cErrors.push(`step${quiz.step}: "${ok}" est aussi dans distractors — sera sélectionnable 2×`)
          }

          // doublon dans distractors
          if (ds.length > 0) {
            const seen = new Set()
            for (const d of ds) {
              const k = d.trim().toLowerCase()
              if (seen.has(k)) cErrors.push(`step${quiz.step}: distractor dupliqué "${d}"`)
              seen.add(k)
            }
          }

          // < 3 distractors → seulement 2 choix si correct non présent
          if (ds.length < 3) cWarns.push(`step${quiz.step}: ${ds.length} distracteur(s) seulement`)

          globalStats.quizTotal++
          if (cErrors.length === 0) globalStats.quizOk++
          else globalStats.quizErreur++
        }
      }

      globalStats.casTotal++
      if (cErrors.length > 0) {
        modCasErr++
        if (!cas.report_fr) globalStats.missingReport.push(id)
        if (cas.difficulty > 3) globalStats.difficulty5.push(id)
        modProblems.push({ cas, qs, cErrors, cWarns })
      } else if (cWarns.length > 0) {
        modCasErr++
        modProblems.push({ cas, qs, cErrors, cWarns })
      } else {
        modCasOk++
        globalStats.casOk++
      }
    }

    // ── Header module ──────────────────────────────────────────────────────
    const allOk  = modCasErr === 0
    const icon   = allOk ? green('✓') : modCasErr > modCases.length/2 ? red('✗') : yellow('⚠')
    console.log(`${icon} ${bold(mod.name_fr)} ${gray(`[${mod.slug}]`)}`)
    console.log(`  ${cyan(`${modCases.length} cas`)} · ${green(`${modCasOk} ok`)} · ${modCasErr > 0 ? red(`${modCasErr} à corriger`) : gray('0 à corriger')}`)

    // ── Détail problèmes ───────────────────────────────────────────────────
    if (modProblems.length > 0) {
      // N'afficher que si ERREURS (pas juste warns) ou si peu de cas
      const hasRealErrors = modProblems.some(p => p.cErrors.length > 0)
      for (const { cas, qs, cErrors, cWarns } of modProblems) {
        const prefix = `  #${cas.case_number} (${cas.age}a, ${cas.sex})`
        for (const e of cErrors) console.log(`  ${red('ERR')} ${prefix} — ${e}`)
        for (const w of cWarns)  console.log(`  ${yellow('WRN')} ${prefix} — ${w}`)
      }
    } else {
      // Tout OK → afficher le détail des quizzes pour validation
      for (const cas of modCases) {
        const qs = qByCase[cas.id] ?? []
        console.log(`\n  ${green('✓')} Cas #${cas.case_number} — ${gray(cas.report_fr?.slice(0,70) ?? '—')}`)
        for (const quiz of qs) {
          const q  = field(quiz, 'question')
          const ok = field(quiz, 'correct')
          const ds = field(quiz, 'distractors') ?? []
          const eOk = field(quiz, 'explanation_correct')
          console.log(`    ${gray(`step${quiz.step}`)} [${magenta(quiz.theme)}] ${q?.slice(0,65) ?? '?'}`)
          console.log(`      ${green('✓')} ${ok ?? '—'}`)
          console.log(`      ${gray('✗')} ${ds.join(' | ')}`)
          if (eOk) console.log(`      ${gray('💡')} ${eOk.slice(0,80)}`)
        }
      }
    }
    console.log()
  }

  // ════════════════════════ RÉSUMÉ ═══════════════════════════════════════════
  console.log(bold('══════════════════════════════════════════════════════'))
  console.log(bold(' RÉSUMÉ GLOBAL'))
  console.log(bold('══════════════════════════════════════════════════════'))
  console.log(`  Modules    : ${modules.length}`)
  console.log(`  Cas        : ${globalStats.casTotal}  (${green(globalStats.casOk + ' ok')} / ${red((globalStats.casTotal - globalStats.casOk) + ' à corriger')})`)
  console.log(`  Quizzes    : ${globalStats.quizTotal}  (${green(globalStats.quizOk + ' ok')} / ${red(globalStats.quizErreur + ' à corriger')})`)

  if (globalStats.noQuiz.length) {
    console.log(`\n  ${red('Cas sans quiz')} (${globalStats.noQuiz.length}) :`)
    console.log(`  ${globalStats.noQuiz.slice(0,20).join(', ')}${globalStats.noQuiz.length > 20 ? ` … +${globalStats.noQuiz.length-20}` : ''}`)
  }
  if (globalStats.missingReport.length) {
    console.log(`\n  ${red('Cas sans report_fr')} (${globalStats.missingReport.length}) :`)
    console.log(`  ${globalStats.missingReport.slice(0,20).join(', ')}${globalStats.missingReport.length > 20 ? ` … +${globalStats.missingReport.length-20}` : ''}`)
  }
  if (globalStats.difficulty5.length) {
    console.log(`\n  ${yellow('Difficulty > 3')} : ${globalStats.difficulty5.join(', ')}`)
  }
  console.log()
}

main().catch(e => { console.error(red(e.message)); process.exit(1) })
