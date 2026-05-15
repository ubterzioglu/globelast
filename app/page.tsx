import { GlobeClient } from '@/components/globe/GlobeClient';
import { PinLauncher } from '@/components/pins/PinLauncher';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black">
      <GlobeClient />
      <PinLauncher />
    </main>
  );
}
