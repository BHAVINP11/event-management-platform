import {
  removeUserAvatar,
  updateUserProfile,
  uploadUserAvatar
} from '@/features/auth/services/userProfileService';

const mockUpdateDoc = jest.fn();
const mockUploadBytes = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('@/services/firebase/firestore', () => ({ firestore: {} }));
jest.mock('@/services/firebase/storage', () => ({ storage: {} }));

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args)
}));

jest.mock('firebase/storage', () => ({
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args)
}));

const fakeFile = (overrides: { type: string; size: number; name?: string }) =>
  ({ name: overrides.name ?? 'photo.jpg', type: overrides.type, size: overrides.size }) as unknown as File;

describe('updateUserProfile', () => {
  beforeEach(() => mockUpdateDoc.mockReset());

  test('updates name/phone fields with an updatedAt timestamp', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await updateUserProfile('user1', {
      firstName: 'Bhavin',
      lastName: 'Patel',
      displayName: 'Bhavin Patel',
      phone: '9999999999'
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collection: 'users', id: 'user1' },
      expect.objectContaining({
        firstName: 'Bhavin',
        lastName: 'Patel',
        displayName: 'Bhavin Patel',
        phone: '9999999999'
      })
    );
  });

  test('wraps a Firestore failure in a friendly error', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('boom'));

    await expect(
      updateUserProfile('user1', { firstName: 'a', lastName: 'b', displayName: 'a b', phone: '' })
    ).rejects.toThrow('Unable to update your profile.');
  });
});

describe('uploadUserAvatar', () => {
  beforeEach(() => {
    mockUploadBytes.mockReset();
    mockGetDownloadURL.mockReset();
    mockUpdateDoc.mockReset();
  });

  test('rejects a non-image file type', async () => {
    const file = fakeFile({ type: 'application/pdf', size: 100 });

    await expect(uploadUserAvatar('user1', file)).rejects.toThrow('Please choose a JPEG, PNG, or WEBP image.');
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  test('rejects a file over 5MB', async () => {
    const file = fakeFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 });

    await expect(uploadUserAvatar('user1', file)).rejects.toThrow('Please choose an image under 5 MB.');
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  test('uploads the file, persists the resulting URL, and returns it', async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue(
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/user-avatars%2Fuser1%2Fphoto.jpg?alt=media'
    );
    mockUpdateDoc.mockResolvedValue(undefined);
    const file = fakeFile({ type: 'image/jpeg', size: 100 });

    const url = await uploadUserAvatar('user1', file);

    expect(url).toBe('https://firebasestorage.googleapis.com/v0/b/bucket/o/user-avatars%2Fuser1%2Fphoto.jpg?alt=media');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collection: 'users', id: 'user1' },
      expect.objectContaining({ avatarUrl: url })
    );
  });
});

describe('removeUserAvatar', () => {
  beforeEach(() => {
    mockUpdateDoc.mockReset();
    mockDeleteObject.mockReset();
  });

  test("clears the avatarUrl field and deletes the user's own Storage object", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
    const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/user-avatars%2Fuser1%2Fphoto.jpg?alt=media';

    await removeUserAvatar('user1', url);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collection: 'users', id: 'user1' },
      expect.objectContaining({ avatarUrl: '' })
    );
    expect(mockDeleteObject).toHaveBeenCalledWith({ path: 'user-avatars/user1/photo.jpg' });
  });

  test("does not delete a file scoped to a different user's folder", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/user-avatars%2Fother-user%2Fphoto.jpg?alt=media';

    await removeUserAvatar('user1', url);

    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  test('clears the field even when there was no previous avatar', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await removeUserAvatar('user1', undefined);

    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  test('does not fail the removal when the Storage object is already gone', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteObject.mockRejectedValue(new Error('object not found'));
    const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/user-avatars%2Fuser1%2Fphoto.jpg?alt=media';

    await expect(removeUserAvatar('user1', url)).resolves.toBeUndefined();
  });
});
