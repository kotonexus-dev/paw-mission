'use client';

import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import '@testing-library/jest-dom';

describe('Card Components', () => {
  describe('Card', () => {
    it('正常系: 基本的なカードを表示する', () => {
      render(
        <Card data-testid="test-card">
          <div>Card content</div>
        </Card>
      );
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });

    it('正常系: カスタムクラス名が適用される', () => {
      render(
        <Card className="custom-class" data-testid="test-card">
          Content
        </Card>
      );
      expect(screen.getByTestId('test-card')).toHaveClass('custom-class');
    });
  });

  describe('CardHeader', () => {
    it('正常系: ヘッダーコンテンツを表示する', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>タイトル</CardTitle>
            <CardDescription>説明文</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('タイトル')).toBeInTheDocument();
      expect(screen.getByText('説明文')).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('正常系: コンテンツを表示する', () => {
      render(
        <Card>
          <CardContent>
            <p>カードの本文</p>
          </CardContent>
        </Card>
      );
      expect(screen.getByText('カードの本文')).toBeInTheDocument();
    });

    it('異常系: 空のコンテンツでもエラーにならない', () => {
      expect(() => {
        render(
          <Card>
            <CardContent />
          </Card>
        );
      }).not.toThrow();
    });
  });

  describe('CardFooter', () => {
    it('正常系: フッターボタンを表示する', () => {
      render(
        <Card>
          <CardFooter>
            <button>アクション</button>
          </CardFooter>
        </Card>
      );
      expect(screen.getByRole('button', { name: 'アクション' })).toBeInTheDocument();
    });
  });

  describe('完全なCardの組み合わせ', () => {
    it('正常系: 全パーツが正しく組み合わせられる', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>お世話記録</CardTitle>
            <CardDescription>今日のお世話状況</CardDescription>
          </CardHeader>
          <CardContent>
            <p>散歩: 完了</p>
            <p>ごはん: 完了</p>
          </CardContent>
          <CardFooter>
            <button>編集</button>
          </CardFooter>
        </Card>
      );
      
      const card = screen.getByTestId('full-card');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('お世話記録')).toBeInTheDocument();
      expect(screen.getByText('今日のお世話状況')).toBeInTheDocument();
      expect(screen.getByText('散歩: 完了')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    });
  });
});