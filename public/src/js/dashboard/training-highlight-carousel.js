/* Only approved, scoped training highlights belong in the community carousel. */
document.addEventListener('DOMContentLoaded',()=>{
  const carousel=document.getElementById('communityFeedbackCarousel');if(!carousel)return;
  const text=(tag,value,className)=>{const element=document.createElement(tag);element.textContent=value||'';if(className)element.className=className;return element;};
  const trainings=window.TmisStore?.records('tmis-trainings').filter(item=>item.status==='Approved & Accepted').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))||[];
  const slides=trainings.flatMap(training=>{const choice=training.dashboardSlide;return Object.entries(training.highlights||{}).filter(([index,item])=>(choice===undefined||choice===null||String(choice)===index)&&(item.heading||item.description||item.quote||item.image)).map(([index,item])=>({training,index,item}));});
  window.bootstrap?.Carousel.getInstance(carousel)?.dispose();
  const inner=carousel.querySelector('.carousel-inner'),indicators=carousel.querySelector('.carousel-indicators');inner.replaceChildren();indicators?.replaceChildren();
  if(!slides.length){const article=document.createElement('article');article.className='carousel-item active dashboard-highlight-empty';const body=document.createElement('div'),icon=document.createElement('i');icon.className='bi bi-images';icon.setAttribute('aria-hidden','true');body.append(icon,text('h3','No highlights yet'),text('p','Training highlights and community feedback will appear here when they are available.'));article.append(body);inner.append(article);}
  slides.forEach(({training,index,item},offset)=>{
    const article=document.createElement('article');article.className='carousel-item dashboard-training-highlight'+(offset===0?' active':'');article.style.minHeight='360px';
    if(item.image){const image=document.createElement('img');image.className='community-feedback-image';image.src=item.image;image.alt=training.title;article.append(image);}else article.classList.add('dashboard-highlight-text');
    const overlay=document.createElement('div');overlay.className='community-feedback-overlay';const topline=document.createElement('div');topline.className='community-feedback-topline';topline.append(text('span',Number(index)===0?'Key Highlights':'Ways Forward','community-feedback-label'));
    const copy=document.createElement('div');copy.className='community-feedback-copy';copy.append(text('h3',item.heading||training.title),text('p',item.description));if(item.quote)copy.append(text('blockquote',item.quote,'community-feedback-quote'));
    const caption=document.createElement('div');caption.className='community-feedback-caption';caption.append(text('h5',item.trainingTitle||training.title));overlay.append(topline,copy,caption);article.append(overlay);inner.append(article);
    if(indicators){const button=document.createElement('button');button.type='button';button.dataset.bsTarget='#communityFeedbackCarousel';button.dataset.bsSlideTo=String(offset);button.setAttribute('aria-label','Show highlight '+(offset+1));if(offset===0){button.className='active';button.setAttribute('aria-current','true');}indicators.append(button);}
  });
  for(const control of carousel.querySelectorAll('.carousel-control-prev,.carousel-control-next,.carousel-indicators'))control.hidden=slides.length<2;
  if(slides.length>1&&window.bootstrap)new bootstrap.Carousel(carousel,{interval:6000,ride:false});
});
