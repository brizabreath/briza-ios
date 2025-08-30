// src/app/services/vimeo-meta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type VimeoMeta = {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number; // noembed sometimes includes this for Vimeo; if missing, keep Firestore's
};

@Injectable({ providedIn: 'root' })
export class VimeoMetaService {
  private cache = new Map<string, VimeoMeta>();

  constructor(private http: HttpClient) {}

  async getMeta(vimeoUrl: string): Promise<VimeoMeta> {
    if (this.cache.has(vimeoUrl)) return this.cache.get(vimeoUrl)!;

    const lsKey = `vimeo:oembed:${vimeoUrl}`;
    const cached = localStorage.getItem(lsKey);
    if (cached) {
      const obj = JSON.parse(cached) as VimeoMeta;
      this.cache.set(vimeoUrl, obj);
      return obj;
    }

    // Noembed works for Vimeo and has CORS enabled
    const endpoint = 'https://noembed.com/embed';
    const params = new HttpParams().set('url', vimeoUrl);

    const meta = await firstValueFrom(
      this.http.get<VimeoMeta>(`${endpoint}?${params.toString()}`)
    );

    this.cache.set(vimeoUrl, meta);
    localStorage.setItem(lsKey, JSON.stringify(meta));
    return meta;
  }

  // Convert any Vimeo page URL to an embeddable player URL
  toPlayerUrl(vimeoUrl: string): string {
    // supports:
    //  https://vimeo.com/1112636936
    //  https://vimeo.com/1112636936/abcdef
    //  https://player.vimeo.com/video/1112636936?h=abcdef
    const m = vimeoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?(?:\?h=([a-zA-Z0-9]+))?/);
    if (!m) return vimeoUrl;
    const id = m[1];
    const hash = m[2] || m[3] || '';
    const h = hash ? `?h=${hash}` : '';
    // you can append player params here as needed
    return `https://player.vimeo.com/video/${id}${h}&title=0&byline=0&portrait=0&playsinline=1`;
  }
}
