# New App

Your new Draftbit app is a modern, cross-platform application built with React Native, Expo, and TypeScript. This app demonstrates best practices for development with a clean, maintainable architecture.

## 🤖 LLM Quick Reference

### Project Summary

- **Type**: React Native/Expo cross-platform mobile app
- **Language**: TypeScript with strict mode
- **Styling**: NativeWind (Tailwind CSS for React Native) with object-based style definitions
- **UI Components**: React Native Reusables (shadcn/ui for React Native) setup
- **Icons**: Lucide React Native with NativeWind integration
- **Routing**: Expo Router v4 (file-based routing)
- **State**: Local component state (no global state management)
- **Navigation**: Stack navigation via Expo Router
- **Theming**: CSS variables with light/dark mode support

### Key Patterns & Conventions

**File Naming**

- `+not-found.tsx`: 404/error pages (Expo Router convention)
- `+html.tsx`: Web-specific HTML configuration
- `_layout.tsx`: Layout components (Expo Router convention)
- `~/` prefix: Root-relative imports (configured in tsconfig.json)

**Styling Approach**

```typescript
// Object-based styles with NativeWind classes
const styles = {
  container: 'flex flex-1 m-6',
  title: 'text-xl font-bold',
  button: 'items-center bg-indigo-500 rounded-[28px] shadow-md p-4'
};

// Usage in components
<View className={styles.container}>

// For conditional styling with react-native-reusables
import { cn } from '~/lib/utils';
<View className={cn('base-styles', conditionalStyles)}>
```

**Component Structure**

- All components are functional with TypeScript
- Props interfaces defined inline or as types
- forwardRef used for components that need ref forwarding
- Children props typed as `React.ReactNode`
- React Native Reusables components go in `~/components/ui/` (when added)

**Icon Usage**

```typescript
// Lucide icons with NativeWind support
import { Sun, MoonStar } from '~/lib/icons';

<Sun className="h-6 w-6 text-foreground" />
<MoonStar size={23} strokeWidth={1.25} className="text-foreground" />
```

**Import Patterns**

```typescript
// External libraries first
import { Stack } from "expo-router";
import { Text, View } from "react-native";

// Internal imports with ~ alias
import { Container } from "~/components/Container";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { H1, H2, P, Muted } from "~/components/ui/typography";
import { cn } from "~/lib/utils";
import { useKeyboard } from "~/lib/keyboard";
import { Sun } from "~/lib/icons";
```

**Advanced Theming System**

The app features a comprehensive theming system built with TypeScript, CSS variables, and NativeWind integration. It supports both colors and typography customization.

```typescript
// Use theme-based NativeWind classes (recommended approach)
<View className="bg-background">
  <Text className="text-foreground text-h1">
    Themed with theme classes
  </Text>
</View>



// Use with the useTheme hook
import { useTheme } from '~/theming/ThemeProvider';
import { ThemeToggle } from '~/components/ThemeToggle';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{
        color: theme.colors.foreground,
        fontSize: theme.typography.h1?.fontSize,
        fontFamily: theme.typography.h1?.fontFamily
      }}>
        Themed Content
      </Text>
      {/* Switch between themes programmatically */}
      <Button onPress={() => setTheme('dark')}>Switch to Dark</Button>
    </View>
  );
}
```

**Theme Structure**

```typescript
// Theme interface definition
interface Theme {
  name: string;
  colors: {
    // Base colors
    background: string;
    foreground: string;

    // Component colors
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;

    // Semantic colors
    destructive: string;
    success: string;
    warning: string;
    muted: string;
    accent: string;

    // UI elements
    border: string;
    input: string;
    ring: string;
    overlay: string;
    notification: string;
  };
  typography: {
    h1: { fontSize: string; fontFamily: string };
    h2: { fontSize: string; fontFamily: string };
    // ... h3-h6, body, caption, button
  };
}

// Available built-in themes
import lightTheme from "~/theming/themes/light";
import darkTheme from "~/theming/themes/dark";
```

