import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { removeUserAvatar, updateUserProfile, uploadUserAvatar } from '@/features/auth/services/userProfileService';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

/**
 * Avatar upload/replace/remove — a self-contained sub-section, matching
 * `EventSettingsForm`'s `CoverPhotoField`: it saves immediately rather
 * than waiting on the surrounding form's own submit, since it's backed
 * by its own dedicated Storage + Firestore write, not the profile-fields
 * update.
 */
function AvatarField({
  userId,
  avatarUrl,
  onChange
}: {
  userId: string;
  avatarUrl: string | undefined;
  onChange: (url: string | undefined) => void;
}): JSX.Element {
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBusy(true);
    try {
      const url = await uploadUserAvatar(userId, file);
      onChange(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "We couldn't upload that photo right now.", 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    setBusy(true);
    try {
      await removeUserAvatar(userId, avatarUrl);
      onChange(undefined);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "We couldn't remove that photo right now.", 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-avatar-field">
      <div className="profile-avatar-preview">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="profile-avatar-placeholder">No photo</span>}
      </div>

      <div className="profile-avatar-actions">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? 'Working…' : avatarUrl ? 'Replace photo' : 'Upload photo'}
        </Button>
        {avatarUrl && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void handleRemove()}>
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(event) => void handleFileChange(event)}
      />
    </div>
  );
}

/**
 * `/profile` — minimal self-service profile editing: name and phone
 * (both writable directly, since `firestore.rules` already permits a
 * user to write their own `users/{userId}` document — no Cloud Function
 * needed), and an avatar photo. Email is shown but never editable here:
 * changing a Firebase Auth email requires its own re-authentication/
 * verification flow, which this pass deliberately does not build (see
 * the final report). No password management either, for the same
 * reason — kept minimal by design.
 */
export function ProfilePage(): JSX.Element {
  const { user, refreshProfile } = useAuth();
  const { show: showToast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <section className="profile-page" />;
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await updateUserProfile(user.id, { firstName, lastName, displayName, phone });
      await refreshProfile();
      showToast('Profile updated.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your profile right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="profile-page">
      <h1>Profile</h1>
      <p className="profile-subtitle">Your name, photo, and contact details.</p>

      <Card padded>
        <AvatarField
          userId={user.id}
          avatarUrl={avatarUrl}
          onChange={(url) => {
            setAvatarUrl(url);
            void refreshProfile();
          }}
        />

        <form onSubmit={(event) => void handleSubmit(event)}>
          {error && (
            <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}

          <div className="auth-form-row">
            <Input
              label="First name *"
              name="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              disabled={submitting}
            />
            <Input
              label="Last name *"
              name="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input
              label="Display name *"
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input label="Email" name="email" value={user.email} disabled hint="Contact support to change your email." />
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="auth-form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
