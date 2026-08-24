import { createUploadthing, type FileRouter } from "uploadthing/next";
import { MAX_IMAGE_COUNT, MAX_IMAGE_SIZE } from "@/lib/upload-limits";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: MAX_IMAGE_SIZE,
      maxFileCount: MAX_IMAGE_COUNT,
    },
  })
    .onUploadComplete(async ({ file }) => {
      console.log("Upload complete for file:", file.url);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
