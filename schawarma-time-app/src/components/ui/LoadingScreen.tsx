import { APP_VERSION } from '@/version'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-sm sm:text-lg font-black text-white tracking-widest uppercase text-center px-12 whitespace-nowrap">
          www.schawarma-time.de
        </h1>
        <div className="h-1 w-24 bg-[#06c167] rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-white/60 font-medium tracking-[0.2em] text-sm animate-pulse uppercase">
            Wird geladen...
          </p>
          <p className="text-white/20 font-bold text-[10px] tracking-wider uppercase mt-4">
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  )
}
