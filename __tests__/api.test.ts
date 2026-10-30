import { getProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

// Mock Supabase
function createMockSupabase(mockResponse: { data: any; error: any }) {
  const mockSingle = async () => mockResponse;
  const mockEq = (column: string, value: any) => ({ single: mockSingle });
  const mockSelect = (columns: string) => ({ eq: mockEq });
  const mockFrom = (table: string) => ({ select: mockSelect });

  // Override the `from` method on the actual supabase object
  supabase.from = mockFrom as any;
}

test('testGetProfileSuccess', async () => {
  const mockProfile: Profile = { id: 'user-1', full_name: 'John Doe', avatar_url: 'http://example.com/avatar.jpg', email: 'john@example.com', updated_at: '2023-10-30T10:00:00Z' };
  createMockSupabase({ data: mockProfile, error: null });

  const result = await getProfile('user-1');
  expect(result).toEqual(mockProfile);
});

test('testGetProfileError', async () => {
  const originalConsoleError = console.error;
  let loggedError: any = null;
  console.error = (msg: string, err: any) => { loggedError = err; };

  const mockError = { message: 'User not found' };
  createMockSupabase({ data: null, error: mockError });

  const result = await getProfile('user-2');
  expect(result).toBeNull();
  expect(loggedError).toEqual(mockError);

  console.error = originalConsoleError;
});
