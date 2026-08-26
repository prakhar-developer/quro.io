from qdrant_client import QdrantClient
from qdrant_client.http import models
from config import settings
from core.embeddings import embedding_service
from typing import List, Dict, Any, Optional
import uuid

class VectorStore:
    def __init__(self):
        url = settings.QDRANT_URL
        if "cloud.qdrant.io" in url and ":6333" not in url:
            url = f"{url.rstrip('/')}:6333"
        self.client = QdrantClient(
            url=url,
            api_key=settings.QDRANT_API_KEY,
            timeout=300
        )
        try:
            self._ensure_collection()
        except Exception as err:
            import logging
            logging.getLogger("quro.vectorstore").warning(f"Qdrant connection warning: {err}")

    def _ensure_collection(self):
        collections = self.client.get_collections().collections
        exists = any(c.name == settings.VECTOR_COLLECTION for c in collections)
        
        if not exists:
            self.client.create_collection(
                collection_name=settings.VECTOR_COLLECTION,
                vectors_config=models.VectorParams(
                    size=embedding_service.vector_size,
                    distance=models.Distance.COSINE
                )
            )
            
        # Ensure session_id index exists (crucial for filtering)
        self.client.create_payload_index(
            collection_name=settings.VECTOR_COLLECTION,
            field_name="session_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )

    def upsert_chunks(self, chunks: List[Dict[str, Any]], session_id: str):
        """
        chunks: List of dicts with 'text', 'metadata' (page_number, etc.)
        """
        points = []
        texts = [c['text'] for c in chunks]
        embeddings = embedding_service.embed_documents(texts)
        
        for idx, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            points.append(models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "text": chunk['text'],
                    "session_id": session_id,
                    **chunk.get('metadata', {})
                }
            ))
            
        # Batch upsert to prevent timeouts on large documents
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.client.upsert(
                collection_name=settings.VECTOR_COLLECTION,
                points=batch
            )

    def search(self, query: str, session_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        query_vector = embedding_service.embed_text(query)
        
        search_result = self.client.search(
            collection_name=settings.VECTOR_COLLECTION,
            query_vector=query_vector,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="session_id",
                        match=models.MatchValue(value=session_id)
                    )
                ]
            ),
            limit=limit
        )
        
        return [
            {
                "text": hit.payload["text"],
                "score": hit.score,
                "metadata": {k: v for k, v in hit.payload.items() if k not in ["text", "session_id"]}
            }
            for hit in search_result
        ]

# Singleton instance
vector_store = VectorStore()
