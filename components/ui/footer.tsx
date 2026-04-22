import * as React from "react"

export function Footer() {
  return (
    <footer className="w-full border-t border-[#7d562d]/10 bg-[#fbf9f5] mt-32">
      <div className="flex flex-col items-center gap-6 py-12 px-4 text-center max-w-7xl mx-auto">
        <h2 className="font-headline text-xl text-[#695d46]">Десислава & Иван</h2>
        <div className="flex gap-8">
          <a className="font-body text-sm uppercase tracking-widest text-stone-500 hover:text-[#7e525c] hover:tracking-[0.2em] transition-all duration-500" href="#">ПОЛИТИКА ЗА ПОВЕРИТЕЛНОСТ</a>
          <a className="font-body text-sm uppercase tracking-widest text-stone-500 hover:text-[#7e525c] hover:tracking-[0.2em] transition-all duration-500" href="#">СВЪРЖЕТЕ СЕ С НАС</a>
          <a className="font-body text-sm uppercase tracking-widest text-stone-500 hover:text-[#7e525c] hover:tracking-[0.2em] transition-all duration-500" href="#">АРХИВ НА ГАЛЕРИЯТА</a>
        </div>
        <p className="font-body text-sm uppercase tracking-widest text-[#7e525c]">С ЛЮБОВ, ДЕСИСЛАВА & ИВАН © 2024</p>
      </div>
    </footer>
  )
}
