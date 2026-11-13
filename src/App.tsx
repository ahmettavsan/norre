import { Canvas } from './canvas/Canvas';
import { Topbar } from './components/Topbar';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export function App() {
  useGlobalShortcuts();
  return (
    <>
      <Topbar />
      <Canvas />
    </>
  );
}
