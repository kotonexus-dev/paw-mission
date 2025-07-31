'use client';

import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

// Vitest拡張マッチャーを使うために jest-dom を import（setup ファイル側に入れていれば不要）
import '@testing-library/jest-dom';

describe('Button', () => {
  it('子要素を正しく表示する', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('disabled属性が効いていること', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('variantによってclassが変わること', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('sizeによってclassが変わること', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.firstChild).toHaveClass('h-11');
  });

  it('asChildをtrueにするとbuttonタグではなくなる', () => {
    render(
      <Button asChild>
        <a data-testid="custom-button" href="#">
          Link
        </a>
      </Button>
    );
    const el = screen.getByTestId('custom-button');
    expect(el.tagName).toBe('A');
  });
});
