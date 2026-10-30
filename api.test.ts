import { getExpenseDetail } from './lib/api';
import { supabase } from './lib/supabase';

jest.mock('./lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: '123',
        description: 'Test Expense',
        expense_splits: [
          {
            user_id: 'user1',
            amount_owed: 10.5,
            profiles: {
              id: 'user1',
              full_name: 'User One',
              avatar_url: null,
              updated_at: null
            } // Test object return
          },
          {
            user_id: 'user2',
            amount_owed: 5,
            profiles: [
              {
                id: 'user2',
                full_name: 'User Two',
                avatar_url: null,
                updated_at: null
              }
            ] // Test array return
          },
          {
            user_id: 'user3',
            amount_owed: 2,
            profiles: null // Test missing profile
          }
        ]
      },
      error: null
    })
  }
}));

describe('getExpenseDetail', () => {
  it('should format nested data correctly', async () => {
    const result = await getExpenseDetail('123');

    expect(result).not.toBeNull();
    expect(result!.expense.id).toBe('123');
    expect(result!.expense.description).toBe('Test Expense');

    expect(result!.splits).toHaveLength(3);

    // Check user 1 (object profile)
    expect(result!.splits[0].amount_owed).toBe(10.5);
    expect(result!.splits[0].profile.full_name).toBe('User One');

    // Check user 2 (array profile)
    expect(result!.splits[1].amount_owed).toBe(5);
    expect(result!.splits[1].profile.full_name).toBe('User Two');

    // Check user 3 (missing profile)
    expect(result!.splits[2].amount_owed).toBe(2);
    expect(result!.splits[2].profile.id).toBe('user3'); // Fallback profile
  });
});
