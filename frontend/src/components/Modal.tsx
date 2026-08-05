import { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({open,title,onClose,children,footer,wide=false}:{open:boolean;title:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;wide?:boolean}){
  if(!open)return null;
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className={`modal-shell ${wide?'max-w-4xl':'max-w-2xl'}`}>
      <div className="modal-header"><h2 className="text-base font-semibold text-fg">{title}</h2><button onClick={onClose} className="action ml-auto" aria-label="Close modal"><X size={18}/></button></div>
      <div className="overflow-y-auto p-5">{children}</div>
      {footer&&<div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}
