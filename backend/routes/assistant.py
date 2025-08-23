# assistant.py
from fastapi import APIRouter, UploadFile, File, Form
from utils.pdf_parser import extract_text_from_pdf
from utils.qa_engine import get_document_chunks, get_most_relevant_chunk, answer_question_with_context, summarize_document
import tempfile

router = APIRouter()
  

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global assistant_chunks
    suffix = ".pdf" if file.filename.endswith(".pdf") else ".txt"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    if suffix == ".pdf":
        text = extract_text_from_pdf(temp_path)
    else:
        with open(temp_path, 'r', encoding='utf-8') as f:
            text = f.read()

    assistant_chunks = get_document_chunks(text)
    summary = summarize_document(text)
    return {"summary": summary}

@router.post("/ask")
async def ask_question(question: str = Form(...)):
    global assistant_chunks
    if not assistant_chunks:
        return {"answer": "Please upload a document before asking questions."}
    best_chunk = get_most_relevant_chunk(question)
    answer = answer_question_with_context(question, best_chunk)
    return {"answer": answer}
# from fastapi import APIRouter, UploadFile, File, Form, HTTPException
# from utils.pdf_parser import extract_text_from_pdf
# from utils.qa_engine import (
#     get_document_chunks,
#     get_most_relevant_chunk,
#     answer_question_with_context,
#     summarize_document
# )
# import tempfile

# router = APIRouter()

# # Temporary in-memory storage for user sessions (better: use DB or cache like Redis)
# user_sessions = {}

# @router.post("/upload")
# async def upload_file(file: UploadFile = File(...), user_id: str = Form(...)):
#     suffix = ".pdf" if file.filename.endswith(".pdf") else ".txt"

#     with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
#         temp.write(await file.read())
#         temp_path = temp.name

#     # Extract text
#     if suffix == ".pdf":
#         text = extract_text_from_pdf(temp_path)
#     else:
#         with open(temp_path, 'r', encoding='utf-8') as f:
#             text = f.read()

#     # Split + Summarize
#     chunks = get_document_chunks(text)
#     summary = summarize_document(text)

#     # Save in session
#     user_sessions[user_id] = chunks

#     return {"summary": summary, "message": "Document uploaded successfully!"}


# @router.post("/ask")
# async def ask_question(question: str = Form(...), user_id: str = Form(...)):
#     if user_id not in user_sessions:
#         raise HTTPException(status_code=400, detail="Please upload a document first.")

#     chunks = user_sessions[user_id]
#     best_chunk = get_most_relevant_chunk(question, chunks)
#     answer = answer_question_with_context(question, best_chunk)

#     return {"answer": answer}
