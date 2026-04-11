import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Menu, ChevronDown, MapPin, Search, Phone } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { totalQuantity, toggleCart } = useCartStore()
  const { user, isLoading, isInitialized } = useAuthStore()
  const itemCount = totalQuantity()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 h-[72px] lg:h-[80px]">
      <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
        
        {/* Left Section */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <div className="flex flex-col items-start shrink-0">
            <Link to="/" className="text-[26px] tracking-tight text-black leading-tight hover:opacity-75 transition-opacity">
              <span className="font-bold">Smash</span><span className="font-medium">47</span>
            </Link>
            <a 
              href="tel:051213030551"
              className="flex items-center gap-1.5 text-black mt-1 hover:opacity-75 transition-opacity"
            >
              <Phone size={12} className="text-black" fill="currentColor" />
              <span className="text-[15px] font-bold tracking-tight">05121 3030551</span>
            </a>
          </div>
        </div>

        {/* Center Search */}
        <div className="flex-1 max-w-[720px] px-2 hidden md:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={20} className="text-black" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Suche in Smash47"
              className="w-full pl-[46px] pr-10 py-3 text-[15px] font-medium bg-[#f6f6f6] border-transparent rounded-full focus:outline-none focus:bg-[#e2e2e2] transition-colors placeholder:text-[#545454]"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <button 
            onClick={toggleCart}
            className="relative p-2 hover:opacity-75 transition-opacity"
          >
            <ShoppingCart size={24} className="text-black" />
            <span className="absolute top-0 right-0 w-5 h-5 bg-[#06c167] text-white text-[11px] font-bold rounded-full flex items-center justify-center translate-x-1.5 -translate-y-1">
              {itemCount}
            </span>
          </button>
          
          <div className="sm:min-w-[140px] flex justify-end">
            {!isInitialized || isLoading ? (
              <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-full" />
            ) : user ? (
              <Link to="/profil" className="flex items-center gap-4 hover:opacity-75 transition-opacity group">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900 group-hover:text-black">{user.full_name}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mein Profil</span>
                </div>
                <div className="w-10 h-10 bg-[#142328] rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#142328]/10 group-hover:scale-105 transition-transform">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-4 lg:gap-6">
                <Link to="/login" className="hidden sm:block px-2 py-2 text-base font-medium text-black hover:opacity-75 transition-opacity whitespace-nowrap">
                  Anmelden
                </Link>
                <Link to="/register" className="hidden sm:block px-5 py-2.5 text-[15px] font-medium bg-[#f6f6f6] text-black hover:bg-[#e2e2e2] rounded-full transition-colors whitespace-nowrap">
                  Registrieren
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
