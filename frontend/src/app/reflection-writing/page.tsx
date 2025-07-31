'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// import { ArrowLeft } from 'lucide-react'; // lucide-reactアイコン
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import createReflectionNote from '@/hooks/reflectionNotesPost';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ReflectionWritingPage() {
  const router = useRouter(); // Next.jsのフックページ遷移などに使う
  const [reflection, setReflection] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const user = useAuth(); // 認証情報を取得

  console.log('[ReflectionWritingPage] User:', user.currentUser);

  const handleSubmit = async () => {
    if (reflection.trim() && title.trim()) {
      setIsSubmitting(true);

      try {
        // APIで送信
        await createReflectionNote(`${title}\n${reflection}`);

        // お世話の状態をリセット（わんちゃんが戻ってくる）
        localStorage.setItem('lastCareTime', new Date().toISOString());
        localStorage.setItem('dogReturned', 'true');

        // 成功ダイアログを表示
        setShowSuccessDialog(true);
      } catch (error) {
        alert('保存に失敗しました。ネットワークを確認してください。');
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ダイアログを閉じて管理者画面に遷移
  const handleDialogClose = () => {
    setShowSuccessDialog(false);
    router.push('/admin-login');
  };

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-cyan-50 px-6 py-12 [&_*]:text-[18px]">
      <div className="w-full max-w-xs mx-auto">
        {/* ヘッダー */}
        {/*
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-2 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        */}

        {/* メインコンテンツ */}
        <div className="flex flex-col items-center space-y-8">
          {/* タイトル */}
          <div className="text-center space-y-2 px-4">
            <p className="text-base font-medium text-gray-800 leading-relaxed">
              わんちゃん さびしくて どこかへ。
            </p>
            <p className="text-base font-medium text-gray-800 leading-relaxed">
              つぎは もっと なかよく しようね。
            </p>
            <p className="text-base font-medium text-gray-800 leading-relaxed">
              はんせいの きもちを かこう。
            </p>
          </div>
          {/* 反省文記入フォーム */}
          <div className="w-full max-w-xs space-y-4 bg-white p-4 border-gray-500 shadow-sm rounded-2xl border-3">
            <div>
              <Label
                htmlFor="title"
                className="text-sm font-medium text-gray-700"
              >
                タイトル
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="れい：おさんぽをさぼりました"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label
                htmlFor="reflection"
                className="text-sm font-medium text-gray-700"
              >
                はんせいぶん
              </Label>
              <Textarea
                id="reflection"
                placeholder="ごめんねのきもちをかいてね..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="mt-1 min-h-24"
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          </div>
          {/* 犬のシルエット */}
          {/* <div className="w-40 h-40 flex items-center justify-center">
            <Image
              src="/images/sad-dog-silhouette.png"
              alt="悲しそうな犬のシルエット"
              width={160}
              height={160}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div> */}
          <div className="w-full max-w-xs space-y-4 bg-white p-4 border-gray-500 shadow-sm rounded-2xl border-3">
            {/* <div className="w-60 h-60 flex items-center justify-center"> */}
            <video
              src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/animations/sad.mp4`}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* おくる（送信）ボタン */}
          <Button
            className={`text-white py-2 px-6 shadow-md text-sm font-medium ${
              reflection.trim() && title.trim() && !isSubmitting
                ? 'bg-purple-400 hover:bg-purple-500'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            onClick={handleSubmit}
            disabled={!reflection.trim() || !title.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                送信中...
              </div>
            ) : (
              'おくる'
            )}
          </Button>
        </div>
      </div>

      {/* 送信成功ダイアログ */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-white rounded-lg max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              はんせいぶんを おくったよ
            </DialogTitle>
            <DialogDescription className="text-center pt-2 text-base whitespace-pre-line">
              ママ・パパに はんせいぶんを みてもらおうね。{'\n'}
              かんりしゃがめんから はんせいぶんを みることができるよ。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={handleDialogClose}
              className="bg-black text-white border border-white px-6 py-2 rounded-lg shadow-none hover:bg-gray-800 active:bg-gray-900"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
