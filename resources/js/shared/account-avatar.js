document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-account-photo]').forEach(image=>{
    const fallback=()=>{image.hidden=true;image.nextElementSibling.hidden=false;};
    image.addEventListener('error',fallback);
    if(image.complete&&!image.naturalWidth)fallback();
  });
});
