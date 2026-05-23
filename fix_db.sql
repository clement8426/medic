-- =============================================================================
-- MEDIQ — CORRECTIFS BASE DE DONNÉES
-- Coller dans Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ─── 1. Plafonner la difficulté ECG à 3 ──────────────────────────────────────
UPDATE cases
SET difficulty = 3
WHERE difficulty > 3
  AND module_id = '3344e799-1293-4654-b92d-d24010dab8df';

-- ─── 2. Corriger les âges aberrants (300 ans → 65) ───────────────────────────
UPDATE cases
SET age = 65
WHERE age = 300
  AND module_id = '3344e799-1293-4654-b92d-d24010dab8df';

-- ─── 3. Normaliser les valeurs de sexe ───────────────────────────────────────
UPDATE cases SET sex = 'Homme' WHERE sex = 'M';
UPDATE cases SET sex = 'Femme' WHERE sex = 'F';
UPDATE cases SET sex = NULL   WHERE sex = 'Nan' OR sex = 'nan';

-- =============================================================================
-- 4. QUIZZES — 7 cas ECG sans questions
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #1 — "Rythme sinusal, microvoltage périphérique"
-- id: c728522c-e4a9-482c-ba39-8f661b0a3f45
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'c728522c-e4a9-482c-ba39-8f661b0a3f45', 1, 'rythme',
 'Quel est le rythme identifié sur cet ECG ?',
 'Rythme sinusal régulier',
 ARRAY['Fibrillation auriculaire', 'Flutter auriculaire 2:1', 'Rythme jonctionnel'],
 'Le rythme sinusal est reconnu par des ondes P positives en DII, précédant chaque QRS avec un intervalle PR constant.'),

(gen_random_uuid(), 'c728522c-e4a9-482c-ba39-8f661b0a3f45', 2, 'axe',
 'Quelle est la déviation axiale observée ?',
 'Axe normal (0° à +90°)',
 ARRAY['Déviation axiale gauche (–30° à –90°)', 'Déviation axiale droite (+90° à +180°)', 'Axe supérieur gauche extrême'],
 'En l''absence de déviation axiale, le vecteur QRS pointe entre 0° et +90° — QRS positif en DI et en aVF.'),

(gen_random_uuid(), 'c728522c-e4a9-482c-ba39-8f661b0a3f45', 3, 'morphologie',
 'Quelle anomalie morphologique principale est présente sur cet ECG ?',
 'Microvoltage périphérique (amplitude QRS < 5 mm dans toutes les dérivations des membres)',
 ARRAY['Hypertrophie ventriculaire gauche (indice de Sokolow > 35 mm)', 'Bloc de branche droit complet (rSR'' en V1, QRS ≥ 120 ms)', 'Sus-décalage ST diffus en selle de cheval'],
 'Le microvoltage périphérique est défini par une amplitude maximale des QRS < 5 mm dans les 6 dérivations des membres. Causes fréquentes : épanchement péricardique, hypothyroïdie, obésité.'),

(gen_random_uuid(), 'c728522c-e4a9-482c-ba39-8f661b0a3f45', 4, 'diagnostic',
 'Quel est le diagnostic ECG retenu ?',
 'Rythme sinusal avec microvoltage périphérique',
 ARRAY['Fibrillation auriculaire avec microvoltage', 'Péricardite aiguë stade I', 'Cardiomyopathie dilatée en décompensation'],
 'L''association rythme sinusal normal + microvoltage périphérique isolé est non spécifique ; elle doit faire évoquer un épanchement péricardique, une hypothyroïdie ou une infiltration myocardique.');

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #103 — "Tachycardie sinusale, axe gauche extrême, microvoltage,
--              QRS(T) anormal, infarctus inférieur probablement ancien"
-- id: f841cc48-10b7-4635-acde-fce7305e5db2
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'f841cc48-10b7-4635-acde-fce7305e5db2', 1, 'rythme',
 'Quel est le rythme identifié sur cet ECG ?',
 'Tachycardie sinusale (FC > 100 bpm, ondes P sinusales)',
 ARRAY['Tachycardie ventriculaire', 'Flutter auriculaire à conduction rapide', 'Fibrillation auriculaire rapide'],
 'La tachycardie sinusale est définie par une FC > 100 bpm avec des ondes P d''origine sinusale (positives en DII, négatives en aVR) précédant chaque QRS avec un PR constant.'),

