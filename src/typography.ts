// Shared logical-pixel type scale. React Native retains system font scaling.
export const typography = {
  hero: {fontSize: 28, lineHeight: 34},
  page: {fontSize: 24, lineHeight: 30},
  section: {fontSize: 20, lineHeight: 26},
  heading: {fontSize: 17, lineHeight: 23},
  body: {fontSize: 15, lineHeight: 22},
  button: {fontSize: 14, lineHeight: 20},
  label: {fontSize: 13, lineHeight: 18},
  caption: {fontSize: 12, lineHeight: 17},
  eyebrow: {fontSize: 11, lineHeight: 16},
  navigation: {fontSize: 11, lineHeight: 16},
  input: {fontSize: 16, lineHeight: 22},
} as const;
