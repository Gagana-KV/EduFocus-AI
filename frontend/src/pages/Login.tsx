import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import api from '../api';

export default function Login() {
  const [username, setUsername] = useState('parent1');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username });
      localStorage.setItem('user', JSON.stringify(res.data));
      navigate(`/${res.data.role}`);
    } catch (err) {
      setError('Invalid username or role not found.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-2xl w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nvidia-green to-nvidia-blue flex items-center justify-center mb-4 shadow-lg shadow-nvidia-green/20">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to <span className="text-gradient">EduFocus AI</span></h2>
          <p className="text-gray-400 text-sm text-center">AI-powered classroom focus assistant</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Demo Account</label>
            <select 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-dark-bg border border-panel-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-nvidia-green transition-colors appearance-none"
            >
              <option value="parent1">Parent (Alice Johnson)</option>
              <option value="teacher1">Teacher (Mr. Smith)</option>
              <option value="student1">Student (Bobby Johnson)</option>
            </select>
          </div>
          
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-nvidia-green to-nvidia-green-dark hover:from-nvidia-green-light hover:to-nvidia-green text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-nvidia-green/20"
          >
            Access Dashboard
          </button>
        </form>
      </motion.div>
    </div>
  );
}
