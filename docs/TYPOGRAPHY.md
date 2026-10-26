# Mobile typography (0.3.1)

All app screens share `src/typography.ts` in React Native logical pixels: hero 28/34, page 24/30, section 20/26, card heading 17/23, body 15/22, button 14/20, form label/table 13/18, caption 12/17, navigation 11/16, input 16/22 (font size/line height).

The home hero was 42/47; it is now 28/34. Compact hero padding and consistent headings apply on Android and iPhone. System fonts and accessibility font scaling remain enabled. Navigation targets retain at least 48 logical pixels of height. Player columns remain horizontally scrollable.

Validation: TypeScript and the existing test suite. Physical-device checks remain necessary at default and enlarged system text sizes; confirm long tournament titles, form labels and bottom navigation on both platforms.
