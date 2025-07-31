'use client';

// __mocks__/firebase_config.ts
export const auth = {
  currentUser: {
    uid: 'mocked-firebase-uid',
  },
  onAuthStateChanged: vi.fn(),
};
