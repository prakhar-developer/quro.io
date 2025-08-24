import { generateChallengeQuestions } from './api'; 
import { useState } from 'react';
import { Bot, Sparkles, Brain, FileText } from 'lucide-react';
import FileUpload from './components/FileUpload';
import SummaryDisplay from './components/SummaryDisplay';
import ChallengeQuestions from './components/ChallengeQuestions';
import type { Question } from './components/ChallengeQuestions';


function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'challenge'>('summary');

  const handleFileUpload = async (file: File, content: string) => {
    setUploadedFile(file);
    setFileContent(content);
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // ✅ Backend URL from env
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/api/assistant/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setSummary(data.summary || '⚠️ No summary returned.');
    } catch (err) {
      console.error('File upload failed:', err);
      setSummary('⚠️ Failed to summarize document.');
    }

    setIsProcessing(false);
  };


  const generateQuestions = async () => {
    if (!fileContent) return;

    setIsGeneratingQuestions(true);
    setActiveTab('challenge');

    try {
      const questionsFromAPI: unknown = await generateChallengeQuestions(fileContent);
      // Handle both array and { questions: [...] }
      if (
        questionsFromAPI &&
        typeof questionsFromAPI === 'object' &&
        'questions' in questionsFromAPI &&
        Array.isArray((questionsFromAPI as { questions: unknown }).questions)
      ) {
        setQuestions((questionsFromAPI as { questions: Question[] }).questions);
      } else if (Array.isArray(questionsFromAPI)) {
        setQuestions(questionsFromAPI as Question[]);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
      setQuestions([]);
    }

    setIsGeneratingQuestions(false);
  };

  const resetApp = () => {
    setUploadedFile(null);
    setFileContent('');
    setSummary('');
    setQuestions([]);
    setActiveTab('summary');
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="relative p-3 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105">
                <Bot className="w-8 h-8 text-white" />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl blur opacity-50 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Quro.io
                </h1>
                <p className="text-sm text-gray-400">Research Intelligence & Summarization Assistant</p>
              </div>
            </div>
            
            {uploadedFile && (
              <button
                onClick={resetApp}
                className="group px-6 py-3 bg-gray-900/50 hover:bg-gray-800/50 text-sm rounded-xl transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                <span className="group-hover:text-cyan-400 transition-colors">New Document</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!uploadedFile ? (
          <div className="text-center space-y-12">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative p-6 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-500 hover:scale-105 animate-float">
                  <Sparkles className="w-16 h-16 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                  Decode Research Instantly
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Transform your documents into interactive knowledge with AI-powered summaries, 
                  intelligent Q&A, and dynamic conversations.
                </p>
              </div>
            </div>
            
            <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
            
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-16">
              <div className="group bg-gray-900/30 backdrop-blur-sm p-8 rounded-2xl border border-gray-800/50 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-2">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-cyan-500/20 rounded-xl group-hover:bg-cyan-500/30 transition-colors">
                    <FileText className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Neural Summarization</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Advanced AI algorithms extract key insights and generate comprehensive summaries 
                  that capture the essence of your documents.
                </p>
              </div>
              
              <div className="group bg-gray-900/30 backdrop-blur-sm p-8 rounded-2xl border border-gray-800/50 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
                    <Brain className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Adaptive Learning</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Challenge your understanding with dynamically generated questions and engage 
                  in natural conversations about your content.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* File Info */}
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/50 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{uploadedFile.name}</h3>
                    <p className="text-gray-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • 
                      <span className="text-green-400 ml-1">Analysis Complete</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  <span className="text-green-400 text-sm font-medium">Ready</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-2 bg-gray-900/30 backdrop-blur-sm p-2 rounded-2xl border border-gray-800/50">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex-1 px-6 py-4 font-medium text-sm rounded-xl transition-all duration-300 ${
                  activeTab === 'summary'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                Summary & Chat
              </button>
              <button
                onClick={() => {
                  setActiveTab('challenge');
                  if (questions.length === 0 && !isGeneratingQuestions) {
                    generateQuestions();
                  }
                }}
                className={`flex-1 px-6 py-4 font-medium text-sm rounded-xl transition-all duration-300 ${
                  activeTab === 'challenge'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                Challenge Mode
              </button>
            </div>

            {/* Content */}
            {activeTab === 'summary' && (
              <SummaryDisplay
                summary={summary}
                fileName={uploadedFile.name}
                fileContent={fileContent}
                isGenerating={isProcessing}
              />
            )}

            {activeTab === 'challenge' && (
              <ChallengeQuestions
                questions={questions}
                isGenerating={isGeneratingQuestions}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;