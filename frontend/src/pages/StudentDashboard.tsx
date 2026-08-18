import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Lightbulb, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const dashboardRes = await api.get(`/dashboard/${user.id}`);
        setData(dashboardRes.data);
        const insightRes = await api.get(`/insights/${user.id}`);
        setInsight(insightRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();

    // Setup WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/focus/${user.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.current_focus_score !== undefined) {
        setData((prev: any) => ({
          ...(prev || {}),
          current_focus_score: msg.current_focus_score,
          recent_events: msg.recent_events || (prev?.recent_events || [])
        }));
      }
      if (msg.distraction_alert) {
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 4000);
      }
    };

    return () => {
      ws.close();
    };
  }, [user?.id, navigate]);



  const progressData = [
    { day: 'Mon', focus: 75 },
    { day: 'Tue', focus: 82 },
    { day: 'Wed', focus: 90 },
    { day: 'Thu', focus: 85 },
    { day: 'Fri', focus: data?.current_focus_score || 95 },
  ];

  if (!data) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showNotification && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" />
            <span className="font-medium">Distraction detected! Focus score dropped.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 hide-on-print">
        <div className="flex items-center gap-4">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="Profile" className="w-16 h-16 rounded-full bg-gray-800" />
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Student Dashboard</h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-400">Let's make today a productive day.</p>
              <span className="text-gray-500 text-sm">• Grade 10 • ID: {user.id}</span>
            </div>
          </div>
        </div>
      </header>



      <div className="grid grid-cols-1 gap-6 mt-8">
        <div className="glass-panel p-6 rounded-xl flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="text-nvidia-green w-6 h-6" />
            <h3 className="text-xl font-bold">AI Coach</h3>
          </div>
          <div className="p-4 rounded-lg bg-dark-bg border border-panel-border/50 text-gray-300 italic text-lg leading-relaxed">
            {insight?.student_motivation ? `"${insight.student_motivation}"` : "Loading your personalized coaching..."}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Weekly Progress</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#76b900" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#76b900" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2c2c2e' }} />
                <Area type="monotone" dataKey="focus" stroke="#76b900" fillOpacity={1} fill="url(#colorFocus)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-yellow-500 w-6 h-6" />
            <h3 className="text-xl font-bold">Study Tips</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-dark-bg border border-panel-border rounded-lg flex gap-3">
              <div className="text-yellow-500 font-bold">1</div>
              <p className="text-sm text-gray-300">Break your study sessions into 25-minute chunks using the Focus Timer.</p>
            </div>
            <div className="p-3 bg-dark-bg border border-panel-border rounded-lg flex gap-3">
              <div className="text-yellow-500 font-bold">2</div>
              <p className="text-sm text-gray-300">Keep your phone in another room while studying History to avoid distractions.</p>
            </div>
            <div className="p-3 bg-dark-bg border border-panel-border rounded-lg flex gap-3">
              <div className="text-yellow-500 font-bold">3</div>
              <p className="text-sm text-gray-300">Stay hydrated! Drinking water improves cognitive function by 14%.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 mt-8">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Timetable</h3>
          <div className="space-y-3">
            {['09:00 AM - Physics', '10:30 AM - Mathematics', '01:00 PM - Computer Science', '02:30 PM - History'].map((cls, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-dark-bg border border-panel-border">
                <span className="text-gray-300 font-medium">{cls.split(' - ')[1]}</span>
                <span className="text-sm text-nvidia-green">{cls.split(' - ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
