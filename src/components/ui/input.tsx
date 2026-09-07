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
  return (
    <div>
      {label && <label class='block text-base font-semibold mb-2 text-slate-800' for={props.id}>{label}</label>}
      <input type='file'
        class={`w-full text-base text-slate-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-bold file:bg-accent file:text-slate-900 hover:file:bg-amber-400 file:min-h-[48px] file:cursor-pointer min-h-[48px] ${extraClass}`}
        {...props} />
      {hint && <p class='text-xs text-slate-500 mt-1 font-medium'>{hint}</p>}
      {error && <p class='text-sm text-error mt-1 font-medium'>{error}</p>}
    </div>
  );
}
