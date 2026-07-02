"use client";

import { useCallback, useState } from "react";
import { useUploadFileMutation } from "./media.api";

/**
 * File-upload hook used by the products manager.
 * Returns an `upload` callback plus a shared `uploading` flag.
 */
export function useMediaUpload() {
  const [uploadFile, uploadState] = useUploadFileMutation();
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<string> => {
      setUploading(true);
      try {
        return await uploadFile(file).unwrap();
      } finally {
        setUploading(false);
      }
    },
    [uploadFile],
  );

  return {
    upload,
    uploading,
    uploadState,
  };
}
