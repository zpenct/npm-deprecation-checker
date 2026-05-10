import { analyzePackage } from '../src/analyzer';
import { RegistryClient } from '../src/registry';

jest.mock('../src/registry');

const mockFetch = jest.fn();
const mockClient = { fetchPackage: mockFetch } as unknown as RegistryClient;

describe('analyzePackage', () => {
  beforeEach(() => mockFetch.mockReset());

  it('detects deprecated package (string message)', async () => {
    mockFetch.mockResolvedValue({
      name: 'request',
      'dist-tags': { latest: '2.88.2' },
      versions: {
        '2.88.2': { deprecated: 'Please use axios instead' },
      },
    });

    const result = await analyzePackage(
      { name: 'request', versionRange: '^2.0.0', type: 'production' },
      mockClient
    );

    expect(result.isDeprecated).toBe(true);
    expect(result.deprecationMessage).toContain('axios');
  });

  it('does NOT flag deprecated when value is boolean false', async () => {
    mockFetch.mockResolvedValue({
      name: 'react',
      'dist-tags': { latest: '19.0.0' },
      versions: {
        '16.7.0':  { deprecated: false },
        '19.0.0':  {},
      },
    });

    const result = await analyzePackage(
      { name: 'react', versionRange: '^19.0.0', type: 'production' },
      mockClient
    );

    expect(result.isDeprecated).toBe(false);
    expect(result.error).toBeNull();
  });

  it('detects major outdated package', async () => {
    mockFetch.mockResolvedValue({
      name: 'react',
      'dist-tags': { latest: '18.3.0' },
      versions: {
        '16.14.0': {},
        '17.0.2':  {},
        '18.3.0':  {},
      },
    });

    const result = await analyzePackage(
      { name: 'react', versionRange: '^16.0.0', type: 'production' },
      mockClient
    );

    expect(result.isMajorOutdated).toBe(true);
    expect(result.suggestion).toContain('^18.3.0');
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await analyzePackage(
      { name: 'broken', versionRange: '^1.0.0', type: 'production' },
      mockClient
    );

    expect(result.error).toBe('Network error');
    expect(result.isDeprecated).toBe(false);
  });
});