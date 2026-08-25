"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUploadThing } from "@/utils/uploadthing";
import { Header } from "@/components/ui/header";
import { Display, Narrative } from "@/components/ui/typography";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_LABEL,
} from "@/lib/upload-limits";
import { AlertCircle, UploadCloud, X, Plus, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: () => {
      router.push("/success");
    },
    onUploadError: (error: Error) => {
      setError(error.message);
    },
  });

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > MAX_IMAGE_COUNT) {
      setError(`Моля, изберете до ${MAX_IMAGE_COUNT} снимки общо.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const oversized = selectedFiles.filter((file) => file.size > MAX_IMAGE_BYTES);
    const accepted = selectedFiles.filter((file) => file.size <= MAX_IMAGE_BYTES);
    if (oversized.length > 0) {
      setError(
        oversized.length === 1
          ? `Една снимка е над ${MAX_IMAGE_SIZE_LABEL} и не беше добавена.`
          : `Някои снимки са над ${MAX_IMAGE_SIZE_LABEL} и не бяха добавени.`,
      );
      if (accepted.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    const newPreviews = accepted.map((file) => URL.createObjectURL(file));
    setFiles((prev) => [...prev, ...accepted]);
    setPreviews((prev) => {
      const updated = [...prev, ...newPreviews];
      previewsRef.current = updated;
      return updated;
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    URL.revokeObjectURL(previews[indexToRemove]);
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setPreviews((prev) => {
      const updated = prev.filter((_, index) => index !== indexToRemove);
      previewsRef.current = updated;
      return updated;
    });
    setError(null);
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    startUpload(files);
  };

  return (
    <>
      <Header />
      <main className="pt-8 pb-24 px-6 max-w-5xl mx-auto flex-grow flex flex-col w-full">
        <section className="text-center mb-20">
          <Display className="mb-8 text-4xl md:text-6xl">
            Нашият голям ден през вашите очи
          </Display>
          <div className="max-w-2xl mx-auto">
            <Narrative>
              Фотографът ще снима церемонията. Вие снимайте масата, наздравицата, хората и танците.
            </Narrative>
          </div>
        </section>

        <section className="w-full max-w-3xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-4 bg-surface-container-low rounded-xl -z-10 transition-transform duration-500 group-hover:scale-[1.02]"></div>
            
            <div className="border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest rounded-lg p-8 sm:p-12 text-center transition-all duration-500 hover:border-primary/40 min-h-[300px] md:h-[450px] flex flex-col items-center justify-center w-full">
              {files.length === 0 ? (
                <div
                  className="cursor-pointer flex flex-col items-center justify-center w-full h-full group/zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 bg-primary-fixed-dim rounded-full !text-primary mb-6 flex items-center justify-center group-hover/zone:scale-110 transition-transform duration-500 p-4">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <h3 className="font-headline text-2xl md:text-3xl text-on-surface mb-4 hover:text-primary transition-colors">
                    Качете спомени
                  </h3>
                  <p className="text-on-surface-variant font-light mb-10 italic">
                    До {MAX_IMAGE_COUNT} снимки наведнъж • За предпочитане с високо качество
                  </p>
                  <div className="!bg-primary !text-on-primary px-10 py-4 rounded-full font-label text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-300">
                    Изберете снимки
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-grow overflow-y-auto w-full mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {previews.map((preview, index) => (
                        <div key={preview} className="relative aspect-square rounded-xl overflow-hidden border border-outline-variant/30 group/item bg-surface-container-low">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity hover:bg-black/70"
                            aria-label="Премахни снимка"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {files.length < MAX_IMAGE_COUNT && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 text-secondary hover:text-primary transition-colors bg-surface-container-high/30"
                        >
                          <Plus className="w-8 h-8 mb-2" />
                          <span className="font-label text-xs uppercase tracking-widest">Добави още</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="!bg-primary !text-on-primary px-10 py-4 rounded-full font-label text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-3 mx-auto"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Качване...
                        </>
                      ) : (
                        "Качи снимките"
                      )}
                    </button>
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>

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
    </>
  );
}