import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

type UploadResponse = { summary: string };

export const uploadFileToBackend = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(`${API_BASE}/assistant/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.summary;
};

export const generateChallengeQuestions = async (text: string) => {
  const formData = new FormData();
  formData.append('document_text', text);

  type GenerateQuestionsResponse = { questions: string[] };
  const response = await axios.post<GenerateQuestionsResponse>(`${API_BASE}/challenge/generate-questions`, formData);
  return response.data.questions;
};