**Creating Custom Themes**

```typescript
// Create a custom theme
import { Theme } from '~/theming/Theme';

const customTheme: Theme = {
  name: 'custom',
  colors: {
    background: 'hsl(210 40% 8%)',
    foreground: 'hsl(210 40% 98%)',
    primary: 'hsl(200 100% 50%)',
    primaryForeground: 'hsl(210 40% 8%)',
    // ... define all required colors
  },
  typography: {
    h1: {
      fontSize: '28px',
      // Assumes font family is already loaded
      // Use `@expo-google-fonts/<font_name>` packages for loading google fonts
      fontFamily: 'Inter_800ExtraBold',
    },
    // ... define typography styles
  },
};

// Register custom theme in app layout
<ThemeProvider
  initialThemeName="custom"
  themes={[lightTheme, darkTheme, customTheme]}
>
  <App />
</ThemeProvider>
```

**Theme Classes Integration**

```typescript
// All theme colors and typography are automatically converted to CSS/tailwind classes
// theme.colors.background → 'bg-background', 'text-background', etc.
// theme.typography.h1 → 'text-h1', theme.typography.body → 'text-body'

// Use in Tailwind classes
<Text className="text-primary bg-secondary text-h1">Themed Text</Text>
<View className="border-border bg-card">Themed Container</View>
```

**Keyboard Handling**

```typescript
// Monitor keyboard visibility and height
import { useKeyboard } from "~/lib/keyboard";

const { isKeyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboard();
// Use 'willShow' for iOS animations: useKeyboard({ eventType: 'willShow' })
```

**UI Components**

```typescript
// React Native Reusables components with variants
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { H1, H2, P, Muted, Code } from '~/components/ui/typography';

<Button variant="outline" size="lg">
  <Text>Click me</Text>
</Button>
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Text>Card content here</Text>
  </CardContent>
</Card>
```

**Typography System**

```typescript
// Semantic typography components with accessibility
import { H1, H2, H3, H4, P, Lead, Large, Small, Muted, Code, BlockQuote } from '~/components/ui/typography';

<H1>Main Heading</H1>
<H2>Section Heading</H2>
<Lead>Large introductory text</Lead>
<P>Regular paragraph text</P>
<Muted>Muted secondary text</Muted>
<Code>inline code</Code>
<BlockQuote>Quote text with proper styling</BlockQuote>
```

**Form Components**

