"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadDropzone } from "@/utils/uploadthing";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { Display, Narrative, Label } from "@/components/ui/typography";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto flex-grow flex flex-col w-full">
        <section className="text-center mb-20">
          <Label className="mb-4 block">ЗАПЕЧАТАНИ МОМЕНТИ</Label>
          <Display className="mb-8">Нашият голям ден през вашите очи</Display>
          <div className="max-w-2xl mx-auto">
            <Narrative>
              Ще се радваме да видим магията през вашите очи. Моля, споделете до 5 от любимите си моменти от нашата сватбена нощ.
            </Narrative>
          </div>
        </section>

        <section className="w-full max-w-3xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-4 bg-surface-container-low rounded-xl -z-10 transition-transform duration-500 group-hover:scale-[1.02]"></div>
            <UploadDropzone
              endpoint="imageUploader"
              onClientUploadComplete={(res) => {
                console.log("Files: ", res);
                router.push("/success");
              }}
              onUploadError={(error: Error) => {
                setError(error.message);
              }}
              appearance={{
                container: "border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest rounded-lg p-12 text-center transition-all duration-500 hover:border-primary/40 group/zone min-h-[300px] md:h-[450px] flex flex-col items-center justify-center w-full",
                uploadIcon: "w-20 h-20 bg-primary-fixed-dim rounded-full text-primary mb-6 mx-auto group-hover/zone:scale-110 transition-transform duration-500 p-4",
                label: "font-headline text-2xl md:text-3xl text-on-surface mb-4 hover:text-primary transition-colors",
                allowedContent: "text-on-surface-variant font-light mb-10 italic",
                button: "bg-primary text-on-primary px-10 py-4 rounded-full font-label text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-300 ut-uploading:animate-pulse after:bg-white/20",
              }}
              content={{
                label: "Плъзнете и пуснете спомени",
                allowedContent: "Макс. 5 снимки • За предпочитане с висока резолюция",
                button({ ready, isUploading }) {
                  if (isUploading) return "Качване...";
                  if (ready) return "ИЗБЕРЕТЕ ОТ УСТРОЙСТВО";
                  return "Зареждане...";
                },
              }}
            />
            {error && (
              <div className="mt-4 p-4 bg-error-container text-on-error-container rounded-md flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Грешка: {error}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
