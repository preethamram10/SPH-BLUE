import { Stack } from "expo-router";

export default function ReceptionLayout() {
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
      <Stack.Screen name="appointments/index" />
      <Stack.Screen name="appointments/book" />
      <Stack.Screen name="all-patients/index" />
      <Stack.Screen name="follow-ups/index" />
      <Stack.Screen name="branch-cleaning/index" />
      <Stack.Screen name="token-queue/index" />
      <Stack.Screen name="walk-in-registration/index" />
      <Stack.Screen name="billing-invoices/index" />
      <Stack.Screen name="doctors-list/index" />
    </Stack>
  );
}
