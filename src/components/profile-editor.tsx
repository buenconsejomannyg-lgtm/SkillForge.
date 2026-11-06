"use client";
import { useState, type FormEvent } from "react";
import { Camera, Pencil } from "lucide-react";
import { profileSchema } from "@/lib/models";
import { usePrototype } from "./prototype-provider";
import { Dialog } from "./ui";

export function Avatar({ large = false }: { large?: boolean }) {
  const { avatar, state } = usePrototype();
  return (
    <div className={`avatar ${large ? "large" : ""}`}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Session-only blob URLs stay local; no image optimization endpoint is needed.
        <img
          src={avatar}
          alt={`${state.profile.displayName}'s session avatar`}
        />
      ) : (
        <span aria-label="Profile picture placeholder">
          {state.profile.displayName.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
export function ProfileEditor() {
  const {
    state,
    updateProfile,
    discardProfileDraft,
    profileBase,
    setAvatar,
    recovered,
  } = usePrototype();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [avatarNotice, setAvatarNotice] = useState("");
  const [draft, setDraft] = useState(state.profile);
  const [base, setBase] = useState(state.profile);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice("");
    setConflict(false);
    const form = new FormData(e.currentTarget);
    const parsed = profileSchema.safeParse({
      id: "local-profile",
      displayName: form.get("displayName"),
      headline: form.get("headline"),
      biography: form.get("biography"),
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await updateProfile(parsed.data, base);
    setSaving(false);
    if (result.status === "saved" && result.state) {
      setBase(result.state.profile);
      setDraft(result.state.profile);
      setNotice("Profile saved in this browser.");
    } else if (result.status === "conflict") {
      setConflict(true);
      setNotice(
        result.message ||
          "A profile conflict was detected. Your draft is still here.",
      );
    } else
      setNotice(
        "Profile updated for this session only. See the storage notice.",
      );
  }
  return (
    <>
      <button
        className="button secondary small"
        onClick={() => {
          setOpen(true);
          setNotice("");
          setErrors({});
          setAvatarNotice("");
          setBase(profileBase());
          setDraft(state.profile);
          setConflict(false);
        }}
      >
        <Pencil size={14} /> Edit profile
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Make it yours"
        description="Prototype profile · saved only in this browser. Use non-confidential information."
      >
        <div className="avatar-editor">
          <Avatar />
          <div>
            <label className="button secondary small upload-label">
              <Camera size={15} /> Preview an image
              <input
                aria-label="Choose profile image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    setAvatarNotice(
                      (await setAvatar(file)) ||
                        "Image preview ready. It lasts for this session only.",
                    );
                  e.target.value = "";
                }}
              />
            </label>
            <small>PNG, JPEG, WebP · max 3 MB · session only</small>
          </div>
        </div>
        {avatarNotice && (
          <p role="status" className="form-notice">
            {avatarNotice}
          </p>
        )}
        <form onSubmit={submit} noValidate>
          {(["displayName", "headline", "biography"] as const).map((field) => (
            <div className="form-field" key={field}>
              <label htmlFor={field}>
                {field === "displayName"
                  ? "Display name"
                  : field === "headline"
                    ? "Headline"
                    : "Biography"}
              </label>
              {field === "biography" ? (
                <textarea
                  id={field}
                  name={field}
                  disabled={saving}
                  value={draft[field]}
                  onChange={(e) => {
                    setDraft((current) => ({
                      ...current,
                      [field]: e.target.value,
                    }));
                    setNotice("");
                  }}
                  rows={4}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={
                    errors[field] ? `${field}-error` : undefined
                  }
                />
              ) : (
                <input
                  id={field}
                  name={field}
                  disabled={saving}
                  value={draft[field]}
                  onChange={(e) => {
                    setDraft((current) => ({
                      ...current,
                      [field]: e.target.value,
                    }));
                    setNotice("");
                  }}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={
                    errors[field] ? `${field}-error` : undefined
                  }
                />
              )}
              {errors[field] && (
                <small className="field-error" id={`${field}-error`}>
                  {errors[field]}
                </small>
              )}
            </div>
          ))}
          {recovered && (
            <p className="form-notice">
              Storage recovery is pending. Edits remain session-only until
              recovery or reset.
            </p>
          )}
          <div className="dialog-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
          {conflict && (
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                const saved = discardProfileDraft();
                if (saved) {
                  setBase(saved);
                  setDraft(saved);
                  setErrors({});
                  setConflict(false);
                  setNotice("Loaded the latest saved profile.");
                }
              }}
            >
              Discard draft & load saved profile
            </button>
          )}
          <p role="status" className="form-notice">
            {notice}
          </p>
        </form>
      </Dialog>
    </>
  );
}
