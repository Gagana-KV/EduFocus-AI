import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Landing from './pages/Landing';
import AIAssistant from './components/AIAssistant';

function App() {
  const user = localStorage.getItem('user');

  return (
    <Router>
      <div className="min-h-screen bg-dark-bg text-white relative flex flex-col">
        {/* Simple Navbar */}
        <header className="px-8 py-4 border-b border-panel-border bg-panel-bg/50 backdrop-blur-md flex justify-between items-center z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-nvidia-green to-nvidia-blue flex items-center justify-center font-bold text-white">
              E
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">EduFocus <span className="text-nvidia-green">AI</span></h1>
          </div>
          <nav>
            {user && (
              <button className="text-sm text-gray-400 hover:text-white transition-colors" onClick={() => {
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}>Logout</button>
            )}
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow p-4 md:p-8 relative z-0">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/" element={<Landing />} />
          </Routes>
        </main>
        
        {/* Floating AI Assistant (Only shows if logged in) */}
        <AIAssistant />
      </div>
    </Router>
  );
}

export default App;
