import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Video, MessageCircle, Camera, CheckCircle } from 'lucide-react';
import api from '../api';

interface Props {
  studentId: number;
  onSimulate: () => void;
}

export default function SimulationPanel({ studentId, onSimulate }: Props) {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const apps = [
    { id: 'Instagram', icon: Camera, color: 'text-pink-500' },
    { id: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
    { id: 'YouTube', icon: Video, color: 'text-red-500' },
  ];

  const handleSimulate = (appName: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveApp(appName);
    setProgress(0);
    
    // Simulate the distraction event over a 10 second demo countdown
    intervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          triggerDistractionEvent(appName);
          setTimeout(() => setActiveApp(null), 1500);
          return 100;
        }
        return prev + 2.5; // 40 increments of 250ms = 10 seconds
      });
    }, 250);
  };

  const handleReturnToClass = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveApp(null);
    setProgress(0);
    try {
      await api.post('/simulation/distraction', {
        user_id: studentId,
        app_name: 'Returned to Class',
        duration: 0,
        focus_score_drop: 0 // Stop distraction
      });
      onSimulate();
    } catch (err) {
      console.error("Failed to record return event", err);
    }
  };

  const triggerDistractionEvent = async (appName: string) => {
    try {
      await api.post('/simulation/distraction', {
        user_id: studentId,
        app_name: appName,
        duration: 300, // 5 minutes in seconds
        focus_score_drop: 5
      });
      onSimulate();
    } catch (err) {
      console.error("Failed to record distraction", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {apps.map((app) => {
          const Icon = app.icon;
          const isActive = activeApp === app.id;
          return (
            <button
              key={app.id}
              disabled={activeApp !== null}
              onClick={() => handleSimulate(app.id)}
              className={`p-3 rounded-lg border border-panel-border bg-dark-bg flex flex-col items-center justify-center transition-all ${
                activeApp === null ? 'hover:border-nvidia-green hover:bg-panel-bg' : 'opacity-50'
              } ${isActive ? 'ring-2 ring-nvidia-blue' : ''}`}
            >
              <Icon className={`w-6 h-6 mb-2 ${app.color}`} />
              <span className="text-xs text-gray-300">{app.id}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeApp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 rounded-lg bg-dark-bg border border-panel-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-nvidia-blue" />
                  {activeApp} opened...
                </span>
                <span className="text-sm font-bold text-nvidia-blue">{progress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <motion.div 
                  className="bg-gradient-to-r from-nvidia-blue to-nvidia-green h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              {progress === 100 && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-2 text-xs text-nvidia-green flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" /> Event Logged! Focus dropped.
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        disabled={activeApp === null}
        onClick={handleReturnToClass}
        className="w-full py-2 bg-panel-bg border border-panel-border rounded-lg text-sm text-gray-400 hover:text-white hover:border-nvidia-green hover:text-nvidia-green transition-colors disabled:opacity-50"
      >
        Return to Class
      </button>
    </div>
  );
}
