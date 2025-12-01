import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  BarChart3,
  Users,
  FileText,
  Play,
  Filter,
  Zap,
  CheckCircle,
  Upload,
  Settings,
  TrendingUp,
  Shield,
  Sparkles,
} from "lucide-react";

export const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);

  // Removed scroll-based transforms for better performance

  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });
  const aboutInView = useInView(aboutRef, { once: true, amount: 0.2 });
  const creditsInView = useInView(creditsRef, { once: true, amount: 0.3 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Upload,
      title: "Data Ingestion",
      description: "Seamlessly upload and parse JSON submission files. All data is persisted in Firebase for reliability and scalability.",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Users,
      title: "AI Judge Management",
      description: "Create, edit, and manage AI judges with custom system prompts. Configure models from OpenAI, Gemini, Groq, and more.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Settings,
      title: "Judge Assignment",
      description: "Intuitively assign multiple judges to specific questions within queues. Flexible configuration for comprehensive evaluation.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Play,
      title: "Automated Evaluation",
      description: "Run AI judges across all submissions with real-time progress tracking. Handles errors gracefully with detailed summaries.",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Filter,
      title: "Advanced Filtering",
      description: "Filter results by judge, question, or verdict. Multi-select filters for powerful data exploration and analysis.",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Beautiful animated charts showing pass rates, trends, and performance metrics. Real-time insights at your fingertips.",
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 via-white to-orange-50/20">
      {/* Hero Section */}
      <motion.div
        ref={heroRef}
        className="relative min-h-screen flex items-start justify-center overflow-hidden pt-16 sm:pt-20"
      >
        {/* Background with Grid Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Static gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50" />
          
          {/* Grid Pattern - CSS only for better performance */}
          <div 
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #f97316 1px, transparent 1px),
                linear-gradient(to bottom, #f97316 1px, transparent 1px)
              `,
              backgroundSize: '4rem 4rem',
            }}
          />
          
          {/* Animated orbs - optimized */}
          <motion.div
            className="absolute top-20 left-10 w-96 h-96 bg-orange-200 rounded-full blur-[100px] opacity-20"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ willChange: "transform" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-orange-300 rounded-full blur-[120px] opacity-15"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ willChange: "transform" }}
          />
        </div>

        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-8 sm:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Brand Logo - Smaller and more subtle */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <img 
                src="/logos/verdict-high-resolution-logo-transparent.png" 
                alt="Verdict Logo" 
                className="h-10 sm:h-12 lg:h-14 w-auto mx-auto opacity-90"
              />
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="block">
                Automate <span className="text-orange-600">Evaluation</span>
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl mt-2 text-slate-700">
                with AI Judges
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg sm:text-xl lg:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Build, configure, and deploy AI judges to automatically evaluate student submissions
              with precision, scale, and real-time analytics
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Link
                to="/dashboard"
                className="px-10 py-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-3"
              >
                <BarChart3 size={22} />
                Get Started
                <span>→</span>
              </Link>
              <Link
                to="/judges"
                className="px-10 py-5 bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-300 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Explore Features
              </Link>
            </motion.div>

            {/* Stats Preview */}
            <motion.div
              className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-8 mb-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {[
                { label: "AI Models", value: "8+" },
                { label: "Real-time", value: "100%" },
                { label: "Secure", value: "Firebase" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 border border-orange-100 shadow-md"
                >
                  <div className="text-3xl font-bold text-orange-600 mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">Scroll to explore</span>
              <div className="w-6 h-10 border-2 border-orange-400 rounded-full flex justify-center">
                <motion.div
                  className="w-1.5 h-3 bg-orange-500 rounded-full mt-2"
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.section
        ref={featuresRef}
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to build and manage AI-powered evaluation systems
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-slate-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                    <Icon className="text-white" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        className="py-20 bg-gradient-to-r from-orange-500 to-orange-600 text-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "AI Models", value: "8+", icon: Zap },
              { label: "Evaluation Types", value: "3", icon: CheckCircle },
              { label: "Real-time Updates", value: "100%", icon: TrendingUp },
              { label: "Secure & Reliable", value: "Firebase", icon: Shield },
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Icon className="mx-auto mb-4" size={40} />
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-orange-100">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* About Section */}
      <motion.section
        ref={aboutRef}
        initial="hidden"
        animate={aboutInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 px-4 sm:px-6 lg:px-8 bg-white"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Built for Scale
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              This platform demonstrates a complete AI evaluation system built with modern
              technologies and best practices. From data ingestion to real-time analytics,
              every feature is designed for production use.
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12"
          >
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Technology Stack</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• React 18 + TypeScript</li>
                <li>• Firebase (Firestore, Functions, Hosting)</li>
                <li>• Recharts for Analytics</li>
                <li>• Framer Motion for Animations</li>
                <li>• Tailwind CSS for Styling</li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Key Capabilities</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• Multi-LLM Provider Support</li>
                <li>• Real-time Data Synchronization</li>
                <li>• Advanced Filtering & Search</li>
                <li>• Animated Analytics Dashboard</li>
                <li>• Responsive Design</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Credits Section */}
      <motion.section
        ref={creditsRef}
        initial="hidden"
        animate={creditsInView ? "visible" : "hidden"}
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50 to-orange-100"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={creditsInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-12 shadow-2xl border-2 border-orange-200"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={creditsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-6">
                <Sparkles className="text-white" size={40} />
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
                Made by <span className="text-orange-600">Mitansh Patel</span>
              </h2>
              <p className="text-2xl text-slate-700 mb-2 font-semibold">
                for Besimple AI Coding Assignment
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={creditsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="mt-8 pt-8 border-t border-orange-200"
            >
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                This project was developed as part of the Besimple AI coding challenge,
                demonstrating proficiency in full-stack development, AI integration, and
                modern web application architecture.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
                <span className="px-4 py-2 bg-orange-50 rounded-full">React + TypeScript</span>
                <span className="px-4 py-2 bg-orange-50 rounded-full">Firebase Integration</span>
                <span className="px-4 py-2 bg-orange-50 rounded-full">LLM API Integration</span>
                <span className="px-4 py-2 bg-orange-50 rounded-full">Real-time Analytics</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={creditsInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                <BarChart3 size={20} />
                Explore the Application
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <img 
            src="/logos/verdict-high-resolution-logo-transparent.png" 
            alt="Verdict Logo" 
            className="h-12 w-auto mx-auto mb-4 opacity-90"
          />
          <p className="text-slate-400 mb-4">
            AI Judge Evaluation Platform
          </p>
          <p className="text-slate-500 text-sm">
            © 2024 Mitansh Patel. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

