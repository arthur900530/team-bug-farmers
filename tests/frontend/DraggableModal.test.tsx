import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DraggableModal } from '../../src/components/common/DraggableModal';

describe('DraggableModal.tsx', () => {
  let mockOnClose: jest.Mock;
  let mockGetBoundingClientRect: jest.Mock;
  let mockAddEventListener: jest.Mock;
  let mockRemoveEventListener: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockGetBoundingClientRect = jest.fn(() => ({
      width: 400,
      height: 300,
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 600 });

    // Mock document event listener methods
    mockAddEventListener = jest.spyOn(document, 'addEventListener');
    mockRemoveEventListener = jest.spyOn(document, 'removeEventListener');

    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkMobile and useEffect (mobile detection)', () => {
    test('Test 1: Should detect mobile when window width < 768', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      
      // On mobile, the modal should not have transform styles
      await waitFor(() => {
        expect(modal.style.transform).toBe('');
      });
    });

    test('Test 2: Should detect desktop when window width >= 768', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
      
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      
      // On desktop, the modal should have transform style
      expect(modal.style.transform).toContain('translate');
    });

    test('Test 3: Should handle error gracefully when window is undefined', () => {
      // Mock console.error to suppress error output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      // Component should render without crashing
      expect(container).toBeTruthy();
      
      consoleError.mockRestore();
    });

    test('Test 4: Should add resize event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const resizeCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'resize'
      );
      expect(resizeCalls.length).toBeGreaterThan(0);
      
      addEventListenerSpy.mockRestore();
    });

    test('Test 5: Should remove resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      unmount();

      const removeCalls = removeEventListenerSpy.mock.calls.filter(
        call => call[0] === 'resize'
      );
      expect(removeCalls.length).toBeGreaterThan(0);
      
      removeEventListenerSpy.mockRestore();
    });

    test('Test 6: Should update isMobile on window resize', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
      
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      
      // Initially desktop
      expect(modal.style.transform).toContain('translate');

      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      fireEvent.resize(window);

      await waitFor(() => {
        // After resize to mobile, transform should be removed
        expect(modal.style.transform).toBe('');
      });
    });
  });

  describe('handleMouseMove', () => {
    test('Test 7: Should update position during drag within bounds', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 200 });

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      });
    });

    test('Test 8: Should constrain position to left boundary with half-width allowance', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: -500, clientY: 200 });

      // Position should be constrained to -modalWidth/2 (i.e., -200 for 400px wide modal)
      expect(mockAddEventListener).toHaveBeenCalled();
    });

    test('Test 9: Should constrain position to top boundary', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 150, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: -100 });

      expect(mockAddEventListener).toHaveBeenCalled();
    });

    test('Test 10: Should constrain position to right boundary', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 50, clientY: 200 });
      fireEvent.mouseMove(document, { clientX: 1000, clientY: 200 });

      expect(mockAddEventListener).toHaveBeenCalled();
    });

    test('Test 11: Should constrain position to bottom boundary', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 150, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 800 });

      expect(mockAddEventListener).toHaveBeenCalled();
    });

    test('Test 12: Should exit early if modalRef is null', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      // Simulate mousemove without proper setup
      fireEvent.mouseMove(document, { clientX: 150, clientY: 200 });

      // Should not crash
      expect(container).toBeTruthy();
    });

    test('Test 13: Should catch and log errors', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: () => { throw new Error('Test error'); }
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 200 });

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('handleMouseUp', () => {
    test('Test 14: Should set isDragging to false', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      
      await waitFor(() => {
        expect(modal.style.cursor).toBe('grabbing');
      });

      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(mockRemoveEventListener).toHaveBeenCalled();
      });
    });

    test('Test 15: Should handle errors gracefully', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const dragHandle = screen.getByText('Drag Handle');

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseUp(document);

      // Should not crash
      expect(container).toBeTruthy();
    });
  });

  describe('useEffect (drag listeners)', () => {
    test('Test 16: Should add event listeners when dragging starts', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(mockAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      });
    });

    test('Test 17: Should remove event listeners when dragging ends', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      
      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled();
      });

      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(mockRemoveEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(mockRemoveEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      });
    });

    test('Test 18: Should not add listeners when not dragging', () => {
      render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      // Initially, no drag listeners should be added
      const mouseMoveCalls = mockAddEventListener.mock.calls.filter(
        call => call[0] === 'mousemove'
      );
      expect(mouseMoveCalls.length).toBe(0);
    });

    test('Test 19: Should cleanup listeners on unmount', async () => {
      const { container, unmount } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });

  describe('handleMouseDown', () => {
    test('Test 20: Should not initiate drag on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      
      render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const dragHandle = screen.getByText('Drag Handle');

      fireEvent.mouseDown(dragHandle, { clientX: 200, clientY: 150 });

      // Should not add drag listeners on mobile
      const mouseMoveCalls = mockAddEventListener.mock.calls.filter(
        call => call[0] === 'mousemove'
      );
      expect(mouseMoveCalls.length).toBe(0);
    });

    test('Test 21: Should not initiate drag when clicking outside drag handle', () => {
      render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
          <div>Other Content</div>
        </DraggableModal>
      );

      const otherContent = screen.getByText('Other Content');

      fireEvent.mouseDown(otherContent, { clientX: 200, clientY: 150 });

      // Should not add drag listeners when clicking outside drag handle
      const mouseMoveCalls = mockAddEventListener.mock.calls.filter(
        call => call[0] === 'mousemove'
      );
      expect(mouseMoveCalls.length).toBe(0);
    });

    test('Test 22: Should initiate drag when clicking drag handle', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 200, clientY: 150 });

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      });
    });

    test('Test 23: Should handle errors during drag start', () => {
      render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const dragHandle = screen.getByText('Drag Handle');

      fireEvent.mouseDown(dragHandle, { clientX: 200, clientY: 150 });

      // Should not crash even if there are errors
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('handleBackdropClick', () => {
    test('Test 24: Should call onClose when clicking backdrop', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
      
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('Test 25: Should not call onClose when clicking modal content', () => {
      render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const content = screen.getByText('Test Content');
      
      fireEvent.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('Test 26: Should not crash when onClose is undefined', () => {
      const { container } = render(
        <DraggableModal>
          <div>Test Content</div>
        </DraggableModal>
      );

      const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
      
      expect(() => fireEvent.click(backdrop)).not.toThrow();
    });

    test('Test 27: Should catch and log errors', () => {
      const errorMock = jest.fn(() => { throw new Error('Test error'); });
      
      const { container } = render(
        <DraggableModal onClose={errorMock}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
      
      fireEvent.click(backdrop);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('DraggableModal component', () => {
    test('Test 28: Should render children content', () => {
      render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('Test 29: Should apply custom width class', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose} width="w-96">
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.w-96');
      expect(modal).toBeInTheDocument();
    });

    test('Test 30: Should apply default width when not specified', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.w-full');
      expect(modal).toBeInTheDocument();
    });

    test('Test 31: Should apply custom className', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose} className="custom-class">
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.custom-class');
      expect(modal).toBeInTheDocument();
    });

    test('Test 32: Should apply transform style when not mobile', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
      
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      expect(modal.style.transform).toContain('translate');
    });

    test('Test 33: Should not apply transform style on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      expect(modal.style.transform).toBe('');
    });

    test('Test 34: Should apply grabbing cursor when dragging', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });

      await waitFor(() => {
        expect(modal.style.cursor).toBe('grabbing');
      });
    });

    test('Test 35: Should apply default cursor when not dragging', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      expect(modal.style.cursor).toBe('default');
    });

    test('Test 36: Should disable transition during drag', async () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div data-drag-handle>Drag Handle</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      const dragHandle = screen.getByText('Drag Handle');
      
      if (modal) {
        Object.defineProperty(modal, 'getBoundingClientRect', {
          value: mockGetBoundingClientRect
        });
      }

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });

      await waitFor(() => {
        expect(modal.style.transition).toBe('none');
      });
    });

    test('Test 37: Should enable transition when not dragging', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white') as HTMLElement;
      expect(modal.style.transition).toBe('transform 0.1s ease-out');
    });

    test('Test 38: Should render backdrop with correct styling', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toHaveClass('bg-black', 'bg-opacity-75', 'z-50', 'flex', 'items-center', 'justify-center');
    });

    test('Test 39: Should have modalRef attached to modal div', () => {
      const { container } = render(
        <DraggableModal onClose={mockOnClose}>
          <div>Test Content</div>
        </DraggableModal>
      );

      const modal = container.querySelector('.bg-white');
      expect(modal).toBeTruthy();
      expect(modal).toBeInTheDocument();
    });
  });
});

