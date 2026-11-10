// Add a small, linked demonstration set without replacing records saved by the user.
(async () => {
  if (window.TMIS_PAGE) return;
  const types = [
    { slug: 'pre-test', title: 'Good Agricultural Practices Pre-test', items: 10 },
    { slug: 'post-test', title: 'Good Agricultural Practices Post-test', items: 10 },
    { slug: 'training-evaluation', title: 'Training Session Evaluation' },
    { slug: 'rp-evaluation', title: 'Resource Person Evaluation' },
  ];
  const questions = [
    { text: 'The objectives were explained clearly.', maxRating: 5 },
    { text: 'The topics were useful for my work.', maxRating: 5 },
    { text: 'The examples were easy to understand.', maxRating: 5 },
  ];
  const dates = ['2026-10-18T09:00:00+08:00', '2026-10-19T10:00:00+08:00', '2026-10-20T14:00:00+08:00'];
  for (const type of types) {
    const questionnaireKey = `tmis-${type.slug}-questionnaires`;
    const encodedKey = `tmis-${type.slug}-encoded`;
    const isTest = type.items != null;
    const base = {
      implementingOffice: 'DA Regional Field Office IV-A', office: 'DA Regional Field Office IV-A',
      region: 'Region IV-A', description: 'Sample questionnaire for demonstration.',
      ...(isTest ? { trainingQuestionnaire: type.title, totalItems: type.items } : {
        questionnaireName: type.title, questions,
        ratingScale: [1, 2, 3, 4, 5].map((score) => ({ score, label: String(score), description: '' })),
      }),
    };
    const questionnaireIds = ['DRAFT', 'ACTIVE', 'INACTIVE'].map((state) => `SAMPLE-${type.slug.toUpperCase()}-${state}`);
    const questionnaires = ['Draft', 'Active', 'Inactive'].map((status, index) => ({
      ...base, id: questionnaireIds[index], status, createdAt: dates[index], updatedAt: dates[index],
      ...(status === 'Inactive' ? { statusRemarks: 'Archived sample questionnaire.' } : {}),
    }));
    const resultBase = {
      questionnaireId: questionnaireIds[1], questionnaireName: type.title,
      implementingOffice: base.implementingOffice, farmerId: 'SAMPLE-FARMER-001',
      farmerName: 'Maria Santos', farmerAssociation: 'Calamba Farmers Association',
      farmerLocation: 'Calamba, Laguna', farmerSex: 'Female', date: '2026-10-20',
      ...(isTest ? { totalItems: type.items, commodity: 'Rice' } : {
        ratings: questions.map((question, index) => ({ question: question.text, rating: 5 - index })),
        comments: 'Useful and clearly presented training.',
      }),
      ...(type.slug === 'rp-evaluation' ? { resourcePersonId: 'SAMPLE-RP-001', resourcePersonName: 'Ana Cruz', resourcePersonOffice: 'DA Regional Field Office IV-A' } : {}),
    };
    const results = [
      { ...resultBase, id: `SAMPLE-${type.slug.toUpperCase()}-ENCODED`, status: 'complete', savedAt: dates[2], ...(isTest ? { score: 8 } : {}) },
      { ...resultBase, id: `SAMPLE-${type.slug.toUpperCase()}-ENCODING-DRAFT`, status: 'draft', savedAt: dates[1], ...(isTest ? { score: 6 } : { ratings: resultBase.ratings.map((rating, index) => ({ ...rating, rating: index ? null : 5 })) }) },
    ];
    for (const [key, additions] of [[questionnaireKey, questionnaires], [encodedKey, results]]) {
      try {
        const marker = `${key}-samples-initialized`;
        if (window.TmisStore.getItem(marker)) continue;
        const saved = JSON.parse(window.TmisStore.getItem(key) || '[]');
        if (!Array.isArray(saved)) continue;
        const missing = additions.filter((item) => !saved.some((record) => record?.id === item.id));
        if (missing.length) await window.TmisStore.setItem(key, JSON.stringify([...saved, ...missing]));
        await window.TmisStore.setItem(marker, '1');
      } catch { /* Leave unreadable or unavailable storage untouched. */ }
    }
  }
})();
