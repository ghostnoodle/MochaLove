# AGENTS.md

## Project Overview

This is a React Native/Expo cross-platform mobile application built with TypeScript, NativeWind (Tailwind CSS for React Native), and React Native Reusables (shadcn/ui-style components). The app uses Expo SDK 52 with Expo Router v4 for file-based routing and a sophisticated dual-theming system.

**Tech Stack:**

- React Native
- Expo
- TypeScript (strict mode)
- NativeWind v4 for styling
- Expo Router v4 for navigation
- React Native Reusables for UI components
- Yarn Berry as package manager

## Architecture

### Theming System (Critical to Understand)

The app uses a **dual-theming system** that is more sophisticated than typical React Native apps:

1. **ThemeProvider System** (`theming/` directory):
   - Manages theme objects with `colors` and `typography` properties
   - Themes defined in `theming/themes/light.ts` and `theming/themes/dark.ts`
   - `ThemeProvider.tsx` uses NativeWind's `vars()` function to convert theme values to CSS variables
   - Typography values are flattened: `h1.fontSize` becomes `--h1-fontSize`
   - Theme structure defined in `theming/Theme.ts` interface

2. **Color Scheme Hook** (`lib/useColorScheme.tsx`):
   - Manages system-level dark/light mode preferences
   - Syncs with device settings
   - Connected to ThemeProvider in `app/_layout.tsx`

**How to use themes in components:**

```typescript
// Method 1: Use NativeWind classes with CSS variables (preferred)
<Text className="text-foreground bg-background text-h1">Themed Text</Text>

// Method 2: Access theme object via hook
const { theme, setTheme } = useTheme();
<View style={{ backgroundColor: theme.colors.background }}>

// Typography classes available: text-h1, text-h2, text-h3, text-h4, text-body, etc.
```

### Icon System (Must Register Icons)

Icons from Lucide must be registered in `app/_layout.tsx` using `iconWithClassName()` before use:

```typescript
// In app/_layout.tsx
import { Home } from 'lucide-react-native';
import { iconWithClassName } from '~/lib/icons/iconWithClassName';
iconWithClassName(Home);

// Then create export file in lib/icons/Home.tsx
export { Home } from 'lucide-react-native';

// Use in components
import { Home } from '~/lib/icons';
<Home className="h-6 w-6 text-foreground" />
```

This registration enables NativeWind className support on Lucide icons.

### Navigation Structure

- **Stack navigation** configured in `app/_layout.tsx`
- File-based routing: files in `app/` directory become routes
- Navigation theme synced with app theme in `RootContent` component
- Header includes ThemeToggle component on the right
- Route options configured per screen using `<Stack.Screen>` component

### Styling Approach (Important)

**Use object-based style definitions with NativeWind classes:**

```typescript
// CORRECT - Object-based styles
const styles = {
  container: 'flex flex-1 m-6',
  title: 'text-xl font-bold text-foreground',
};
<View className={styles.container}>

// For conditional styling
import { cn } from '~/lib/utils';
<View className={cn('base-styles', isActive && 'active-styles')}>

// NOT inline style objects unless necessary
```

**CSS Variables:**

- Defined in `tailwind.config.js`
- Map directly to theme colors and typography
- Use in className: `bg-background`, `text-primary`, `border-border`, etc.

### Font Loading

The app uses Inter font family with multiple weights:

- Inter_300Light
- Inter_400Regular
- Inter_500Medium
- Inter_600SemiBold
- Inter_700Bold

Loaded in `app/_layout.tsx` via `useFonts()` hook from `@expo-google-fonts/inter`.

## File Structure & Conventions

### Path Mapping

`~/*` aliases to project root (configured in `tsconfig.json`)

Example: `import { Button } from '~/components/ui/button';`

### Expo Router Conventions

- `_layout.tsx`: Layout components that wrap child routes
- `+not-found.tsx`: 404/error pages
- `+html.tsx`: Web-specific HTML configuration
- All files in `app/` directory become routes automatically

### Component Organization

**UI Components (`components/ui/`)**:

