import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../Select';

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders correctly', () => {
    render(<Select options={options} placeholder="Select an option" />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('shows placeholder when no value selected', () => {
    render(<Select options={options} placeholder="Select an option" />);
    expect(screen.getByText(/select an option/i)).toBeInTheDocument();
  });

  it('shows selected value', () => {
    render(
      <Select
        options={options}
        value="option2"
        onChange={() => {}}
        placeholder="Select an option"
      />
    );
    expect(screen.getByText(/option 2/i)).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const handleChange = vi.fn();
    render(
      <Select
        options={options}
        value="option1"
        onChange={handleChange}
        placeholder="Select an option"
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /option 3/i }));

    expect(handleChange).toHaveBeenCalledWith('option3');
  });

  it('disables correctly', () => {
    render(
      <Select
        options={options}
        disabled
        placeholder="Select an option"
      />
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('shows error state', () => {
    render(
      <Select
        options={options}
        error="This field is required"
        placeholder="Select an option"
      />
    );
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-500');
  });
});