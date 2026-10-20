# Dossier documentaire de remplacement médical

Vérification documentaire initiale : 19 septembre 2026 ; réexamen le 20 octobre 2026. Gabarit applicatif : `FR-LIBERAL-2026-10-20.1`.

## Périmètre

Cette première version prépare un remplacement temporaire et personnel d’un médecin en **exercice libéral individuel en France**, par un médecin inscrit au tableau de l’Ordre ou un étudiant en médecine éligible. L’utilisateur confirme explicitement ce cadre avant génération (`practiceFramework: INDIVIDUAL_LIBERAL`).

Les contrats salariés, sociétés d’exercice, établissements de santé, collaborateurs, adjoints, prestataires européens enregistrés sans inscription au tableau et autres professions de santé ne sont pas couverts par ces gabarits. Les formalités d’installation et d’affiliation ne sont pas exécutées par le dossier. Les modalités et pièces complémentaires doivent être vérifiées auprès du conseil compétent.

## Documents et traitement

| Document | Production ou import | Sens du statut |
| --- | --- | --- |
| Contrat de remplacement | PDF prérempli, à relire puis signer ; import d’une copie complète signée | « Généré » ne signifie ni signé ni approuvé par l’Ordre |
| Déclaration préalable, médecin inscrit | Courrier PDF à relire et signer par le médecin remplacé | Information préalable, pas autorisation générée |
| Demande d’autorisation, étudiant | Courrier PDF distinct, période maximale de trois mois | Une demande envoyée ne constitue pas une autorisation |
| Inscription au tableau | Import de l’attestation délivrée par l’Ordre | Un numéro RPPS déclaré ne suffit pas à prouver l’inscription |
| Licence de remplacement, étudiant | Import de la licence délivrée par l’Ordre | La licence n’est pas l’autorisation du remplacement concerné |
| Autorisation, étudiant | Import de la décision ordinale obtenue | Aucune décision favorable n’est fabriquée ni déduite d’un envoi |
| Responsabilité civile professionnelle | Import de l’attestation de l’assureur ; vérifier spécialité, actes et période couverte | Aucune attestation d’assurance n’est générée |
| Pièces complémentaires | Import selon les exigences du destinataire | La liste n’est pas présentée comme universellement exhaustive |

Un dossier envoyé n’équivaut pas à un accusé de réception, un examen favorable ou une autorisation. Les documents et versions choisis pour chaque envoi doivent rester identifiables dans son historique.

## Sources primaires et décisions de rédaction

