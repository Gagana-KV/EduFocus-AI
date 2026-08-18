import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';


export default function Landing() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    const timer2 = setTimeout(() => {
      navigate('/login');
    }, 3000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  }, [navigate]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden bg-dark-bg">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex flex-col items-center justify-center absolute inset-0"
          >
            {/* Background Animated Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-nvidia-green/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-nvidia-blue/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none delay-1000"></div>

            {/* Hero Section */}
            <section className="relative flex flex-col items-center text-center z-10 w-full max-w-4xl px-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.8, type: 'spring' }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-nvidia-green/30 text-nvidia-green mb-12 shadow-[0_0_20px_rgba(118,185,0,0.2)]"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green"></span>
                </span>
                System Booting...
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white uppercase"
              >
                Welcome to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-nvidia-green to-nvidia-blue">EduFocus AI</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl md:text-2xl text-gray-400 max-w-3xl mb-16 font-light"
              >
                AI-Powered Classroom Focus Assistant
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex flex-col items-center justify-center gap-4"
              >
                {/* Loading Spinner */}
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-panel-border"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-nvidia-green border-t-transparent animate-spin"></div>
                </div>
                <span className="text-sm text-gray-500 uppercase tracking-widest font-medium mt-2 animate-pulse">Initializing Platform...</span>
              </motion.div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
