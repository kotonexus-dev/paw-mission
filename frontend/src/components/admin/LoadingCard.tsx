'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function LoadingCard() {
  return (
    <Card className="mb-4 shadow-lg">
      <CardContent>
        <p className="text-center text-gray-500 py-4">読み込み中...</p>
      </CardContent>
    </Card>
  );
}
