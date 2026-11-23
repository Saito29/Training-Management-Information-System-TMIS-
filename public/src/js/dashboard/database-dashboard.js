document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
  const data=window.TmisDashboard;if(!data)return;
  const money=value=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value);
  for(const[id,key]of [['totalTrainingChart','trainingByMunicipality'],['totalParticipantsChart','participantsByMunicipality'],['totalFAChart','fabyMunicipality']]){
    const mount=document.getElementById(id),card=mount?.closest('.card');if(!card)continue;
    const totals=[data.currentYear,data.previousYear].map(year=>Object.values(data[key]).reduce((sum,town)=>sum+town[year].reduce((a,b)=>a+b,0),0));
    const percentage=card.querySelector('.card-data-text-vs-year');if(percentage)percentage.textContent=totals[1]?((totals[0]-totals[1])*100/totals[1]).toFixed(1)+'%':totals[0]?'New records':'No comparison yet';
    const label=card.querySelector('.card-data-vs-year');if(label)label.textContent='vs '+data.previousYear;
  }
  for(const[id,key]of [['totalAllocatedDistrictChart','allocatedBudgetByDistrict'],['allocatedProvinceChart','allocatedBudgetByProvince'],['allocatedMunicipalityChart','municipalityAllocation'],['allocatedMunicipalityChartLegacy','municipalityAllocation']]){
    const card=document.getElementById(id)?.closest('.card');if(!card)continue;
    const rows=data[key],summary=card.querySelectorAll('.card-allocation-summary>div');
    const highest=rows.slice().sort((a,b)=>b.current-a.current)[0];
    if(summary[0]){summary[0].querySelector('span').textContent=data.currentYear+' allocated';summary[0].querySelector('strong').textContent=money(data.funds.current);}
    if(summary[1]){summary[1].querySelector('span').textContent=data.previousYear+' allocated';summary[1].querySelector('strong').textContent=money(data.funds.previous);}
    if(summary[2]){summary[2].querySelector('span').textContent='Areas covered';summary[2].querySelector('strong').textContent=rows.length;}
    const period=card.querySelector('.card-chart-period');if(period)period.textContent=data.currentYear+' vs '+data.previousYear;
    const footer=card.querySelector('.card-footer-context');if(footer)footer.textContent='Approved training budgets for '+data.currentYear+' compared with '+data.previousYear+'.';
    const helper=card.querySelector('.card-chart-helper span');if(helper)helper.textContent='Recorded training budgets by year. Hover for amounts.';
  }
  const age=document.getElementById('beneficiaryAgeSexChart');if(age){const note=document.createElement('p');note.className='dashboard-data-note';note.textContent='Age as of '+data.humanDate+'. Youth: 15-30 / Adults: 31-59 / Seniors: 60+.'+(data.excludedAgeCount?' '+data.excludedAgeCount+' records outside these bands or without a valid birthdate/sex are excluded.':'');age.after(note);}
  const groups=document.getElementById('beneficiaryGroupChart');if(groups){const description=groups.closest('.card').querySelector('.card-beneficiary-description');if(description)description.textContent='PWD, 4Ps, IP, TUPAD, and solo-parent beneficiaries. Membership can overlap.';}
  if(!data.upcoming.length){const slot=document.querySelector('.card-upcoming-training .card-slot');if(slot)slot.hidden=true;const date=document.querySelector('.card-upcoming-training .card-range-date');if(date)date.textContent='No upcoming date';}
},0));
