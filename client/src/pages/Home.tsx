import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-pink-600 bg-slate-950 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black text-neon-pink uppercase tracking-widest mb-4">
            System Status Monitor
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            Real-time uptime monitoring with cyberpunk aesthetics
          </p>
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/monitor")}
              className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider text-lg px-8 py-3"
            >
              Open Dashboard
            </Button>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-pink-600 hover:bg-pink-500 text-white font-bold uppercase tracking-wider text-lg px-8 py-3"
            >
              Login to Start
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <section className="border-glow p-6 rounded-sm bg-slate-900 border border-pink-600">
            <h2 className="text-2xl font-bold text-neon-pink uppercase tracking-wider mb-4">
              Features
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="text-cyan-400 font-bold">•</span>
                Monitor up to 20 systems with real-time status checks
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-bold">•</span>
                Automatic heartbeat pings every 60 seconds
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-bold">•</span>
                12-hour ping history with response time charts
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-bold">•</span>
                Green (online) and red (down) status indicators
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400 font-bold">•</span>
                Manual ping trigger for immediate checks
              </li>
            </ul>
          </section>

          <section className="border-glow p-6 rounded-sm bg-slate-900 border border-cyan-500">
            <h2 className="text-2xl font-bold text-neon-cyan uppercase tracking-wider mb-4">
              Getting Started
            </h2>
            <p className="text-gray-300 mb-4">
              The dashboard comes pre-loaded with Google as an example system. You can add up to 20 systems total and monitor their uptime in real-time.
            </p>
            {isAuthenticated && (
              <Button
                onClick={() => setLocation("/monitor")}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider"
              >
                Go to Dashboard
              </Button>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
