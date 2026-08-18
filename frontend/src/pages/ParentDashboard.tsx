import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, ShieldAlert, Bell } from 'lucide-react';
import api from '../api';
import SimulationPanel from '../components/SimulationPanel';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot, FileText, Wifi, X, Download, Book, Calendar } from 'lucide-react';

export default function ParentDashboard() {
  const [data, setData] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [reportModal, setReportModal] = useState<{type: string, content: string} | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchData = useCallback(async () => {
    try {
      if (user?.id) {
        const res = await api.get(`/dashboard/${user.id}`);
        setData((prevData: any) => {
          if (prevData && res.data.recent_events.length > prevData.recent_events.length) {
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 4000);
            const newAlertsCount = res.data.recent_events.length - prevData.recent_events.length;
            setUnreadAlerts(prev => prev + newAlertsCount);
          }
          return res.data;
        });
        
        // Fetch AI insight
        const insightRes = await api.get(`/insights/${user.id}`);
        setInsight(insightRes.data);
        
        // Fetch Messages
        const msgRes = await api.get(`/messages/${user.id}`);
        setMessages(msgRes.data);
      }

    } catch (err) {
      console.error(err);
    }
  }, [user?.id]); // Safely depend on primitive ID

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 1000); // Poll for updates
    return () => clearInterval(interval);
  }, [user?.id, navigate, fetchData]); // Depend on user?.id instead of user object

  if (!data) return <div className="text-center p-8">Loading...</div>;

  // Calculate dynamic chart data based on recent events
  let runningFocus = 100;
  const chartData = [{ time: 'Start', focus: 100 }];
  if (data?.recent_events && data.recent_events.length > 0) {
    const reversedEvents = [...data.recent_events].reverse();
    reversedEvents.forEach((e: any, i: number) => {
      runningFocus -= e.focus_score_drop;
      chartData.push({ time: `Event ${i+1}`, focus: Math.max(0, runningFocus) });
    });
  } else {
    chartData.push({ time: 'Now', focus: runningFocus });
  }

  const handleGenerateReport = async (type: string) => {
    setLoadingReport(true);
    try {
      const res = await api.get(`/reports/${type}/${user.id}`);
      setReportModal({ type, content: res.data.report });
    } catch (e) {
      console.error("Error generating report", e);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" />
            <span className="font-medium">New Distraction Alert! Focus dropped.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 hide-on-print">
        <div className="flex items-center gap-4">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.child_name}`} alt="Profile" className="w-16 h-16 rounded-full bg-gray-800" />
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Parent Dashboard</h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-400">Monitoring {data.user.child_name}</p>
              <span className="text-gray-500 text-sm">• Grade 10 • Lincoln High</span>
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-nvidia-green/20 text-nvidia-green rounded-full border border-nvidia-green/30">
                <Wifi className="w-3 h-3" /> Connected
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
          <div className="relative mr-2 md:mr-4 self-center">
            <button onClick={() => { setShowMessages(!showMessages); setUnreadAlerts(0); }} className="p-2 relative text-gray-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              {unreadAlerts > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-dark-bg">{unreadAlerts}</span>
              )}
            </button>
            <AnimatePresence>
              {showMessages && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-72 md:w-80 bg-panel-bg border border-panel-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-panel-border bg-dark-bg/50">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {messages.length > 0 ? messages.map((m, i) => (
                      <div key={i} className={`p-4 border-b border-panel-border/50 hover:bg-white/5 transition-colors ${!m.is_read ? 'bg-nvidia-blue/5' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-nvidia-blue">{m.sender_name}</span>
                          <span className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-sm text-gray-300">{m.content}</p>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-sm text-gray-500">No new messages.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => handleGenerateReport('daily')} disabled={loadingReport} className="px-4 py-2 bg-panel-bg hover:bg-white/5 border border-panel-border rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-2">

            <FileText className="w-4 h-4" /> {loadingReport ? 'Generating...' : 'Daily Report'}
          </button>
          <button onClick={() => handleGenerateReport('weekly')} disabled={loadingReport} className="px-4 py-2 bg-nvidia-blue/20 hover:bg-nvidia-blue/30 border border-nvidia-blue/30 text-nvidia-blue rounded-lg text-sm transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" /> Weekly Report
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-xl border-t-4 border-nvidia-green">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-300">Focus Score</h3>
            <Activity className="text-nvidia-green" />
          </div>
          <div className="text-4xl font-bold text-white">{data.current_focus_score}/100</div>
          <p className="text-sm text-nvidia-green-light mt-2">Target: 85</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-xl border-t-4 border-nvidia-blue">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-300">Class Hours</h3>
            <Clock className="text-nvidia-blue" />
          </div>
          <div className="text-4xl font-bold text-white">4h 20m</div>
          <p className="text-sm text-gray-400 mt-2">Remaining: 1h 40m</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-xl border-t-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-300">Distractions</h3>
            <ShieldAlert className="text-red-500" />
          </div>
          <div className="text-4xl font-bold text-white">{data.recent_events.length}</div>
          <p className="text-sm text-red-400 mt-2">Last: {data.recent_events[0]?.app_name || 'None'}</p>
        </motion.div>
      </div>

      {/* New Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 hide-on-print">
        <div className="glass-panel p-6 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Current Subject</h3>
            <div className="text-2xl font-bold text-white">Mathematics</div>
          </div>
          <Book className="w-8 h-8 text-nvidia-blue opacity-50" />
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Attendance</h3>
            <div className="text-2xl font-bold text-white">98%</div>
          </div>
          <Calendar className="w-8 h-8 text-nvidia-green opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 hide-on-print">
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Focus Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" stroke="#71717a" />
                <YAxis stroke="#71717a" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2c2c2e' }} />
                <Line type="monotone" dataKey="focus" stroke="#76b900" strokeWidth={3} dot={{ fill: '#76b900', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><Bot className="text-nvidia-green" /> AI Insights</h3>
              {insight && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  insight.risk_level === 'High' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
                  insight.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 
                  'bg-green-500/20 text-green-500 border-green-500/30'
                }`}>
                  {insight.risk_level} Risk
                </span>
              )}
            </div>
            {insight ? (
              <div>
                <div className="text-gray-300 italic mb-4 text-lg min-h-[56px]">
                  "{insight.summary}"
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 border-t border-panel-border pt-4">
                  <div><span className="text-gray-500 block mb-1">Behaviour Analysis</span> <span className="text-white block min-h-[40px]">{insight.behaviour_analysis}</span></div>
                  <div><span className="text-gray-500 block mb-1">Parent Recommendation</span> <span className="text-white block min-h-[40px]">{insight.parent_recommendation}</span></div>
                  <div><span className="text-gray-500 block mb-1">Teacher Recommendation</span> <span className="text-white block min-h-[40px]">{insight.teacher_recommendation}</span></div>
                  <div><span className="text-gray-500 block mb-1">Student Motivation</span> <span className="text-white block min-h-[40px]">{insight.student_motivation}</span></div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse">
                <div className="h-14 bg-panel-border rounded-lg mb-4 w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 border-t border-panel-border pt-4">
                  <div><div className="h-4 w-24 bg-panel-border rounded mb-2"></div><div className="h-10 bg-panel-border/50 rounded w-full"></div></div>
                  <div><div className="h-4 w-24 bg-panel-border rounded mb-2"></div><div className="h-10 bg-panel-border/50 rounded w-full"></div></div>
                  <div><div className="h-4 w-24 bg-panel-border rounded mb-2"></div><div className="h-10 bg-panel-border/50 rounded w-full"></div></div>
                  <div><div className="h-4 w-24 bg-panel-border rounded mb-2"></div><div className="h-10 bg-panel-border/50 rounded w-full"></div></div>
                </div>
              </div>
            )}

          </div>

          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Device Simulation</h3>
            <p className="text-sm text-gray-400 mb-4">Simulate distractions on the child's device to see the system react in real-time.</p>
            <SimulationPanel studentId={3} onSimulate={fetchData} /> {/* student1 is ID 3 in DB */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Recent Alerts Log</h3>
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-panel-border text-gray-400 text-sm">
                <th className="py-3 px-4 font-medium">Student Name</th>
                <th className="py-3 px-4 font-medium">Subject</th>
                <th className="py-3 px-4 font-medium">App</th>
                <th className="py-3 px-4 font-medium">Duration (s)</th>
                <th className="py-3 px-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_events.length > 0 ? data.recent_events.map((ev: any, idx: number) => (
                <tr key={idx} className="border-b border-panel-border/50 hover:bg-white/5 transition-colors text-sm">
                  <td className="py-3 px-4 text-white font-medium">{data.user.child_name || "Unknown"}</td>
                  <td className="py-3 px-4 text-gray-300">Mathematics</td>
                  <td className="py-3 px-4 text-white font-medium">{ev.app_name}</td>
                  <td className="py-3 px-4 text-gray-300">{ev.duration}</td>
                  <td className="py-3 px-4 text-gray-300">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No recent distractions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">Distraction History</h3>
        <div className="space-y-3">
          {data.recent_events && data.recent_events.length > 0 ? data.recent_events.map((ev: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-dark-bg border border-panel-border border-l-2 border-l-red-500">
              <span className="text-gray-300 font-medium">{ev.app_name}</span>
              <span className="text-sm text-red-500">-{ev.focus_score_drop} pts</span>
            </div>
          )) : (
            <div className="text-gray-500 italic p-4 text-center border border-panel-border border-dashed rounded-lg">No distractions today! Great job.</div>
          )}
        </div>
      </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 report-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-dark-bg border border-panel-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl report-modal-content"
            >
              <div className="flex justify-between items-center p-6 border-b border-panel-border hide-on-print">
                <h3 className="text-2xl font-bold text-white capitalize">{reportModal.type} Report</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-nvidia-blue text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-nvidia-blue/80 transition-colors">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button onClick={() => setReportModal(null)} className="p-2 text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto print-content bg-white text-black rounded-b-2xl">
                <div className="hidden print:block mb-8 border-b pb-4">
                  <h1 className="text-3xl font-bold text-black">EduFocus AI</h1>
                  <p className="text-gray-600 capitalize">{reportModal.type} Report for {data.user.child_name}</p>
                  <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
                </div>
                <div className="prose max-w-none whitespace-pre-wrap text-black">
                  {reportModal.content}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