```typescript
// Form inputs with proper accessibility
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

<Label>Email Address</Label>
<Input
  placeholder="Enter your email"
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

**Screen Structure**

```typescript
// Screens now contain their content directly
export default function MyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Screen Title',
          headerRight: () => <ThemeToggle />
        }}
      />
      <Container>
        <View className="flex-1 justify-center items-center">
          {/* Your screen content here */}
        </View>
      </Container>
    </>
  );
}
```

### Quick Commands

```bash
yarn start    # Start dev server
yarn ios      # iOS simulator
yarn android  # Android emulator
yarn web      # Web browser
yarn lint     # ESLint check
yarn format   # Format + lint fix
yarn prebuild # Generate native code for custom builds
```

### Key Files for LLMs

- `app/_layout.tsx`: Root layout (Stack navigation)
- `app/index.tsx`: Home screen
- `assets/images/`: App icons, splash screens, and images
- `components/ThemeToggle.tsx`: Theme switcher component
- `components/ui/`: React Native Reusables components (Button, Card, Text, etc.)
- `lib/keyboard.tsx`: Keyboard visibility and height hook
- `lib/android-navigation-bar.ts`: Android navigation bar theming
- `lib/utils.ts`: Utility functions (cn for class merging)
- `lib/useColorScheme.tsx`: Color scheme hook
- `lib/icons/`: Lucide icons with NativeWind integration
- `global.css`: Global CSS and theme related typography classes
- `tailwind.config.js`: NativeWind preset configuration
- `tsconfig.json`: Path mapping (`~/` → root)
- `app.json`: Expo configuration (asset paths updated)

### Common Tasks

- **Add new screen**: Create file in `app/` directory with direct content
- **Add component**: Create in `components/` directory
- **Add UI component**: Use [React Native Reusables](https://www.reactnativereusables.com/) - copy/paste to `components/ui/`
- **Add icon**: Import from `~/lib/icons/` or add new Lucide icon
- **Add images**: Place in `assets/images/` directory
- **Update app icons**: Replace files in `assets/images/` (paths already configured)
- **Handle keyboard**: Use `useKeyboard()` hook for visibility/height
- **Style elements**: Use NativeWind classes, CSS variables, and `cn()` utility
- **Navigate**: Use `<Link>` from expo-router or router.push()
- **Safe areas**: Wrap content in `<Container>` component
- **Toggle theme**: Use `<ThemeToggle />` component in header or `toggleColorScheme()` hook

### React Native Reusables Integration

- **Status**: Foundation complete with comprehensive component library
- **Available components**: Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar, Badge, Button, Card, Checkbox, Collapsible, Context Menu, Dialog, Dropdown Menu, Hover Card, Input, Label, Menubar, Navigation Menu, Popover, Progress, Radio Group, Select, Separator, Skeleton, Switch, Table, Tabs, Text, Textarea, Toggle, Toggle Group, Tooltip, Typography
- **Typography system**: H1-H4, P, Lead, Large, Small, Muted, Code, BlockQuote
- **Form components**: Input with focus states, Label with accessibility support
- **Component variants**: Multiple styles (default, outline, ghost, destructive, etc.)
- **Component location**: `~/components/ui/` directory
- **Styling**: Uses CSS variables, `cn()` utility, and class-variance-authority
- **Accessibility**: Built-in accessibility support for all components
- **Next steps**: Add more components from [reactnativereusables.com](https://www.reactnativereusables.com/)

### Additional Utilities

- **Keyboard Hook**: `useKeyboard()` for monitoring keyboard state
- **Theme Toggle**: Pre-built `<ThemeToggle />` component with icons
- **Android Navigation**: Automatic navigation bar theming on Android
- **Icon System**: Lucide icons with NativeWind className support

## 📱 Features

- **Cross-platform compatibility**: Runs on iOS, Android, and Web
- **Modern UI**: Styled with NativeWind (Tailwind CSS for React Native)
- **Comprehensive UI Library**: React Native Reusables with Typography, Forms, and Components
- **Typography System**: Complete set of semantic text components (H1-H4, P, Code, etc.)
- **Form Components**: Input and Label components with accessibility support
- **Beautiful Icons**: Lucide React Native icons with NativeWind integration
- **Dark/Light Mode**: Built-in theming with CSS variables
- **Type-safe**: Built with TypeScript for better developer experience
- **File-based routing**: Uses Expo Router for navigation
- **Hot reload**: Fast development with instant updates
- **Responsive design**: Adapts to different screen sizes and orientations
- **Accessibility**: Built-in accessibility support across all components

## 🏗️ Architecture

### App Structure

```
app/
├── _layout.tsx          # Root layout component
├── index.tsx            # Home screen
├── +not-found.tsx       # 404 error page
└── +html.tsx            # Web-specific HTML configuration

assets/
└── images/              # App icons, splash screens, and images
    ├── icon.png         # App icon
    ├── adaptive-icon.png # Android adaptive icon
    ├── splash.png       # Splash screen
    └── favicon.png      # Web favicon

components/
├── ui/                  # React Native Reusables components
│   ├── avatar.tsx       # Avatar component with image/fallback
│   ├── button.tsx       # Button with variants (default, outline, ghost, etc.)
│   ├── card.tsx         # Card with header, content, footer sections
│   ├── input.tsx        # Text input with consistent styling
│   ├── label.tsx        # Form label with accessibility support
│   ├── progress.tsx     # Progress bar component
│   ├── text.tsx         # Text component with context support
│   ├── tooltip.tsx      # Tooltip component
│   └── typography.tsx   # Typography system (H1, H2, H3, H4, P, etc.)
├── ThemeToggle.tsx      # Theme switcher with sun/moon icons
└── Container.tsx        # Safe area wrapper

