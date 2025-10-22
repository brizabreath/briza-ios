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
  /** How long we trust a cached oEmbed (ms). Adjust as needed. */
  private TTL = 24 * 60 * 60 * 1000; // 1 minute for testing

  constructor(private http: HttpClient) {}

  /**
   * Public entry: give me any Vimeo URL (player or watch) and I’ll return fresh-ish meta.
   * - Cache key is always based on the canonical watch URL (stable per video id/hash).
   * - Fetch URL prefers the *player* URL if you provided one (avoids stale caches).
   */
  async getMeta(vimeoUrl: string, forceRefresh = false): Promise<VimeoMeta> {
    const pageUrl = this.toPageUrl(vimeoUrl);           // canonical watch URL (for stable cache key)
    const fetchUrl = this.pickBestFetchUrl(vimeoUrl);   // what we actually query (player if provided)
    const lsKey = `vimeo:oembed:${pageUrl}`;
    const now = Date.now();

    // 1) In-memory cache (by canonical key)
    const mem = this.cache.get(pageUrl);
    if (!forceRefresh && mem && now - mem.ts < this.TTL) {
      return mem.data;
    }

    // 2) localStorage cache (by canonical key)
    if (!forceRefresh) {
      const cachedRaw = localStorage.getItem(lsKey);
      if (cachedRaw) {
        try {
          const cached: Cached<VimeoMeta> = JSON.parse(cachedRaw);
          if (cached?.ts && now - cached.ts < this.TTL) {
            this.cache.set(pageUrl, cached);
            return cached.data;
          }
        } catch {}
      }
    }

    // 3) Fetch fresh oEmbed (NoEmbed first, then Vimeo official as fallback)
    try {
      const cacheBusted = this.withBuster(fetchUrl);
      const data = await this.fetchOEmbed(cacheBusted);

      const wrapped: Cached<VimeoMeta> = { data, ts: now };
      this.cache.set(pageUrl, wrapped);
      localStorage.setItem(lsKey, JSON.stringify(wrapped));
      return data;
    } catch (err) {
      console.warn('⚠️ VimeoMetaService: failed to fetch oEmbed, using cache if available', err);
      const cachedRaw = localStorage.getItem(lsKey);
      if (cachedRaw) {
        try {
          const cached: Cached<VimeoMeta> = JSON.parse(cachedRaw);
          return cached.data;
        } catch {}
      }
      return {};
    }
  }

  /** Try NoEmbed first; if missing key fields, fall back to Vimeo’s official oEmbed. */
  private async fetchOEmbed(oembedTargetUrl: string): Promise<VimeoMeta> {
    // A) NoEmbed
    const noembedEndpoint = 'https://noembed.com/embed';
    const neParams = new HttpParams().set('url', oembedTargetUrl);
    const noembed = await firstValueFrom(
      this.http.get<any>(`${noembedEndpoint}?${neParams.toString()}`)
    );

    if (this.looksComplete(noembed)) {
      return this.pickFields(noembed);
    }

    // B) Vimeo official oEmbed fallback
    const vimeoEndpoint = 'https://vimeo.com/api/oembed.json';
    const vmParams = new HttpParams().set('url', oembedTargetUrl);
    const vimeo = await firstValueFrom(
      this.http.get<any>(`${vimeoEndpoint}?${vmParams.toString()}`)
    );

    return this.pickFields(vimeo);
  }

  /** Minimal check that title/thumbnail are present; description can legitimately be empty. */
  private looksComplete(obj: any): boolean {
    if (!obj) return false;
    const hasTitle = typeof obj.title === 'string' && obj.title.trim() !== '';
    const hasThumb = typeof obj.thumbnail_url === 'string' && obj.thumbnail_url.trim() !== '';
    return hasTitle && hasThumb;
  }

  /** Normalize the response to our VimeoMeta shape. */
  private pickFields(obj: any): VimeoMeta {
    return {
      title: obj?.title ?? undefined,
      description: obj?.description ?? undefined,
      thumbnail_url: obj?.thumbnail_url ?? undefined,
      duration: typeof obj?.duration === 'number' ? obj.duration : undefined,
    };
  }

  /** Prefer *player* URL if you gave one, else canonical watch URL. */
  private pickBestFetchUrl(vimeoUrl: string): string {
    if (vimeoUrl.includes('player.vimeo.com')) return vimeoUrl;
    return this.toPageUrl(vimeoUrl);
  }

  /** Append a cache-busting query param, respecting existing ?/&. */
  private withBuster(url: string): string {
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}nocache=${Date.now()}`;
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
    const joiner = h === '?' ? '' : '&';
    return `${base}${h}${joiner}title=0&byline=0&portrait=0&playsinline=1`;
  }

  /**
   * Always produce the canonical watch URL used as the stable cache key.
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
    const m1 = url.match(
      /player\.vimeo\.com\/video\/(\d+)(?:.*?[?&]h=([a-zA-Z0-9]+))?/
    );
    if (m1) return { id: m1[1], hash: m1[2] };

    // Try watch URL with optional hash
    const m2 = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (m2) return { id: m2[1], hash: m2[2] };

    return null;
  }

  /** Optional helper to clear all cached Vimeo data (for testing or debugging). */
  clearCache(): void {
    this.cache.clear();
    Object.keys(localStorage)
      .filter((k) => k.startsWith('vimeo:oembed:'))
      .forEach((k) => localStorage.removeItem(k));
  }
}
