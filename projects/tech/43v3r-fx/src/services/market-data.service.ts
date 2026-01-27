import { Injectable } from '@angular/core';
import { Observable, timer, of, from, throwError, Subject, defer } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { map, retry, catchError, switchMap } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';
import { OHLCV, MarketType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {

  // Binance Public API Base
  private readonly BINANCE_API = 'https://api.binance.com/api/v3/klines';
  private readonly BINANCE_WS = 'wss://stream.binance.com:9443/ws';
  
  // Frankfurter for FX (Daily only for free public)
  private readonly FRANKFURTER_API = 'https://api.frankfurter.app';

  // Global Status/Error Stream
  private _status$ = new Subject<{type: 'ERROR'|'WARNING'|'INFO', message: string}>();
  public status$ = this._status$.asObservable();

  constructor() {}

  // --- Resilience Strategy ---

  private getRetryConfig() {
    return {
      delay: (error: any, retryCount: number) => {
        // 1. Rate Limit Handling (HTTP 429)
        if (error.status === 429) {
          this._status$.next({
            type: 'ERROR', 
            message: 'API Rate Limit Hit. Pausing updates for 60s.'
          });
          console.error('Rate Limit Exceeded (429). Backing off.');
          return timer(60000); // 60s cooldown
        }

        // 2. Max Retries
        if (retryCount > 3) {
           return throwError(() => error);
        }

        // 3. Exponential Backoff (1s, 2s, 4s...)
        const delayMs = Math.pow(2, retryCount) * 1000;
        this._status$.next({
          type: 'WARNING',
          message: `Network instability. Retrying in ${delayMs/1000}s...`
        });
        return timer(delayMs);
      }
    };
  }

  getOHLCV(type: MarketType, symbol: string, interval: string): Observable<OHLCV[]> {
    if (type === 'CRYPTO') {
      return this.getCryptoData(symbol, interval);
    } else {
      return this.getForexData(symbol, interval);
    }
  }

  connectTicker(type: MarketType, symbol: string, interval: string): Observable<OHLCV> {
    if (type === 'CRYPTO') {
      const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
      const url = `${this.BINANCE_WS}/${streamName}`;
      
      return new Observable<OHLCV>(observer => {
        const socket = webSocket(url);
        const sub = socket.subscribe({
          next: (msg: any) => {
            if (msg.k) {
              const k = msg.k;
              observer.next({
                time: k.t,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v)
              });
            }
          },
          error: (err) => observer.error(err),
          complete: () => observer.complete()
        });

        return () => {
          sub.unsubscribe();
          socket.complete();
        };
      }).pipe(
        retry({
           delay: (err, count) => {
             console.warn('WS Connection Error', err);
             // Cap backoff at 30s for WebSocket
             const delay = Math.min(Math.pow(2, count) * 1000, 30000); 
             return timer(delay);
           }
        })
      );

    } else {
      // Forex Simulation
      return timer(0, 2000).pipe(
        map(() => ({
          time: 0, // Signal to simulator
          open: 0, high: 0, low: 0, close: 0, volume: 0
        }))
      );
    }
  }

  // --- REST Fetching ---

  private getCryptoData(symbol: string, interval: string): Observable<OHLCV[]> {
    const url = `${this.BINANCE_API}?symbol=${symbol}&interval=${interval}&limit=500`;
    return ajax.getJSON<any[]>(url).pipe(
      retry(this.getRetryConfig()),
      map(rawData => rawData.map(d => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }))),
      catchError(err => {
        console.warn('Crypto API failed. Using fallback data.', err);
        this._status$.next({
          type: 'ERROR',
          message: 'Unable to fetch live Crypto data. Switched to Simulation Mode.'
        });
        return of(this.generateMockData(100, 45000, 100));
      })
    );
  }

  private getForexData(symbol: string, interval: string): Observable<OHLCV[]> {
    // defer ensures the Promise is recreated on retry
    return defer(() => this.fetchForexAsync(symbol, interval)).pipe(
      retry(this.getRetryConfig()),
      catchError(err => {
         console.warn('Forex API failed. Using fallback.', err);
         this._status$.next({
          type: 'WARNING',
          message: 'Forex API unavailable. Switched to Simulation Mode.'
         });
         return of(this.generateMockData(100, 1.08, 0.005));
      })
    );
  }

  private async fetchForexAsync(symbol: string, interval: string): Promise<OHLCV[]> {
    if (interval !== '1d') {
      console.warn('Free Forex API only supports Daily timeframe. Simulating intraday structure from daily.');
    }

    const from = symbol.substring(0, 3);
    const to = symbol.substring(3, 6);
    
    // Get last 150 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 150);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const url = `${this.FRANKFURTER_API}/${startStr}..${endStr}?from=${from}&to=${to}`;
    const response = await fetch(url);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Rate Limit' };
    }
    if (!response.ok) throw new Error('Forex API Error');

    const data = await response.json();
    const rates = data.rates;

    const candles: OHLCV[] = [];
    
    Object.keys(rates).forEach(dateStr => {
      const close = rates[dateStr][to];
      // Simulate some OHLC structure around the close
      const open = close * (1 + (Math.random() * 0.01 - 0.005));
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      
      candles.push({
        time: new Date(dateStr).getTime(),
        open,
        high,
        low,
        close,
        volume: 0
      });
    });

    return candles.sort((a, b) => a.time - b.time);
  }

  private generateMockData(count: number, startPrice: number, volatility: number): OHLCV[] {
    const candles: OHLCV[] = [];
    let currentPrice = startPrice;
    let time = Date.now() - (count * 3600 * 1000);

    for (let i = 0; i < count; i++) {
      const move = (Math.random() - 0.5) * volatility;
      const open = currentPrice;
      const close = currentPrice + move;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      candles.push({
        time,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000)
      });
      
      currentPrice = close;
      time += 3600 * 1000;
    }
    return candles;
  }
}