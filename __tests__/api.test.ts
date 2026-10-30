import { getProfilesByIds } from '../lib/api';

jest.mock('react-native', () => ({
  Platform: { OS: 'web', Version: '10' },
  NativeModules: {
    BlobModule: { getConstants: () => ({ BLOB_URI_SCHEME: 'content' }) },
    NativeBlobModule: { getConstants: () => ({ BLOB_URI_SCHEME: 'content' }) },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('api tests', () => {
  it('getProfilesByIds should return an empty array when passed an empty array of ids', async () => {
    const result = await getProfilesByIds([]);
    expect(result).toEqual([]);
  });
});
