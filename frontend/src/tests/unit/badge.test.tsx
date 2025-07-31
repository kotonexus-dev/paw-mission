'use client';

import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import '@testing-library/jest-dom';

describe('Badge Component', () => {
  describe('正常系テスト', () => {
    it('基本的なバッジを表示する', () => {
      render(<Badge>完了</Badge>);
      expect(screen.getByText('完了')).toBeInTheDocument();
    });

    it('子要素として複数の要素を表示する', () => {
      render(
        <Badge>
          <span>アイコン</span>
          <span>テキスト</span>
        </Badge>
      );
      expect(screen.getByText('アイコン')).toBeInTheDocument();
      expect(screen.getByText('テキスト')).toBeInTheDocument();
    });
  });

  describe('variant プロパティテスト', () => {
    it('default バリアントが正しく適用される', () => {
      render(<Badge variant="default" data-testid="badge">デフォルト</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-primary');
    });

    it('secondary バリアントが正しく適用される', () => {
      render(<Badge variant="secondary" data-testid="badge">セカンダリ</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-secondary');
    });

    it('destructive バリアントが正しく適用される', () => {
      render(<Badge variant="destructive" data-testid="badge">削除</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-destructive');
    });

    it('outline バリアントが正しく適用される', () => {
      render(<Badge variant="outline" data-testid="badge">アウトライン</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('border');
    });
  });

  describe('カスタマイズテスト', () => {
    it('カスタムクラス名が適用される', () => {
      render(<Badge className="custom-badge" data-testid="badge">カスタム</Badge>);
      expect(screen.getByTestId('badge')).toHaveClass('custom-badge');
    });

    it('カスタム属性が適用される', () => {
      render(
        <Badge 
          data-testid="badge" 
          data-status="active"
          aria-label="アクティブ状態"
        >
          アクティブ
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-status', 'active');
      expect(badge).toHaveAttribute('aria-label', 'アクティブ状態');
    });
  });

  describe('異常系テスト', () => {
    it('空の内容でもエラーにならない', () => {
      expect(() => {
        render(<Badge />);
      }).not.toThrow();
    });

    it('不正なvariantを渡してもエラーにならない', () => {
      expect(() => {
        render(<Badge variant={'invalid' as any}>テスト</Badge>);
      }).not.toThrow();
    });

    it('nullやundefinedの子要素でもエラーにならない', () => {
      expect(() => {
        render(<Badge>{null}</Badge>);
      }).not.toThrow();
      
      expect(() => {
        render(<Badge>{undefined}</Badge>);
      }).not.toThrow();
    });
  });

  describe('実用的なユースケース', () => {
    it('お世話ステータスバッジを表示する', () => {
      const careStatus = [
        { id: 1, task: '朝ごはん', completed: true },
        { id: 2, task: '散歩', completed: false },
        { id: 3, task: '夜ごはん', completed: true }
      ];

      render(
        <div data-testid="care-status-list">
          {careStatus.map(status => (
            <div key={status.id}>
              <span>{status.task}</span>
              <Badge 
                variant={status.completed ? 'default' : 'secondary'}
                data-testid={`status-${status.id}`}
              >
                {status.completed ? '完了' : '未完了'}
              </Badge>
            </div>
          ))}
        </div>
      );

      expect(screen.getByTestId('status-1')).toHaveTextContent('完了');
      expect(screen.getByTestId('status-2')).toHaveTextContent('未完了');
      expect(screen.getByTestId('status-3')).toHaveTextContent('完了');
    });

    it('緊急度バッジを表示する', () => {
      const priorities = [
        { level: 'high', label: '緊急', variant: 'destructive' as const },
        { level: 'medium', label: '普通', variant: 'default' as const },
        { level: 'low', label: '低', variant: 'secondary' as const }
      ];

      render(
        <div>
          {priorities.map(priority => (
            <Badge 
              key={priority.level}
              variant={priority.variant}
              data-testid={`priority-${priority.level}`}
            >
              {priority.label}
            </Badge>
          ))}
        </div>
      );

      expect(screen.getByTestId('priority-high')).toHaveTextContent('緊急');
      expect(screen.getByTestId('priority-medium')).toHaveTextContent('普通');
      expect(screen.getByTestId('priority-low')).toHaveTextContent('低');
    });

    it('数値バッジを表示する', () => {
      const notificationCount = 5;
      
      render(
        <div>
          <span>通知</span>
          <Badge variant="destructive" data-testid="notification-badge">
            {notificationCount > 99 ? '99+' : notificationCount}
          </Badge>
        </div>
      );

      expect(screen.getByTestId('notification-badge')).toHaveTextContent('5');
    });
  });
});