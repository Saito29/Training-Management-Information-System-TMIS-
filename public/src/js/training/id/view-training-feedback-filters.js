(() => {
  const sampleAnswerGroups = [
    {date:'2025-05-22', association:'San Antonio Farmers Cooperative'},
    {date:'2025-05-23', association:'Batangas Growers Association'},
  ];
  const answerGroups = window.TMIS_PAGE
    ? ['pre-test','post-test','training-evaluation','rp-evaluation'].flatMap(kind => window.TmisTrainingData.results(kind).map(item => ({
      date:item.date,
      association:window.TmisStore.records('tmis-farmers').find(farmer => farmer.id === item.farmerId)?.association || '',
    }))).filter(group => group.association)
    : sampleAnswerGroups;
  const associationRecords = window.TMIS_PAGE ? window.TmisStore.records('tmis-farmer-associations') : [];
  const state = {date:'', association:''};
  const controls = [];
  const dateLabel = date => new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {year:'numeric', month:'short', day:'numeric'});

  function associationOption(name) {
    const record = associationRecords.find(item => (item.association_name || item.name) === name);
    const option = new Option(name, name);
    if (record) {
      const location = record.location || [record.barangay, record.municipality, record.district, record.province, record.region].filter(Boolean).join(', ');
      option.dataset.title = record.association_name || record.name || name;
      option.dataset.details = [record.id, location, record.region].filter(Boolean).join(' · ');
      option.dataset.office = record.office || '';
    }
    return option;
  }

  function replaceOptions(select, firstLabel, values, makeOption) {
    select.replaceChildren(new Option(firstLabel, ''), ...values.map(makeOption));
  }

  function sync() {
    const dates = [...new Set(answerGroups.map(group => group.date).filter(Boolean))].sort();
    const associations = [...new Set(answerGroups
      .filter(group => !state.date || group.date === state.date)
      .map(group => group.association)
      .filter(Boolean))].sort();

    for (const {dateSelect, associationSelect, onChange} of controls) {
      if (state.association && !associations.includes(state.association)) state.association = '';
      replaceOptions(dateSelect, 'All dates', dates, value => new Option(dateLabel(value), value));
      replaceOptions(associationSelect, 'All associations', associations, associationOption);
      dateSelect.value = state.date;
      associationSelect.value = state.association;
      onChange({...state});
    }
  }

  window.trainingFeedbackFilters = {
    register(dateSelect, associationSelect, onChange) {
      controls.push({dateSelect, associationSelect, onChange});
      dateSelect.addEventListener('change', () => {
        state.date = dateSelect.value;
        sync();
      });
      associationSelect.addEventListener('change', () => {
        state.association = associationSelect.value;
        if (state.association && state.date && !answerGroups.some(group => group.date === state.date && group.association === state.association)) {
          state.date = '';
        }
        sync();
      });
      sync();
    },
  };
})();
