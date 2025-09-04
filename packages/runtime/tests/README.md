# SmythOS Runtime Server - Test Suite

Simple, focused tests following KISS principle and OSS best practices.

## Test Structure

```
tests/
├── setup.ts              # Simple test utilities
├── mocks/
│   └── sre.mock.ts      # Basic SRE library mocks
├── core/
│   ├── utils/           # Utility function tests
│   └── middlewares/     # Middleware tests
├── services/            # Service tests
└── integration/         # API integration tests (using supertest)
```

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

## Writing Tests - KISS Approach

### Keep It Simple

```typescript
describe('MyFunction', () => {
  it('handles valid input', () => {
    const result = myFunction('input');
    expect(result).toBe('output');
  });

  it('handles edge cases', () => {
    expect(myFunction('')).toBe(null);
    expect(myFunction(null)).toBe(null);
  });
});
```

### Mock Only What You Need

```typescript
vi.mock('@smythos/sre', () => ({
  Logger: vi.fn(() => ({ error: vi.fn() })),
}));
```

### Test One Thing at a Time

- Each test should verify one behavior
- Use descriptive test names
- Follow Arrange-Act-Assert pattern

## Testing Philosophy

- Focus on critical paths and business logic
- Quality over quantity
- Test behavior, not implementation details

## Best Practices

1. **Simple is better than complex**
2. **Test behavior, not implementation**
3. **Mock external dependencies only**
4. **Use realistic test data**
5. **Keep tests fast and independent**

## Common Patterns

```typescript
// Simple service test
it('processes valid requests', async () => {
  const result = await service.process(validInput);
  expect(result.status).toBe('success');
});

// API integration test with supertest
it('returns health status', async () => {
  await request(app).get('/health').expect(200).expect({ status: 'ok' });
});
```

## When Tests Fail

1. Read the error message carefully
2. Check your mocks are set up correctly
3. Verify async operations are awaited
4. Ensure test isolation (no shared state)

Keep tests simple, focused, and valuable.