lib/
├── icons/               # Lucide icons with NativeWind integration
│   ├── iconWithClassName.ts
│   ├── Sun.tsx
│   └── MoonStar.tsx     # Moon icon for dark theme
├── android-navigation-bar.ts # Android navigation bar theming
├── keyboard.tsx         # Keyboard visibility and height hook
├── useColorScheme.tsx   # Color scheme hook
└── utils.ts             # Utility functions (cn, etc.)
```

### Key Technologies

**Expo SDK 52**

- Foundation for cross-platform development
- Rich ecosystem of pre-built components and APIs
- Simplified build and deployment process
- Over-the-air updates capability

**Expo Router v4**

- File-based routing system similar to Next.js
- Type-safe routing with automatic route generation
- Deep linking support out of the box
- Nested navigation capabilities

**NativeWind**

- Tailwind CSS integration for React Native
- Type-safe styling with IntelliSense support
- Platform-specific styling when needed
- Hot reload support for styles

**React Native Reusables**

- [Universal shadcn/ui components](https://www.reactnativereusables.com/) for React Native
- Built with accessibility in mind using @rn-primitives
- CSS variable-based theming with light/dark mode
- Copy/paste component library approach
- Consistent design system across platforms

**Lucide Icons**

- Beautiful, customizable SVG icons
- NativeWind className support
- Optimized for React Native performance
- Consistent icon system across platforms

**TypeScript**

- Strict type checking enabled
- Path mapping configured (`~/` for root imports)
- Enhanced developer experience with autocomplete
- Better code maintainability

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager
- Expo CLI
- For iOS: Xcode (macOS only)
- For Android: Android Studio

### Installation

1. Clone the repository and install dependencies:

   ```bash
   yarn install
   ```

2. Start the development server:
   ```bash
   yarn start
   ```

### Running on Different Platforms

**Development Server**

```bash
yarn start          # Start Expo development server
```

**iOS Simulator** (macOS only)

```bash
yarn ios           # Launch on iOS simulator
```

**Android Emulator**

```bash
yarn android       # Launch on Android emulator
```

**Web Browser**

```bash
yarn web           # Launch in web browser
```

## 🛠️ Development

### Code Quality Tools

**Linting & Formatting**

```bash
yarn lint          # Run ESLint
yarn format        # Format code with Prettier and fix linting issues
```

**Build**

```bash
yarn prebuild      # Generate native code for custom builds
```

### Project Configuration

- **TypeScript**: Configured with strict mode and path mapping
- **ESLint**: Configured for React Native and TypeScript
- **Prettier**: Integrated with Tailwind CSS plugin
- **Babel**: Configured for NativeWind and Expo
- **Tailwind**: Configured for React Native with NativeWind preset

## 📦 Dependencies

### Core Dependencies

- **React Native 0.76.9**: Core framework
- **Expo 52**: Development platform
- **Expo Router 4**: File-based routing
- **NativeWind**: Tailwind CSS for React Native
- **TypeScript**: Type safety

### UI & Styling

- **Lucide React Native**: Beautiful SVG icons
- **React Native SVG**: SVG support for icons
- **Class Variance Authority**: Component variant management
- **Tailwind Merge**: Utility class merging
- **Tailwind CSS Animate**: Animation utilities
- **CLSX**: Conditional class names

### Platform Utilities

- **Expo Navigation Bar**: Android navigation bar theming
- **Expo Splash Screen**: Splash screen management

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Tailwind CSS**: Utility-first CSS framework

## 🚀 Deployment

### Production Builds

This app is configured for deployment using Expo Application Services (EAS):

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for production
eas build --platform all

# Submit to app stores
eas submit --platform all
```

### Web Deployment

The app can be deployed as a static web app:

```bash
yarn web
# Build output will be in dist/ directory
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using Draftbit, Expo, and React Native
