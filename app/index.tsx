import { Redirect } from 'expo-router';

// Entry point — redirect to the main tab or screen
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
