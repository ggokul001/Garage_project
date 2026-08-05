const numericSelector='input[type="number"]';

function convert(input:HTMLInputElement){
  input.type='text';
  input.inputMode='decimal';
  input.autocomplete='off';
  input.pattern='[0-9]*[.]?[0-9]*';
  input.dataset.numericText='true';
}

function sanitize(value:string){
  let result=value.replace(/[^0-9.]/g,'');
  const point=result.indexOf('.');
  if(point>=0)result=result.slice(0,point+1)+result.slice(point+1).replace(/\./g,'');
  return result;
}

export function enableNumericTextInputs(){
  const scan=(node:ParentNode)=>{if(node instanceof HTMLInputElement&&node.matches(numericSelector))convert(node);node.querySelectorAll?.(numericSelector).forEach(element=>convert(element as HTMLInputElement))};
  scan(document);
  const observer=new MutationObserver(records=>records.forEach(record=>{if(record.type==='attributes')scan(record.target as ParentNode);record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)scan(node)})}));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['type']});
  document.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input?.dataset.numericText!=='true')return;const next=sanitize(input.value);if(next!==input.value)input.value=next;if(next===''||next.endsWith('.'))event.stopPropagation()},true);
  document.addEventListener('beforeinput',event=>{const input=event.target as HTMLInputElement;if(input?.dataset.numericText!=='true'||!(event instanceof InputEvent)||!event.data)return;const start=input.selectionStart??input.value.length,end=input.selectionEnd??start,proposed=input.value.slice(0,start)+event.data+input.value.slice(end);if(sanitize(proposed)!==proposed)event.preventDefault()},true);
}
