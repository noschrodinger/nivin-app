import { Stack } from 'expo-router';
import 'react-native-reanimated';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Esto controla TODO lo que esté fuera de las pestañas */}
      <Stack.Screen name="(tabs)" /> 
      <Stack.Screen name="details/[id]" />
      <Stack.Screen name="player/[url]" />
    </Stack>
  );
}
