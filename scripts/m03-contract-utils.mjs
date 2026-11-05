export function methodText(source,name){
  const match=new RegExp('^  (?:private )?'+name+'\\(', 'm').exec(source);if(!match)throw Error('Method missing: '+name);
  let i=source.indexOf('(',match.index),depth=0,quote='',escaped=false;
  function character(c){if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';return false;}if(c==='"'||c==="'"||c==='`'){quote=c;return false;}return true;}
  for(;i<source.length;i++){const c=source[i];if(!character(c))continue;if(c==='(')depth++;if(c===')'&&--depth===0){i++;break;}}
  i=source.indexOf('{',i);depth=0;quote='';escaped=false;
  for(;i<source.length;i++){const c=source[i];if(!character(c))continue;if(c==='{')depth++;if(c==='}'&&--depth===0)return source.slice(match.index,i+1);}
  throw Error('Unclosed method: '+name);
}
