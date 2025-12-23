import { Theme } from "../Theme";

// MochaLove dark green theme (based on design mockup)
const mochaTheme: Theme = {
  name: "mocha",
  colors: {
    // Dark forest green backgrounds
    background: "hsl(150 40% 8%)", // Deep forest green #0d2818
    foreground: "hsl(0 0% 98%)", // Almost white text
    card: "hsl(150 35% 12%)", // Slightly lighter green for cards #1a3a2e
    cardForeground: "hsl(0 0% 98%)",
    popover: "hsl(150 35% 12%)",
    popoverForeground: "hsl(0 0% 98%)",

    // Bright lime green primary (button color from design)
    primary: "hsl(84 76% 53%)", // Bright lime #7ed321
    primaryForeground: "hsl(150 40% 8%)", // Dark green text on lime buttons

    // Secondary colors
    secondary: "hsl(150 30% 18%)", // Medium green
    secondaryForeground: "hsl(0 0% 98%)",
    tertiary: "hsl(150 25% 25%)", // Lighter green accent
    tertiaryForeground: "hsl(0 0% 98%)",

    // Muted elements
    muted: "hsl(150 20% 20%)", // Muted green
    mutedForeground: "hsl(0 0% 70%)", // Gray text
    accent: "hsl(150 30% 22%)",
    accentForeground: "hsl(0 0% 98%)",

    // Status colors
    success: "hsl(142 70.6% 45.3%)", // Green for success
    successForeground: "hsl(0 0% 98%)",
    warning: "hsl(45 100% 51%)", // Yellow for warnings
    warningForeground: "hsl(0 0% 0%)",
    destructive: "hsl(0 72% 51%)", // Red for errors
    destructiveForeground: "hsl(0 0% 98%)",

    // Borders and inputs
    border: "hsl(150 25% 25%)", // Subtle green border
    notification: "hsl(84 76% 53%)", // Lime green
    input: "hsl(150 25% 18%)", // Input background
    ring: "hsl(84 76% 53%)", // Focus ring (lime)
    overlay: "hsl(0 0% 100%)",
  },
  typography: {
    h1: {
      fontSize: "32px",
      fontFamily: "Inter_700Bold",
    },
    h2: {
      fontSize: "24px",
      fontFamily: "Inter_700Bold",
    },
    h3: {
      fontSize: "20px",
      fontFamily: "Inter_600SemiBold",
    },
    h4: {
      fontSize: "18px",
      fontFamily: "Inter_600SemiBold",
    },
    h5: {
      fontSize: "16px",
      fontFamily: "Inter_500Medium",
    },
    h6: {
      fontSize: "14px",
      fontFamily: "Inter_500Medium",
    },
    body: {
      fontSize: "14px",
      fontFamily: "Inter_400Regular",
    },
    caption: {
      fontSize: "12px",
      fontFamily: "Inter_300Light",
    },
    button: {
      fontSize: "16px",
      fontFamily: "Inter_500Medium",
    },
  },
};

export default mochaTheme;
