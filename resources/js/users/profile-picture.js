/* Profile images are validated and stored for the authenticated database account. */
document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id),input=$('profilePictureFile'),avatar=$('myProfileAvatar'),preview=$('profilePicturePreview'),status=$('profilePictureStatus');
  let selected=null,previewUrl=null,busy=false,user=window.TMIS_SESSION?.user;
  if(!user)return;
  function render(){
    for(const target of [avatar,preview]){
      target.replaceChildren();const source=target===preview&&previewUrl?previewUrl:user.photoUrl;
      if(source){const image=document.createElement('img');image.src=source;image.alt='Your profile photo';image.addEventListener('error',()=>{target.textContent=user.initials||'U';});target.append(image);}else target.textContent=user.initials||'U';
    }
    input.disabled=busy;$('saveProfilePicture').disabled=busy||!selected;$('cancelProfilePicture').disabled=busy||!selected;$('removeProfilePicture').disabled=busy||!user.photoUrl;
  }
  function clear(){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;selected=null;input.value='';}
  function apply(result){user=result.user;window.TMIS_SESSION.user=user;
    document.querySelectorAll('[data-account-avatar]').forEach(target=>{target.replaceChildren();if(user.photoUrl){const image=document.createElement('img');image.src=user.photoUrl;image.alt='';image.addEventListener('error',()=>{target.textContent=user.initials;});target.append(image);}else target.textContent=user.initials;});
    clear();status.textContent=result.message;window.TmisToast?.show(result.message,'success');
  }
  input.addEventListener('change',()=>{
    clearSelection();
    const file=input.files[0];if(!file){render();return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status.textContent='Choose a JPG, PNG, or WebP image up to 10 MB.';window.TmisToast?.show(status.textContent,'error');input.value='';render();return;}
    selected=file;previewUrl=URL.createObjectURL(file);status.textContent='Preview ready. Save to update your account photo.';render();
  });
  function clearSelection(){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;selected=null;}
  async function save(remove=false){if(busy||(!remove&&!selected))return;busy=true;render();try{
    const body=new FormData();if(!remove)body.append('photo',selected);
    const result=await window.TmisStore.request('/profile/photo',body,remove?'DELETE':'POST');apply(result);
  }catch(error){status.textContent=error.message;window.TmisToast?.show(error.message,'error');}finally{busy=false;render();}}
  $('saveProfilePicture').addEventListener('click',()=>save());$('removeProfilePicture').addEventListener('click',()=>save(true));$('cancelProfilePicture').addEventListener('click',()=>{clear();status.textContent='Picture selection cancelled.';render();});
  window.addEventListener('pagehide',clearSelection);render();
});
