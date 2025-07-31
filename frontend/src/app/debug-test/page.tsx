// src/app/debug-test/page.tsx

'use client';

import { TestUserProvider } from '@/tests/__mocks__/TestUserProvider';
import { useState } from 'react';

export default function DebugTestPage() {
  const [clicked, setClicked] = useState(false);

  return (
    <TestUserProvider>
      <main className="p-4">
        <h1>デバッグテストページ</h1>

        <button
          type="button"
          onClick={() => setClicked(true)}
          className="px-4 py-2 mt-4 bg-blue-500 text-white rounded"
        >
          あさごはん
        </button>

        {clicked && <p>🍚 あさごはん完了！</p>}
      </main>
    </TestUserProvider>
  );
}
