import "~/global.css";
import "~/appearance-polyfill";

import {
  Theme as NavigationTheme,
  ThemeProvider as NavigationThemeProvider,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Platform, View } from "react-native";
import { useColorScheme } from "~/lib/useColorScheme";
import {
  Home,
  Menu,
  Coins,
  Sparkles,
  Crown,
  Zap,
  Coffee,
  MessageCircle,
  User,
  Store as StoreIcon,
  Settings,
  Heart,
  Video,
  Gift,
  Search,
  X as XIcon,
  ChevronLeft,
  Bell,
  Lock,
  Globe,
  Eye,
  Shield,
  Trash2,
  Camera,
  Save,
  DollarSign,
  CreditCard,
  Building,
  TrendingUp,
  Calendar,
  Star,
  HelpCircle,
  Mail,
  FileText,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  ThumbsUp,
  Users,
  Filter,
  Download,
  Upload,
  Ban,
  UserX,
  Tag,
  Check,
  SmilePlus,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
  CheckCheck,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react-native";
import { iconWithClassName } from "~/lib/icons/iconWithClassName";
import { ThemeToggle } from "~/components/ThemeToggle";
import { ThemeProvider, useTheme } from "~/theming/ThemeProvider";
import darkTheme from "~/theming/themes/dark";
import lightTheme from "~/theming/themes/light";
import mochaTheme from "~/theming/themes/mocha";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { PortalHost } from "@rn-primitives/portal";
import { WebPortalContext } from "~/components/WebPortalContext";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "~/hooks/useAuth";
import { STRIPE_CONFIG, validateStripeConfig } from "~/lib/stripe";
import { StripeWrapper } from "~/components/StripeWrapper";

SplashScreen.preventAutoHideAsync();

// Configure icons for NativeWind
iconWithClassName(Home);
iconWithClassName(Menu);
iconWithClassName(Coins);
iconWithClassName(Sparkles);
iconWithClassName(Crown);
iconWithClassName(Zap);
iconWithClassName(Coffee);
iconWithClassName(MessageCircle);
iconWithClassName(User);
iconWithClassName(StoreIcon);
iconWithClassName(Settings);
iconWithClassName(Heart);
iconWithClassName(Video);
iconWithClassName(Gift);
iconWithClassName(Search);
iconWithClassName(XIcon);
iconWithClassName(ChevronLeft);
iconWithClassName(Bell);
iconWithClassName(Lock);
iconWithClassName(Globe);
iconWithClassName(Eye);
iconWithClassName(Shield);
iconWithClassName(Trash2);
iconWithClassName(Camera);
iconWithClassName(Save);
iconWithClassName(Copy);
iconWithClassName(DollarSign);
iconWithClassName(CreditCard);
iconWithClassName(Building);
iconWithClassName(TrendingUp);
iconWithClassName(Calendar);
iconWithClassName(Star);
iconWithClassName(HelpCircle);
iconWithClassName(Mail);
iconWithClassName(FileText);
iconWithClassName(AlertCircle);
iconWithClassName(ChevronRight);
iconWithClassName(ArrowUpRight);
iconWithClassName(ArrowDownLeft);
iconWithClassName(ThumbsUp);
iconWithClassName(Users);
iconWithClassName(Filter);
iconWithClassName(Download);
iconWithClassName(Upload);
iconWithClassName(Ban);
iconWithClassName(UserX);
iconWithClassName(Tag);
iconWithClassName(Check);
iconWithClassName(SmilePlus);
iconWithClassName(ImageIcon);
iconWithClassName(Mic);
iconWithClassName(Play);
iconWithClassName(Pause);
iconWithClassName(CheckCheck);
iconWithClassName(CheckCircle);
iconWithClassName(XCircle);
iconWithClassName(Clock);
iconWithClassName(ExternalLink);
iconWithClassName(Copy);

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

function RootContent() {
  const hasMounted = React.useRef(false);
  const portalContainer = React.useRef<View>(null);
  const { isDarkColorScheme } = useColorScheme();
  const { theme, setTheme } = useTheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isLoadingFonts = !fontsLoaded && !fontError;

  const navigationTheme: NavigationTheme = React.useMemo(() => {
    const navigationThemeBase = isDarkColorScheme ? NavigationDarkTheme : NavigationDefaultTheme;
    const baseColors = navigationThemeBase.colors;
    return {
      ...navigationThemeBase,
      colors: {
        ...baseColors,
        background: theme.colors.background ?? baseColors.background,
        border: theme.colors.border ?? baseColors.border,
        card: theme.colors.card ?? baseColors.card,
        notification: theme.colors.destructive ?? baseColors.notification,
        primary: theme.colors.primary ?? baseColors.primary,
        text: theme.colors.foreground ?? baseColors.text,
      },
    };
  }, [theme, isDarkColorScheme]);

  // Keep mocha theme always (comment out auto-switching)
  // React.useEffect(() => {
  //   if (isDarkColorScheme && theme.name !== "dark") {
  //     setTheme("dark");
  //   }
  //   if (!isDarkColorScheme && theme.name !== "light") {
  //     setTheme("light");
  //   }
  // }, [isDarkColorScheme]);

  React.useEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      // Adds the background color to the html element to prevent white background on overscroll.
      // eslint-disable-next-line no-undef
      document.documentElement.classList.add("bg-background");
    }
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  React.useEffect(() => {
    if (!isLoadingFonts) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingFonts]);

  if (!isColorSchemeLoaded || isLoadingFonts) {
    return null;
  }

  return (
    <WebPortalContext.Provider value={{ container: portalContainer.current as HTMLElement | null }}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
        <Stack
          screenOptions={() => ({
            headerStyle: {
              backgroundColor: theme.colors.background,
              borderBottomColor: theme.colors.border,
            },
            headerTintColor: theme.colors.foreground,
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontFamily: theme.typography.h1?.fontFamily,
            },

            headerRight: () => <ThemeToggle />,
          })}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Welcome",
            }}
          />
        </Stack>
        {
          // View used as a portal container on web
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
            }}
            ref={portalContainer}
          />
        }
        {
          // PortalHost used as a portal container on native
          <PortalHost />
        }
      </NavigationThemeProvider>
    </WebPortalContext.Provider>
  );
}

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  // Validate Stripe config on mount (only warns in dev, doesn't block)
  // Only validate on native platforms where Stripe is available
  React.useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        validateStripeConfig();
      } catch (error) {
        console.warn("Stripe configuration warning:", error);
      }
    }
  }, []);

  // Content component to avoid duplication
  const content = (
    <ThemeProvider initialThemeName="mocha" themes={[lightTheme, darkTheme, mochaTheme]}>
      <RootContent />
    </ThemeProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StripeWrapper>{content}</StripeWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}
