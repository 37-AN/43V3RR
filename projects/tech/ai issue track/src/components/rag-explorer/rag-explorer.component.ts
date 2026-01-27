import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagService, RagChunk } from '../../services/rag.service';

@Component({
  selector: 'app-rag-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col space-y-4">
      <!-- Header -->
      <div class="flex justify-between items-center">
         <div>
            <h2 class="text-xl font-bold text-white">RAG Knowledge Graph</h2>
            <p class="text-sm text-gray-400">Manage vector embeddings, filtering, and retrieval context.</p>
         </div>
         <div class="flex space-x-3 items-center">
            <!-- Ingest Button -->
             <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-1.5 flex items-center space-x-2 transition shadow-lg shadow-blue-900/20 group">
                <input type="file" multiple (change)="handleFileUpload($event)" class="hidden" accept=".txt,.md,.log,.json,.csv,.js,.ts,.html">
                @if (isIngesting()) {
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span class="text-xs font-bold text-white">Ingesting...</span>
                } @else {
                    <span class="text-lg leading-none text-white">+</span>
                    <span class="text-xs font-bold text-white">Ingest Knowledge</span>
                }
            </label>

            <!-- Hybrid Search Toggle -->
            <div class="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-700">
                <span class="text-xs font-bold text-gray-400 uppercase">Hybrid Search</span>
                <button 
                    (click)="toggleHybrid()"
                    class="w-8 h-4 rounded-full relative transition-colors duration-200 focus:outline-none"
                    [class.bg-blue-600]="ragService.isHybrid()"
                    [class.bg-gray-600]="!ragService.isHybrid()">
                    <div class="w-2 h-2 bg-white rounded-full absolute top-1 transition-all duration-200"
                         [class.left-5]="ragService.isHybrid()"
                         [class.left-1]="!ragService.isHybrid()">
                    </div>
                </button>
            </div>
            
            <div class="bg-gray-800 rounded flex items-center px-3 py-1.5 border border-gray-700">
                <span class="text-xs text-gray-400 mr-2">Collection:</span>
                <span class="text-sm text-white font-mono">ishtrak_ops_v2</span>
            </div>
         </div>
      </div>

      <div class="grid grid-cols-3 gap-4 flex-grow overflow-hidden">
        <!-- Chunk List & Filters -->
        <div class="glass-panel rounded-lg flex flex-col overflow-hidden col-span-1">
             <div class="p-3 border-b border-gray-700 bg-gray-800/50 space-y-3">
                <input type="text" placeholder="Search vector store..." class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600">
                
                <div class="flex space-x-2">
                    <select (change)="setTypeFilter($event)" class="w-1/2 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 focus:outline-none">
                        <option value="ALL">All Sources</option>
                        <option value="SOP">SOPs</option>
                        <option value="LOG">Logs</option>
                        <option value="KB">Knowledge Base</option>
                        <option value="POLICY">Policies</option>
                        <option value="INGESTED">Uploaded Files</option>
                    </select>
                    <div class="w-1/2 flex items-center space-x-2 px-1">
                        <span class="text-[10px] text-gray-500 uppercase">Min Score</span>
                        <input type="range" min="0" max="1" step="0.1" [value]="minScore()" (input)="setMinScore($event)" class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer">
                    </div>
                </div>
             </div>

             <div class="overflow-y-auto flex-grow p-2 space-y-2 custom-scrollbar">
                <div class="text-[10px] text-gray-500 uppercase px-1 pb-1 flex justify-between">
                    <span>{{ filteredChunks().length }} Results</span>
                    <span>Sort: {{ ragService.isHybrid() ? 'Effective Score' : 'Similarity' }}</span>
                </div>

                @for (chunk of filteredChunks(); track chunk.id) {
                    <div class="p-3 rounded bg-gray-800/30 border border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition group relative overflow-hidden">
                        <!-- Type Indicator Bar -->
                        <div class="absolute left-0 top-0 bottom-0 w-1"
                             [class.bg-blue-500]="chunk.type === 'SOP'"
                             [class.bg-yellow-500]="chunk.type === 'LOG'"
                             [class.bg-purple-500]="chunk.type === 'KB'"
                             [class.bg-green-500]="chunk.type === 'POLICY'"
                             [class.bg-white]="chunk.type === 'INGESTED'">
                        </div>

                        <div class="pl-2">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-xs font-bold text-gray-300">#{{chunk.id}}</span>
                                <div class="flex items-center space-x-1">
                                    <span class="text-[9px] px-1 py-0.5 rounded border border-gray-600 text-gray-400" title="User Rating">★ {{chunk.avgUserRating}}</span>
                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-gray-300 font-mono" title="Effective Score">{{chunk.effectiveScore.toFixed(2)}}</span>
                                </div>
                            </div>
                            <p class="text-sm text-gray-400 line-clamp-2 group-hover:text-gray-200 transition-colors">{{chunk.content}}</p>
                            <div class="mt-2 flex justify-between items-center">
                                <span class="text-[10px] text-gray-500 truncate max-w-[120px]">{{chunk.source}}</span>
                                <div class="flex items-center space-x-2">
                                    <span class="text-[9px] text-gray-500" title="Reliability Weight">Rel: {{chunk.sourceReliability}}</span>
                                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700/50">{{chunk.type}}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                }
                @if (filteredChunks().length === 0) {
                    <div class="text-center p-8 text-gray-600 text-xs italic">
                        No vectors match current filters.
                    </div>
                }
             </div>
        </div>

        <!-- Detail & Visualization View -->
        <div class="glass-panel rounded-lg col-span-2 p-6 flex flex-col relative overflow-hidden">
             <!-- Visual Background Decoration -->
             <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

             <h3 class="text-lg font-bold text-white mb-4">Vector Neighborhood Analysis</h3>
             
             <!-- Mock Visualization of Vector Space -->
             <div class="flex-grow bg-gray-900/50 rounded border border-gray-700 relative mb-4 flex items-center justify-center overflow-hidden">
                <div class="absolute inset-0 flex items-center justify-center">
                    <!-- Central Node -->
                    <div class="relative w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20 cursor-pointer hover:scale-110 transition">
                        <div class="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white bg-black/50 px-2 rounded backdrop-blur">Query Vector</div>
                    </div>
                    
                    <!-- Dynamic Surrounding Nodes based on Filter -->
                    @for (chunk of filteredChunks().slice(0, 5); track chunk.id; let i = $index) {
                         <div class="absolute w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition duration-300 z-10"
                              [style.top.%]="50 + (Math.sin(i * 1.5) * 30)"
                              [style.left.%]="50 + (Math.cos(i * 1.5) * 30)"
                              [class.bg-blue-500]="chunk.type === 'SOP'"
                              [class.bg-yellow-500]="chunk.type === 'LOG'"
                              [class.bg-purple-500]="chunk.type === 'KB'"
                              [class.bg-green-500]="chunk.type === 'POLICY'"
                              [class.bg-white]="chunk.type === 'INGESTED'"
                              [title]="chunk.id + ' (Score: ' + chunk.effectiveScore.toFixed(2) + ')'">
                         </div>
                         <!-- Connection Lines -->
                         <svg class="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <line x1="50%" y1="50%" 
                                  [attr.x2]="(50 + (Math.cos(i * 1.5) * 30)) + '%'" 
                                  [attr.y2]="(50 + (Math.sin(i * 1.5) * 30)) + '%'" 
                                  stroke="#4b5563" stroke-width="1" stroke-opacity="0.3" />
                         </svg>
                    }
                </div>
                <div class="absolute bottom-2 right-2 text-xs text-gray-500 font-mono flex flex-col items-end">
                    <span>PCA Projection (2D)</span>
                    <span *ngIf="ragService.isHybrid()" class="text-blue-400">Hybrid Rerank Active</span>
                </div>
             </div>

             <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Chunk Metadata</h4>
                    <div class="bg-black/20 rounded p-3 text-xs font-mono text-gray-300 space-y-1">
                        <div class="flex justify-between"><span>Dimensions:</span> <span class="text-white">4096</span></div>
                        <div class="flex justify-between"><span>Model:</span> <span class="text-white">nomic-embed-text-v1.5</span></div>
                        <div class="flex justify-between"><span>Indexed:</span> <span class="text-white">2023-10-24 14:02:00</span></div>
                        <div class="flex justify-between"><span>Strategy:</span> <span class="text-white">Recursive Character Split (512)</span></div>
                    </div>
                </div>
                 
                 <!-- Tuning Controls -->
                 <div>
                    <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Retrieval Tuning</h4>
                    <div class="bg-black/20 rounded p-3 text-xs font-mono text-gray-300 space-y-3">
                        <div class="flex justify-between items-center mb-1">
                            <span>Strategy:</span> 
                            <span [class.text-blue-400]="ragService.isHybrid()" [class.text-gray-400]="!ragService.isHybrid()">
                                {{ ragService.isHybrid() ? 'Hybrid' : 'Dense Only' }}
                            </span>
                        </div>
                        
                        <!-- Sliders -->
                        <div class="space-y-1" [class.opacity-50]="!ragService.isHybrid()" [class.pointer-events-none]="!ragService.isHybrid()">
                            <div class="flex justify-between"><span>Vector Sim</span> <span class="text-blue-400">{{ ragService.wVector().toFixed(2) }}</span></div>
                            <input type="range" min="0" max="1" step="0.05" [ngModel]="ragService.wVector()" (ngModelChange)="ragService.wVector.set($event)" class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer">
                        </div>

                        <div class="space-y-1" [class.opacity-50]="!ragService.isHybrid()" [class.pointer-events-none]="!ragService.isHybrid()">
                            <div class="flex justify-between"><span>Source Rel</span> <span class="text-yellow-400">{{ ragService.wReliability().toFixed(2) }}</span></div>
                            <input type="range" min="0" max="1" step="0.05" [ngModel]="ragService.wReliability()" (ngModelChange)="ragService.wReliability.set($event)" class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer">
                        </div>

                        <div class="space-y-1" [class.opacity-50]="!ragService.isHybrid()" [class.pointer-events-none]="!ragService.isHybrid()">
                            <div class="flex justify-between"><span>User Rating</span> <span class="text-green-400">{{ ragService.wRating().toFixed(2) }}</span></div>
                            <input type="range" min="0" max="1" step="0.05" [ngModel]="ragService.wRating()" (ngModelChange)="ragService.wRating.set($event)" class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer">
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  `
})
export class RagExplorerComponent {
    Math = Math; // Expose to template
    
    ragService = inject(RagService);
    
    // State
    selectedType = signal<string>('ALL');
    minScore = signal<number>(0.1); // Lowered default min score for visibility
    isIngesting = signal<boolean>(false);

    // Computed chunks now reflect weighted scores
    filteredChunks = computed(() => {
        const chunks = this.ragService.chunks();
        const type = this.selectedType();
        const min = this.minScore();
        const hybrid = this.ragService.isHybrid();
        
        // Weights
        const wV = this.ragService.wVector();
        const wRel = this.ragService.wReliability();
        const wRat = this.ragService.wRating();
        const total = wV + wRel + wRat || 1; 

        return chunks.filter(c => {
            const matchesType = type === 'ALL' || c.type === type;
            // Filter logic: In dense mode, check base score. In hybrid, we could check effective score, 
            // but usually base vector match is the first gate. 
            // Let's filter by baseVectorScore > 0.1 always to avoid total noise, 
            // and then use the minScore slider against the EFFECTIVE score for clearer visual filtering.
            
            // Calculate effective score early for filtering
            let score = c.baseVectorScore;
            if (hybrid) {
                 const normRating = c.avgUserRating / 5.0;
                 score = (c.baseVectorScore * (wV/total)) + 
                         (c.sourceReliability * (wRel/total)) + 
                         (normRating * (wRat/total));
            }
            
            // Use minScore against effective score to make the slider feel responsive to the current weights
            return matchesType && score >= min;
        }).map(c => {
             // Re-calc for mapping (optimization: could do in one pass but map/filter clean)
             let score = c.baseVectorScore;
             if (hybrid) {
                 const normRating = c.avgUserRating / 5.0;
                 score = (c.baseVectorScore * (wV/total)) + 
                         (c.sourceReliability * (wRel/total)) + 
                         (normRating * (wRat/total));
             }
             return { ...c, effectiveScore: score };
        }).sort((a, b) => b.effectiveScore - a.effectiveScore);
    });

    setTypeFilter(e: Event) {
        this.selectedType.set((e.target as HTMLSelectElement).value);
    }

    setMinScore(e: Event) {
        this.minScore.set(Number((e.target as HTMLInputElement).value));
    }

    toggleHybrid() {
        this.ragService.isHybrid.update(v => !v);
    }

    async handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        this.isIngesting.set(true);
        const files = Array.from(input.files);

        try {
            // Process files sequentially
            for (const file of files) {
                await this.ragService.ingestDocument(file);
            }
            // Auto-switch filter to show ingested files to confirm success
            this.selectedType.set('INGESTED');
            // Lower threshold to ensure they show up
            this.minScore.set(0.1); 
        } catch (err) {
            console.error('Ingestion failed', err);
            alert('Failed to ingest some files. Ensure they are text-readable (TXT, LOG, JSON, CSV, MD).');
        } finally {
            this.isIngesting.set(false);
            input.value = ''; // Reset
        }
    }
}