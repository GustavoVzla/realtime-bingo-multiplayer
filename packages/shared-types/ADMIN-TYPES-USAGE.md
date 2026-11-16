# Admin Types Usage Guide

This document demonstrates how to use the comprehensive admin types defined in `@bingo/shared-types/admin`.

## Import Examples

```typescript
// Import specific types
import {
  CreateSessionRequest,
  UpdateSessionRequest,
  AdminSessionResponse,
  SessionListItem,
  SessionFilters,
  AdminPaymentDetail,
  PaymentFilters,
  DashboardStats,
  BulkSessionOperation,
  GenerateCardsRequest,
} from '@bingo/shared-types';

// Import Zod schemas for validation
import {
  CreateSessionSchema,
  UpdateSessionSchema,
  SessionFiltersSchema,
  PaymentFiltersSchema,
  ApprovePaymentSchema,
  RejectPaymentSchema,
  BulkSessionOperationSchema,
  GenerateCardsSchema,
} from '@bingo/shared-types';
```

## Usage Examples

### 1. Creating a New Session (Backend)

```typescript
import { CreateSessionRequest, CreateSessionSchema, BingoPattern } from '@bingo/shared-types';

// Type-safe request handler
app.post('/api/admin/sessions', async (req, res) => {
  try {
    // Validate request body with Zod
    const validated = CreateSessionSchema.parse(req.body);

    // TypeScript knows the exact shape
    const sessionData: CreateSessionRequest = validated;

    // Insert into database
    const { data, error } = await supabase
      .from('bingo_sessions')
      .insert({
        date_time: sessionData.date_time,
        card_price: sessionData.card_price,
        max_cards_per_player: sessionData.max_cards_per_player,
        winning_pattern: sessionData.winning_pattern,
        prize_amount: sessionData.prize_amount,
        description: sessionData.description,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});
```

### 2. Updating a Session (Backend)

```typescript
import { UpdateSessionRequest, UpdateSessionSchema } from '@bingo/shared-types';

app.patch('/api/admin/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate partial update
    const validated = UpdateSessionSchema.parse(req.body);

    const { data, error } = await supabase
      .from('bingo_sessions')
      .update(validated)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    // Handle error
  }
});
```

### 3. Fetching Sessions with Filters (Backend)

```typescript
import { SessionFilters, SessionFiltersSchema, SessionListItem } from '@bingo/shared-types';

app.get('/api/admin/sessions', async (req, res) => {
  try {
    // Validate and parse query parameters
    const filters: SessionFilters = SessionFiltersSchema.parse(req.query);

    let query = supabase.from('bingo_sessions').select(`
        id,
        date_time,
        card_price,
        winning_pattern,
        prize_amount,
        status,
        (SELECT COUNT(*) FROM bingo_cards WHERE session_id = bingo_sessions.id AND player_id IS NOT NULL) as sold_cards,
        (SELECT COUNT(*) FROM bingo_cards WHERE session_id = bingo_sessions.id) as total_cards,
        (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE session_id = bingo_sessions.id AND status = 'approved') as total_revenue,
        (SELECT COUNT(*) FROM payment_transactions WHERE session_id = bingo_sessions.id AND status = 'pending') as pending_payments
      `);

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.date_from) {
      query = query.gte('date_time', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('date_time', filters.date_to);
    }

    if (filters.pattern) {
      if (Array.isArray(filters.pattern)) {
        query = query.in('winning_pattern', filters.pattern);
      } else {
        query = query.eq('winning_pattern', filters.pattern);
      }
    }

    if (filters.min_price) {
      query = query.gte('card_price', filters.min_price);
    }

    if (filters.max_price) {
      query = query.lte('card_price', filters.max_price);
    }

    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    // Apply sorting
    query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' });

    // Apply pagination
    const from = (filters.page - 1) * filters.page_size;
    const to = from + filters.page_size - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data as SessionListItem[],
      total: count || 0,
      page: filters.page,
      pageSize: filters.page_size,
      hasMore: (count || 0) > filters.page * filters.page_size,
    });
  } catch (error) {
    // Handle error
  }
});
```

