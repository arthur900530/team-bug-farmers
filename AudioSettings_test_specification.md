# Test Specification: AudioSettings.tsx

## Functions in AudioSettings.tsx

1. `useEffect` (position initialization, lines 21-33) - Centers the draggable popup on first render
2. `handleMouseMove(e: MouseEvent)` - Calculates and updates popup position during drag with boundary constraints
3. `handleMouseUp()` - Ends the dragging state
4. `useEffect` (drag listeners, lines 63-73) - Adds/removes event listeners for drag functionality
5. `handleMouseDown(e: React.MouseEvent)` - Initiates dragging and stores initial position
6. `handleMoreSettings(e: React.MouseEvent)` - Navigates to full settings menu
7. `AudioSettings()` - Main component that renders audio device selection popup

## Test Table for AudioSettings.tsx

| Test # | Function | Test Purpose | Test Inputs | Expected Output |
|--------|----------|--------------|-------------|-----------------|
| 1 | `useEffect` (position init) | Should calculate center position on first render | `popupRef.current.getBoundingClientRect()` returns `{ width: 300, height: 400, left: 0, top: 0 }`, window size `800x600` | `position` is set to `{ x: 250, y: 100 }`, `initialized` becomes `true` |
| 2 | `useEffect` (position init) | Should not recalculate position if already initialized | `initialized: true`, `popupRef.current` exists | `position` remains unchanged, effect does not execute |
| 3 | `useEffect` (position init) | Should handle error gracefully when getBoundingClientRect fails | `popupRef.current.getBoundingClientRect()` throws error | Error is logged to console, `initialized` remains `false` |
| 4 | `useEffect` (position init) | Should not run if popupRef is null | `popupRef.current: null`, `initialized: false` | Effect exits early, no state changes |
| 5 | `handleMouseMove` | Should update position during drag within bounds | `e: { clientX: 150, clientY: 200 }`, `dragStartPos: { x: 50, y: 50 }`, `popupRef` width/height: `300x400`, window: `800x600` | `position` is set to `{ x: 100, y: 150 }` |
| 6 | `handleMouseMove` | Should constrain position to left boundary | `e: { clientX: -100, clientY: 200 }`, `dragStartPos: { x: 50, y: 50 }` | `position.x` is constrained to `0` (minimum) |
| 7 | `handleMouseMove` | Should constrain position to top boundary | `e: { clientX: 150, clientY: -100 }`, `dragStartPos: { x: 50, y: 50 }` | `position.y` is constrained to `0` (minimum) |
| 8 | `handleMouseMove` | Should constrain position to right boundary | `e: { clientX: 1000, clientY: 200 }`, `dragStartPos: { x: 50, y: 50 }`, popup width: `300`, window width: `800` | `position.x` is constrained to `500` (maxX = 800 - 300) |
| 9 | `handleMouseMove` | Should constrain position to bottom boundary | `e: { clientX: 150, clientY: 800 }`, `dragStartPos: { x: 50, y: 50 }`, popup height: `400`, window height: `600` | `position.y` is constrained to `200` (maxY = 600 - 400) |
| 10 | `handleMouseMove` | Should exit early if popupRef is null | `popupRef.current: null`, `e: { clientX: 150, clientY: 200 }` | Function returns early, no state changes |
| 11 | `handleMouseMove` | Should catch and log errors | `popupRef.current.getBoundingClientRect()` throws error | Error is logged to console, function continues safely |
| 12 | `handleMouseUp` | Should set isDragging to false | `isDragging: true` | `isDragging` becomes `false` |
| 13 | `handleMouseUp` | Should handle errors gracefully | `setIsDragging` throws error (mock) | Error is caught and logged to console |
| 14 | `useEffect` (drag listeners) | Should add event listeners when dragging starts | `isDragging: true` | `mousemove` and `mouseup` event listeners are added to document |
| 15 | `useEffect` (drag listeners) | Should remove event listeners when dragging ends | `isDragging: false` (after being `true`) | `mousemove` and `mouseup` event listeners are removed from document |
| 16 | `useEffect` (drag listeners) | Should not add listeners when not dragging | `isDragging: false` | No event listeners are added to document |
| 17 | `useEffect` (drag listeners) | Should cleanup listeners on unmount | Component unmounts while `isDragging: true` | `mousemove` and `mouseup` event listeners are removed |
| 18 | `handleMouseDown` | Should set dragging state and store start position | `e: { clientX: 200, clientY: 150 }`, current `position: { x: 50, y: 30 }` | `isDragging` becomes `true`, `dragStartPos.current` is set to `{ x: 150, y: 120 }` |
| 19 | `handleMouseDown` | Should handle errors during drag start | `setIsDragging` throws error (mock) | Error is caught and logged to console |
| 20 | `handleMoreSettings` | Should call onNavigateToSettings callback | `e: React.MouseEvent`, `onNavigateToSettings: mockFunction` | `e.stopPropagation()` is called, `onNavigateToSettings()` is called |
| 21 | `handleMoreSettings` | Should stop event propagation | `e: React.MouseEvent` with `stopPropagation` mock | `e.stopPropagation()` is called |
| 22 | `handleMoreSettings` | Should handle missing onNavigateToSettings gracefully | `e: React.MouseEvent`, `onNavigateToSettings: undefined` | Function completes without error, only `stopPropagation` is called |
| 23 | `handleMoreSettings` | Should catch and log errors | `onNavigateToSettings` throws error | Error is caught and logged to console |
| 24 | `AudioSettings` | Should render with initial hidden visibility | Component mounts with props: `onNavigateToSettings: mockFn`, `onClose: mockFn` | Component renders with style `visibility: 'hidden'` until initialized |
| 25 | `AudioSettings` | Should render with visible state after initialization | `initialized: true`, `position: { x: 100, y: 100 }` | Component renders with style `visibility: 'visible'` and correct transform |
| 26 | `AudioSettings` | Should display microphone device option | Component rendered | Renders button with text "MacBook Pro Microphone" |
| 27 | `AudioSettings` | Should display speaker device option | Component rendered | Renders button with text "MacBook Pro Speakers" |
| 28 | `AudioSettings` | Should display microphone level test option | Component rendered | Renders button with text "Microphone level" and green indicator |
| 29 | `AudioSettings` | Should display speaker test option | Component rendered | Renders button with text "Test speaker" with Volume2 icon |
| 30 | `AudioSettings` | Should display more settings button | Component rendered | Renders button with text "More settings..." |
| 31 | `AudioSettings` | Should apply grab cursor when not dragging | `isDragging: false` | Component style includes `cursor: 'grab'` |
| 32 | `AudioSettings` | Should apply grabbing cursor when dragging | `isDragging: true` | Component style includes `cursor: 'grabbing'` |
| 33 | `AudioSettings` | Should disable transition during drag | `isDragging: true` | Component style includes `transition: 'none'` |
| 34 | `AudioSettings` | Should enable transition when not dragging | `isDragging: false` | Component style includes `transition: 'transform 0.1s ease-out'` |

## Notes on Test Implementation

- DOM measurement tests require mocking `getBoundingClientRect()` and window dimensions
- Event listener tests should verify `addEventListener` and `removeEventListener` calls
- Drag interaction tests should simulate mouse events in sequence: `mousedown` → `mousemove` → `mouseup`
- useEffect tests require rendering the component and triggering dependency changes
- Error handling tests should mock console.error to verify error logging

