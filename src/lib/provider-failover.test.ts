import { describe, expect, it } from 'vitest';

import {
  buildMediaProviderFailoverChain,
  isMediaProviderFailoverError,
  listConfiguredMediaProviders,
} from './provider-failover';

describe('listConfiguredMediaProviders', () => {
  it('orders APIMart before KIE', () => {
    expect(
      listConfiguredMediaProviders({
        kie_api_key: 'k',
        apimart_api_key: 'a',
      })
    ).toEqual(['apimart', 'kie']);
  });
});

describe('buildMediaProviderFailoverChain', () => {
  it('keeps same model/credits across providers', () => {
    const chain = buildMediaProviderFailoverChain({
      modelId: 'gpt-image-2',
      mediaType: 'image',
      primaryProvider: 'apimart',
      availableProviders: ['apimart', 'kie'],
      credits: 20,
    });
    expect(
      chain.map((c) => [c.provider, c.modelKey, c.credits, c.upstreamModel])
    ).toEqual([
      ['apimart', 'gpt-image-2', 20, 'gpt-image-2'],
      ['kie', 'gpt-image-2', 20, 'gpt-image-2'],
    ]);
  });

  it('maps catalog id to upstream model id', () => {
    const chain = buildMediaProviderFailoverChain({
      modelId: 'seedance-2-5',
      mediaType: 'video',
      primaryProvider: 'apimart',
      availableProviders: ['apimart', 'kie'],
      credits: 1000,
    });
    expect(chain[0]?.upstreamModel).toBe('seedance-2.5');
    expect(chain[1]?.upstreamModel).toBe('seedance-2.5');
  });

  it('skips providers that do not advertise the model', () => {
    const chain = buildMediaProviderFailoverChain({
      modelId: 'flux-2',
      mediaType: 'image',
      primaryProvider: 'apimart',
      availableProviders: ['apimart', 'kie'],
      credits: 16,
      modelProviders: ['apimart'],
    });
    expect(chain.length).toBe(1);
    expect(chain[0]?.provider).toBe('apimart');
    expect(chain[0]?.upstreamModel).toBe('flux-2-pro');
  });

  it('returns empty for unknown catalog model', () => {
    const chain = buildMediaProviderFailoverChain({
      modelId: 'not-a-real-model',
      mediaType: 'video',
      primaryProvider: 'apimart',
      availableProviders: ['apimart', 'kie'],
      credits: 100,
    });
    expect(chain.length).toBe(0);
  });

  it('excludes already tried providers', () => {
    const chain = buildMediaProviderFailoverChain({
      modelId: 'seedance-2-5',
      mediaType: 'video',
      primaryProvider: 'apimart',
      availableProviders: ['apimart', 'kie'],
      credits: 1000,
      excludeProviders: ['apimart'],
    });
    expect(chain.length).toBe(1);
    expect(chain[0]?.provider).toBe('kie');
  });
});

describe('isMediaProviderFailoverError', () => {
  it('allows balance / upstream failures', () => {
    expect(isMediaProviderFailoverError('Insufficient balance')).toBe(true);
    expect(isMediaProviderFailoverError(new Error('502 Bad Gateway'))).toBe(
      true
    );
  });

  it('blocks local validation errors', () => {
    expect(isMediaProviderFailoverError('Unsupported model')).toBe(false);
    expect(isMediaProviderFailoverError('Prompt is too long')).toBe(false);
  });
});
