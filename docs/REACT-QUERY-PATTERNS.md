# React Query Patterns Guide

**Guía de patrones de React Query para el equipo de Bingo Online**

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Configuración](#configuración)
3. [Patrones de Queries](#patrones-de-queries)
4. [Patrones de Mutations](#patrones-de-mutations)
5. [Invalidación de Queries](#invalidación-de-queries)
6. [Testing](#testing)
7. [Best Practices](#best-practices)
8. [Ejemplos Reales](#ejemplos-reales)

---

## Introducción

React Query es la biblioteca de gestión de estado asíncrono que usamos en Bingo Online. Nos permite:

- ✅ Cachear datos del servidor automáticamente
- ✅ Refetch automático en background
- ✅ Estados de carga y error integrados
- ✅ Invalidación y revalidación de cache
- ✅ Optimistic updates
- ✅ Paginación e infinite scroll

**Versión actual:** @tanstack/react-query v5.90.5

---

## Configuración

### QueryClient Setup

**Ubicación:** `apps/frontend/src/main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caché por 5 minutos por defecto
      staleTime: 1000 * 60 * 5,
      // Reintentar 3 veces en caso de error
      retry: 3,
      // Refetch al enfocar la ventana
      refetchOnWindowFocus: true,
    },
    mutations: {
      // No reintentar mutaciones por defecto
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### QueryClient en Tests

**Ubicación:** `apps/frontend/src/hooks/__tests__/usePayments.test.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // No reintentar en tests
        gcTime: 0,    // Limpiar cache inmediatamente
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

---

## Patrones de Queries

### Patrón 1: Query Básica

**Cuándo usar:** Para obtener datos del servidor sin parámetros.

```typescript
export function usePaymentHistory() {
  return useQuery({
    queryKey: ['payment-history'],
    queryFn: getPaymentHistory,
  });
}

// Uso en componente
function PaymentHistoryPage() {
  const { data, isLoading, isError, error } = usePaymentHistory();

  if (isLoading) return <Loader />;
  if (isError) return <Error message={error.message} />;

  return <PaymentList payments={data.data} />;
}
```

**Key points:**
- `queryKey` debe ser único para este tipo de datos
- `queryFn` es una función async que retorna los datos
- React Query maneja estados automáticamente

### Patrón 2: Query con Parámetros

**Cuándo usar:** Para obtener datos que dependen de parámetros (ID, filtros, etc.).

```typescript
export function usePayment(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment', paymentId], // Incluir parámetro en la key
    queryFn: () => getPaymentById(paymentId!),
    enabled: !!paymentId, // Solo ejecutar si tenemos paymentId
  });
}

// Uso en componente
function PaymentDetailPage() {
  const { paymentId } = useParams();
  const { data, isLoading } = usePayment(paymentId);

  // La query no se ejecuta hasta que paymentId esté disponible
}
```

**Key points:**
- Parámetros deben incluirse en `queryKey`
- `enabled` previene ejecución hasta que tengamos todos los parámetros
- Cache automático por combinación de key + parámetros

### Patrón 3: Query con Stale Time

**Cuándo usar:** Para datos que cambian poco frecuentemente.

```typescript
export function usePaymentInstructions(method: PaymentMethod | null) {
  return useQuery({
    queryKey: ['payment-instructions', method],
    queryFn: () => getPaymentInstructions(method!),
    enabled: !!method,
    staleTime: 1000 * 60 * 60, // 1 hora - instrucciones no cambian seguido
  });
}
```

**Opciones de tiempo:**
- `staleTime: 0` - Siempre considerado stale (refetch en cada mount)
- `staleTime: 1000 * 60 * 5` - 5 minutos (bueno para dashboards)
- `staleTime: 1000 * 60 * 60` - 1 hora (bueno para configuraciones)
- `staleTime: Infinity` - Nunca stale (solo para datos inmutables)

### Patrón 4: Query con Refetch Interval

**Cuándo usar:** Para datos que necesitan actualizarse automáticamente (real-time).

```typescript
export function usePendingPayments() {
  return useQuery({
    queryKey: ['pending-payments'],
    queryFn: getPendingPayments,
    refetchInterval: 10000, // Refetch cada 10 segundos
  });
}

export function useAllPayments(filters?: { status?: string; sessionId?: string }) {
  return useQuery({
    queryKey: ['all-payments', filters],
    queryFn: () => getAllPayments(filters),
    refetchInterval: 30000, // Refetch cada 30 segundos
  });
}
```

**Recomendaciones de intervalos:**
- Admin dashboards: 10-30 segundos
- Live data feeds: 5-10 segundos
- Statistics: 60 segundos
- **Nota:** Para real-time crítico, usar Socket.IO en lugar de polling

---

## Patrones de Mutations

### Patrón 1: Mutation Básica

**Cuándo usar:** Para operaciones POST/PUT/DELETE sin efectos secundarios complejos.

```typescript
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PaymentRequestPayload) => {
      // Validar antes de enviar
      const validation = validateCardIds(payload.cardIds);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return createPaymentRequest(payload);
    },
    onSuccess: () => {
      // Invalidar cache relacionado
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
  });
}

// Uso en componente
function PaymentForm() {
  const createPayment = useCreatePayment();

  const handleSubmit = (data) => {
    createPayment.mutate(data, {
      onSuccess: () => {
        toast.success('Pago creado exitosamente');
        navigate('/payments');
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button disabled={createPayment.isPending}>
        {createPayment.isPending ? 'Creando...' : 'Crear Pago'}
      </button>
    </form>
  );
}
```

**Key points:**
- Validación en `mutationFn` antes de llamar al API
- `onSuccess` global en el hook para invalidaciones
- `onSuccess`/`onError` locales en `mutate()` para UI feedback
- Usar `isPending` para estados de carga

### Patrón 2: Mutation con Múltiples Invalidaciones

**Cuándo usar:** Cuando la mutación afecta múltiples queries.

```typescript
export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, adminNotes }: { paymentId: string; adminNotes?: string }) =>
      approvePayment(paymentId, adminNotes),
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
    },
  });
}
```

### Patrón 3: Mutation con Optimistic Update

**Cuándo usar:** Para mejor UX en operaciones que es probable que tengan éxito.

```typescript
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, status }: { paymentId: string; status: string }) =>
      updatePaymentStatus(paymentId, status),

    // ANTES de la mutación
    onMutate: async (variables) => {
      // Cancelar refetch pendientes
      await queryClient.cancelQueries({ queryKey: ['payment', variables.paymentId] });

      // Snapshot del valor anterior (para rollback)
      const previousPayment = queryClient.getQueryData(['payment', variables.paymentId]);

      // Actualizar optimísticamente
      queryClient.setQueryData(['payment', variables.paymentId], (old: any) => ({
        ...old,
        status: variables.status,
      }));

      // Retornar context para rollback
      return { previousPayment };
    },

    // Si la mutación FALLA, hacer rollback
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        ['payment', variables.paymentId],
        context?.previousPayment
      );
      toast.error('Error al actualizar pago');
    },

    // Siempre refetch después (success o error)
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment', variables.paymentId] });
    },
  });
}
```

---

## Invalidación de Queries

### Estrategias de Invalidación

#### 1. Invalidación por Query Key Exacta

```typescript
// Invalida solo la query con esta key exacta
queryClient.invalidateQueries({ queryKey: ['payment-history'] });
```

#### 2. Invalidación por Prefijo

```typescript
// Invalida todas las queries que empiecen con 'payment'
queryClient.invalidateQueries({ queryKey: ['payment'] });

// Esto invalida:
// - ['payment']
// - ['payment', '123']
// - ['payment', '456']
// - ['payment', 'history']
```

#### 3. Invalidación Selectiva

```typescript
// Invalida solo queries con filtro específico
queryClient.invalidateQueries({
  queryKey: ['all-payments', { status: 'pending' }],
});
```

### Cuándo Invalidar

| Acción | Queries a Invalidar |
|--------|---------------------|
| Crear pago | `['payment-history']` |
| Aprobar pago | `['pending-payments']`, `['all-payments']` |
| Rechazar pago | `['pending-payments']`, `['all-payments']` |
| Crear sesión | `['sessions']` |
| Iniciar juego | `['session', sessionId]`, `['rooms', sessionId]` |

---

## Testing

### Test de Query

```typescript
it('should fetch payment instructions for a method', async () => {
  const mockInstructions = {
    method: PaymentMethod.PAGO_MOVIL,
    phone: '+584121234567',
    bank: 'Banesco',
  };

  vi.mocked(paymentsApi.getPaymentInstructions).mockResolvedValue({
    success: true,
    data: mockInstructions,
  });

  const { result } = renderHook(
    () => usePaymentInstructions(PaymentMethod.PAGO_MOVIL),
    { wrapper: createWrapper() }
  );

  // Esperar a que la query tenga éxito
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(paymentsApi.getPaymentInstructions).toHaveBeenCalledWith(
    PaymentMethod.PAGO_MOVIL
  );
  expect(result.current.data).toEqual({ success: true, data: mockInstructions });
});
```

### Test de Mutation

```typescript
it('should create a payment request successfully', async () => {
  const mockPayload = {
    sessionId: 'session-123',
    cardIds: ['card-1', 'card-2'],
    method: PaymentMethod.PAGO_MOVIL,
    data: { referencia: '12345678' },
  };

  vi.mocked(validations.validateCardIds).mockReturnValue({
    isValid: true,
    error: null,
  });

  vi.mocked(paymentsApi.createPaymentRequest).mockResolvedValue({
    success: true,
    data: { id: 'payment-123' },
  });

  const { result } = renderHook(() => useCreatePayment(), {
    wrapper: createWrapper(),
  });

  result.current.mutate(mockPayload);

  // Esperar a que la mutación tenga éxito
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(validations.validateCardIds).toHaveBeenCalledWith(mockPayload.cardIds);
  expect(paymentsApi.createPaymentRequest).toHaveBeenCalledWith(mockPayload);
});
```

### Test de Invalidación

```typescript
it('should invalidate payment-history query on success', async () => {
  const mockPayload = { /* ... */ };

  vi.mocked(paymentsApi.createPaymentRequest).mockResolvedValue({
    success: true,
    data: {},
  });

  const { result } = renderHook(() => useCreatePayment(), {
    wrapper: createWrapper(),
  });

  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  result.current.mutate(mockPayload);

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // IMPORTANTE: Esperar a que la invalidación se ejecute
  await waitFor(() => {
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['payment-history'],
    });
  });
});
```

**⚠️ Nota importante:** Las invalidaciones en `onSuccess` se ejecutan asíncronamente DESPUÉS de que `isSuccess` sea true. Siempre usar un segundo `waitFor` para verificar la invalidación.

---

## Best Practices

### 1. Naming Conventions

```typescript
// ✅ BUENO: Nombres descriptivos y consistentes
export function usePaymentHistory() { /* ... */ }
export function usePayment(paymentId: string) { /* ... */ }
export function useCreatePayment() { /* ... */ }
export function useApprovePayment() { /* ... */ }

// ❌ MALO: Nombres genéricos
export function useData() { /* ... */ }
export function useFetch() { /* ... */ }
export function usePayments() { /* ... */ } // Demasiado ambiguo
```

### 2. Query Keys

```typescript
// ✅ BUENO: Array con estructura jerárquica
['payment-history']
['payment', paymentId]
['all-payments', { status: 'pending' }]
['sessions', { active: true }]

// ❌ MALO: Strings concatenados o estructuras inconsistentes
['paymentHistory']
[`payment-${paymentId}`]
['all_payments_pending']
```

### 3. Error Handling

```typescript
// ✅ BUENO: Manejo completo de errores
function PaymentPage() {
  const { data, isLoading, isError, error } = usePaymentHistory();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <ErrorAlert
        message={error.message || 'Error al cargar pagos'}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['payment-history'] })}
      />
    );
  }

  return <PaymentList payments={data.data} />;
}

// ❌ MALO: Asumir que data siempre existe
function PaymentPage() {
  const { data } = usePaymentHistory();
  return <PaymentList payments={data.data} />; // Crash si data es undefined
}
```

### 4. Loading States

```typescript
// ✅ BUENO: Estados de carga específicos
function PaymentForm() {
  const createPayment = useCreatePayment();

  return (
    <button
      onClick={() => createPayment.mutate(data)}
      disabled={createPayment.isPending}
    >
      {createPayment.isPending ? 'Creando...' : 'Crear Pago'}
    </button>
  );
}

// ✅ BUENO: Spinner global para queries
function PaymentHistory() {
  const { data, isLoading, isFetching } = usePaymentHistory();

  return (
    <div>
      {isFetching && <SmallSpinner />} {/* Refetch en background */}
      {isLoading ? <FullPageLoader /> : <PaymentList payments={data.data} />}
    </div>
  );
}
```

### 5. Evitar Over-fetching

```typescript
// ✅ BUENO: Solo refetch cuando es necesario
export function usePaymentInstructions(method: PaymentMethod | null) {
  return useQuery({
    queryKey: ['payment-instructions', method],
    queryFn: () => getPaymentInstructions(method!),
    enabled: !!method, // No fetch hasta que tengamos method
    staleTime: 1000 * 60 * 60, // Cache por 1 hora
  });
}

// ❌ MALO: Refetch innecesario
export function usePaymentInstructions(method: PaymentMethod) {
  return useQuery({
    queryKey: ['payment-instructions'],
    queryFn: () => getPaymentInstructions(method),
    refetchInterval: 1000, // Refetch cada segundo (muy costoso!)
  });
}
```

---

## Ejemplos Reales

### Ejemplo Completo: Payment Flow

**1. Hook personalizado** (`apps/frontend/src/hooks/usePayments.ts`):

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPaymentRequest, getPaymentHistory } from '../lib/api/payments';
import { validateCardIds } from '../lib/validations';
import { PaymentRequestPayload } from '@bingo/shared-types';

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PaymentRequestPayload) => {
      const validation = validateCardIds(payload.cardIds);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return createPaymentRequest(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ['payment-history'],
    queryFn: getPaymentHistory,
  });
}
```

**2. Componente de formulario**:

```typescript
import { useCreatePayment } from '../hooks/usePayments';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export function PaymentForm() {
  const navigate = useNavigate();
  const createPayment = useCreatePayment();

  const handleSubmit = (formData) => {
    createPayment.mutate(formData, {
      onSuccess: () => {
        toast.success('Pago enviado para verificación');
        navigate('/my-payments');
      },
      onError: (error) => {
        toast.error(error.message || 'Error al crear pago');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createPayment.isPending}
      >
        {createPayment.isPending ? 'Enviando...' : 'Enviar Pago'}
      </button>
    </form>
  );
}
```

**3. Componente de listado**:

```typescript
import { usePaymentHistory } from '../hooks/usePayments';

export function MyPaymentsPage() {
  const { data, isLoading, isError, error } = usePaymentHistory();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-900 rounded-lg">
        Error: {error.message}
      </div>
    );
  }

  const payments = data?.data || [];

  return (
    <div>
      <h1>Mis Pagos</h1>
      {payments.length === 0 ? (
        <p>No tienes pagos registrados</p>
      ) : (
        <PaymentList payments={payments} />
      )}
    </div>
  );
}
```

---

## Recursos

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [TkDodo's Blog](https://tkdodo.eu/blog/practical-react-query) - Best practices
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)

---

## Changelog

- **2025-11-06** - Creación inicial de la guía
- Basado en implementación real de `usePayments.ts` y sus tests

---

**Mantenido por:** Equipo de Desarrollo Bingo Online
**Última actualización:** 2025-11-06
