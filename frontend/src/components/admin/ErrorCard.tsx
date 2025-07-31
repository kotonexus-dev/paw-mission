'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function ErrorCard() {
  return (
    <Card className="mb-4 shadow-lg">
      <CardContent>
        <p className="text-center text-red-500 py-4">エラーが発生しました</p>
      </CardContent>
    </Card>
  );
}
