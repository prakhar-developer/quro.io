import React, { useState } from 'react';
import { Brain, ChevronRight, Check, X, Trophy } from 'lucide-react';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface ChallengeQuestionsProps {
  questions: Question[];
  isGenerating: boolean;
}

export default function ChallengeQuestions({ questions, isGenerating }: ChallengeQuestionsProps) {
  // Defensive filter for malformed questions
  const questionArray = Array.isArray(questions)
    ? questions.filter(
        q =>
          typeof q.question === 'string' &&
          Array.isArray(q.options) &&
          q.options.length > 1 &&
          typeof q.correctAnswer === 'number'
      )
    : [];

  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);

  // Defensive check to prevent white screen
  if (!Array.isArray(questionArray) || questionArray.length === 0) {
    return (
      <div className="bg-gray-900/40 rounded-2xl p-8 border border-gray-800/50 shadow-xl text-center text-gray-400">
        No challenge questions available. Try uploading a different document or regenerating questions.
      </div>
    );
  }

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmit = () => {
    if (Object.keys(selectedAnswers).length === questionArray.length) {
      setShowResults(true);
    }
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const calculateScore = () => {
    return questionArray.reduce((score, question) => {
      return score + (selectedAnswers[question.id] === question.correctAnswer ? 1 : 0);
    }, 0);
  };

  const getScoreColor = () => {
    const score = calculateScore();
    const percentage = (score / questionArray.length) * 100;
    if (percentage >= 80) return 'from-green-500 to-emerald-600';
    if (percentage >= 60) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/50 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/25">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Neural Challenge</h3>
            <p className="text-gray-400">Test your understanding</p>
          </div>
        </div>
        
        {showResults && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className={`text-lg font-bold bg-gradient-to-r ${getScoreColor()} bg-clip-text text-transparent`}>
                {calculateScore()}/{questionArray.length}
              </span>
            </div>
            <button
              onClick={resetQuiz}
              className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Retry Challenge
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        {questionArray.map((q) => (
          <div key={q.id} className="mb-8 p-4 rounded-xl bg-gray-900/60 border border-gray-800/50 shadow">
            <div className="font-semibold text-white mb-2 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-cyan-400" />
              {q.question}
            </div>
            <div className="space-y-2">
              {q.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(q.id, idx)}
                  disabled={showResults}
                  className={`block w-full text-left px-4 py-2 rounded-lg border transition-all duration-200
                    ${selectedAnswers[q.id] === idx
                      ? (idx === q.correctAnswer && showResults
                          ? 'bg-green-600/80 border-green-400 text-white'
                          : 'bg-purple-600/80 border-purple-400 text-white')
                      : 'bg-gray-800/70 border-gray-700 text-gray-200 hover:bg-cyan-700/40'}
                    ${showResults && idx === q.correctAnswer ? 'ring-2 ring-green-400' : ''}
                  `}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                  {showResults && idx === q.correctAnswer && (
                    <Check className="inline ml-2 w-4 h-4 text-green-300" />
                  )}
                  {showResults && selectedAnswers[q.id] === idx && idx !== q.correctAnswer && (
                    <X className="inline ml-2 w-4 h-4 text-red-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {!showResults && Object.keys(selectedAnswers).length === questionArray.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 flex items-center space-x-3 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
          >
            <span>Submit Challenge</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}