(gen_random_uuid(), 'f841cc48-10b7-4635-acde-fce7305e5db2', 2, 'axe',
 'Quelle déviation axiale est observée sur cet ECG ?',
 'Axe gauche extrême (au-delà de –90°, dit axe nord-ouest)',
 ARRAY['Déviation axiale gauche modérée (–30° à –90°)', 'Axe normal', 'Déviation axiale droite'],
 'L''axe gauche extrême (–90° à ±180°) se traduit par un QRS négatif en DI ET en aVF. Il est associé à des blocs bifasciculaires ou des pathologies ventriculaires sévères.'),

(gen_random_uuid(), 'f841cc48-10b7-4635-acde-fce7305e5db2', 3, 'morphologie',
 'Quelle anomalie morphologique évoque un infarctus inférieur ancien ?',
 'Ondes Q pathologiques en DII, DIII et aVF avec anomalies de repolarisation',
 ARRAY['Sus-décalage ST convexe en DII, DIII, aVF (STEMI actif)', 'Bloc de branche gauche complet', 'Ondes T amples et pointues en précordiales'],
 'Un infarctus inférieur ancien se traduit par des ondes Q pathologiques (durée ≥ 40 ms ou amplitude ≥ 25 % du QRS) en DII, DIII et aVF, sans sus-décalage ST évolutif.'),

(gen_random_uuid(), 'f841cc48-10b7-4635-acde-fce7305e5db2', 4, 'diagnostic',
 'Quel est le diagnostic ECG principal retenu ?',
 'Infarctus inférieur probablement ancien, associé à une tachycardie sinusale et un microvoltage périphérique',
 ARRAY['Infarctus inférieur aigu en cours (STEMI)', 'Péricardite aiguë avec tachycardie réactionnelle', 'Tachycardie ventriculaire d''origine inférieure'],
 'L''association ondes Q inférieures sans sus-décalage ST évolutif et anomalies de repolarisation chroniques signe un IDM inférieur ancien. La tachycardie + microvoltage orientent vers une atteinte cardiaque globale.');

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #146 — "Rythme sinusal, bloc de branche non spécifique,
--              évolution QRS(T) atypique, infarctus inférieur d'âge indéterminable"
-- id: c02f4a27-0231-4fc5-987e-f307ba8bceb9
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'c02f4a27-0231-4fc5-987e-f307ba8bceb9', 1, 'rythme',
 'Quel est le rythme identifié sur cet ECG ?',
 'Rythme sinusal régulier',
 ARRAY['Fibrillation auriculaire', 'Bloc auriculo-ventriculaire du 2ème degré', 'Rythme idioventriculaire accéléré'],
 'Le rythme sinusal est confirmé par des ondes P régulières et sinusales précédant chaque QRS avec un PR constant.'),

(gen_random_uuid(), 'c02f4a27-0231-4fc5-987e-f307ba8bceb9', 2, 'axe',
 'Quel trouble de conduction intra-ventriculaire est présent ?',
 'Bloc de branche non spécifique (QRS entre 110 et 120 ms, morphologie atypique)',
 ARRAY['Bloc de branche gauche complet (QRS ≥ 120 ms, rS en V1, R large en V5-V6)', 'Bloc de branche droit complet (QRS ≥ 120 ms, rSR'' en V1)', 'Bloc auriculo-ventriculaire complet'],
 'Un bloc de branche non spécifique (ou incomplet) présente un QRS élargi entre 110 et 120 ms sans les critères morphologiques typiques d''un BBG ou BBD complet.'),

(gen_random_uuid(), 'c02f4a27-0231-4fc5-987e-f307ba8bceb9', 3, 'morphologie',
 'Quelle anomalie morphologique évoque un infarctus inférieur ?',
 'Ondes Q pathologiques en DII, DIII et aVF',
 ARRAY['Sus-décalage ST convexe vers le haut en DII, DIII, aVF', 'Sous-décalage ST horizontal en précordiales', 'Ondes T négatives profondes en V1-V4'],
 'Les ondes Q pathologiques (≥ 40 ms ou ≥ 25 % du QRS) dans les dérivations inférieures (DII, DIII, aVF) traduisent une nécrose myocardique inférieure.'),

