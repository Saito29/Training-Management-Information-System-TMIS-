/* Database timestamps without an offset are UTC; calendar-only dates stay on their Philippine date. */
(() => {
  const parse=value=>{
    if(value instanceof Date)return value;
    if(typeof value!=='string')return new Date(value);
    let text=value.trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(text))text+='T00:00:00+08:00';
    else if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text)&&!/(Z|[+-]\d{2}:?\d{2})$/i.test(text))text=text.replace(' ','T')+'Z';
    return new Date(text);
  };
  window.TmisDate={parse,format:(value,options={dateStyle:'medium',timeStyle:'short'})=>{
    const date=parse(value);return Number.isNaN(date.getTime())?'Date not recorded':new Intl.DateTimeFormat('en-PH',{...options,timeZone:'Asia/Manila'}).format(date);
  }};
})();
