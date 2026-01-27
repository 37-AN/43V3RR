import { Injectable, signal, computed } from '@angular/core';

export interface RagChunk {
    id: string;
    content: string;
    source: string;
    type: 'SOP' | 'LOG' | 'KB' | 'POLICY' | 'INGESTED';
    dimensions: number;
    ingested: string;
    
    // Scoring Metadata
    baseVectorScore: number;   // 0.0 - 1.0 (Cosine Similarity)
    avgUserRating: number;     // 1.0 - 5.0 (Historical usefulness)
    sourceReliability: number; // 0.0 - 1.0 (Static weight based on source type)
}

@Injectable({
  providedIn: 'root'
})
export class RagService {
    // Mock Vector Store with rich metadata
    // In a real app, this would be populated from a Vector DB (Chroma/Weaviate)
    private _chunks = signal<RagChunk[]>([
        { 
            id: 'vec_892', 
            content: 'To reset the printer spooler on Windows Server 2019, stop the spooler service using "net stop spooler" and then delete files in System32\\spool\\PRINTERS.', 
            source: 'SOP-Win-042', 
            type: 'SOP', 
            dimensions: 4096, 
            ingested: '2023-11-12',
            baseVectorScore: 0.92,
            avgUserRating: 4.8,
            sourceReliability: 1.0 // SOPs are trusted
        },
        { 
            id: 'vec_104', 
            content: 'Network latency on the 3rd floor is often caused by the legacy switch on rack 4. Check uplink saturation.', 
            source: 'Incident-Log-2023', 
            type: 'LOG', 
            dimensions: 4096, 
            ingested: '2024-01-15',
            baseVectorScore: 0.88,
            avgUserRating: 2.5, // Low rating: Users found this log misleading previously
            sourceReliability: 0.6 // Logs are noisy
        },
        { 
            id: 'vec_331', 
            content: 'For VPN connectivity issues, ensure the user has the correct certificate installed in the Personal store.', 
            source: 'KB-VPN-001', 
            type: 'KB', 
            dimensions: 4096, 
            ingested: '2023-09-30',
            baseVectorScore: 0.76,
            avgUserRating: 4.2,
            sourceReliability: 0.8
        },
        { 
            id: 'vec_002', 
            content: 'Password policies require 12 characters minimum. Reset via ADUC or Azure AD portal.', 
            source: 'Policy-Sec-01', 
            type: 'POLICY', 
            dimensions: 4096, 
            ingested: '2023-08-22',
            baseVectorScore: 0.65,
            avgUserRating: 5.0,
            sourceReliability: 1.0
        },
        { 
            id: 'vec_551', 
            content: 'Error 503 Service Unavailable often correlates with high memory usage on the app pool. Recycle app pool to fix temporarily.', 
            source: 'KB-IIS-99', 
            type: 'KB', 
            dimensions: 4096, 
            ingested: '2024-02-10',
            baseVectorScore: 0.72,
            avgUserRating: 3.5,
            sourceReliability: 0.7
        }
    ]);

    chunks = this._chunks.asReadonly();

    // Tuning Weights (Signals for dynamic adjustment)
    // Default config prioritizing vector similarity, but respecting ratings
    wVector = signal(0.45);
    wReliability = signal(0.25);
    wRating = signal(0.30);
    isHybrid = signal(true);

    /**
     * Ingests a raw file, chunks it, simulates embeddings, and adds to vector store.
     */
    async ingestDocument(file: File): Promise<void> {
        const text = await file.text();
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Simple Chunking Strategy: Split by double newline (paragraphs) or code blocks
        // In production, use LangChain RecursiveCharacterTextSplitter
        const rawChunks = text.split(/\n\s*\n/);
        
        const newRagChunks: RagChunk[] = rawChunks
            .filter(c => c.trim().length > 20) // Filter too short noise
            .map(content => {
                // Determine reliability based on file extension
                let reliability = 0.5;
                let type: RagChunk['type'] = 'INGESTED';
                
                if (file.name.endsWith('.log')) {
                    type = 'LOG';
                    reliability = 0.8; // Raw logs are facts
                } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                    type = 'KB';
                    reliability = 0.7;
                } else if (file.name.includes('policy') || file.name.includes('sop')) {
                    type = 'POLICY';
                    reliability = 0.9;
                }

                return {
                    id: `vec_${Math.floor(Math.random() * 10000)}`,
                    content: content.trim().substring(0, 500), // Limit char count for demo
                    source: file.name,
                    type: type,
                    dimensions: 4096,
                    ingested: timestamp,
                    // Simulate a high vector score so user sees it "working" immediately in a demo
                    baseVectorScore: 0.75 + (Math.random() * 0.2), 
                    avgUserRating: 3.0, // Neutral starting rating
                    sourceReliability: reliability
                };
            });

