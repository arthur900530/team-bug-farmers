import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetingToolbar } from '../MeetingToolbar';

describe('MeetingToolbar', () => {
  const mockOnMicToggle = vi.fn();
  const mockOnMicSettings = vi.fn();

  const defaultProps = {
    micMuted: false,
    micLocked: false,
    cameraOn: false,
    onMicToggle: mockOnMicToggle,
    onMicSettings: mockOnMicSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lock Icon', () => {
    it('should display lock icon when micLocked is true', () => {
      const { container } = render(
        <MeetingToolbar {...defaultProps} micLocked={true} />
      );

      // Find the lock icon by searching for the Lock lucide icon class
      const lockIcon = container.querySelector('.lucide-lock');
      expect(lockIcon).toBeInTheDocument();
    });

    it('should not display lock icon when micLocked is false', () => {
      const { container } = render(
        <MeetingToolbar {...defaultProps} micLocked={false} />
      );

      // Lock icon should not be present
      const lockIcon = container.querySelector('.lucide-lock');
      expect(lockIcon).not.toBeInTheDocument();
    });

    it('should display lock icon on microphone button when muted and locked', () => {
      const { container } = render(
        <MeetingToolbar {...defaultProps} micMuted={true} micLocked={true} />
      );

      const lockIcon = container.querySelector('.lucide-lock');
      expect(lockIcon).toBeInTheDocument();
      
      // Verify it's positioned on the mic button (has absolute positioning)
      expect(lockIcon).toHaveClass('absolute');
    });

    it('should have correct styling for lock icon', () => {
      const { container } = render(
        <MeetingToolbar {...defaultProps} micLocked={true} />
      );

      const lockIcon = container.querySelector('.lucide-lock');
      expect(lockIcon).toBeInTheDocument();
      
      // Check for expected classes from the component
      expect(lockIcon).toHaveClass('w-4');
      expect(lockIcon).toHaveClass('h-4');
      expect(lockIcon).toHaveClass('text-white');
      expect(lockIcon).toHaveClass('absolute');
      expect(lockIcon).toHaveClass('-top-1');
      expect(lockIcon).toHaveClass('-right-1');
    });
  });

  describe('Microphone Button', () => {
    it('should render microphone button', () => {
      render(<MeetingToolbar {...defaultProps} />);
      
      const micButton = screen.getByRole('button', { name: /mute microphone/i });
      expect(micButton).toBeInTheDocument();
    });

    it('should call onMicToggle when microphone button is clicked', async () => {
      const user = userEvent.setup();
      render(<MeetingToolbar {...defaultProps} />);
      
      const micButton = screen.getByRole('button', { name: /mute microphone/i });
      await user.click(micButton);
      
      expect(mockOnMicToggle).toHaveBeenCalledTimes(1);
    });

    it('should show unmute label when mic is muted', () => {
      render(<MeetingToolbar {...defaultProps} micMuted={true} />);
      
      const micButton = screen.getByRole('button', { name: /unmute microphone/i });
      expect(micButton).toBeInTheDocument();
    });

    it('should show mute label when mic is unmuted', () => {
      render(<MeetingToolbar {...defaultProps} micMuted={false} />);
      
      const micButton = screen.getByRole('button', { name: /mute microphone/i });
      expect(micButton).toBeInTheDocument();
    });
  });

  describe('Microphone Settings Button', () => {
    it('should render microphone settings button', () => {
      render(<MeetingToolbar {...defaultProps} />);
      
      const settingsButton = screen.getByRole('button', { name: /microphone settings/i });
      expect(settingsButton).toBeInTheDocument();
    });

    it('should call onMicSettings when settings button is clicked', async () => {
      const user = userEvent.setup();
      render(<MeetingToolbar {...defaultProps} />);
      
      const settingsButton = screen.getByRole('button', { name: /microphone settings/i });
      await user.click(settingsButton);
      
      expect(mockOnMicSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Audio Status Display', () => {
    it('should show "Muted" status when mic is muted', () => {
      render(<MeetingToolbar {...defaultProps} micMuted={true} />);
      
      expect(screen.getByText('Muted')).toBeInTheDocument();
    });

    it('should show "Unmuted" status when mic is not muted', () => {
      render(<MeetingToolbar {...defaultProps} micMuted={false} />);
      
      expect(screen.getByText('Unmuted')).toBeInTheDocument();
    });
  });

  describe('Toolbar Layout', () => {
    it('should render all main toolbar sections', () => {
      render(<MeetingToolbar {...defaultProps} />);
      
      // Audio section
      expect(screen.getByText('Audio')).toBeInTheDocument();
      
      // Video section
      expect(screen.getByText('Video')).toBeInTheDocument();
      
      // End button
      expect(screen.getByRole('button', { name: /end meeting/i })).toBeInTheDocument();
    });
  });
});
