// Compact, aggregate-only handoff between the deterministic analyzer and the
// agent-authored response. It carries facts and constraints, never stock prose.

import { buildResponseShape } from './response-shape.mjs';

const localizeMissing = (reason, language) => {
  if (language !== 'vi') return reason;
  if (reason === 'token usage coverage below 60%; supply provider usage metadata to compute a realm') {
    return 'Độ phủ số liệu token dưới 60%; cần bổ sung dữ liệu sử dụng từ nhà cung cấp để tính cảnh giới.';
  }
  return reason;
};

function localized(value, language) {
  if (!value || typeof value !== 'object') return value ?? null;
  return value[language] ?? value.en ?? value.vi ?? null;
}

function problemEvidence(problem) {
  const evidence = problem.evidence ?? {};
  if (problem.problemType === 'repeated-failure' || problem.problemType === 'too-many-prompts') return { repeatCount: evidence.repeatCount ?? 0 };
  if (problem.problemType === 'conflicting-instructions') return { count: evidence.count ?? 0 };
  if (problem.problemType === 'unrecovered-failure') return { count: evidence.count ?? 0 };
  if (problem.problemType === 'work-without-proof') return { commits: evidence.commits ?? 0 };
  return {};
}

function roleAddressContract(language) {
  if (language === 'vi') {
    return {
      scope: 'in-world-roleplay-prose',
      visibleSecondPerson: 'đạo hữu',
      establishedInWorldTitleMayOverride: true,
      internalTargetLabels: 'metadata-only-never-render-as-addressee',
      forbiddenVisibleAddresseeLabels: ['vai tu sĩ', 'vai tu sĩ hư cấu', 'vai diễn hư cấu', 'avatar'],
      setupExplanationException: 'control-and-safety-explanations-only'
    };
  }
  return {
    scope: 'in-world-roleplay-prose',
    visibleSecondPerson: 'you',
    establishedInWorldTitleMayOverride: true,
    internalTargetLabels: 'metadata-only-never-render-as-addressee',
    forbiddenVisibleAddresseeLabels: ['fictional avatar', 'fictional cultivation avatar', 'role-play avatar'],
    setupExplanationException: 'control-and-safety-explanations-only'
  };
}