### 4. Fetching Session Details with Statistics (Backend)

```typescript
import { AdminSessionResponse } from '@bingo/shared-types';

app.get('/api/admin/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError) throw sessionError;

    // Fetch statistics
    const [
      totalCards,
      soldCards,
      approvedPayments,
      pendingPayments,
      rejectedPayments,
      revenue,
      uniquePlayers,
    ] = await Promise.all([
      supabase
        .from('bingo_cards')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', id),
      supabase
        .from('bingo_cards')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', id)
        .not('player_id', 'is', null),
      supabase
        .from('payment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', id)
        .eq('status', 'approved'),
      supabase
        .from('payment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', id)
        .eq('status', 'pending'),
      supabase
        .from('payment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', id)
        .eq('status', 'rejected'),
      supabase
        .from('payment_transactions')
        .select('amount')
        .eq('session_id', id)
        .eq('status', 'approved'),
      supabase
        .from('payment_transactions')
        .select('player_id')
        .eq('session_id', id)
        .eq('status', 'approved'),
    ]);

    const response: AdminSessionResponse = {
      ...session,
      stats: {
        total_cards: totalCards.count || 0,
        sold_cards: soldCards.count || 0,
        available_cards: (totalCards.count || 0) - (soldCards.count || 0),
        total_revenue: revenue.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        unique_players: new Set(uniquePlayers.data?.map((p) => p.player_id)).size,
        pending_payments: pendingPayments.count || 0,
        approved_payments: approvedPayments.count || 0,
        rejected_payments: rejectedPayments.count || 0,
      },
    };

    res.json({ success: true, data: response });
  } catch (error) {
    // Handle error
  }
});
```

### 5. Generating Cards (Backend)

```typescript
import { GenerateCardsRequest, GenerateCardsSchema } from '@bingo/shared-types';

app.post('/api/admin/sessions/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request
    const validated = GenerateCardsSchema.parse({
      session_id: id,
      ...req.body,
    });

    // Generate cards (using your card generation logic)
    const cards = [];
    for (let i = 0; i < validated.quantity; i++) {
      cards.push({
        session_id: validated.session_id,
        numbers: generateBingoCard(), // Your card generation function
        player_id: null,
      });
    }

    const { data, error } = await supabase.from('bingo_cards').insert(cards).select();

    if (error) throw error;

    const totalCards = await supabase
      .from('bingo_cards')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', id);

    res.json({
      success: true,
      data: {
        session_id: id,
        cards_generated: data.length,
        total_cards: totalCards.count || 0,
      },
    });
  } catch (error) {
    // Handle error
  }
});
```

### 6. Using Filters in Frontend

```typescript
import { SessionFilters, BingoPattern, SessionStatus } from '@bingo/shared-types';

const SessionManagementPage: React.FC = () => {
  const [filters, setFilters] = useState<SessionFilters>({
    status: SessionStatus.SCHEDULED,
    page: 1,
    page_size: 20,
    sort_by: 'date_time',
    sort_order: 'asc',
  });

  const fetchSessions = async () => {
    const params = new URLSearchParams();

    // Type-safe filter building
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach((s) => params.append('status', s));
      } else {
        params.set('status', filters.status);
      }
    }

    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    params.set('page', filters.page.toString());
    params.set('page_size', filters.page_size.toString());
    params.set('sort_by', filters.sort_by);
    params.set('sort_order', filters.sort_order);

    const response = await fetch(`/api/admin/sessions?${params}`);
    const result = await response.json();

    return result;
  };

  // Component rendering...
};
```

### 7. Bulk Operations