(gen_random_uuid(), 'c02f4a27-0231-4fc5-987e-f307ba8bceb9', 4, 'diagnostic',
 'Quel est le diagnostic ECG retenu ?',
 'Infarctus inférieur d''âge indéterminable avec trouble de conduction intra-ventriculaire non spécifique',
 ARRAY['Infarctus inférieur aigu (STEMI inférieur)', 'Bloc de branche gauche complet d''origine ischémique', 'Péricardite chronique constrictive'],
 'L''absence de sus-décalage ST évolutif, associée à des ondes Q inférieures et un QRS élargi atypique, signe un IDM inférieur dont l''ancienneté reste indéterminable à l''ECG seul.');

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #282 — "CVP. Fibrillation auriculaire. Déviation axiale gauche.
--              Bloc de branche gauche (cardiopathie ischémique probable)"
-- id: ee8e0add-783a-4596-a0be-482e4faeaf8c
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'ee8e0add-783a-4596-a0be-482e4faeaf8c', 1, 'rythme',
 'Quel est le rythme de base identifié sur cet ECG ?',
 'Fibrillation auriculaire (absence d''ondes P, intervalles RR irréguliers)',
 ARRAY['Flutter auriculaire (ondes F en dents de scie à 300/min)', 'Tachycardie sinusale avec extrasystoles fréquentes', 'Rythme sinusal avec bloc AV du 1er degré'],
 'La FA est caractérisée par l''absence d''ondes P organisées, une ligne de base anarchique et des intervalles RR totalement irréguliers.'),

(gen_random_uuid(), 'ee8e0add-783a-4596-a0be-482e4faeaf8c', 2, 'axe',
 'Quelle déviation axiale est associée au bloc de branche gauche ?',
 'Déviation axiale gauche (axe entre –30° et –90°)',
 ARRAY['Axe normal', 'Déviation axiale droite', 'Axe indéterminé'],
 'Le BBG est fréquemment associé à une déviation axiale gauche, la conduction anormale dans le VG modifiant le vecteur QRS moyen.'),

(gen_random_uuid(), 'ee8e0add-783a-4596-a0be-482e4faeaf8c', 3, 'morphologie',
 'Quel trouble de conduction intra-ventriculaire est présent ?',
 'Bloc de branche gauche complet (QRS ≥ 120 ms, aspect QS ou rS en V1, onde R large en V5-V6 sans onde q septale)',
 ARRAY['Bloc de branche droit complet (rSR'' en V1, onde S large en DI et V6)', 'Hémiblock antérieur gauche isolé (QRS < 120 ms)', 'Préexcitation ventriculaire (WPW)'],
 'Le BBG complet : QRS ≥ 120 ms, aspect QS/rS en V1-V2, onde R large crochetée en V5-V6 sans onde q septale. Il masque les signes d''ischémie sous-jacente.'),

(gen_random_uuid(), 'ee8e0add-783a-4596-a0be-482e4faeaf8c', 4, 'diagnostic',
 'Quel est le diagnostic ECG complet retenu ?',
 'Fibrillation auriculaire avec bloc de branche gauche complet et extrasystoles ventriculaires, évoquant une cardiopathie ischémique',
 ARRAY['Fibrillation auriculaire isolée sans trouble de conduction', 'Tachycardie ventriculaire polymorphe sur FA', 'Bloc AV complet avec échappement ventriculaire'],
 'L''association FA + BBG + ESV est très évocatrice d''une cardiopathie ischémique sévère ou d''une cardiomyopathie dilatée. Un BBG de novo doit faire évoquer un infarctus aigu.');

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #310 — "Rythme sinusal. Bloc de branche droit. Ondes Q antérieures
--              (ancien IDM antérieur). Possible ancien IDM inférieur."
-- id: f72a0ba4-7823-4e4c-a8ea-3007f997cfab
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'f72a0ba4-7823-4e4c-a8ea-3007f997cfab', 1, 'rythme',
 'Quel est le rythme identifié sur cet ECG ?',
 'Rythme sinusal régulier',
 ARRAY['Fibrillation auriculaire', 'Bloc sino-auriculaire du 2ème degré', 'Rythme d''échappement jonctionnel'],
 'Le rythme sinusal est confirmé par des ondes P régulières et sinusales précédant chaque QRS avec un PR constant.'),

