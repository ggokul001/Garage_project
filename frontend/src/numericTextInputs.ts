const numericSelector='input[type="number"]';
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function descriptor(input:HTMLInputElement){
  const label=input.labels?.[0]?.textContent??input.closest('div')?.querySelector('label')?.textContent??'';
  return `${input.name} ${input.id} ${input.placeholder} ${label}`.toLowerCase();
}

function isPhoneInput(input:HTMLInputElement){
  if(input.type==='search')return false;
  const text=descriptor(input);
  if(/contact\s*(person|name)/.test(text)&&!/(phone|mobile|number|no\b)/.test(text))return false;
  return /(^|[_\s-])(phone|mobile)([_\s-]|$)|contact\s*(number|no\b)|driver\s*contact|customer\s*contact/.test(text);
}

function isEmailInput(input:HTMLInputElement){
  return input.type==='email'||/(^|[_-])email([_-]|$)/i.test(`${input.name} ${input.id}`);
}

function convertNumber(input:HTMLInputElement){
  if(input.dataset.numericText==='true')return;
  input.type='text';
  input.inputMode='decimal';
  input.autocomplete='off';
  input.pattern='[0-9]*[.]?[0-9]*';
  input.dataset.numericText='true';
}

function configurePhone(input:HTMLInputElement){
  if(input.dataset.phoneInput==='true')return;
  input.type='tel';
  input.inputMode='numeric';
  input.autocomplete='tel';
  input.maxLength=10;
  input.minLength=10;
  input.pattern='[0-9]{10}';
  input.title='Enter exactly 10 digits';
  input.dataset.phoneInput='true';
  input.value=input.value.replace(/\D/g,'').slice(0,10);
}

function configureEmail(input:HTMLInputElement){
  if(input.dataset.emailInput==='true')return;
  input.type='email';
  input.inputMode='email';
  input.autocomplete=input.autocomplete||'email';
  input.dataset.emailInput='true';
}

function sanitizeNumber(value:string){
  let result=value.replace(/[^0-9.]/g,'');
  const point=result.indexOf('.');
  if(point>=0)result=result.slice(0,point+1)+result.slice(point+1).replace(/\./g,'');
  return result;
}

function isAmountHeading(value:string){
  if(/paid until|billing months?|allocated months?/i.test(value))return false;
  return /\b(amount|total|balance|salary|rate|price|cost|fee|outstanding|billed|taxable|advance|additional|paid|credit|received|allocated|earnings?|deductions?|discount|monthly fee|earned|ot amt|net salary)\b/i.test(value);
}

function alignAmountInput(input:HTMLInputElement){
  if(isAmountHeading(descriptor(input))&&!input.classList.contains('amount-input'))input.classList.add('amount-input');
}

function alignAmounts(table:HTMLTableElement){
  const headers=table.tHead?.rows[0]?.cells;
  if(!headers)return;
  Array.from(headers).forEach((header,index)=>{
    if(!isAmountHeading(header.textContent??''))return;
    Array.from(table.rows).forEach(row=>{const cell=row.cells[index];if(cell&&!cell.classList.contains('amount-column'))cell.classList.add('amount-column')});
  });
}

function scan(node:ParentNode){
  if(node instanceof HTMLInputElement){
    if(node.matches(numericSelector))convertNumber(node);
    else if(isPhoneInput(node))configurePhone(node);
    else if(isEmailInput(node))configureEmail(node);
    alignAmountInput(node);
  }
  node.querySelectorAll?.('input').forEach(element=>{
    const input=element as HTMLInputElement;
    if(input.matches(numericSelector))convertNumber(input);
    else if(isPhoneInput(input))configurePhone(input);
    else if(isEmailInput(input))configureEmail(input);
    alignAmountInput(input);
  });
  if(node instanceof HTMLTableElement)alignAmounts(node);
  node.querySelectorAll?.('table').forEach(table=>alignAmounts(table as HTMLTableElement));
  if(node instanceof Element){const parentTable=node.closest('table');if(parentTable)alignAmounts(parentTable)}
}

function validate(input:HTMLInputElement){
  if(input.dataset.phoneInput==='true'){
    input.setCustomValidity(input.value!==''&&!/^\d{10}$/.test(input.value)?'Enter exactly 10 digits.':'');
  }else if(input.dataset.emailInput==='true'){
    input.setCustomValidity(input.value!==''&&!emailPattern.test(input.value)?'Enter a valid email address (example: name@company.com).':'');
  }
  return input.checkValidity();
}

export function enableNumericTextInputs(){
  scan(document);
  const pending=new Set<HTMLElement>();
  let scheduled=false;
  const flush=()=>{
    scheduled=false;
    const nodes=Array.from(pending);
    pending.clear();
    nodes.forEach(scan);
  };
  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)pending.add(node)}));
    if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(flush)}
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});

  document.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;
    if(!(input instanceof HTMLInputElement))return;
    if(input.dataset.phoneInput==='true'){
      const next=input.value.replace(/\D/g,'').slice(0,10);
      if(next!==input.value)input.value=next;
      validate(input);
      return;
    }
    if(input.dataset.emailInput==='true'){
      const next=input.value.replace(/\s/g,'');
      if(next!==input.value)input.value=next;
      validate(input);
      return;
    }
    if(input.dataset.numericText!=='true')return;
    const next=sanitizeNumber(input.value);
    if(next!==input.value)input.value=next;
    if(next===''||next.endsWith('.'))event.stopPropagation();
  },true);

  document.addEventListener('beforeinput',event=>{
    const input=event.target as HTMLInputElement;
    if(!(input instanceof HTMLInputElement)||!(event instanceof InputEvent)||!event.data)return;
    const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
    const proposed=input.value.slice(0,start)+event.data+input.value.slice(end);
    if(input.dataset.phoneInput==='true'&&(/\D/.test(event.data)||proposed.length>10))event.preventDefault();
    else if(input.dataset.emailInput==='true'&&/\s/.test(event.data))event.preventDefault();
    else if(input.dataset.numericText==='true'&&sanitizeNumber(proposed)!==proposed)event.preventDefault();
  },true);

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement))return;
    const invalid=Array.from(form.querySelectorAll<HTMLInputElement>('input[data-phone-input="true"],input[data-email-input="true"]')).find(input=>!validate(input));
    if(invalid){event.preventDefault();event.stopImmediatePropagation();invalid.reportValidity();invalid.focus()}
  },true);
}
