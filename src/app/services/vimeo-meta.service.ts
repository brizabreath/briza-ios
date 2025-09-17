// src/app/services/vimeo-meta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type VimeoMeta = {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
};

type Cached<T> = { data: T; ts: number };

@Injectable({ providedIn: 'root' })
export class VimeoMetaService {
  private cache = new Map<string, Cached<VimeoMeta>>();
  /** How long we trust a cached oEmbed (ms). Tweak as you like. */
  private TTL = 24 * 60 * 60 * 1000; // 24h

  constructor(private http: HttpClient) {}

  /**
   * Public entry: give me any Vimeo URL (player or watch), I’ll normalize
   * to the canonical watch URL and return fresh-ish meta.
   */
  async getMeta(vimeoUrl: string): Promise<VimeoMeta> {
    const pageUrl = this.toPageUrl(vimeoUrl); // <— normalize first

    // 1) In-memory cache (with TTL)
    const mem = this.cache.get(pageUrl);
    if (mem && Date.now() - mem.ts < this.TTL) return mem.data;

    // 2) localStorage cache (with TTL)
    const lsKey = `vimeo:oembed:${pageUrl}`;
    const cachedRaw = localStorage.getItem(lsKey);
    if (cachedRaw) {
      try {
        const cached: Cached<VimeoMeta> = JSON.parse(cachedRaw);
        if (cached?.ts && Date.now() - cached.ts < this.TTL) {
          this.cache.set(pageUrl, cached);
          return cached.data;
        }
      } catch {}
    }

    // 3) Refetch from noembed using the canonical watch URL
    const endpoint = 'https://noembed.com/embed';
    const params = new HttpParams().set('url', pageUrl);
    const fresh = await firstValueFrom(
      this.http.get<VimeoMeta>(`${endpoint}?${params.toString()}`)
    );

    const wrapped: Cached<VimeoMeta> = { data: fresh, ts: Date.now() };
    this.cache.set(pageUrl, wrapped);
    localStorage.setItem(lsKey, JSON.stringify(wrapped));
    return fresh;
  }

  /**
   * Convert any Vimeo URL into the embeddable player URL.
   * Ensures query params join with ? / & correctly.
   */
  toPlayerUrl(vimeoUrl: string): string {
    const { id, hash } = this.extractIdAndHash(vimeoUrl) ?? {};
    if (!id) return vimeoUrl;

    const base = `https://player.vimeo.com/video/${id}`;
    const h = hash ? `?h=${hash}` : '?';
    // Add player params after ? or & as needed
    const joiner = h === '?' ? '' : '&';
    return `${base}${h}${joiner}title=0&byline=0&portrait=0&playsinline=1`;
  }

  /**
   * Always produce the canonical watch URL used as the oEmbed cache key.
   * - Public:   https://vimeo.com/123456789
   * - Unlisted: https://vimeo.com/123456789/abcdef
   */
  toPageUrl(vimeoUrl: string): string {
    const data = this.extractIdAndHash(vimeoUrl);
    if (!data?.id) return vimeoUrl;
    return data.hash
      ? `https://vimeo.com/${data.id}/${data.hash}`
      : `https://vimeo.com/${data.id}`;
  }

  /**
   * Robustly extract { id, hash? } from:
   * - https://vimeo.com/1112636936
   * - https://vimeo.com/1112636936/abcdef
   * - https://player.vimeo.com/video/1112636936?h=abcdef
   */
  private extractIdAndHash(url: string): { id: string; hash?: string } | null {
    // Try player URL first
    const m1 = url.match(/player\.vimeo\.com\/video\/(\d+)(?:.*?[?&]h=([a-zA-Z0-9]+))?/);
    if (m1) return { id: m1[1], hash: m1[2] };

    // Try watch URL with optional hash
    const m2 = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (m2) return { id: m2[1], hash: m2[2] };

    return null;
  }
}
