import { Component, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketDataService } from './services/market-data.service';
import { AnalysisService } from './services/analysis.service';
import { GeminiService } from './services/gemini.service';
import { ChartComponent } from './components/chart.component';
import { ASSETS, TIMEFRAMES, AssetOption, OHLCV, AnalysisResult, AISummary, BacktestResult, IndicatorConfig, MarketType } from './models';
import { Subject, merge, of, from } from 'rxjs';
import { switchMap, tap, catchError, takeUntil, filter, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent],
  template: `
<div class="min-h-screen bg-slate-900 text-slate-200 flex flex-col md:flex-row relative">
  
  <!-- Toast Notification -->
  @if (statusMessage()) {
    <div class="fixed top-4 right-4 z-50 animate-fade-in max-w-sm w-full">
      <div class="bg-slate-800 border-l-4 p-4 rounded shadow-lg flex items-start gap-3 border border-slate-700"
        [class.border-l-rose-500]="statusMessage()?.type === 'ERROR'"
        [class.border-l-yellow-500]="statusMessage()?.type === 'WARNING'"
        [class.border-l-blue-500]="statusMessage()?.type === 'INFO'"
      >
        <div class="flex-1">
          <p class="text-xs font-bold uppercase tracking-wider"
            [class.text-rose-400]="statusMessage()?.type === 'ERROR'"
            [class.text-yellow-400]="statusMessage()?.type === 'WARNING'"
            [class.text-blue-400]="statusMessage()?.type === 'INFO'"
          >
            {{ statusMessage()?.type }}
          </p>
          <p class="text-sm text-slate-300 mt-1">
            {{ statusMessage()?.message }}
          </p>
        </div>
        <button (click)="statusMessage.set(null)" class="text-slate-400 hover:text-white transition-colors">✕</button>
      </div>
    </div>
  }

  <!-- Sidebar / Controls -->
  <aside class="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex-shrink-0 flex flex-col h-screen overflow-y-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
        43v3r Analytics
      </h1>
      <p class="text-xs text-slate-500 mt-1">Free FX & Crypto Intelligence</p>
    </div>

    <!-- Controls -->
    <div class="space-y-6 flex-1">
      
      <!-- Asset Selector -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-400">Select Asset</label>
        <select 
          [value]="selectedAsset().symbol"
          (change)="onAssetChange($event)"
          class="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        >
          @for (asset of assets; track asset.symbol) {
            <option [value]="asset.symbol">
              {{ asset.name }} ({{ asset.type }})
            </option>
          }
        </select>
      </div>

      <!-- Timeframe Selector -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-400">Timeframe</label>
        <select 
          [value]="selectedTimeframe()"
          (change)="onTimeframeChange($event)"
          class="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        >
          @for (tf of timeframes; track tf.value) {
            <option [value]="tf.value">{{ tf.label }}</option>
          }
        </select>
      </div>

      <!-- Current Price Display -->
      <div class="p-4 bg-slate-800 rounded-xl border border-slate-700">
        <p class="text-sm text-slate-400 mb-1">Current Price</p>
        <div class="text-3xl font-mono font-bold transition-colors duration-300" [class]="priceColor()">
          {{ currentPrice() | number:'1.2-5' }}
        </div>
        <p class="text-xs text-slate-500 mt-2 flex items-center gap-2">
           @if (selectedAsset().type === 'CRYPTO') {
             <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> WS Live
           } @else {
             <span class="w-2 h-2 rounded-full bg-yellow-500"></span> FX Simulated
           }
           {{ selectedAsset().symbol }} • {{ selectedTimeframe() }}
        </p>
      </div>

      <!-- Indicator Toggles -->
      <div class="space-y-3 pt-4 border-t border-slate-800">
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overlays & Params</h3>
        
        <div class="pb-2 mb-2 border-b border-slate-800/50">
          <label class="block text-[10px] text-slate-500 uppercase mb-1">RSI Period</label>
          <input 
            type="number" 
            [value]="indicatorConfig().rsiPeriod" 
            (input)="updateConfig('rsiPeriod', $any($event.target).value)"
            class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
          >
        </div>

        <label class="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" [checked]="indicatorConfig().showSMA" (change)="toggleIndicator('showSMA')" class="form-checkbox bg-slate-800 border-slate-600 rounded text-blue-500 focus:ring-0">
          <span class="text-sm text-slate-300 group-hover:text-white transition-colors">Simple Moving Averages</span>
        </label>

        <!-- Bollinger Bands Control -->
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" [checked]="indicatorConfig().showBollinger" (change)="toggleIndicator('showBollinger')" class="form-checkbox bg-slate-800 border-slate-600 rounded text-blue-500 focus:ring-0">
            <span class="text-sm text-slate-300 group-hover:text-white transition-colors">
              Bollinger Bands ({{ indicatorConfig().bbPeriod }}, {{ indicatorConfig().bbStdDev }})
            </span>
          </label>
          
          @if (indicatorConfig().showBollinger) {
            <div class="flex gap-2 pl-6 animate-fade-in">
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1">Period</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().bbPeriod" 
                  (input)="updateConfig('bbPeriod', $any($event.target).value)"
                  class="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                >
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1">StdDev</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().bbStdDev" 
                  (input)="updateConfig('bbStdDev', $any($event.target).value)"
                  class="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                  step="0.1"
                >
              </div>
            </div>
          }
        </div>
        
        <!-- Ichimoku Control -->
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" [checked]="indicatorConfig().showIchimoku" (change)="toggleIndicator('showIchimoku')" class="form-checkbox bg-slate-800 border-slate-600 rounded text-blue-500 focus:ring-0">
            <span class="text-sm text-slate-300 group-hover:text-white transition-colors">Ichimoku Cloud</span>
          </label>
          
          @if (indicatorConfig().showIchimoku) {
            <div class="grid grid-cols-3 gap-2 pl-6 animate-fade-in">
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1" title="Conversion Line">Tenkan</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().ichiTenkan" 
                  (input)="updateConfig('ichiTenkan', $any($event.target).value)"
                  class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                >
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1" title="Base Line">Kijun</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().ichiKijun" 
                  (input)="updateConfig('ichiKijun', $any($event.target).value)"
                  class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                >
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1" title="Leading Span B">Span B</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().ichiSenkouB" 
                  (input)="updateConfig('ichiSenkouB', $any($event.target).value)"
                  class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                >
              </div>
            </div>
          }
        </div>

        <!-- Stochastic Control -->
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" [checked]="indicatorConfig().showStochastic" (change)="toggleIndicator('showStochastic')" class="form-checkbox bg-slate-800 border-slate-600 rounded text-blue-500 focus:ring-0">
            <span class="text-sm text-slate-300 group-hover:text-white transition-colors">
              Stochastic Osc ({{ indicatorConfig().stochK }}, {{ indicatorConfig().stochD }})
            </span>
          </label>
          
          @if (indicatorConfig().showStochastic) {
            <div class="flex gap-2 pl-6 animate-fade-in">
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1">%K</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().stochK" 
                  (input)="updateConfig('stochK', $any($event.target).value)"
                  class="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                >
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 uppercase mb-1">%D</label>
                <input 
                  type="number" 
                  [value]="indicatorConfig().stochD" 
                  (input)="updateConfig('stochD', $any($event.target).value)"
                  class="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                >
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 p-4 md:p-8 overflow-y-auto">
    
    <!-- Top Bar Status -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-slate-100">Market Overview</h2>
      @if (isLoading()) {
        <span class="text-sm text-blue-400 animate-pulse">Fetching data...</span>
      } @else {
        <span class="text-sm text-emerald-500 flex items-center gap-2">
          {{ ohlcData().length }} Candles Loaded
        </span>
      }
    </div>

    <!-- Chart Section -->
    <div class="mb-8">
      <app-chart [data]="ohlcData()" [symbol]="selectedAsset().symbol" [config]="indicatorConfig()"></app-chart>
    </div>

    <!-- Analysis Tabs -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <!-- Tab Headers -->
      <div class="flex border-b border-slate-700">
        <button 
          (click)="setActiveTab('AI')"
          class="flex-1 py-4 text-sm font-medium transition-colors"
          [class]="activeTab() === 'AI' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'"
        >
          AI Narrative & RAG
          @if (isAiThinking()) { <span class="ml-2 inline-block w-2 h-2 bg-blue-400 rounded-full animate-ping"></span> }
        </button>
        <button 
          (click)="setActiveTab('INDICATORS')"
          class="flex-1 py-4 text-sm font-medium transition-colors"
          [class]="activeTab() === 'INDICATORS' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'"
        >
          Technical Signals
        </button>
        <button 
          (click)="setActiveTab('BACKTEST')"
          class="flex-1 py-4 text-sm font-medium transition-colors"
          [class]="activeTab() === 'BACKTEST' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'"
        >
          Strategy Backtest
        </button>
      </div>

      <!-- Tab Content -->
      <div class="p-6 min-h-[300px]">
        
        <!-- AI Tab -->
        @if (activeTab() === 'AI') {
          @if (aiSummary(); as ai) {
            <div class="space-y-6 animate-fade-in">
              <div class="flex items-center gap-4">
                <div class="px-4 py-2 rounded-lg font-bold text-sm tracking-wide uppercase"
                  [class.bg-emerald-900]="ai.bias === 'BULLISH'"
                  [class.text-emerald-300]="ai.bias === 'BULLISH'"
                  [class.bg-rose-900]="ai.bias === 'BEARISH'"
                  [class.text-rose-300]="ai.bias === 'BEARISH'"
                  [class.bg-slate-700]="ai.bias === 'NEUTRAL'"
                  [class.text-slate-300]="ai.bias === 'NEUTRAL'"
                >
                  Bias: {{ ai.bias }}
                </div>
                <div class="text-sm text-slate-400">
                  Confidence Score: <span class="text-slate-200 font-semibold">{{ ai.confidence | number:'1.0-0' }}%</span>
                </div>
              </div>

              <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <h3 class="text-sm font-semibold text-blue-300 mb-2">Market Narrative (RAG Synthesis)</h3>
                <p class="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{{ ai.narrative }}</p>
              </div>

              <!-- News & Events Section -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <!-- News -->
                 @if (ai.newsHighlights && ai.newsHighlights.length > 0) {
                   <div class="space-y-3">
                     <h3 class="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                       Recent News
                     </h3>
                     <ul class="space-y-2">
                       @for (news of ai.newsHighlights; track news.title) {
                         <li class="bg-slate-900 border border-slate-800 p-3 rounded-lg text-sm text-slate-300 hover:border-slate-700 transition-colors">
                           <span class="block text-white font-medium mb-1">{{ news.title }}</span>
                           @if(news.source) { <span class="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{{ news.source }}</span> }
                         </li>
                       }
                     </ul>
                   </div>
                 }

                 <!-- Events -->
                 @if (ai.upcomingEvents && ai.upcomingEvents.length > 0) {
                   <div class="space-y-3">
                     <h3 class="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                       Economic Calendar
                     </h3>
                     <ul class="space-y-2">
                       @for (evt of ai.upcomingEvents; track evt.event) {
                         <li class="bg-slate-900 border border-slate-800 p-3 rounded-lg text-sm flex justify-between items-center hover:border-slate-700 transition-colors">
                           <div class="flex flex-col">
                             <span class="text-slate-200 font-medium">{{ evt.event }}</span>
                             @if (evt.time) { <span class="text-xs text-slate-500">{{ evt.time }}</span> }
                           </div>
                           <span class="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider min-w-[60px] text-center"
                             [class.bg-rose-500/10]="evt.impact === 'HIGH'"
                             [class.text-rose-400]="evt.impact === 'HIGH'"
                             [class.border-rose-500/20]="evt.impact === 'HIGH'"
                             [class.border]="evt.impact === 'HIGH'"
                             
                             [class.bg-orange-500/10]="evt.impact === 'MEDIUM'"
                             [class.text-orange-400]="evt.impact === 'MEDIUM'"
                             [class.border-orange-500/20]="evt.impact === 'MEDIUM'"
                             [class.border]="evt.impact === 'MEDIUM'"
                             
                             [class.bg-slate-700]="evt.impact === 'LOW'"
                             [class.text-slate-400]="evt.impact === 'LOW'"
                           >{{ evt.impact }}</span>
                         </li>
                       }
                     </ul>
                   </div>
                 }
              </div>

              <!-- Sources -->
              @if (ai.sources && ai.sources.length > 0) {
                 <div class="pt-4 border-t border-slate-800">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                      Sources (Grounding)
                    </h3>
                    <div class="flex flex-wrap gap-2">
                       @for (src of ai.sources; track src.url) {
                          <a [href]="src.url" target="_blank" class="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-blue-400 hover:text-blue-300 transition-colors max-w-xs truncate border border-slate-700">
                            <span class="truncate max-w-[150px]">{{ src.title }}</span>
                            <svg class="w-3 h-3 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                       }
                    </div>
                 </div>
              }

              <div class="border-t border-slate-700 pt-4">
                <h3 class="text-sm font-semibold text-slate-200 mb-3">Trade Idea (Experimental)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-slate-900 p-3 rounded border border-slate-700">
                    <span class="text-xs text-slate-500 uppercase block mb-1">Action</span>
                    <span class="font-mono text-sm font-bold"
                      [class.text-emerald-400]="ai.idea.type === 'LONG'"
                      [class.text-rose-400]="ai.idea.type === 'SHORT'"
                      [class.text-slate-400]="ai.idea.type === 'WAIT'"
                    >{{ ai.idea.type }}</span>
                  </div>
                  <div class="bg-slate-900 p-3 rounded border border-slate-700">
                    <span class="text-xs text-slate-500 uppercase block mb-1">Invalidation</span>
                    <span class="font-mono text-sm text-slate-300">{{ ai.idea.invalidatedIf }}</span>
                  </div>
                  <div class="col-span-1 md:col-span-2 bg-slate-900 p-3 rounded border border-slate-700">
                     <span class="text-xs text-slate-500 uppercase block mb-1">Note</span>
                     <span class="text-sm text-slate-400 italic">{{ ai.idea.note }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        }

        <!-- Indicators Tab -->
        @if (activeTab() === 'INDICATORS') {
          @if (analysisResult(); as res) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              <div class="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span class="text-xs text-slate-500 uppercase">Trend Structure</span>
                <div class="text-lg font-semibold mt-1" 
                   [class.text-emerald-400]="res.trend === 'UPTREND'"
                   [class.text-rose-400]="res.trend === 'DOWNTREND'"
                >{{ res.trend }}</div>
              </div>

              <div class="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span class="text-xs text-slate-500 uppercase">RSI ({{ indicatorConfig().rsiPeriod }}) State</span>
                <div class="text-lg font-semibold mt-1"
                   [class.text-rose-400]="res.rsiState === 'OVERBOUGHT'"
                   [class.text-emerald-400]="res.rsiState === 'OVERSOLD'"
                >{{ res.rsiState }}</div>
              </div>

              <div class="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span class="text-xs text-slate-500 uppercase">Stochastic ({{ indicatorConfig().stochK }},{{ indicatorConfig().stochD }})</span>
                <div class="text-lg font-semibold mt-1"
                   [class.text-rose-400]="res.stochSignal === 'OVERBOUGHT'"
                   [class.text-emerald-400]="res.stochSignal === 'OVERSOLD'"
                >{{ res.stochSignal }}</div>
              </div>

              <div class="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span class="text-xs text-slate-500 uppercase">Bollinger State</span>
                <div class="text-lg font-semibold mt-1"
                   [class.text-emerald-400]="res.bbState === 'BREAKOUT_UP'"
                   [class.text-rose-400]="res.bbState === 'BREAKOUT_DOWN'"
                >{{ res.bbState.replace('_', ' ') }}</div>
              </div>

              <div class="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span class="text-xs text-slate-500 uppercase">Ichimoku Cloud</span>
                <div class="text-lg font-semibold mt-1"
                   [class.text-emerald-400]="res.ichimokuState === 'BULLISH'"
                   [class.text-rose-400]="res.ichimokuState === 'BEARISH'"
                >{{ res.ichimokuState }}</div>
              </div>

              <div class="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span class="text-xs text-slate-500 uppercase">MACD Signal</span>
                <div class="text-lg font-semibold mt-1"
                   [class.text-emerald-400]="res.macdSignal === 'BULLISH'"
                   [class.text-rose-400]="res.macdSignal === 'BEARISH'"
                >{{ res.macdSignal }}</div>
              </div>
            </div>
          }
        }

        <!-- Backtest Tab -->
        @if (activeTab() === 'BACKTEST') {
          @if (backtestResult(); as bt) {
            <div class="space-y-6 animate-fade-in">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-300">Strategy: SMA(20) Crossover SMA(50)</h3>
                <span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Last 500 candles</span>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-4 bg-slate-900 rounded border border-slate-700">
                  <div class="text-2xl font-bold text-slate-200">{{ bt.totalTrades }}</div>
                  <div class="text-xs text-slate-500 uppercase mt-1">Total Trades</div>
                </div>
                <div class="text-center p-4 bg-slate-900 rounded border border-slate-700">
                  <div class="text-2xl font-bold" [class.text-emerald-400]="bt.winRate > 50" [class.text-rose-400]="bt.winRate <= 50">
                    {{ bt.winRate | number:'1.1-1' }}%
                  </div>
                  <div class="text-xs text-slate-500 uppercase mt-1">Win Rate</div>
                </div>
                <div class="text-center p-4 bg-slate-900 rounded border border-slate-700">
                  <div class="text-2xl font-bold" [class.text-emerald-400]="bt.finalPnLPercent > 0" [class.text-rose-400]="bt.finalPnLPercent < 0">
                    {{ bt.finalPnLPercent | number:'1.2-2' }}%
                  </div>
                  <div class="text-xs text-slate-500 uppercase mt-1">Return</div>
                </div>
              </div>
              
              <div class="text-xs text-slate-500 text-center italic">
                *Naive backtest simulation. Assumes perfect execution at close price. No fees/slippage.
              </div>
            </div>
          }
        }

      </div>
    </div>
  </main>
</div>
`
})
export class AppComponent implements OnInit, OnDestroy {
  private marketService = inject(MarketDataService);
  private analysisService = inject(AnalysisService);
  private geminiService = inject(GeminiService);