- [CSP, article R. 4127-65, version depuis le 30 juillet 2026](https://www.legifrance.gouv.fr/affichCodeArticle.do?categorieLien=cid&cidTexte=LEGITEXT000006072665&dateTexte=&idArticle=LEGIARTI000006912934) : remplacement personnel et temporaire, information préalable avec identité, qualité, dates et durée. Le texte actuel exige la cessation de **toute activité médicale**, sauf dérogation ordinale ; les gabarits ne reprennent donc pas l’ancienne formulation limitée à l’activité libérale. La compétence territoriale du conseil doit être vérifiée au regard du lieu d’activité, notamment si plusieurs départements sont concernés.
- [CSP, article R. 4127-91, version depuis le 30 juillet 2026](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054562698) : contrat écrit préservant l’indépendance, communication des contrats et avenants au conseil départemental et déclaration sur l’honneur relative à l’absence de contre-lettre ou d’avenant non communiqué (V). Cette déclaration est intégrée aux engagements signés des parties, comme à l’article 11 des modèles CNOM.
- [CSP, article L. 4113-9](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021536345/) et [CNOM, commentaire de l’article 91](https://www.conseil-national.medecin.fr/code-deontologie/lexercice-profession-art-69-108/2-exercice-clientele-privee-art-85-94/article-91) : chaque médecin communique le contrat et les avenants au conseil dont il relève, dans le mois de leur conclusion. L’information préalable du médecin remplacé reste requise. Le modèle CNOM étudiant (article 12) prévoit aussi la transmission avant le début au conseil auprès duquel l’étudiant est enregistré. Un seul conseil renseigné dans le formulaire ou destinataire d’un envoi ne dispense pas les parties de leurs autres transmissions.
- [CSP, article R. 4127-86, version depuis le 30 juillet 2026](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054562676) : possibilité de prévoir contractuellement une clause de non-réinstallation. L’ancienne interdiction automatique fondée sur trois mois de remplacements et deux ans ne figure plus dans cet article. Le gabarit n’impose **aucune clause de non-réinstallation** ; un éventuel avenant adapté doit être préparé séparément.
- [CSP, article D. 4131-2](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043681497) : autorisation étudiante délivrée par le conseil compétent pour trois mois au plus, renouvellement distinct, autres conditions liées à la formation et à la disponibilité. Le contrôle logiciel de période ne vérifie pas l’ensemble des conditions personnelles d’éligibilité.
- [CSP, article L. 1142-2](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025076559/2026-08-18) : assurance de responsabilité obligatoire pour l’activité libérale.
- [CNOM, remplacement d’un médecin](https://www.conseil-national.medecin.fr/medecin/carriere/remplacement-dun-medecin) : pièces de la déclaration et contrat signé, responsabilité du remplaçant. **Cette page est datée du 9 mars 2023 et certains paragraphes sur les articles 65 et 86 ont été dépassés par la réforme de juillet 2026.** Les textes actuels de Légifrance priment dans la rédaction.
- [CNOM, interne ou docteur junior remplaçant](https://www.conseil-national.medecin.fr/etudiant-interne-docteur-junior/linterne-docteur-junior-remplacant) : distinction entre licence et autorisation, spécialité et pièces de formation. La fonctionnalité prépare la demande ; elle ne détermine pas elle-même un droit à commencer un remplacement.
- [CNOM, modèle pour médecin, mise à jour septembre 2020](https://www.conseil-national.medecin.fr/sites/default/files/cnom_rempl_medecin.pdf) et [modèle pour étudiant, même date](https://www.conseil-national.medecin.fr/sites/default/files/cnom_rempl_etudiant.pdf) : structure de référence consultée, sans copie intégrale ni présentation du gabarit applicatif comme modèle homologué. Leurs clauses anciennes de non-réinstallation et leurs options d’arbitrage ne sont pas insérées automatiquement.
- [Assurance maladie, remplacer un confrère](https://www.ameli.fr/medecin/exercice-liberal/vie-cabinet/remplacements) : RCP, pièces d’enregistrement, signalement des remplacements, identification personnelle pour la facturation. Les formalités CPAM, Urssaf et CARMF restent extérieures au parcours documentaire présenté ici.

## Gabarits implémentés

`CONTRACT` comporte les identités et qualités des parties, le lieu, la spécialité, les dates et horaires, les conditions ordinales, l’indépendance et les moyens, la continuité des soins, le secret, la RCP, les obligations personnelles, la rétrocession des honoraires, les modalités de règlement, la fin du contrat, la conciliation, les pièces et deux emplacements de signature manuscrite. Le taux exprime la **part reversée au remplaçant**, sur les honoraires perçus ou restant à percevoir liés à ses actes. Aucune signature, assurance, affiliation ou autorisation n’est préremplie comme acquise.

`DECLARATION` est un courrier adressé au conseil renseigné, comportant le médecin demandeur, le remplaçant, la spécialité, le lieu, les dates et la durée de la période. Pour un étudiant, le titre, l’objet et le corps sont ceux d’une demande d’autorisation. La liste de pièces indique celles à joindre et ne prétend pas connaître les pièces effectivement attachées à un envoi.

Les PDF portent le numéro de version du document et du gabarit ; la date de préparation est distincte de la date et du lieu de signature à compléter. Le contrat est un document à relire et adapter, sans garantie juridique ni validation automatique de l’Ordre. Les particularités (rupture anticipée assortie d’un préavis ou d’indemnités, obligations spécifiques, locaux ou équipements atypiques, non-réinstallation, régime fiscal particulier) nécessitent une rédaction adaptée hors de ce gabarit.

## Réexamen métier du 20 octobre 2026

La comparaison des deux contrats aux modèles CNOM, au code actuel et aux formalités Ameli conduit à deux compléments ciblés : déclaration sur l’honneur à la signature et transmission à chacun des conseils concernés. Les clauses relatives à la RCP, à l’indépendance, aux honoraires perçus ou restant à percevoir, aux astreintes, à la continuité des soins, au statut étudiant et à l’absence de non-réinstallation imposée sont conservées. Les PDF CNOM consultés sont toujours datés de septembre 2020 : leur ancienne interdiction automatique d’installation n’est pas reprise.

Les exemples de rapports d’activité (`MissionActivityReports`, `lib/mission-activity-reports.ts`) sont conservés. Ils présentent une période, un auteur fictif, un nombre de consultations déclaré, l’organisation et les points pour la suite, sans patient identifiable. Cette interface est une démonstration volontairement isolée, sans sauvegarde ni envoi ; elle ne constitue pas un compte rendu clinique. [L’article R. 4127-66](https://www.conseil-national.medecin.fr/code-deontologie/rapport-medecins-membres-professions-sante-art-56-68-1/article-66-cessation) impose la transmission des informations nécessaires à la continuité des soins, déjà prévue au contrat, sans imposer de trame journalière, hebdomadaire ou mensuelle. La séparation entre bilan administratif et informations cliniques suit le principe d’accès limité aux données nécessaires rappelé par la [CNIL](https://www.cnil.fr/fr/rgpd-et-professionnels-de-sante-liberaux-ce-que-vous-devez-savoir). L’audit ne justifie aucune modification de ces exemples ni l’ajout d’un système de transmission clinique.

## Vérification reproductible

Depuis `medilink-backend-mvp` :

```powershell
npx ts-node scripts/dossier-pdf-tests.ts
python scripts/dossier-pdf-verify.py
```

Le premier script ne contacte aucun service et utilise uniquement des personnes et identifiants fictifs. Il vérifie les champs manquants, les dates impossibles/inversées, le cadre confirmé, la validité de licence et la limite de durée étudiant. Il produit cinq PDF sous `output/pdf` à la racine : contrat et courrier pour les deux statuts, puis un contrat avec textes longs. Le second vérifie l’extraction, les accents français, les pages, les pieds de page, le texte long intégral et le maintien des signatures sur une même page, ainsi que la déclaration sur l’honneur, les transmissions propres à chaque statut et la version révisée du gabarit. Il nécessite `pypdf` et `pdfplumber` disponibles dans le runtime documentaire.

Les cinq PDF ont également été rendus avec Poppler puis inspectés visuellement : contrats usuels de trois pages, courriers de deux pages et texte long de six pages, sans texte coupé ni chevauchement. Une police DejaVu Sans est embarquée avec sa licence redistribuable dans `src/modules/replacement-dossiers/fonts` et copiée dans les assets du build Nest. Le PDF inclut les glyphes nécessaires, sans dépendre des polices du poste utilisateur. Accents et ligatures français, apostrophes, euros, grec et cyrillique sont vérifiés. Les caractères absents du jeu réel de glyphes bloquent explicitement la génération, sans translittération ni corruption silencieuse d’un nom. Source de la police : copie DejaVu Sans du runtime documentaire ; [licence officielle du projet DejaVu](https://github.com/dejavu-fonts/dejavu-fonts/blob/master/LICENSE).