- React Native Reusables components (shadcn/ui port for React Native)
- Use `@rn-primitives` packages for accessibility
- Styled with CSS variables and class-variance-authority for variants
- Copy/paste approach from [reactnativereusables.com](https://www.reactnativereusables.com/)

**Available UI Components:**

- Typography: H1, H2, H3, H4, P, Lead, Large, Small, Muted, Code, BlockQuote
- Forms: Button, Input, Label, Textarea, Checkbox, Switch, Radio Group, Select
- Layout: Card, Separator, Tabs, Accordion, Table, Avatar
- Overlays: Dialog, Alert Dialog, Popover, Tooltip, Dropdown Menu, Context Menu
- Feedback: Alert, Progress, Skeleton, Badge

**Common Components:**

- `ThemeToggle.tsx`: Sun/Moon icon theme switcher
- `WebPortalContext.tsx`: Portal context for web platform
- `componentShowcase.tsx`: Example component implementations

## Adding New Features

### New Screen

1. Create file in `app/` directory (e.g., `app/profile.tsx`)
2. Export default functional component
3. Include `<Stack.Screen>` for options:

```typescript
export default function Profile() {
  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      {/* Screen content */}
    </>
  );
}
```

### New UI Component

1. Copy component from [reactnativereusables.com](https://www.reactnativereusables.com/)
2. Place in `components/ui/`
3. Ensure it uses theme CSS variables (e.g., `bg-background`, `text-foreground`)
4. Import and use: `import { Component } from '~/components/ui/component';`

### New Icon

1. Import from `lucide-react-native` in `app/_layout.tsx`
2. Register with `iconWithClassName(IconName)`
3. Create export file in `lib/icons/IconName.tsx`
4. Use with className support: `<IconName className="h-6 w-6" />`

### Custom Theme

1. Create new theme file in `theming/themes/` implementing `Theme` interface
2. Define all required colors and typography properties
3. Add to `themes` array in ThemeProvider in `app/_layout.tsx`
4. Switch themes with `setTheme('theme-name')`

## Important Development Notes

### Package Manager

- Uses **Yarn Berry (v4.10.3)**, not classic Yarn
- Config in `.yarnrc.yml`
- Plug'n'Play (PnP) enabled

### ESLint Configuration

- Strict TypeScript rules enabled
- `no-console` produces warnings (use console only for intentional logging)
- `@typescript-eslint/no-explicit-any` is an error (never use `any`)
- Unused variables warning (prefix with `_` to ignore)
- React Native specific rules for inline styles and unused styles

### Platform-Specific Features

- **Android Navigation Bar**: Auto-themed via `lib/android-navigation-bar.ts`
- **Web**: Single-page output configured in `app.json`
- **iOS**: Tablet support enabled

### Keyboard Handling

Use the `useKeyboard()` hook for keyboard visibility and height:

```typescript
import { useKeyboard } from "~/lib/keyboard";
const { isKeyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboard();
```

### Portal System

- Web: Uses `WebPortalContext` with DOM portal container
- Native: Uses `PortalHost` from `@rn-primitives/portal`
- Both configured in `app/_layout.tsx`

## Testing Across Platforms

Always test changes on:

- iOS simulator (if on macOS)
- Android emulator
- Web browser (for web compatibility)

Some components behave differently across platforms due to @rn-primitives implementations.

## Common Patterns

### Component Structure

```typescript
import * as React from 'react';
import { View, Text } from 'react-native';
import { cn } from '~/lib/utils';

interface MyComponentProps {
  children: React.ReactNode;
  className?: string;
}

export function MyComponent({ children, className }: MyComponentProps) {
  return (
    <View className={cn('base-styles', className)}>
      <Text className="text-foreground">{children}</Text>
    </View>
  );
}
```

### Form Pattern

```typescript
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';

<Label>Email</Label>
<Input
  placeholder="Enter your email"
  keyboardType="email-address"
  autoCapitalize="none"
/>
<Button onPress={handleSubmit}>
  <Text>Submit</Text>
</Button>
```

### Navigation Pattern

```typescript
import { router } from 'expo-router';
import { Link } from 'expo-router';

// Programmatic navigation
router.push('/profile');

// Link component
<Link href="/profile" asChild>
  <Button><Text>Go to Profile</Text></Button>
</Link>
```

## Critical Files

- `app/_layout.tsx`: Root layout, theme setup, icon registration, font loading
- `theming/ThemeProvider.tsx`: Theme context and CSS variable injection
- `theming/Theme.ts`: Theme interface definition
- `tailwind.config.js`: NativeWind configuration with CSS variables and safelist
- `lib/utils.ts`: Utility functions (cn for class merging)
- `lib/icons/iconWithClassName.ts`: Icon registration helper
- `global.css`: Global CSS and typography classes
- `tsconfig.json`: TypeScript config with path mapping
- `eslint.config.js`: ESLint rules and configuration
- `app.config.js`: Expo configuration
