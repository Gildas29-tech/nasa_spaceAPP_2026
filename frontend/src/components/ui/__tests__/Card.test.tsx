import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../Card';

describe('Card', () => {
  it('renders correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
        <CardFooter>Card footer</CardFooter>
      </Card>
    );

    expect(screen.getByText(/test card/i)).toBeInTheDocument();
    expect(screen.getByText(/card content/i)).toBeInTheDocument();
    expect(screen.getByText(/card footer/i)).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Card variant="outlined">Outlined</Card>);
    const card = screen.getByText(/outlined/i).closest('div');
    expect(card).toHaveClass('border');
  });

  it('applies elevation classes', () => {
    render(<Card elevation="high">Elevated</Card>);
    const card = screen.getByText(/elevated/i).closest('div');
    expect(card).toHaveClass('shadow-lg');
  });

  it('renders children correctly', () => {
    render(
      <Card>
        <div data-testid="child">Child content</div>
      </Card>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});