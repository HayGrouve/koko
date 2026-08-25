import { Header } from "@/components/ui/header";
import { verifySession } from "@/lib/admin-dal";
import { fetchGalleryPage } from "@/lib/fetch-gallery-page";
import { AdminGallery } from "./gallery";
import { GateForm } from "./gate-form";

export default async function AdminPage() {
  const session = await verifySession();

  return (
    <>
      <Header />
      <main className="pt-8 pb-24 px-6 max-w-5xl mx-auto flex-grow flex flex-col w-full">
        {session ? (
          <AdminGalleryView />
        ) : (
          <section className="flex-grow flex items-center">
            <GateForm />
          </section>
        )}
      </main>
    </>
  );
}

async function AdminGalleryView() {
  const page = await fetchGalleryPage(0);
  return (
    <AdminGallery
      initialPhotos={page.photos}
      initialHasMore={page.hasMore}
    />
  );
}