  // Constants
  assets = ASSETS;
  timeframes = TIMEFRAMES;

  // Signals for UI State
  selectedAsset = signal<AssetOption>(ASSETS[0]);
  selectedTimeframe = signal<string>('1h');
  isLoading = signal<boolean>(false);
  isAiThinking = signal<boolean>(false); // specific loading state for RAG
  statusMessage = signal<{type: string, message: string} | null>(null);
  
  // Indicator Config
  indicatorConfig = signal<IndicatorConfig>({
    showSMA: true,
    showBollinger: false,
    showIchimoku: false,
    showStochastic: false, 
    bbPeriod: 20,
    bbStdDev: 2,
    stochK: 14,
    stochD: 3,
    ichiTenkan: 9,
    ichiKijun: 26,
    ichiSenkouB: 52,
    rsiPeriod: 14
  });
  
  // Data Signals
  ohlcData = signal<OHLCV[]>([]);
  analysisResult = signal<AnalysisResult | null>(null);
  aiSummary = signal<AISummary | null>(null);
  backtestResult = signal<BacktestResult | null>(null);
  activeTab = signal<'AI' | 'INDICATORS' | 'BACKTEST'>('AI');

  // Reactive Stream Management
  private configChanged$ = new Subject<{asset: AssetOption, tf: string}>();
  private destroy$ = new Subject<void>();
  
