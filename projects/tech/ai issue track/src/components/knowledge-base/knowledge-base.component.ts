import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService, AiSop } from '../../services/database.service';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col space-y-4">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-white">SOP Knowledge Base</h2>
                <p class="text-sm text-gray-400">Manage and Curate Standard Operating Procedures</p>
            </div>
             <div class="flex space-x-2">
                <span class="px-2 py-1 rounded bg-gray-800 text-xs text-gray-500 border border-gray-700 font-mono">Total SOPs: {{ db.sops().length }}</span>
             </div>
        </div>

        <div class="grid grid-cols-12 gap-4 flex-grow overflow-hidden">
            <!-- Sidebar list -->
            <div class="col-span-4 glass-panel rounded-lg flex flex-col overflow-hidden">
                <div class="p-3 border-b border-gray-700 bg-gray-800/50">
                    <input type="text" placeholder="Filter SOPs..." class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
                </div>
                <div class="overflow-y-auto flex-grow custom-scrollbar">
                     @for (sop of db.sops(); track sop.id) {
                         <div (click)="selectSop(sop)" 
                              class="p-4 border-b border-gray-700/50 cursor-pointer transition hover:bg-gray-700/30 group"
                              [class.bg-blue-900_20]="selectedSop()?.id === sop.id">
                              <div class="flex justify-between items-start">
                                <h4 class="text-sm font-bold text-gray-200 truncate pr-2 group-hover:text-blue-300 transition-colors">{{sop.title}}</h4>
                              </div>
                              <div class="flex justify-between mt-2 items-center">
                                  <span class="text-[10px] text-gray-500">{{sop.generated_at | date:'MMM d, y, h:mm a'}}</span>
                                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400 font-mono">{{sop.issue_id}}</span>
                              </div>
                         </div>
                     }
                     @if (db.sops().length === 0) {
                         <div class="p-8 text-center text-gray-500 text-xs">
                            <p>No SOPs generated yet.</p>
                            <p class="mt-1">Resolve issues in the Issue Tracker to generate new SOPs.</p>
                         </div>
                     }
                </div>
            </div>

            <!-- Main Content -->
            <div class="col-span-8 glass-panel rounded-lg flex flex-col overflow-hidden relative">
                @if (selectedSop(); as sop) {
                    <div class="p-4 border-b border-gray-700 bg-gray-800/30 flex justify-between items-center">
                         <div>
                            <h3 class="text-lg font-bold text-white">{{sop.title}}</h3>
                            <div class="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                <span>ID: {{sop.id}}</span>
                                <span>•</span>
                                <span>Source: {{sop.issue_id}}</span>
                            </div>
                         </div>
                         <div class="flex space-x-2">
                             @if (isEditing()) {
                                 <button (click)="saveSop()" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs font-bold transition shadow-lg shadow-green-900/20">Save Changes</button>
                                 <button (click)="cancelEdit()" class="px-3 py-1.5 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded text-xs font-bold transition">Cancel</button>
                             } @else {
                                 <button (click)="startEdit()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-bold transition shadow-lg shadow-blue-900/20">Edit Content</button>
                             }
                         </div>
                    </div>
                    
                    <div class="flex-grow p-6 overflow-y-auto custom-scrollbar bg-gray-900/50">
                        @if (isEditing()) {
                            <textarea [(ngModel)]="editContent" class="w-full h-full bg-gray-950 text-gray-300 font-mono text-sm p-4 rounded border border-gray-700 focus:outline-none focus:border-blue-500 resize-none leading-relaxed" spellcheck="false"></textarea>
                        } @else {
                            <div class="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-sans text-gray-300">
                                {{sop.sop_content}}
                            </div>

                            <!-- Rating & Feedback Section -->
                            <div class="mt-8 border-t border-gray-800 pt-6">
                                <h4 class="text-xs font-bold text-gray-400 uppercase mb-3">SOP Quality Feedback</h4>
                                
                                @if (!sop.user_rating) {
                                    <div class="bg-gray-800/50 p-4 rounded border border-gray-700">
                                        <div class="flex items-center justify-between mb-3">
                                            <span class="text-sm text-gray-300">Rate this SOP:</span>
                                            <div class="flex space-x-1">
                                                @for (star of [1,2,3,4,5]; track star) {
                                                    <button (click)="rateSop(sop, star)" class="text-gray-600 hover:text-yellow-400 transition text-2xl leading-none">★</button>
                                                }
                                            </div>
                                        </div>
                                        <input type="text" [(ngModel)]="feedbackText" placeholder="Optional: How can this SOP be improved?" 
                                               class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600">
                                    </div>
                                } @else {
                                    <div class="bg-gray-800/30 p-4 rounded border border-gray-700/50">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                 <div class="flex items-center space-x-2 mb-2">
                                                    <span class="text-yellow-400 text-lg tracking-widest">
                                                        {{ '★'.repeat(sop.user_rating) }}<span class="text-gray-700">{{ '★'.repeat(5 - sop.user_rating) }}</span>
                                                    </span>
                                                    <span class="text-xs text-gray-500 uppercase font-bold px-2 py-0.5 bg-gray-800 rounded">You Rated</span>
                                                 </div>
                                                 @if (sop.user_feedback) {
                                                    <p class="text-sm text-gray-300 italic border-l-2 border-gray-700 pl-3">"{{ sop.user_feedback }}"</p>
                                                 } @else {
                                                    <p class="text-xs text-gray-500 italic">No text feedback provided.</p>
                                                 }
                                            </div>
                                            <!-- Optional: Edit Rating button could go here -->
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                } @else {
                     <div class="flex flex-col items-center justify-center h-full text-gray-600">
                        <svg class="w-16 h-16 mb-4 opacity-50 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <p class="text-sm">Select an SOP from the list to view or edit.</p>
                     </div>
                }
            </div>
        </div>
    </div>
  `
})
export class KnowledgeBaseComponent {
    db = inject(DatabaseService);
    
    selectedSop = signal<AiSop | null>(null);
    isEditing = signal(false);
    editContent = '';
    feedbackText = signal('');

    constructor() {
        // Auto-select first SOP if available and none selected
        if (this.db.sops().length > 0 && !this.selectedSop()) {
            this.selectedSop.set(this.db.sops()[0]);
        }
    }

    selectSop(sop: AiSop) {
        if (this.isEditing()) {
            if (!confirm('Discard unsaved changes?')) return;
            this.isEditing.set(false);
        }
        this.selectedSop.set(sop);
        this.feedbackText.set('');
    }

    startEdit() {
        const sop = this.selectedSop();
        if (sop) {
            this.editContent = sop.sop_content;
            this.isEditing.set(true);
        }
    }

    saveSop() {
        const sop = this.selectedSop();
        if (sop) {
            this.db.updateSopContent(sop.id, this.editContent);
            this.isEditing.set(false);
            // Refresh selection to show update
            this.selectedSop.set(this.db.sops().find(s => s.id === sop.id) || null);
        }
    }

    cancelEdit() {
        this.isEditing.set(false);
        this.editContent = '';
    }

    rateSop(sop: AiSop, rating: number) {
        this.db.rateSop(sop.issue_id, rating, this.feedbackText());
        // Refresh selection to show updated rating state
        this.selectedSop.set(this.db.sops().find(s => s.id === sop.id) || null);
        this.feedbackText.set('');
    }
}