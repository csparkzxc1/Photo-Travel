import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@design/ThemeProvider';
import { useAppStore } from '@data/store';
import { MapScreen } from '@features/map/MapScreen';
import { TimelineScreen } from '@features/timeline/TimelineScreen';
import { PhotobookScreen } from '@features/photobook/PhotobookScreen';
import { RankingScreen } from '@features/ranking/RankingScreen';
import { MyTravelScreen } from '@features/mytravel/MyTravelScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';
import { OnboardingScreen } from '@features/onboarding/OnboardingScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Map: '🗺️',
  Timeline: '📅',
  Photobook: '📸',
  Ranking: '🏆',
  MyTravel: '✈️',
  Settings: '⚙️',
};

const TAB_LABELS: Record<string, string> = {
  Map: '지도',
  Timeline: '타임라인',
  Photobook: '포토북',
  Ranking: '랭킹',
  MyTravel: '나의 여행',
  Settings: '설정',
};

export function RootNavigator() {
  const { theme, name } = useTheme();
  const onboarded = useAppStore((s) => s.onboarded);
  const [showOnboarding, setShowOnboarding] = React.useState(!onboarded);

  React.useEffect(() => {
    if (onboarded) setShowOnboarding(false);
  }, [onboarded]);

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  const navTheme = name === 'dark' ? DarkTheme : DefaultTheme;
  const themed = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={themed}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarLabel: TAB_LABELS[route.name] ?? route.name,
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>
              {TAB_ICONS[route.name]}
            </Text>
          ),
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
        })}
      >
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Timeline" component={TimelineScreen} />
        <Tab.Screen name="Photobook" component={PhotobookScreen} />
        <Tab.Screen name="Ranking" component={RankingScreen} />
        <Tab.Screen name="MyTravel" component={MyTravelScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
