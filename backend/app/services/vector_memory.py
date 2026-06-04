import os
import re
from typing import List, Dict, Any
from app.services.llm import llm_service

class VectorMemoryService:
    def __init__(self):
        self.use_chroma = False
        self.mock_db = {}  # Fallback memory: project_id -> list of chunks
        
        try:
            import chromadb
            from app.config import settings
            os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_DIR)
            self.use_chroma = True
        except Exception:
            self.use_chroma = False

    def add_project_files(self, project_id: str, files: Dict[str, str]):
        """
        Chunks and indexes project files.
        files: Dict mapping relative_path -> file_content
        """
        chunks = []
        for path, content in files.items():
            # Basic chunking: split by function or every ~1000 characters
            file_chunks = self._chunk_text(content, max_chars=1000)
            for idx, chunk in enumerate(file_chunks):
                chunks.append({
                    "id": f"{project_id}_{path.replace('/', '_')}_{idx}",
                    "text": chunk,
                    "metadata": {
                        "project_id": project_id,
                        "file_path": path,
                        "chunk_index": idx
                    }
                })

        # Save to mock db as fallback
        self.mock_db[project_id] = chunks

        if self.use_chroma:
            try:
                # Generate embeddings using LLM Service
                embeddings = []
                for c in chunks:
                    try:
                        vector = llm_service.generate_embeddings(c["text"])
                        embeddings.append(vector)
                    except Exception:
                        # If embedding generation fails, abort Chroma indexing and use fallback
                        raise RuntimeError("Embedding generation failed.")

                # Get or create collection
                collection = self.chroma_client.get_or_create_collection(
                    name=f"project_rag_{project_id}"
                )
                
                # Delete existing documents to prevent duplication
                try:
                    collection.delete(where={"project_id": project_id})
                except Exception:
                    pass

                ids = [c["id"] for c in chunks]
                texts = [c["text"] for c in chunks]
                metadatas = [c["metadata"] for c in chunks]

                if ids:
                    collection.add(
                        documents=texts,
                        embeddings=embeddings,
                        metadatas=metadatas,
                        ids=ids
                    )
                return
            except Exception:
                # Fall back to mock DB search if Chroma or embedding calls fail
                pass

    def query_project(self, project_id: str, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Queries indexed project files for relevant chunks.
        """
        if self.use_chroma:
            try:
                # Try getting the collection
                collection = self.chroma_client.get_collection(
                    name=f"project_rag_{project_id}"
                )
                
                # Generate query vector
                query_vector = llm_service.generate_embeddings(query)
                
                results = collection.query(
                    query_embeddings=[query_vector],
                    n_results=limit
                )
                
                output = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0]
                    for d, m in zip(docs, metas):
                        output.append({
                            "text": d,
                            "file_path": m.get("file_path", "unknown"),
                            "score": 0.8  # Default relevance score for matching
                        })
                if output:
                    return output
            except Exception:
                # Fall through to mock DB match
                pass

        # Fallback keyword matching implementation
        project_chunks = self.mock_db.get(project_id, [])
        query_words = set(re.findall(r'\w+', query.lower()))
        
        scored_chunks = []
        for chunk in project_chunks:
            chunk_text = chunk["text"].lower()
            # Simple keyword overlap scoring
            score = sum(1 for word in query_words if word in chunk_text)
            if score > 0:
                scored_chunks.append((score, chunk))
        
        # Sort by score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        output = []
        for score, chunk in scored_chunks[:limit]:
            output.append({
                "text": chunk["text"],
                "file_path": chunk["metadata"]["file_path"],
                "score": round(score / max(len(query_words), 1), 2)
            })
            
        # If no matches, return first few chunks of project
        if not output and project_chunks:
            for chunk in project_chunks[:limit]:
                output.append({
                    "text": chunk["text"],
                    "file_path": chunk["metadata"]["file_path"],
                    "score": 0.0
                })
        return output

    def _chunk_text(self, text: str, max_chars: int = 1000) -> List[str]:
        if len(text) <= max_chars:
            return [text]
            
        lines = text.split("\n")
        chunks = []
        current_chunk = []
        current_len = 0
        
        for line in lines:
            if current_len + len(line) + 1 > max_chars:
                chunks.append("\n".join(current_chunk))
                current_chunk = [line]
                current_len = len(line)
            else:
                current_chunk.append(line)
                current_len += len(line) + 1
                
        if current_chunk:
            chunks.append("\n".join(current_chunk))
            
        return chunks

vector_memory = VectorMemoryService()
