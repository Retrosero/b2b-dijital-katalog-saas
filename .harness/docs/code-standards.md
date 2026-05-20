# Code Standards

## TypeScript

### Tipler

```typescript
// Interface > Type alias
interface User {
  id: string;
  name: string;
}

// Union type için type alias acceptable
type Status = 'PENDING' | 'APPROVED' | 'SHIPPED';

// Nullable için optional operator
interface Order {
  id: string;
  customerId?: string; // null olabilir
}
```

### Naming

```typescript
// PascalCase - Class, Interface, Type
class UserService {}
interface UserProfile {}

// camelCase - Variables, functions, methods
const userName = 'test';
function getUser() {}

// UPPER_SNAKE_CASE - Constants
const MAX_RETRY_COUNT = 3;

// Prefix ile boolean değişkenler
const isActive = true;
const hasPermission = false;
```

## React Bileşenleri

### Functional Components

```tsx
// İyi
interface ButtonProps {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'default', size = 'md', children }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }))}>{children}</button>;
}

// Kötü - gereksiz useState
function BadComponent() {
  const [count, setCount] = useState(0); // state yok, gereksiz
  return <div>Static content</div>;
}
```

### Hooks

```tsx
// Özel hook pattern
function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  return { products, loading };
}
```

## API Response

```typescript
// Her API response için standardize format
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
```

## Error Handling

```typescript
// Backend
try {
  const product = await prisma.product.create({ data });
  res.json(product);
} catch (e) {
  console.error('[ProductCreateError]', e);
  res.status(500).json({ error: 'Ürün oluşturulamadı.' });
}

// Frontend
try {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed');
  const data = await res.json();
} catch (e) {
  setError(e.message);
}
```

## Dosya Organizasyonu

```
src/
├── api.ts              # API routes
├── App.tsx             # Root component + routing
├── components/
│   ├── layouts/        # Layout components
│   └── ui/             # shadcn/ui base components
├── lib/
│   ├── utils.ts        # cn() helper
│   └── r2Client.ts      # R2/S3 client
├── pages/
│   ├── admin/          # Admin pages (20+)
│   ├── auth/           # Auth pages
│   └── public/         # Public/customer pages
├── services/           # Business logic
└── store/              # Zustand stores
```

## Styling (TailwindCSS)

```tsx
// Önce base-ui/shadcn components kullan
// Sonra Tailwind ile override et

// İyi
<div className="flex items-center gap-2 p-4">

// Kötü - inline style
<div style={{ display: 'flex', padding: '16px' }}>

// Responsive
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

## Security Kuralları

1. **Credentials**: API key, JWT secret asla hardcode etme
2. **Input validation**: Tüm user input validate et
3. **SQL injection**: Prisma parameterize query kullan
4. **XSS**: React auto-escapes, ama dangerouslySetInnerHTML KAÇIN
5. **CORS**: Sadece gerekli origin'lere izin ver

## Testing

```typescript
// Test dosyaları: *.test.tsx
// Coverage: minimum %70

describe('OrderService', () => {
  it('creates order and decrements stock', async () => {
    const order = await createOrder({ items: [...] });
    expect(order.status).toBe('PENDING');
    const product = await getProduct(order.items[0].productId);
    expect(product.stock).toBeLessThan(initialStock);
  });
});
```