import { describe, expect, it } from 'vitest';
import { parseTrafficSource } from '@/server';

describe('APIVALE-Aligned Attribution Engine', () => {
  const selfHosts = ['airap-video.net', 'localhost:3000'];

  it('correctly maps short promotional parameters', () => {
    // 1. Channel param
    const resChannel = parseTrafficSource(
      new URL('https://airap-video.net/showcase?channel=tiktok_migos'),
      null,
      selfHosts
    );
    expect(resChannel.source).toBe('tiktok_migos');
    expect(resChannel.medium).toBe('campaign');
    expect(resChannel.hasExplicitMarketing).toBe(true);

    // 2. Affiliate short param
    const resAff = parseTrafficSource(
      new URL('https://airap-video.net/?aff=rapking'),
      null,
      selfHosts
    );
    expect(resAff.source).toBe('aff_rapking');
    expect(resAff.medium).toBe('referral');
    expect(resAff.hasExplicitMarketing).toBe(true);

    // 3. Fast alias f
    const resF = parseTrafficSource(
      new URL('https://airap-video.net/?f=yt_shorts_migos'),
      null,
      selfHosts
    );
    expect(resF.source).toBe('yt_shorts_migos');
    expect(resF.medium).toBe('campaign');
  });

  it('intelligently classifies video and social media referrers without UTM params', () => {
    // TikTok
    const resTikTok = parseTrafficSource(
      new URL('https://airap-video.net/showcase'),
      'https://www.tiktok.com/@hiphop/video/7281923',
      selfHosts
    );
    expect(resTikTok.source).toBe('tiktok');
    expect(resTikTok.medium).toBe('social');
    expect(resTikTok.hasExplicitMarketing).toBe(true);

    // Instagram
    const resInsta = parseTrafficSource(
      new URL('https://airap-video.net/'),
      'https://l.instagram.com/?u=https%3A%2F%2Fairap-video.net',
      selfHosts
    );
    expect(resInsta.source).toBe('instagram');
    expect(resInsta.medium).toBe('social');

    // YouTube Shorts
    const resYt = parseTrafficSource(
      new URL('https://airap-video.net/'),
      'https://www.youtube.com/shorts/aB1cD2eF',
      selfHosts
    );
    expect(resYt.source).toBe('youtube');
    expect(resYt.medium).toBe('social');

    // Twitter / X
    const resX = parseTrafficSource(
      new URL('https://airap-video.net/'),
      'https://t.co/xyz123',
      selfHosts
    );
    expect(resX.source).toBe('twitter');
    expect(resX.medium).toBe('social');

    // Reddit
    const resReddit = parseTrafficSource(
      new URL('https://airap-video.net/showcase/drill-rap'),
      'https://www.reddit.com/r/hiphopheads/comments/123/migos_ai/',
      selfHosts
    );
    expect(resReddit.source).toBe('reddit');
    expect(resReddit.medium).toBe('community');

    // Organic Search
    const resGoogle = parseTrafficSource(
      new URL('https://airap-video.net/'),
      'https://www.google.com/search?q=ai+rap+video+generator',
      selfHosts
    );
    expect(resGoogle.source).toBe('google');
    expect(resGoogle.medium).toBe('organic');
  });

  it('filters internal self-navigation and classifies direct traffic', () => {
    // Internal navigation
    const resInternal = parseTrafficSource(
      new URL('https://airap-video.net/pricing'),
      'https://airap-video.net/showcase',
      selfHosts
    );
    expect(resInternal.source).toBe('');
    expect(resInternal.hasExplicitMarketing).toBe(false);

    // Direct traffic
    const resDirect = parseTrafficSource(
      new URL('https://airap-video.net/'),
      null,
      selfHosts
    );
    expect(resDirect.source).toBe('direct');
    expect(resDirect.medium).toBe('none');
    expect(resDirect.hasExplicitMarketing).toBe(false);
  });
});
