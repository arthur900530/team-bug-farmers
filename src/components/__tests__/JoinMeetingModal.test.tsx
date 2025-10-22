import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinMeetingModal } from '../JoinMeetingModal';

describe('JoinMeetingModal', () => {
  const mockOnJoin = vi.fn();
  const mockOnMicToggle = vi.fn();
  const mockOnCameraToggle = vi.fn();

  const defaultProps = {
    micOn: true,
    cameraOn: false,
    onJoin: mockOnJoin,
    onMicToggle: mockOnMicToggle,
    onCameraToggle: mockOnCameraToggle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the modal', () => {
    render(<JoinMeetingModal {...defaultProps} />);
    
    expect(screen.getByText('Join Meeting')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('should display username input field', () => {
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should show default username if provided', () => {
    render(<JoinMeetingModal {...defaultProps} defaultUsername="Alice" />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toHaveValue('Alice');
  });

  it('should update username preview when typing', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'John Doe');
    
    expect(input).toHaveValue('John Doe');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show "Enter your name" placeholder in preview when empty', () => {
    render(<JoinMeetingModal {...defaultProps} />);
    
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('should disable join button when username is empty', () => {
    render(<JoinMeetingModal {...defaultProps} />);
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    expect(joinButton).toBeDisabled();
  });

  it('should enable join button when username is provided', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'Alice');
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    expect(joinButton).toBeEnabled();
  });

  it('should show error for username less than 2 characters', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'A');
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    await user.click(joinButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
    });
    
    expect(mockOnJoin).not.toHaveBeenCalled();
  });

  it('should show error for empty username on submit', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, '   '); // Only spaces
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    await user.click(joinButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter your name/i)).toBeInTheDocument();
    });
  });

  it('should call onJoin with username when submitted', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'Alice');
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    await user.click(joinButton);
    
    expect(mockOnJoin).toHaveBeenCalledWith('Alice');
  });

  it('should trim whitespace from username', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, '  Alice  ');
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    await user.click(joinButton);
    
    expect(mockOnJoin).toHaveBeenCalledWith('Alice');
  });

  it('should toggle microphone when mic button clicked', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const micButton = screen.getByLabelText(/mute microphone/i);
    await user.click(micButton);
    
    expect(mockOnMicToggle).toHaveBeenCalled();
  });

  it('should toggle camera when camera button clicked', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const cameraButton = screen.getByLabelText(/stop video/i);
    await user.click(cameraButton);
    
    expect(mockOnCameraToggle).toHaveBeenCalled();
  });

  it('should show muted icon when mic is off', () => {
    render(<JoinMeetingModal {...defaultProps} micOn={false} />);
    
    const micButton = screen.getByLabelText(/unmute microphone/i);
    expect(micButton).toBeInTheDocument();
  });

  it('should limit username length to 30 characters', () => {
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toHaveAttribute('maxLength', '30');
  });

  it('should clear error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<JoinMeetingModal {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'A');
    
    const joinButton = screen.getByRole('button', { name: /join meeting/i });
    await user.click(joinButton);
    
    // Error should appear
    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
    });
    
    // Type more characters
    await user.type(input, 'lice');
    
    // Error should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Name must be at least 2 characters/i)).not.toBeInTheDocument();
    });
  });
});

