import React from 'react';

/**
 * Inline field error message component.
 * Shows a red error message below the input field. Pass the same `id` used
 * in the input's aria-describedby so screen readers associate the two.
 */
export default function FieldError({ error, id }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  );
}
