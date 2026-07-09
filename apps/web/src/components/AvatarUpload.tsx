"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStorageImageUrl } from "@/lib/storage-image-url";

export function AvatarUpload({
  table,
  profileId,
  userId,
  avatarPath,
  onChange,
}: {
  table: "tailor_profiles" | "supplier_profiles";
  profileId: string;
  userId: string;
  avatarPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    // Storage RLS scopes writes by auth.uid() folder, not by profileId.
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ avatar_path: path })
      .eq("id", profileId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    // Best-effort — the old object being orphaned isn't harmful, so a
    // failure here doesn't block the new avatar from taking effect.
    if (avatarPath) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }

    onChange(path);
    setUploading(false);
  }

  async function handleRemove() {
    if (!avatarPath) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from(table)
      .update({ avatar_path: null })
      .eq("id", profileId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    await supabase.storage.from("avatars").remove([avatarPath]);
    onChange(null);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-3">
      {avatarPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getStorageImageUrl("avatars", avatarPath)}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
      )}
      <div className="flex flex-col items-start gap-1">
        <label className="flex h-9 cursor-pointer items-center rounded-full border border-slate-200 px-4 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
          {uploading ? "Uploading..." : "Change photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {avatarPath && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="text-xs text-red-600 underline disabled:opacity-50"
          >
            Remove photo
          </button>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
