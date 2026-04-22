import * as React from "react"

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#fbf9f5]/70 backdrop-blur-md shadow-[0_8px_32px_rgba(27,28,26,0.04)]">
      <div className="flex justify-center md:justify-start items-center px-8 py-6 max-w-7xl mx-auto">
        <h1 className="font-headline italic text-2xl text-[#7e525c]">Десислава & Иван</h1>
      </div>
    </header>
  )
}