```typescript
import { BulkSessionOperation, BulkSessionOperationSchema } from '@bingo/shared-types';

app.post('/api/admin/sessions/bulk', async (req, res) => {
  try {
    const operation = BulkSessionOperationSchema.parse(req.body);

    const results = [];

    for (const sessionId of operation.session_ids) {
      try {
        switch (operation.action) {
          case 'cancel':
            await supabase
              .from('bingo_sessions')
              .update({ status: 'cancelled' })
              .eq('id', sessionId);
            results.push({ session_id: sessionId, success: true });
            break;

          case 'delete':
            // Check if session can be deleted (no payments, etc.)
            await supabase.from('bingo_sessions').delete().eq('id', sessionId);
            results.push({ session_id: sessionId, success: true });
            break;

          case 'duplicate':
            // Duplicate session logic
            const { data: original } = await supabase
              .from('bingo_sessions')
              .select('*')
              .eq('id', sessionId)
              .single();

            await supabase.from('bingo_sessions').insert({
              ...original,
              id: undefined,
              status: 'scheduled',
            });
            results.push({ session_id: sessionId, success: true });
            break;
        }
      } catch (error) {
        results.push({
          session_id: sessionId,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        success_count: results.filter((r) => r.success).length,
        failed_count: results.filter((r) => !r.success).length,
        results,
      },
    });
  } catch (error) {
    // Handle error
  }
});
```

### 8. Dashboard Statistics (Backend)

```typescript
import { DashboardStats } from '@bingo/shared-types';

app.get('/api/admin/dashboard/stats', async (req, res) => {
  try {
    const [
      totalSessions,
      activeSessions,
      scheduledSessions,
      completedSessions,
      totalRevenue,
      pendingPayments,
      totalPlayers,
      activePlayers30d,
    ] = await Promise.all([
      supabase.from('bingo_sessions').select('id', { count: 'exact', head: true }),
      supabase
        .from('bingo_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('bingo_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled'),
      supabase
        .from('bingo_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase.from('payment_transactions').select('amount').eq('status', 'approved'),
      supabase
        .from('payment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'player'),
      supabase
        .from('payment_transactions')
        .select('player_id')
        .eq('status', 'approved')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const revenue = totalRevenue.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const avgRevenuePerSession = completedSessions.count ? revenue / completedSessions.count : 0;

    const stats: DashboardStats = {
      total_sessions: totalSessions.count || 0,
      active_sessions: activeSessions.count || 0,
      scheduled_sessions: scheduledSessions.count || 0,
      completed_sessions: completedSessions.count || 0,
      total_revenue: revenue,
      pending_payments: pendingPayments.count || 0,
      total_players: totalPlayers.count || 0,
      active_players_30d: new Set(activePlayers30d.data?.map((p) => p.player_id)).size,
      avg_revenue_per_session: avgRevenuePerSession,
      avg_cards_per_session: 0, // Calculate based on your needs
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    // Handle error
  }
});
```

## Type Safety Benefits

1. **Compile-time validation**: TypeScript catches type errors before runtime
2. **IntelliSense support**: Auto-completion in your IDE for all fields
3. **Runtime validation**: Zod schemas validate incoming data
4. **Consistent API contracts**: Frontend and backend share the same types
5. **Self-documenting code**: Type definitions serve as documentation
6. **Refactoring safety**: Changes to types propagate across the codebase

## Zod Schema Validation Features

All schemas include:

- Required field validation
- Type constraints (positive numbers, UUIDs, date formats)
- Business rule validation (e.g., dates in future, price ranges)
- Custom error messages
- Optional field handling
- Default values for pagination
- Cross-field validation (e.g., date_from <= date_to)

## Best Practices

1. **Always validate user input** with Zod schemas in API endpoints
2. **Use TypeScript types** for internal function signatures
3. **Leverage discriminated unions** for polymorphic data
4. **Keep types DRY** by reusing existing types
5. **Document complex types** with JSDoc comments
6. **Export all types** from the shared package
7. **Version control breaking changes** to type definitions
