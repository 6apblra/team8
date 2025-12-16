import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import HomeScreen from "@/screens/HomeScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Colors } from "@/constants/theme";

export type HomeStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();
  const theme = Colors.dark;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerRight: () => (
            <HeaderButton
              onPress={() => {}}
              pressColor="transparent"
              pressOpacity={0.7}
            >
              <Feather name="bell" size={22} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