export function buildResponseBrief(model, options = {}) {
  const language = options.language === 'vi' ? 'vi' : 'en';
  const profile = options.profile ?? {};
  const classification = model.cultivation?.classification ?? null;
  const progression = model.cultivation?.progression ?? null;
  const findingKey = (model.problems ?? []).map((problem) => problem.problemType).join('_') || 'clean';
  const responseShape = buildResponseShape({
    seed: {
      projectId: profile.projectId ?? 'repo',
      evidenceKey: options.storyContext?.evidenceKey ?? findingKey
    },
    sequence: options.shapeSequence,
    priorShapeSignature: options.priorShapeSignature
  });
  return {
    schema: 'tutien-response-brief-v1',
    semanticNamespace: model.experience.semanticNamespace,
    language,
    tone: model.tone,
    policy: {
      state: model.policyState,
      suppressGamification: model.suppressGamification
    },
    project: {
      id: profile.projectId ?? 'repo',
      type: profile.projectType ?? null,
      primaryLanguage: profile.primaryLanguage ?? null,
      domains: profile.domains ?? [],
      stack: profile.stack ?? [],
      packageManager: profile.packageManager ?? null,
      validationCommands: profile.validationCommands ?? [],
      recommendedValidation: profile.recommendedValidation ?? null,
      metadataSources: profile.metadataSources ?? [],
      kitInstalled: profile.kitInstalled === true
    },
    evidence: {
      coverage: model.coverage,
      tokens: model.tokens,
      realm: model.realm ? { name: model.realm.name, score: model.score } : null,
      enoughEvidence: model.enoughEvidence,
      missing: (model.missing ?? []).map((reason) => localizeMissing(reason, language)),
      dimensions: model.dimensions
    },
    cultivation: classification ? {
      faction: classification.faction?.id ?? null,
      affiliation: classification.affiliation?.id ?? null,
      paths: (classification.paths ?? []).map((item) => item.id),
      progression: progression ? {
        tuVi: progression.tuVi?.window ?? 0,
        congDuc: progression.congDuc?.window ?? 0,
        nghiepLuc: progression.nghiepLuc?.window ?? 0,
        daoHanhWindows: progression.daoHanh?.windows ?? 0
      } : null
    } : null,
    findings: (model.problems ?? []).map((problem) => ({
      type: problem.problemType,
      confidence: problem.confidence,
      priority: problem.priority,
      evidence: problemEvidence(problem),
      counterTechnique: localized(problem.counterTechnique, language),
      projectHelp: problem.projectHelp ?? null,
      microQuest: localized(problem.microQuest, language),
      victory: localized(problem.victory, language),
      villain: problem.villain ? {
        name: problem.villain.name,
        gloss: problem.villain.gloss,
        role: problem.villain.role,
        voice: 'cutting-sarcastic-mockery',
        humiliation: problem.villain.humiliation?.level > 0 ? {
          level: problem.villain.humiliation.level,
          key: problem.villain.humiliation.key,
          band: problem.villain.humiliation.band,
          target: problem.villain.humiliation.target
        } : null,
        duel: problem.villain.actionDuel ? {
          enabled: true,
          target: problem.villain.humiliation?.level > 0
            ? 'fictional-cultivation-avatar-and-evidenced-action'
            : 'evidenced-action'
        } : null
      } : null
    })),
    nextPractice: model.ifThen ? localized(model.ifThen, language) : null,
    story: options.storyContext ? {
      evidenceKey: options.storyContext.evidenceKey,
      language: options.storyContext.language,
      style: options.storyContext.style,
      focus: options.storyContext.focus,
      canWriteChapter: options.storyContext.canWriteChapter
    } : null,
    artifacts: { evidenceLedger: options.ledgerPath ?? null },
    composition: {
      finalResponse: 'agent-authored',
      evidenceLedgerIsNotFinalResponse: true,
      mustComposeFromBrief: true,
      forbidDirectLedgerReuse: true,
      forbiddenLedgerShape: [
        'fixed-report-title',
        'fixed-heading-sequence',
        'evidence-counter-quest-victory-template',
        'stock-ledger-opening',
        'stock-ledger-closing'
      ],
      activeModeVoice: 'immersive-adaptive-xianxia',
      responseScope: 'all-user-facing-replies-while-active',
      roleAddress: roleAddressContract(language),
      literalTechnicalContent: 'preserve-exactly',
      villainVoice: 'cutting-sarcastic-mockery',
      banterMode: model.banterMode,
      humiliationLevel: model.humiliationLevel,
      humiliationContract: model.humiliationLevel > 0 ? {
        consent: 'explicit-current-session',
        target: 'fictional-cultivation-avatar-and-evidenced-action',
        level: model.humiliationLevel,
        key: model.humiliationProfile.key,
        band: model.humiliationProfile.band,
        directness: model.humiliationProfile.directness,
        sarcasmDensity: model.humiliationProfile.sarcasmDensity,
        fictionalStatusPressure: model.humiliationProfile.fictionalStatusPressure,
        maxDirectAddresses: model.humiliationProfile.maxDirectAddresses,
        allowAvatarDefeat: model.humiliationProfile.allowAvatarDefeat,
        allowLossOfFace: model.humiliationProfile.allowLossOfFace,
        hardBoundary: 'never-real-person-protected-trait-vulnerability-threat-or-private-data',
        correctiveGuidance: 'required-near-theatrical-strike'
      } : {
        consent: 'none',
        target: 'none',
        level: 0
      },
      banterContract: model.banterMode === 'duel' ? {
        consent: 'explicit',
        target: model.humiliationLevel > 0 ? 'fictional-cultivation-avatar-and-evidenced-action' : 'evidenced-action',
        safetyBoundary: 'never-person'
      } : {
        consent: 'default',
        target: 'evidenced-flaw',
        safetyBoundary: 'never-person'
      },
      responseShape,
      shapeSignature: responseShape.shapeSignature,
      deriveFrom: ['current-user-request', 'project-facts', 'approved-evidence', 'living-chronicle', 'recent-response-rhythm'],
      preserve: model.composition.preserve,
      vary: model.composition.vary,
      prohibitions: ['stock-heading-sequence', 'stock-opening', 'stock-closing', 'raw-prompt-text', 'raw-event-ids'],
      vietnameseEndingIntent: language === 'vi'
        ? 'Kết cà khịa, luôn giáo huấn, không tâng bốc và kéo dài dư âm vai diễn.'
        : null
    }
  };
}
