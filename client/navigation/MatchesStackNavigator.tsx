import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MatchesScreen from "@/screens/MatchesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTranslation } from "@/hooks/useTranslation";

export type MatchesStackParamList = {
  Matches: undefined;
};

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export default function MatchesStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          headerTitle: t("navigation.matches"),
        }}
      />
    </Stack.Navigator>
  );
}
