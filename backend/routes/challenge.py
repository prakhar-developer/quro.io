from fastapi import APIRouter, Form # type: ignore
from utils.qa_engine import generate_questions, evaluate_answer
from typing import List

router = APIRouter()
stored_questions = []
challenge_chunks = []  # renamed

@router.post("/generate-questions")
def generate_challenge_questions(document_text: str = Form(...)):
    global stored_questions, challenge_chunks
    challenge_chunks = document_text.split("\n\n")  # or reuse chunking
    stored_questions = generate_questions(document_text)
    return {"questions": stored_questions}

@router.post("/evaluate")
def evaluate_user_answers(answers: List[str] = Form(...)):
    global stored_questions, challenge_chunks
    feedback_list = []

    for user_answer, question in zip(answers, stored_questions):
        relevant_chunk = next((chunk for chunk in challenge_chunks if question.split()[0] in chunk), challenge_chunks[0])
        feedback = evaluate_answer(question, user_answer, relevant_chunk)
        feedback_list.append({
            "question": question,
            "your_answer": user_answer,
            "feedback": feedback
        })

    return {"evaluations": feedback_list}