  // Debouncer for AI calls to save tokens/calls during rapid price ticks
  private aiCallTrigger$ = new Subject<OHLCV[]>();

  // Computed
  currentPrice = computed(() => {
    const data = this.ohlcData();
    return data.length > 0 ? data[data.length - 1].close : 0;
  });

  priceColor = computed(() => {
    const data = this.ohlcData();
    if (data.length < 2) return 'text-white';
    const curr = data[data.length - 1].close;
    const prev = data[data.length - 2].close;
    return curr >= prev ? 'text-emerald-400' : 'text-rose-400';
  });

  ngOnInit() {
    this.setupDataPipeline();
    this.setupAiPipeline();
    
    // Subscribe to Status Messages (Errors/Warnings)
    this.marketService.status$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.statusMessage.set(status);
      // Auto-dismiss info and warnings, keep errors longer or until clicked
      if (status.type !== 'ERROR') {
        setTimeout(() => {
          // Only dismiss if it hasn't changed to an error in the meantime
          if (this.statusMessage() === status) {
             this.statusMessage.set(null);
          }
        }, 5000);
      }
    });

    // Trigger initial load
    this.configChanged$.next({ 
      asset: this.selectedAsset(), 
      tf: this.selectedTimeframe() 
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAssetChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const asset = this.assets.find(a => a.symbol === select.value);
    if (asset) {
      this.selectedAsset.set(asset);
      this.configChanged$.next({ asset, tf: this.selectedTimeframe() });
    }
  }

  onTimeframeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const tf = select.value;
    this.selectedTimeframe.set(tf);
    this.configChanged$.next({ asset: this.selectedAsset(), tf });
  }

  toggleIndicator(key: keyof IndicatorConfig) {
    this.indicatorConfig.update(cfg => ({ ...cfg, [key]: !cfg[key] }));
  }
  
  updateConfig(key: keyof IndicatorConfig, value: string) {
     this.indicatorConfig.update(cfg => ({ ...cfg, [key]: parseFloat(value) }));
    this.runAnalysis(this.ohlcData());
  }

  setActiveTab(tab: 'AI' | 'INDICATORS' | 'BACKTEST') {
    this.activeTab.set(tab);
  }

  private setupDataPipeline() {
    this.configChanged$.pipe(
      takeUntil(this.destroy$),
      switchMap(config => {
        this.isLoading.set(true);
        this.aiSummary.set(null); // Reset AI on asset change
        
        // 1. Fetch History
        return this.marketService.getOHLCV(config.asset.type, config.asset.symbol, config.tf).pipe(
          tap(data => {
            this.ohlcData.set(data);
            this.runAnalysis(data); // Immediate local analysis
            this.isLoading.set(false);
          }),
          // 2. Switch to WebSocket
          switchMap(() => {
             return this.marketService.connectTicker(config.asset.type, config.asset.symbol, config.tf).pipe(
                tap(tick => this.handleTick(tick, config.asset.type)),
                catchError(err => {
                   console.error('WS Stream Error', err);
                   return of(null);
                })
             );
          }),
          catchError(err => {
             console.error('Historical Data Error', err);
             this.isLoading.set(false);
             return of(null);
          })
        );
      })
    ).subscribe();
  }

  private setupAiPipeline() {
    // Separate pipeline for expensive RAG calls
    this.aiCallTrigger$.pipe(
      takeUntil(this.destroy$),
      debounceTime(5000), // Only analyze every 5 seconds max if data is streaming fast
      switchMap(data => {
        if (data.length < 50 || !this.geminiService.isAvailable()) return of(null);
        
        this.isAiThinking.set(true);
        const config = this.indicatorConfig();
        const asset = this.selectedAsset();
        const tf = this.selectedTimeframe();
        
        // Get local heuristic first
        const localAnalysis = this.analysisService.analyze(data, config);
        
        // Call Gemini for RAG (wrapped in from() for Observable compatibility)
        return from(
          this.geminiService.generateHybridAnalysis(
            asset.symbol,
            asset.name, // Pass Asset Name for better search context
            asset.type,
            tf,
            data[data.length-1].close,
            localAnalysis.result,
            localAnalysis.summary
          ).then(result => {
            this.isAiThinking.set(false);
            return result;
          })
        );
      })
    ).subscribe(enhancedSummary => {
      if (enhancedSummary) {
        this.aiSummary.set(enhancedSummary);
      }
    });
  }

  private handleTick(tick: OHLCV | null, type: MarketType) {
    if (!tick) return;

    this.ohlcData.update(currentData => {
      if (currentData.length === 0) return [tick];

      // Forex Simulation specific logic (tick.time === 0)
      if (tick.time === 0 && type === 'FOREX') {
          const updated = [...currentData];
          const last = updated[updated.length - 1];
          // Random walk simulation
          const move = last.close * (Math.random() - 0.5) * 0.0005;
          const newClose = last.close + move;
          
          updated[updated.length - 1] = {
            ...last,
            close: newClose,
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose)
          };
          return updated;
      }

      // Standard Crypto Logic
      const lastCandle = currentData[currentData.length - 1];
      
      // Update current candle
      if (tick.time === lastCandle.time) {
        const updated = [...currentData];
        updated[updated.length - 1] = tick;
        return updated;
      } 
      // New candle started
      else if (tick.time > lastCandle.time) {
        const updated = [...currentData, tick];
        if (updated.length > 500) updated.shift();
        return updated;
      }
      
      return currentData;
    });

    this.runAnalysis(this.ohlcData());
  }

  runAnalysis(data: OHLCV[]) {
    if (data.length > 50) {
      // 1. Fast local analysis
      const analysis = this.analysisService.analyze(data, this.indicatorConfig());
      this.analysisResult.set(analysis.result);
      
      // Update signal tab immediately, but keep AI summary from flickering until Gemini returns
      if (!this.aiSummary()) {
        this.aiSummary.set(analysis.summary); // Set initial heuristic
      }
      
      const bt = this.analysisService.runBacktest(data);
      this.backtestResult.set(bt);

      // 2. Queue heavy AI analysis
      this.aiCallTrigger$.next(data);
    }
  }
}