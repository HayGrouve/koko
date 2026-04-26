import Link from "next/link";
import { Heart, Camera } from "lucide-react";
import { Header } from "@/components/ui/header";

export default function SuccessPage() {
  return (
    <>
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center opacity-30">
          <img
            alt="background texture"
            className="w-full h-full object-cover blur-3xl opacity-20"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB755U7LEjFl9PG8lx6J_wui81jE4vhiml3rypWcNh81Iwz_XFXSQcOiDPG1B6zrF8zc1WXEUFlpLEUf17o-rHfBJMNIR0PWOHGQEEjZ-8CjZXd91IvmTVwcGORHDYMmVkEyJRIA6rPudKaeX-dQ45_kFpvpgjHKoCOoJxcdpvJ927f7KPQumOpDoSP_LPL5dKir4Tj6BPz5ZeZIPZZ51Z1eBYLCKmAI0fga4Uray-JWt9VZaSvOe3SH-ya6UOIwXZcJiPaCx-aiRQ"
          />
        </div>

        <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-10">
          <div className="relative flex items-center justify-center w-32 h-32 mb-4">
            <div className="absolute inset-0 bg-primary-container opacity-20 rounded-full blur-xl"></div>
            <div className="w-24 h-24 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(27,28,26,0.04)] border border-outline-variant/15 z-10">
              <Heart className="text-primary w-12 h-12" strokeWidth={1} />
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl text-on-surface font-light leading-tight">
              Благодарим ви!
            </h1>
            <p className="font-headline text-2xl sm:text-3xl text-secondary italic font-light">
              Вашите спомени бяха запазени.
            </p>
            <div className="w-16 h-[1px] bg-outline-variant/30 mx-auto my-8"></div>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Десислава и Иван ще се зарадват да ги видят.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-[#fbf9f5] w-full py-16 border-t border-[#7e525c]/10 flex flex-col items-center gap-8 max-w-7xl mx-auto px-6">
        <nav className="flex flex-wrap justify-center gap-8">
          <Link href="/" className="font-body text-xs uppercase tracking-[0.2em] text-[#695d46]/60 hover:text-[#7e525c] transition-colors duration-300 ease-in-out">
            Начало
          </Link>
          <Link href="#" className="font-body text-xs uppercase tracking-[0.2em] text-[#695d46]/60 hover:text-[#7e525c] transition-colors duration-300 ease-in-out">
            Галерия
          </Link>
          <Link href="#" className="font-body text-xs uppercase tracking-[0.2em] text-[#695d46]/60 hover:text-[#7e525c] transition-colors duration-300 ease-in-out">
            Контакти
          </Link>
        </nav>
        <div className="font-body text-xs uppercase tracking-[0.2em] text-[#695d46]/60 text-center">
          Десислава & Иван. С любов.
        </div>
      </footer>
    </>
  );
}
