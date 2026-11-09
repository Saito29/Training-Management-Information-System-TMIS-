(() => {
  // These sample answer groups are shared by all four training result tabs.
  const answerGroups = [
    {date:'2025-05-22', association:'San Antonio Farmers Cooperative'},
    {date:'2025-05-23', association:'Batangas Growers Association'},
  ];
  if(window.TMIS_PAGE){answerGroups.splice(0,answerGroups.length,...['pre-test','post-test','training-evaluation','rp-evaluation'].flatMap(kind=>window.TmisTrainingData.results(kind)).map(item=>({date:item.date,association:window.TmisStore.records('tmis-farmers').find(farmer=>farmer.id===item.farmerId)?.association||''})));}
  const state = {date:'', association:''};
  const controls = [];
  const dateLabel = date => new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {year:'numeric', month:'short', day:'numeric'});

  function options(select, firstLabel, values, label) {
    select.replaceChildren(new Option(firstLabel, ''), ...values.map(value => new Option(label(value), value)));
  }

  function sync() {
    const dates = [...new Set(answerGroups.map(group => group.date))].sort();
    const associations = [...new Set(answerGroups.filter(group => !state.date || group.date === state.date).map(group => group.association))].sort();
    for (const {dateSelect, associationSelect, onChange} of controls) {
      options(dateSelect, 'All dates', dates, dateLabel);
      options(associationSelect, 'All associations', associations, value => value);
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
        if (!state.date || (state.association && !answerGroups.some(group => group.date === state.date && group.association === state.association))) state.association = '';
        sync();
      });
      associationSelect.addEventListener('change', () => {
        state.association = associationSelect.value;
        if (state.association && state.date && !answerGroups.some(group => group.date === state.date && group.association === state.association)) state.date = '';
        sync();
      });
      sync();
    },
  };
})();
