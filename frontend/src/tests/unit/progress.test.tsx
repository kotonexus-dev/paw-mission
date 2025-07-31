'use client';

import { render, screen } from '@testing-library/react';
import { Progress } from '@/components/ui/progress';
import '@testing-library/jest-dom';

describe('Progress Component', () => {
  describe('正常系テスト', () => {
    it('進捗値0%を正しく表示する', () => {
      render(<Progress value={0} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('進捗値50%を正しく表示する', () => {
      render(<Progress value={50} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
      expect(progress).toHaveClass('relative');
    });

    it('進捗値100%を正しく表示する', () => {
      render(<Progress value={100} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
      expect(progress).toHaveClass('relative');
    });

    it('カスタムクラス名が適用される', () => {
      render(<Progress value={75} className="custom-progress" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('custom-progress');
    });

    it('maxプロパティが正しく設定される', () => {
      render(<Progress value={50} max={200} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('aria-valuemax', '200');
    });
  });

  describe('異常系・境界値テスト', () => {
    it('負の値を渡してもエラーにならない', () => {
      expect(() => {
        render(<Progress value={-10} data-testid="progress" />);
      }).not.toThrow();
    });

    it('100を超える値を渡してもエラーにならない', () => {
      expect(() => {
        render(<Progress value={150} data-testid="progress" />);
      }).not.toThrow();
    });

    it('valueがundefinedでもエラーにならない', () => {
      expect(() => {
        render(<Progress data-testid="progress" />);
      }).not.toThrow();
    });

    it('valueがnullでもエラーにならない', () => {
      expect(() => {
        render(<Progress value={null as any} data-testid="progress" />);
      }).not.toThrow();
    });

    it('valueが文字列でもエラーにならない', () => {
      expect(() => {
        render(<Progress value={'50' as any} data-testid="progress" />);
      }).not.toThrow();
    });
  });

  describe('アクセシビリティテスト', () => {
    it('適切なrole属性が設定される', () => {
      render(<Progress value={50} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('role', 'progressbar');
    });

    it('progressbarの構造が正しく構築される', () => {
      render(<Progress value={75} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('role', 'progressbar');
      expect(progress).toHaveClass('relative');
    });

    it('aria-valueminが正しく設定される', () => {
      render(<Progress value={50} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('aria-valuemin', '0');
    });

    it('aria-valuemaxが正しく設定される', () => {
      render(<Progress value={50} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('実用的なユースケース', () => {
    it('散歩の進捗を表示する', () => {
      const walkProgress = 65; // 1km中650m歩いた
      render(
        <div>
          <div aria-label="散歩の進捗">
            <Progress 
              value={walkProgress} 
              data-testid="walk-progress" 
            />
          </div>
          <span>{walkProgress}% 完了</span>
        </div>
      );
      
      expect(screen.getByLabelText('散歩の進捗')).toBeInTheDocument();
      expect(screen.getByText('65% 完了')).toBeInTheDocument();
    });

    it('お世話タスクの完了率を表示する', () => {
      const completedTasks = 2;
      const totalTasks = 3;
      const progress = Math.round((completedTasks / totalTasks) * 100);
      
      render(
        <div>
          <h3>今日のお世話タスク</h3>
          <Progress value={progress} data-testid="task-progress" />
          <p>{completedTasks}/{totalTasks} 完了</p>
        </div>
      );
      
      expect(screen.getByText('今日のお世話タスク')).toBeInTheDocument();
      expect(screen.getByText('2/3 完了')).toBeInTheDocument();
      expect(screen.getByTestId('task-progress')).toHaveClass('relative');
    });
  });
});