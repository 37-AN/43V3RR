import { Injectable, inject } from '@angular/core';
import { LlmService } from './llm.service';
import { DatabaseService, Issue } from './database.service';
import { RagService } from './rag.service';

@Injectable({
  providedIn: 'root'
})
export class IssueAiService {
  llm = inject(LlmService);
  db = inject(DatabaseService);
  rag = inject(RagService);

  async proposeResolution(issue: Issue): Promise<string> {
    // 1. Retrieve Dynamic Context via RAG Service
    // This now applies the weighting logic based on ratings and reliability
    const query = `Issue: ${issue.title} System: ${issue.system} Category: ${issue.category}`;
    const dynamicContext = this.rag.retrieveContext(query);

    // 2. Construct Prompt
    const systemPrompt = `You are a Senior IT Operations AI running on local infrastructure. 
    Analyze the issue, provided context, and any attached images.
    
    RAG CONTEXT INSTRUCTION:
    The context provided below has been re-ranked based on user feedback and source reliability. 
    Pay higher attention to sources with high 'User Rating' and 'Reliability' scores.
    
    If images are provided, you MUST analyze them for error codes, stack traces, or status indicators to support your diagnosis.
    
    Output a structured resolution plan in Markdown.
    
    Structure your response as follows:
    1. **Root Cause Category**: Choose exactly one from [Configuration, Code Defect, Infrastructure, User Error, External Dependency, Security Incident].
    2. **Confidence Score**: Provide a value between 0.0 and 1.0 (e.g., 0.95) based on the relevance of the RAG context and the clarity of the symptoms.
    3. **Analysis**: Brief explanation of the root cause and why the category was chosen.
    4. **Resolution Plan**: Concise, step-by-step technical instructions.
    
    Be concise, technical, and actionable.
    Do NOT hallucinate credentials or specific IP addresses unless provided.`;

    const userPrompt = `
    ISSUE: ${issue.title}
    DESCRIPTION: ${issue.description}
    SYSTEM: ${issue.system}
    CATEGORY: ${issue.category}
    ATTACHMENTS: ${issue.images && issue.images.length > 0 ? issue.images.length + ' image(s) attached. Analyze these visual inputs carefully for diagnostic clues.' : 'No images provided.'}

    RELEVANT KNOWLEDGE BASE (RAG):
    ${dynamicContext}

    Please provide a Root Cause Analysis and a Step-by-Step Resolution.`;

    // 3. Inference
    const response = await this.llm.generateSimulation(userPrompt, systemPrompt, 'text/plain', issue.images || []);
    
    // Attempt to extract confidence score using regex from the generated text
    let confidence = 0.89; // Fallback
    const scoreMatch = response.match(/Confidence Score\**[:\s]*([0-1]\.?[0-9]*)/i);
    if (scoreMatch && scoreMatch[1]) {
        const parsed = parseFloat(scoreMatch[1]);
        if (!isNaN(parsed)) confidence = parsed;
    }

    // 4. Save to DB
    this.db.addResolution({
      id: crypto.randomUUID(),
      issue_id: issue.id,
      resolution_text: response,
      confidence: confidence, 
      model: 'llama3.1:8b',
      generated_at: Date.now()
    });

    return response;
  }

  async generateSOP(issue: Issue, resolutionText: string): Promise<string> {
    const systemPrompt = `You are a Technical Writer AI. 
    Generate a formal Standard Operating Procedure (SOP) based on the provided context.
    If a resolution is provided, format it into the SOP.
    If only the issue description is provided, generate a recommended standard procedure for resolving such an issue.
    Structure: Title, Purpose, Scope, Preconditions, Procedure (Steps), Validation, Rollback.
    Use Markdown.`;

    const userPrompt = `
    Task: Generate SOP for issue "${issue.title}".
    Context:
    ${resolutionText}
    `;

    const response = await this.llm.generateSimulation(userPrompt, systemPrompt, 'text/plain');

    this.db.addSop({
        id: crypto.randomUUID(),
        issue_id: issue.id,
        title: `SOP: ${issue.title}`,
        sop_content: response,
        generated_at: Date.now()
    });

    return response;
  }
}