import type { Child } from 'hono/jsx';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  class?: string;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  [key: string]: unknown;
}

export function InputField({ label, error, hint, class: extraClass = '', ...props }: FieldProps) {
  return (
    <div>
      {label && <label class='block text-base font-semibold mb-2 text-slate-800' for={props.id}>{label}</label>}
      <input class={`input-field ${extraClass}`} {...props} />
      {hint && <p class='text-xs text-slate-500 mt-1 font-medium'>{hint}</p>}
      {error && <p class='text-sm text-error mt-1 font-medium'>{error}</p>}
    </div>
  );
}

export function SelectField({ label, error, hint, children, class: extraClass = '', ...props }: FieldProps & { children: Child }) {
  return (
    <div>
      {label && <label class='block text-base font-semibold mb-2 text-slate-800' for={props.id}>{label}</label>}
      <select class={`input-field ${extraClass}`} {...props}>
        {children}
      </select>
      {hint && <p class='text-xs text-slate-500 mt-1 font-medium'>{hint}</p>}
      {error && <p class='text-sm text-error mt-1 font-medium'>{error}</p>}
    </div>
  );
}

export function TextareaField({ label, error, hint, class: extraClass = '', ...props }: FieldProps) {
  return (
    <div>
      {label && <label class='block text-base font-semibold mb-2 text-slate-800' for={props.id}>{label}</label>}
      <textarea class={`input-field ${extraClass}`} {...props} />
      {hint && <p class='text-xs text-slate-500 mt-1 font-medium'>{hint}</p>}
      {error && <p class='text-sm text-error mt-1 font-medium'>{error}</p>}
    </div>
  );
}

export function FileInputField({ label, error, hint, class: extraClass = '', ...props }: FieldProps) {
  const inputId = props.id as string | undefined;
  return (
    <div>
      {label && <label class='block text-base font-semibold mb-2 text-slate-800' for={inputId}>{label}</label>}
      <div class='flex flex-col items-center gap-2'>
        <label
          for={inputId}
          class={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-accent text-slate-900 font-bold text-base cursor-pointer hover:bg-amber-400 transition min-h-[48px] ${extraClass}`}>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
          Datei ausw&auml;hlen
        </label>
        <input type='file'
          id={inputId}
          class='sr-only'
          {...props} />
        {inputId && (
          <p class='text-sm text-slate-600 font-medium' data-file-name-for={inputId}></p>
        )}
        {hint && <p class='text-xs text-slate-500 font-medium text-center'>{hint}</p>}
        {error && <p class='text-sm text-error mt-1 font-medium'>{error}</p>}
      </div>
      {inputId && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var i=document.getElementById(${JSON.stringify(inputId)});
            var o=document.querySelector('[data-file-name-for="' + ${JSON.stringify(inputId)} + '"]');
            if(!i||!o)return;
            i.addEventListener('change',function(){
              o.textContent = i.files && i.files[0] ? i.files[0].name : '';
            });
          })();
        ` }} />
      )}
    </div>
  );
}