        this._chunks.update(prev => [...newRagChunks, ...prev]);
    }

    /**
     * Retrieves context with dynamic re-ranking.
     * Formula: FinalScore = (Vector * w1) + (Reliability * w2) + (Rating * w3)
     */
    retrieveContext(query: string): string {
        let wV = this.wVector();
        let wRel = this.wReliability();
        let wRat = this.wRating();
        const q = query.toLowerCase();

        // If Hybrid is disabled, rely purely on Vector Score
        if (!this.isHybrid()) {
            wV = 1.0;
            wRel = 0.0;
            wRat = 0.0;
        } else {
            // Adaptive Logic: Adjust weights based on User Intent
            
            // Scenario A: Authority/Compliance -> Boost Reliability
            if (q.includes('sop') || q.includes('policy') || q.includes('standard') || q.includes('compliance')) {
                const boost = 0.25;
                wRel += boost;
                wV = Math.max(0.1, wV - (boost / 2));
                wRat = Math.max(0.1, wRat - (boost / 2));
            } 
            // Scenario B: Troubleshooting/Best Practice -> Boost User Rating
            else if (q.includes('fix') || q.includes('solution') || q.includes('resolved') || q.includes('recommend')) {
                const boost = 0.20;
                wRat += boost;
                wV = Math.max(0.1, wV - (boost / 2));
                wRel = Math.max(0.1, wRel - (boost / 2));
            }
            // Scenario C: Error Trace/Logs -> Boost Vector Similarity
            else if (q.includes('error') || q.includes('exception') || q.includes('stack') || q.includes('log')) {
                const boost = 0.20;
                wV += boost;
                wRel = Math.max(0.1, wRel - (boost / 2));
                wRat = Math.max(0.1, wRat - (boost / 2));
            }
        }

        // Normalize weights to ensure they sum to ~1.0
        const total = wV + wRel + wRat || 1;
        wV = wV / total;
        wRel = wRel / total;
        wRat = wRat / total;

        // 1. Get Candidates (Mock Search)
        // In a real app, this would be the initial top-k from vector DB
        const candidates = this._chunks();

        // 2. Re-rank based on adaptive weights
        const ranked = candidates.map(chunk => {
            // Normalize rating (1-5 -> 0.2-1.0)
            const normRating = chunk.avgUserRating / 5.0;
            
            const finalScore = (chunk.baseVectorScore * wV) + 
                               (chunk.sourceReliability * wRel) + 
                               (normRating * wRat);
            
            return { chunk, finalScore };
        }).sort((a, b) => b.finalScore - a.finalScore);

        // 3. Select Top K (e.g., Top 3)
        const topK = ranked.slice(0, 3);
        
        // 4. Format for LLM Injection
        const formattedContext = topK.map(item => {
            const c = item.chunk;
            return `[ID: ${c.id}] [Type: ${c.type}] [Relevance: ${item.finalScore.toFixed(2)}] [Rel: ${c.sourceReliability}] [Rating: ${c.avgUserRating}/5]
Source: ${c.source}
Content: "${c.content}"`;
        }).join('\n\n');

        return formattedContext;
    }

    // Method to simulate updating rating loop from feedback
    updateChunkRating(chunkId: string, newRating: number) {
        this._chunks.update(prev => prev.map(c => {
            if (c.id === chunkId) {
                // Simple moving average to smooth out ratings
                const updatedRating = (c.avgUserRating * 10 + newRating) / 11;
                return { ...c, avgUserRating: Number(updatedRating.toFixed(1)) };
            }
            return c;
        }));
    }
}