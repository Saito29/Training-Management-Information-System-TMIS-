(() => {
  const element = document.getElementById('trainingQuestionnaireData');
  let source = {};
  try {
    source = JSON.parse(element?.textContent || '{}');
  } catch (error) {
    console.error('Unable to read training questionnaire data.', error);
  }

  if(window.TMIS_PAGE)source={pretest:window.TmisTrainingData.assessment('pre-test'),posttest:window.TmisTrainingData.assessment('post-test')};

  function normalize(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && item.id).map(item => {
      const itemCount = Number(item.itemCount);
      const count = Number.isInteger(itemCount) && itemCount > 0 ? itemCount : null;
      const score = Number(item.averageCorrect);
      const averageCorrect = item.averageCorrect !== null && item.averageCorrect !== undefined &&
        count !== null && Number.isFinite(score) && score >= 0 && score <= count ? score : null;
      return {
        id: String(item.id),
        name: String(item.name || item.id),
        itemCount: count,
        averageCorrect,
      };
    });
  }

  const questionnaires = {
    pretest: normalize(source.pretest),
    posttest: normalize(source.posttest),
  };

  window.trainingAssessments = {
    list(type) { return questionnaires[type] || []; },
    summary(type) {
      const items = questionnaires[type] || [];
      const totalItems = items.reduce((sum, item) => sum + (item.itemCount || 0), 0);
      const scored = items.length > 0 && items.every(item => item.itemCount !== null && item.averageCorrect !== null);
      const averageCorrect = scored ? items.reduce((sum, item) => sum + item.averageCorrect, 0) : null;
      return {
        count: items.length,
        totalItems,
        averageCorrect,
        percentage: scored && totalItems ? averageCorrect / totalItems * 100 : null,
      };
    },
  };
})();
