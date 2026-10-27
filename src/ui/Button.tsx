import type { ButtonHTMLAttributes } from 'react'

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & { className?: string }

/** `icon` buttons have no visible text, so they require an `aria-label`. */
export type ButtonProps =
  | (BaseProps & { variant?: 'primary' | 'secondary' })
  | (BaseProps & { variant: 'icon'; 'aria-label': string })

const base =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border font-medium whitespace-nowrap transition-[color,background-color,border-color] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  primary: 'border-accent bg-accent px-3 py-2 text-on-accent hover:brightness-110',
  secondary:
    'border-neutral-300 bg-white px-3 py-2 text-neutral-900 hover:border-neutral-500 ' +
    'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-500',
  icon:
    'size-9 border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 ' +
    'dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-100',
} as const

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />
}
