1. One simple, dark theme

Every page uses the same dark colours (#0f1115 background, #7c5cff purple accent, light grey text). The same card style, the same rounded corners, and the same buttons are used on every screen. This keeps the app feeling like one product, not six separate pages.

2. One clear action per screen

Each screen has one button that stands out so the user knows what to do next:
- Landing page: Login (filled button).
- Dashboard: + New Presentation.
- Edit page: + New Slide.
Dangerous actions like Delete Presentation and 🗑 Delete Slide use a different colour so the user cannot mix them up with the normal buttons.

3. Clear feedback

The app never uses alert(). Every error shows up in a small banner at the top of the page with an ✕ button to close it.
Before deleting a presentation, a confirm modal asks "Are you sure? This will permanently delete the presentation." The default button is No. Yes is styled red, so the user has to pause and look.
When editing, the current slide number is always shown in the top-left of the slide, and also in the URL (?slide=3), so the user never gets lost.
When the user adds a code element, the app shows the detected language live under the code box (for example "PYTHON"), so the user knows the code will be highlighted correctly.

4. Shortcuts for power users

On the edit page:
- Left / Right arrow - move to the previous / next slide.
- Escape - close whichever modal is open.
- Double-click an element - open its edit modal.
- Right-click an element - delete it.
- Drag an element - move it. Drag a corner - resize it.

The slide control panel shows small previews of every slide and lets the user drag-and-drop to reorder them.
There is also a revision history that automatically takes a snapshot of the slides every minute, so the user can restore an older version if they break something.

5. Helpful small details

- File-upload inputs show the image right away as a preview, so the user knows the upload worked before saving.
- The Cancel button is always on the left and the main action button is always on the right of every modal.
- Every modal has autoFocus on the first input, so the user can just start typing.

6. Responsive design

- The landing / login / register screens use clamp() for font size so text scales with the screen.
- The dashboard uses display: grid with auto-fill, minmax(220px, 1fr), so it shows 4 cards per row on a desktop and 1 per row on a phone, with no extra code.
- The slide always keeps a 16:9 shape because of aspect-ratio: 16 / 9, so positions of elements look the same on any screen size.
- There are @media rules for widths of 900px and 480px so the app is still usable on tablets and phones.
