# Test Specification: DraggableModal.tsx

## Functions in DraggableModal.tsx

1. `checkMobile()` (inside useEffect, lines 23-29) - Checks if window width is less than 768px for mobile detection
2. `handleMouseMove(e: MouseEvent)` - Calculates and updates modal position during drag with boundary constraints
3. `handleMouseUp()` - Ends the dragging state
4. `useEffect` (mobile detection, lines 22-37) - Sets up mobile detection and window resize listener
5. `useEffect` (drag listeners, lines 67-77) - Adds/removes event listeners for drag functionality
6. `handleMouseDown(e: React.MouseEvent)` - Initiates dragging if not on mobile and clicked on drag handle
7. `handleBackdropClick(e: React.MouseEvent)` - Closes modal when backdrop is clicked
8. `DraggableModal()` - Main component that renders draggable modal with backdrop

## Test Table for DraggableModal.tsx

| Test # | Function | Test Purpose | Test Inputs | Expected Output |
|--------|----------|--------------|-------------|-----------------|
| 1 | `checkMobile` | Should detect mobile when window width < 768 | `window.innerWidth: 500` | `isMobile` becomes `true` |
| 2 | `checkMobile` | Should detect desktop when window width >= 768 | `window.innerWidth: 800` | `isMobile` becomes `false` |
| 3 | `checkMobile` | Should handle error gracefully when window is undefined | `window` throws error | Error is logged to console, component doesn't crash |
| 4 | `useEffect` (mobile) | Should add resize event listener on mount | Component mounts | `addEventListener` called with `'resize'` and handler function |
| 5 | `useEffect` (mobile) | Should remove resize event listener on unmount | Component unmounts | `removeEventListener` called with `'resize'` and handler function |
| 6 | `useEffect` (mobile) | Should update isMobile on window resize | Window resizes from 1000px to 500px | `isMobile` changes from `false` to `true` |
| 7 | `handleMouseMove` | Should update position during drag within bounds | `e: { clientX: 150, clientY: 200 }`, `dragStartPos: { x: 50, y: 50 }`, modal width/height: `400x300`, window: `800x600` | `position` is set to `{ x: 100, y: 150 }` |
| 8 | `handleMouseMove` | Should constrain position to left boundary with half-width allowance | `e: { clientX: -500, clientY: 200 }`, `dragStartPos: { x: 50, y: 50 }`, modal width: `400` | `position.x` is constrained to `-200` (half modal width allowed) |
| 9 | `handleMouseMove` | Should constrain position to top boundary | `e: { clientX: 150, clientY: -100 }`, `dragStartPos: { x: 50, y: 50 }` | `position.y` is constrained to `0` (minimum) |
| 10 | `handleMouseMove` | Should constrain position to right boundary | `e: { clientX: 1000, clientY: 200 }`, `dragStartPos: { x: 50, y: 50 }`, modal width: `400`, window width: `800` | `position.x` is constrained to `400` (maxX = 800 - 400) |
| 11 | `handleMouseMove` | Should constrain position to bottom boundary | `e: { clientX: 150, clientY: 800 }`, `dragStartPos: { x: 50, y: 50 }`, modal height: `300`, window height: `600` | `position.y` is constrained to `300` (maxY = 600 - 300) |
| 12 | `handleMouseMove` | Should exit early if modalRef is null | `modalRef.current: null`, `e: { clientX: 150, clientY: 200 }` | Function returns early, no state changes |
| 13 | `handleMouseMove` | Should catch and log errors | `getBoundingClientRect()` throws error | Error is logged to console, function continues safely |
| 14 | `handleMouseUp` | Should set isDragging to false | `isDragging: true` | `isDragging` becomes `false` |
| 15 | `handleMouseUp` | Should handle errors gracefully | `setIsDragging` throws error (mock) | Error is caught and logged to console |
| 16 | `useEffect` (drag listeners) | Should add event listeners when dragging starts | `isDragging: true` | `mousemove` and `mouseup` event listeners are added to document |
| 17 | `useEffect` (drag listeners) | Should remove event listeners when dragging ends | `isDragging: false` (after being `true`) | `mousemove` and `mouseup` event listeners are removed from document |
| 18 | `useEffect` (drag listeners) | Should not add listeners when not dragging | `isDragging: false` | No event listeners are added to document |
| 19 | `useEffect` (drag listeners) | Should cleanup listeners on unmount | Component unmounts while `isDragging: true` | `mousemove` and `mouseup` event listeners are removed |
| 20 | `handleMouseDown` | Should not initiate drag on mobile | `isMobile: true`, `e: { clientX: 200, clientY: 150 }` | `isDragging` remains `false`, no state changes |
| 21 | `handleMouseDown` | Should not initiate drag when clicking outside drag handle | `e.target` not within `[data-drag-handle]`, `isMobile: false` | `isDragging` remains `false`, no state changes |
| 22 | `handleMouseDown` | Should initiate drag when clicking drag handle | `e.target` within `[data-drag-handle]`, `e: { clientX: 200, clientY: 150 }`, current `position: { x: 50, y: 30 }`, `isMobile: false` | `isDragging` becomes `true`, `dragStartPos.current` is set to `{ x: 150, y: 120 }` |
| 23 | `handleMouseDown` | Should handle errors during drag start | `setIsDragging` throws error (mock) | Error is caught and logged to console |
| 24 | `handleBackdropClick` | Should call onClose when clicking backdrop | `e.target === e.currentTarget`, `onClose: mockFunction` | `onClose()` is called |
| 25 | `handleBackdropClick` | Should not call onClose when clicking modal content | `e.target !== e.currentTarget`, `onClose: mockFunction` | `onClose()` is not called |
| 26 | `handleBackdropClick` | Should not crash when onClose is undefined | `e.target === e.currentTarget`, `onClose: undefined` | Function completes without error |
| 27 | `handleBackdropClick` | Should catch and log errors | `onClose` throws error | Error is caught and logged to console |
| 28 | `DraggableModal` | Should render children content | Component renders with `children: <div>Test Content</div>` | Children are rendered inside modal |
| 29 | `DraggableModal` | Should apply custom width class | `width: 'w-96'` | Modal has `w-96` class applied |
| 30 | `DraggableModal` | Should apply default width when not specified | No width prop provided | Modal has `w-full md:w-[600px]` classes |
| 31 | `DraggableModal` | Should apply custom className | `className: 'custom-class'` | Modal has `custom-class` applied |
| 32 | `DraggableModal` | Should apply transform style when not mobile | `isMobile: false`, `position: { x: 100, y: 50 }` | Modal style includes `transform: 'translate(100px, 50px)'` |
| 33 | `DraggableModal` | Should not apply transform style on mobile | `isMobile: true`, `position: { x: 100, y: 50 }` | Modal style is empty object `{}` |
| 34 | `DraggableModal` | Should apply grabbing cursor when dragging | `isDragging: true`, `isMobile: false` | Modal style includes `cursor: 'grabbing'` |
| 35 | `DraggableModal` | Should apply default cursor when not dragging | `isDragging: false`, `isMobile: false` | Modal style includes `cursor: 'default'` |
| 36 | `DraggableModal` | Should disable transition during drag | `isDragging: true`, `isMobile: false` | Modal style includes `transition: 'none'` |
| 37 | `DraggableModal` | Should enable transition when not dragging | `isDragging: false`, `isMobile: false` | Modal style includes `transition: 'transform 0.1s ease-out'` |
| 38 | `DraggableModal` | Should render backdrop with correct styling | Component renders | Backdrop div has classes `fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center` |
| 39 | `DraggableModal` | Should have modalRef attached to modal div | Component renders | Modal div has ref attached and accessible |

## Notes on Test Implementation

- Window resize tests require mocking `window.innerWidth` and triggering resize events
- DOM measurement tests require mocking `getBoundingClientRect()` and window dimensions
- Event listener tests should verify `addEventListener` and `removeEventListener` calls
- Drag interaction tests should simulate mouse events in sequence: `mousedown` → `mousemove` → `mouseup`
- `data-drag-handle` attribute tests require proper DOM structure with nested elements
- Mobile detection tests should test the 768px breakpoint thoroughly
- useEffect tests require rendering the component and triggering dependency changes
- Error handling tests should mock console.error to verify error logging
- Tests should verify that dragging is disabled on mobile devices

