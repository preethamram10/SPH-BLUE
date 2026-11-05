import { Stack } from "expo-router";

export default function DoctorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 280,
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="packages/index" />
      <Stack.Screen name="patient-list/index" />
      <Stack.Screen name="total-revenue/index" />
      <Stack.Screen name="patient-file/index" />
    </Stack>
  );
}

