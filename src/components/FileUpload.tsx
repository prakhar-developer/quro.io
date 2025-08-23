import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle, Zap } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File, content: string) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onFileUpload, isProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.txt')) {
      alert('Please upload a PDF, DOC, DOCX, or TXT file.');
      return;
    }

    setUploadedFile(file);
    
    let content = '';
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      content = await file.text();
    } else {
      content = `This is a sample document content from ${file.name}. In a production environment, this would be the actual extracted text from your PDF or DOC file. The document contains important information that can be summarized and used to generate relevant questions for testing your understanding.`;
    }
    
    onFileUpload(file, content);
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!uploadedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-500 group ${
            dragActive
              ? 'border-cyan-400 bg-cyan-500/10 shadow-2xl shadow-cyan-500/20 scale-105'
              : 'border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-900/20'
          } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="p-6 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl shadow-2xl shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-500 group-hover:scale-110">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                Drop Your Document Here
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                Drag and drop your file or click to browse
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>PDF</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>DOC</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>DOCX</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>TXT</span>
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Maximum file size: 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25">
                <File className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">
                  {uploadedFile.name}
                </h4>
                <p className="text-gray-400">
                  {(uploadedFile.size / 1024).toFixed(1)} KB • Ready for processing
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-medium">Uploaded</span>
              </div>
              <button
                onClick={removeFile}
                className="p-2 hover:bg-gray-800/50 rounded-xl transition-colors group"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}