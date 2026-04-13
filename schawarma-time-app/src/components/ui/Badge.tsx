import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'mostLiked' | 'halal' | 'vegan' | 'vegetarian' | 'new' | 'promo' | 'success' | 'pending' | 'danger' | 'warning' | 'default' | 'info'
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'mostLiked', className, children }: BadgeProps) {
  const variants = {
    mostLiked: 'bg-[#06c167] text-white',
    halal: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    vegan: 'bg-green-100 text-green-800 border border-green-200',
    vegetarian: 'bg-lime-100 text-lime-800 border border-lime-200',
    new: 'bg-blue-100 text-blue-800 border border-blue-200',
    promo: 'bg-orange-100 text-orange-800 border border-orange-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    danger:  'bg-red-100 text-red-800 border border-red-200',
    warning: 'bg-orange-100 text-orange-800 border border-orange-200',
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
    info:    'bg-blue-100 text-blue-800 border border-blue-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
