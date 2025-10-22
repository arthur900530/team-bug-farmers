import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetingView } from '../MeetingView';

describe('MeetingView', () => {
  const mockOnMicToggle = vi.fn();
  const mockOnMicSettings = vi.fn();

  const defaultProps = {
    micMuted: false,
    micLocked: false,
    showBanner: false,
    cameraOn: false,
    username: 'Test User',
    onMicToggle: mockOnMicToggle,
    onMicSettings: mockOnMicSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the meeting view', () => {
    render(<MeetingView {...defaultProps} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should display username in center', () => {
    render(<MeetingView {...defaultProps} username="Alice" />);
    
    const usernameElements = screen.getAllByText('Alice');
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it('should display username in participant label', () => {
    render(<MeetingView {...defaultProps} username="Bob" />);
    
    const participantLabel = screen.getAllByText('Bob');
    expect(participantLabel.length).toBe(2); // Center and bottom-left
  });

  it('should show banner when showBanner is true', () => {
    render(<MeetingView {...defaultProps} showBanner={true} />);
    
    expect(screen.getByText(/you have been unmuted/i)).toBeInTheDocument();
  });

  it('should not show banner when showBanner is false', () => {
    render(<MeetingView {...defaultProps} showBanner={false} />);
    
    expect(screen.queryByText(/you have been unmuted/i)).not.toBeInTheDocument();
  });

  it('should render meeting toolbar', () => {
    render(<MeetingView {...defaultProps} />);
    
    // Toolbar should be present (check for common toolbar elements)
    expect(screen.getByText(/audio/i)).toBeInTheDocument();
  });

  it('should call onMicToggle when microphone button is clicked', async () => {
    const user = userEvent.setup();
    render(<MeetingView {...defaultProps} />);
    
    const micButton = screen.getByRole('button', { name: /mute/i });
    await user.click(micButton);
    
    expect(mockOnMicToggle).toHaveBeenCalled();
  });

  it('should show default username when none provided', () => {
    render(<MeetingView {...defaultProps} username={undefined} />);
    
    // Should default to 'User'
    expect(screen.getAllByText('User')).toHaveLength(2);
  });

  it('should display View text in header', () => {
    render(<MeetingView {...defaultProps} />);
    
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('should show green status indicator', () => {
    const { container } = render(<MeetingView {...defaultProps} />);
    
    const greenDot = container.querySelector('.bg-green-500');
    expect(greenDot).toBeInTheDocument();
  });
});

