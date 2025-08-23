from langchain.schema import Document
import google.generativeai as genai
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint, HuggingFaceEmbeddings
from langchain_core.output_parsers import StrOutputParser
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

import os
from dotenv import load_dotenv
import json
import re

# ---------------- ENV SETUP ----------------
load_dotenv()

# ---------------- GEMINI SETUP ----------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-1.5-flash-latest")

# ---------------- HUGGINGFACE ENDPOINT SETUP ----------------
llm = HuggingFaceEndpoint(
    repo_id="deepseek-ai/DeepSeek-V3",
    task="text-generation",
    max_new_tokens=512,
    huggingfacehub_api_token=os.getenv("HUGGINGFACEHUB_API_TOKEN")
)
model = ChatHuggingFace(llm=llm)

# ---------------- VECTOR STORE SETUP ----------------
vector_store = Chroma(
    embedding_function=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2"),
    collection_name="Features"
)

parser = StrOutputParser()

# ---------------- FUNCTIONS ----------------

def get_document_chunks(text, chunk_size=500):
    """Split large document into chunks and add to vector DB."""
    doc = Document(page_content=text)
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=50)
    chunks = splitter.split_documents([doc])
    vector_store.add_documents(chunks)
    return chunks


def get_most_relevant_chunk(question):
    """Fetch most relevant chunk for a given question."""
    relevant_docs = vector_store.similarity_search(question, k=1)
    return relevant_docs[0].page_content if relevant_docs else None


def answer_question_with_context(question, context):
    """Answer user question using retrieved context + reasoning."""
    prompt = f"""You are a smart and helpful AI assistant.

Given the context below, answer the question in a natural, free-form style. 
If the answer is not explicitly stated, use logical reasoning or inferred knowledge from the context.
Avoid saying "no information provided" unless it's truly impossible to infer.
Keep the answer short, clear, and directly related to the question.

Also explain briefly which part of the context helped you answer.

Context:
{context}

Question:
{question}

Answer (with explanation of supporting context):"""

    chain = model | parser
    response = chain.invoke(prompt)
    return response.strip() if isinstance(response, str) else response.text.strip()


def summarize_document(text):
    """Summarize a research paper into structured format."""
    prompt = f"""You are a smart AI research assistant.

TASK:
Summarize the following research paper. Focus on preserving key insights, methods, experiments, and results. 
Make sure to explain technical parts in simpler language while maintaining correctness.

CONSTRAINT:
Keep the summary around 300 words. Ensure no critical information is omitted. Provide matrix (if any).

FORMAT:
- Title
- Objective
- Methodology
- Results
- Conclusion.

{text[:2000]}"""
    chain = model | parser
    response = chain.invoke(prompt)
    return response.strip() if isinstance(response, str) else response.text.strip()


def generate_questions(document_text, num_questions=3):
    """Generate MCQs from document using Gemini."""
    prompt = f"""
Generate {num_questions} multiple-choice questions (MCQs) from the following document. 
Make the MCQs logical and reasoning-based.

For each question, provide:
- The question text.
- Four answer options (A, B, C, D).
- The index (0-based) of the correct answer.

Respond in this JSON format:
[
  {{
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctAnswer": 0
  }}
]

Document:
{document_text[:2000]}
"""
    response = gemini_model.generate_content(prompt)

    text = response.text.strip()
    # Remove code block markers if present
    if text.startswith("```") and text.endswith("```"):
        text = text.strip("`").strip()
    # Extract JSON array
    match = re.search(r'(\[\s*{.*}\s*\])', text, re.DOTALL)
    if match:
        text = match.group(1)

    try:
        questions = json.loads(text)
        # Add id field for frontend
        for idx, q in enumerate(questions):
            q["id"] = idx + 1
        return questions
    except Exception as e:
        print("Error parsing MCQ JSON:", e, text)
        return []


def evaluate_answer(question, user_answer, context):
    """Evaluate candidate answer with context using Gemini."""
    prompt = f"""You are an AI evaluator. Given the original question, user answer, and document context, provide a score (0-10) and feedback.

Question:
{question}

User Answer:
{user_answer}

Context:
{context}

Now evaluate the answer. Respond in the format:
Score: X/10
Feedback: <your explanation>
"""
    response = gemini_model.generate_content(prompt)
    return response.text.strip()
