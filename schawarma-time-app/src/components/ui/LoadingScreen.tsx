export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-sm sm:text-lg font-black text-white tracking-widest uppercase text-center px-12 whitespace-nowrap">
          www.schawarma-time.de
        </h1>
        <div className="h-1 w-24 bg-[#06c167] rounded-full" />
        <p className="text-white/60 font-medium tracking-[0.2em] text-sm animate-pulse uppercase">
          Wird geladen...
        </p>
      </div>
    </div>
  )
}
