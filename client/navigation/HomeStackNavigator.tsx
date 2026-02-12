import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export type HomeStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function FilterButton() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  return (
    <HeaderButton
      onPress={() => navigation.navigate("Filters")}
      pressColor="transparent"
      pressOpacity={0.7}
    >
      <Feather name="sliders" size={22} color={theme.text} />
    </HeaderButton>
  );
}

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerLeft: () => <FilterButton />,
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
