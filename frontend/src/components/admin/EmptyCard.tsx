'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function EmptyCard() {
  return (
    <Card className="mb-4 shadow-lg">
      <CardContent>
        <p className="text-center text-gray-500 py-4">データがありません</p>
      </CardContent>
    </Card>
  );
}
