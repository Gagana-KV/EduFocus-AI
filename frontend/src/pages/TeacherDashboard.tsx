import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, BookOpen, GraduationCap, FileText, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import BlockchainAuditPanel from '../components/BlockchainAuditPanel';
import ReportModal from '../components/ReportModal';
import type { ReportModalData } from '../components/ReportModal';

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [reportModal, setReportModal] = useState<ReportModalData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [messageModal, setMessageModal] = useState<{recipientId: number, name: string} | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // For demo purposes, we fetch the student's data using their ID (3) to show classroom analytics
    const fetchData = async () => {
      try {
        const res = await api.get(`/dashboard/3`);
        setData(res.data);
        
        const insightRes = await api.get(`/insights/3`);
        setInsight(insightRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [user?.id, navigate]);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      // Simulate generating a class report by fetching student 3's weekly report
      const res = await api.get(`/reports/weekly/3`);
      setReportModal({ 
        type: 'Weekly Classroom', 
        content: res.data.report,
        reportId: res.data.report_id,
        reportHash: res.data.report_hash,
        txHash: res.data.blockchain_tx_id,
        blockNumber: res.data.block_number,
        network: res.data.network,
        studentName: 'Grade 10 Class Analytics'
      });
    } catch (e: any) {
      console.error("Error generating report", e);
      const errMsg = e.response?.data?.detail || e.message || "Failed to generate report.";
      setReportModal({ type: 'Weekly Classroom', content: `Error generating report: ${errMsg}` });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messageModal) return;
    setSendingMsg(true);
    try {
      await api.post('/messages', {
        sender_id: user.id,
        recipient_id: 2, // Hardcoded Parent ID 2 for demo purposes
        content: messageText
      });
      setMessageModal(null);
      setMessageText('');
    } catch (e) {
      console.error("Failed to send message", e);
    } finally {
      setSendingMsg(false);
    }
  };

  const classTrendData = [
    { time: '9 AM', focus: 92 },
    { time: '10 AM', focus: 88 },
    { time: '11 AM', focus: 90 },
    { time: '12 PM', focus: 85 },
    { time: '1 PM', focus: 89 },
    { time: 'Now', focus: 88 },
  ];

  if (!data) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 hide-on-print">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Teacher Dashboard</h2>
          <p className="text-gray-400">Classroom Analytics for {user.name}</p>
        </div>
        <button onClick={handleGenerateReport} disabled={loadingReport} className="px-4 py-2 bg-nvidia-blue hover:bg-nvidia-blue/80 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <FileText className="w-4 h-4" /> {loadingReport ? 'Generating...' : 'Generate Weekly Class Report'}
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 hide-on-print">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-xl border-t-4 border-gray-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-300">Total Students</h3>
            <GraduationCap className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-white">28</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-xl border-t-4 border-green-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-300">Present Today</h3>
            <CheckCircle className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-white">26</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-xl border-t-4 border-nvidia-blue">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-300">Class Focus Avg</h3>
            <Users className="text-nvidia-blue" />
          </div>
          <div className="text-3xl font-bold text-white">88/100</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-xl border-t-4 border-yellow-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-300">Needs Support</h3>
            <AlertTriangle className="text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">3</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 hide-on-print mt-8">
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Subject-wise Focus</h3>
            <BookOpen className="text-nvidia-green" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Mathematics</span><span className="text-nvidia-green font-bold">92%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-nvidia-green h-2 rounded-full" style={{width: '92%'}}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Science</span><span className="text-nvidia-blue font-bold">85%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-nvidia-blue h-2 rounded-full" style={{width: '85%'}}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">History</span><span className="text-yellow-500 font-bold">78%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full" style={{width: '78%'}}></div></div>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">AI Classroom Summary</h3>
          <div className="p-4 bg-dark-bg border border-panel-border rounded-lg text-gray-300 leading-relaxed italic">
            "The classroom is performing exceptionally well in Mathematics today. However, there has been a noticeable 12% drop in focus during History. 3 students are currently showing high distraction levels. Recommended action: Incorporate a 5-minute interactive break in the next period."
          </div>
          
          <h3 className="text-xl font-bold mt-8 mb-4">Class Focus Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={classTrendData}>
                <XAxis dataKey="time" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2c2c2e' }} />
                <Line type="monotone" dataKey="focus" stroke="#76b900" strokeWidth={3} dot={{ fill: '#76b900', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 hide-on-print mt-8">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Students Needing Attention</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-panel-border text-gray-400">
                  <th className="py-3 px-4 font-medium">Student Profile</th>
                  <th className="py-3 px-4 font-medium">Risk Level</th>
                  <th className="py-3 px-4 font-medium">Focus</th>
                  <th className="py-3 px-4 font-medium">Recent App</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-panel-border/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-nvidia-blue/20 flex items-center justify-center text-nvidia-blue font-bold">
                      {data.user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{data.user.name}</div>
                      <div className="text-xs text-gray-400">ID: {data.user.id}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {insight ? (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${insight.risk_level === 'High' ? 'bg-red-500/20 text-red-500' : insight.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-nvidia-green/20 text-nvidia-green'}`}>
                        {insight.risk_level}
                      </span>
                    ) : <span className="text-xs text-gray-500">Loading...</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${data.current_focus_score > 80 ? 'bg-nvidia-green/20 text-nvidia-green' : 'bg-red-500/20 text-red-500'}`}>
                      {data.current_focus_score}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">{data.recent_events[0]?.app_name || 'None'}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => setMessageModal({recipientId: 2, name: data.user.name})} className="text-sm text-nvidia-blue hover:underline">Message Parent</button>
                  </td>
                </tr>
                {/* Dummy rows for visual fullness */}
                <tr className="border-b border-panel-border/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" alt="Charlie" className="w-10 h-10 rounded-full bg-gray-800" />
                    <div>
                      <div className="text-white font-medium">Charlie Davis</div>
                      <div className="text-xs text-gray-400">ID: 4</div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-500">Medium</span></td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-500">65</span></td>
                  <td className="py-3 px-4 text-sm text-gray-300">TikTok</td>
                  <td className="py-3 px-4"><button className="text-sm text-nvidia-blue hover:underline">Message Parent</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Distraction Leaderboard</h3>
          <div className="space-y-4">
            {[
              { name: "Bobby Johnson", apps: "Instagram, YouTube", drops: 25 },
              { name: "Sarah Connor", apps: "WhatsApp", drops: 15 },
              { name: "Mike Wheeler", apps: "Games", drops: 10 }
            ].map((student, i) => (
               <div key={i} className="flex justify-between items-center p-3 bg-dark-bg rounded-lg border border-panel-border">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-400">{i + 1}</div>
                   <div>
                     <span className="font-bold text-white block">{student.name}</span>
                     <span className="text-xs text-gray-500">{student.apps}</span>
                   </div>
                 </div>
                 <div className="text-red-400 font-bold">-{student.drops} pts</div>
               </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Global Recent Alerts Table */}
      <div className="glass-panel p-6 rounded-xl mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Global Class Alerts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-panel-border text-gray-400 text-sm">
                <th className="py-3 px-4 font-medium">Time</th>
                <th className="py-3 px-4 font-medium">Student</th>
                <th className="py-3 px-4 font-medium">App</th>
                <th className="py-3 px-4 font-medium">Duration (s)</th>
                <th className="py-3 px-4 font-medium">Focus Impact</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_events.length > 0 ? data.recent_events.map((ev: any, idx: number) => (
                <tr key={idx} className="border-b border-panel-border/50 hover:bg-white/5 transition-colors text-sm">
                  <td className="py-3 px-4 text-gray-300">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3 px-4 text-white font-medium">{data.user.name}</td>
                  <td className="py-3 px-4 text-gray-300">{ev.app_name}</td>
                  <td className="py-3 px-4 text-gray-300">{ev.duration}s</td>
                  <td className="py-3 px-4 text-red-400">-{ev.focus_score_drop}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No recent distractions in class.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blockchain Audit Trail & Integrity Ledger */}
      <div className="hide-on-print mt-8">
        <BlockchainAuditPanel 
          userId={user.id} 
          onViewReport={(rep) => setReportModal({
            type: rep.report_type,
            content: rep.content,
            reportId: rep.id,
            reportHash: rep.report_hash,
            txHash: rep.blockchain_tx_id,
            blockNumber: rep.block_number,
            network: rep.network,
            studentName: 'Classroom Overview'
          })} 
        />
      </div>

      {/* Report Modal */}
      <ReportModal data={reportModal} onClose={() => setReportModal(null)} />

      {/* Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-bg border border-panel-border rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-white">Message Parent of {messageModal.name}</h3>
            <textarea 
              value={messageText} 
              onChange={e => setMessageText(e.target.value)}
              className="w-full bg-panel-bg border border-panel-border rounded-lg p-3 text-white focus:outline-none focus:border-nvidia-green mb-4 h-32"
              placeholder="Type your message here..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setMessageModal(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSendMessage} disabled={sendingMsg || !messageText.trim()} className="px-4 py-2 bg-nvidia-blue hover:bg-nvidia-blue/80 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
                {sendingMsg ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