(gen_random_uuid(), 'f72a0ba4-7823-4e4c-a8ea-3007f997cfab', 2, 'axe',
 'Quel trouble de conduction intra-ventriculaire est identifié ?',
 'Bloc de branche droit complet (QRS ≥ 120 ms, aspect rSR'' en V1, onde S large en DI et V6)',
 ARRAY['Bloc de branche gauche complet (rS en V1, R large et crochetée en V5-V6)', 'Hémiblock antérieur gauche', 'Préexcitation ventriculaire de type WPW'],
 'Le BBD complet : QRS ≥ 120 ms, aspect rSR'' (oreille de lapin) en V1, onde S large et profonde en DI et V6, ondes T négatives en V1-V3.'),

(gen_random_uuid(), 'f72a0ba4-7823-4e4c-a8ea-3007f997cfab', 3, 'morphologie',
 'Quelle anomalie morphologique évoque un infarctus antérieur ancien ?',
 'Ondes Q pathologiques dans les dérivations précordiales antérieures (V1-V4)',
 ARRAY['Sus-décalage ST en V1-V4 (STEMI antérieur actif)', 'Ondes T négatives isolées en V1-V4 sans ondes Q', 'Hypertrophie ventriculaire gauche avec surcharge systolique'],
 'Les ondes Q pathologiques en V1-V4 (durée ≥ 40 ms ou ≥ 25 % du QRS), en l''absence de sus-décalage ST évolutif, signent un IDM antérieur ancien avec nécrose transmurale.'),

(gen_random_uuid(), 'f72a0ba4-7823-4e4c-a8ea-3007f997cfab', 4, 'diagnostic',
 'Quel est le diagnostic ECG principal retenu ?',
 'Ancien infarctus du myocarde antérieur (et possible IDM inférieur ancien), associé à un bloc de branche droit',
 ARRAY['Infarctus antérieur aigu (STEMI) sur BBD', 'Cardiomyopathie hypertrophique obstructive', 'Syndrome de Brugada type 1 (sus-décalage ST coved en V1-V2)'],
 'BBD + ondes Q antérieures sans sus-décalage ST = IDM antérieur ancien. La présence d''ondes Q inférieures étend l''atteinte coronaire (probablement tri-tronculaire).');

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #346 — "Rythme sinusal. Déviation axiale gauche. Bloc de branche gauche
--              (cardiopathie ischémique probable)"
-- id: f54b019c-a3b9-4e53-80af-9a72b6bff23f
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'f54b019c-a3b9-4e53-80af-9a72b6bff23f', 1, 'rythme',
 'Quel est le rythme identifié sur cet ECG ?',
 'Rythme sinusal régulier',
 ARRAY['Fibrillation auriculaire', 'Flutter auriculaire', 'Rythme idioventriculaire'],
 'Le rythme sinusal est confirmé par des ondes P sinusales régulières précédant chaque QRS avec un PR constant.'),

(gen_random_uuid(), 'f54b019c-a3b9-4e53-80af-9a72b6bff23f', 2, 'axe',
 'Quelle déviation axiale est présente sur cet ECG ?',
 'Déviation axiale gauche (axe entre –30° et –90°, QRS négatif en aVF)',
 ARRAY['Axe normal', 'Déviation axiale droite (QRS négatif en DI)', 'Axe supérieur gauche extrême (au-delà de –90°)'],
 'La déviation axiale gauche : QRS positif en DI et négatif en aVF, axe entre –30° et –90°. Elle est souvent associée à un hémiblock antérieur gauche ou un BBG.'),

(gen_random_uuid(), 'f54b019c-a3b9-4e53-80af-9a72b6bff23f', 3, 'morphologie',
 'Quel trouble de conduction intra-ventriculaire est présent ?',
 'Bloc de branche gauche complet (QRS ≥ 120 ms, aspect rS ou QS en V1, onde R large crochetée en V5-V6)',
 ARRAY['Bloc de branche droit complet (rSR'' en V1, S large en DI et V6)', 'Hémiblock antérieur gauche isolé (QRS < 120 ms)', 'Bloc fasciculaire postérieur gauche'],
 'Le BBG complet : QRS ≥ 120 ms, aspect QS/rS en V1, onde R large crochetée en V5-V6, absence d''onde q en V5-V6. Il rend non interprétables les signes d''ischémie associés.'),

