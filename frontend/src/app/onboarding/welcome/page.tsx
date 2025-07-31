'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // radixui/button
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'; // radixui/
import { Progress } from '@/components/ui/progress'; // radixui/

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <Card className="bg-white w-full max-w-xs shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-2 pb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-center">
            わん🐾みっしょん
          </h1>
          <Progress value={20} className="w-full" />
          <p className="text-center text-sm sm:text-base text-muted-foreground" />
        </CardHeader>
        <CardContent className="text-center space-y-3 sm:space-y-4 pt-3 sm:pt-4">
          <p className="text-sm sm:text-base">
            「わん🐾みっしょん」は、お子様に犬のお世話の大変さを体験することができる教育ウェブアプリです。
          </p>
          <div className="py-3 sm:py-4 flex justify-center">
            <div className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden bg-white shadow">
              {/* <div className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 pet-bag-container"> */}
              <Image
                src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/images/dog-house.jpg`}
                alt="ワンちゃんの家"
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-4 sm:pb-6">
          <Link href="/onboarding/login" className="w-full">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-sm sm:text-base py-2 sm:py-3">
              始める
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