(gen_random_uuid(), 'f54b019c-a3b9-4e53-80af-9a72b6bff23f', 4, 'diagnostic',
 'Quel est le diagnostic ECG retenu ?',
 'Rythme sinusal avec bloc de branche gauche complet et déviation axiale gauche, évoquant une cardiopathie ischémique',
 ARRAY['Rythme sinusal avec bloc de branche droit et axe droit', 'Fibrillation auriculaire avec aberration de conduction', 'Tachycardie ventriculaire à complexes larges'],
 'Un BBG complet de novo ou d''ancienneté inconnue doit toujours faire évoquer une cardiopathie ischémique. Associé à une DAG, il oriente vers une atteinte du faisceau de His ou du tronc commun gauche.');

-- ─────────────────────────────────────────────────────────────────────────────
-- CAS #477 — "Bradycardie sinusale / Axe extrêmement dévié à gauche /
--              Hémiblock antérieur gauche / BBD / Bloc bifasciculaire / WPW type A"
-- id: f16db505-3f5e-4c2d-80cf-0372719d1f69
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, case_id, step, theme, question_fr, correct_fr, distractors_fr, explanation_correct_fr) VALUES

(gen_random_uuid(), 'f16db505-3f5e-4c2d-80cf-0372719d1f69', 1, 'rythme',
 'Quel trouble du rythme ou de la fréquence est identifié sur cet ECG ?',
 'Bradycardie sinusale (FC < 60 bpm, ondes P sinusales régulières)',
 ARRAY['Bloc sino-auriculaire du 2ème degré (pauses régulières)', 'Bloc auriculo-ventriculaire complet (dissociation AV)', 'Rythme d''échappement jonctionnel (ondes P rétrogrades)'],
 'La bradycardie sinusale : FC < 60 bpm avec ondes P d''origine sinusale. Elle est fréquente chez les sportifs, sous traitement bradycardisant ou en cas d''hypervagotonie.'),

(gen_random_uuid(), 'f16db505-3f5e-4c2d-80cf-0372719d1f69', 2, 'axe',
 'Quelle déviation axiale et quel trouble de conduction fasciculaire sont présents ?',
 'Axe extrêmement dévié à gauche avec hémiblock antérieur gauche (rS en DII, DIII, aVF ; qR en DI, aVL)',
 ARRAY['Déviation axiale droite avec hémiblock postérieur gauche', 'Axe normal avec BBG complet', 'Bloc bifasciculaire BBD + hémiblock postérieur gauche'],
 'L''HAG : déviation axiale gauche marquée (–45° à –90°), aspect rS en DII, DIII, aVF et qR en DI, aVL, QRS < 120 ms en l''absence d''autre anomalie.'),

(gen_random_uuid(), 'f16db505-3f5e-4c2d-80cf-0372719d1f69', 3, 'morphologie',
 'Quelle association de troubles de conduction et de préexcitation est identifiée ?',
 'Bloc bifasciculaire (BBD + HAG) avec onde delta en faveur d''un WPW type A (onde delta positive en V1)',
 ARRAY['Bloc trifasciculaire complet (BAV III + BBD + HAG)', 'BBG complet masquant une préexcitation', 'Syndrome de Brugada type 1 (sus-décalage ST coved en V1-V2)'],
 'Le WPW type A présente une onde delta positive en V1 (voie accessoire gauche postérieure). Associé à BBD + HAG, ce tableau ECG complexe est rare et évoque une maladie de conduction diffuse.'),

(gen_random_uuid(), 'f16db505-3f5e-4c2d-80cf-0372719d1f69', 4, 'diagnostic',
 'Quel est le diagnostic ECG complet retenu ?',
 'WPW type A associé à un bloc bifasciculaire (BBD + HAG) sur fond de bradycardie sinusale',
 ARRAY['Bloc AV complet avec échappement ventriculaire préexcité', 'Tachycardie antidromique sur WPW avec BBD fonctionnel', 'BBG complet avec pseudo-préexcitation'],
 'Ce tableau rare associe une préexcitation ventriculaire (WPW type A, voie accessoire gauche postérieure) à un bloc bifasciculaire (BBD + HAG), suggérant une maladie de conduction diffuse. Le risque de FA préexcitée est à considérer.');
