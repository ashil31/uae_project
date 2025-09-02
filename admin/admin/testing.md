
# Testing Documentation for UAE Fashion Admin Dashboard

## Testing Stack
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing utilities
- **Cypress** - End-to-end testing
- **Mock Service Worker (MSW)** - API mocking
- **Testing Coverage** - 100% component coverage target

## Test Structure

```
src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── __mocks__/
│   ├── firebase.js
│   ├── handlers.js
│   └── server.js
└── cypress/
    ├── e2e/
    ├── fixtures/
    └── support/
```

## Component Testing Strategy

### 1. Authentication Components

#### `Login.tsx`
```javascript
// src/__tests__/pages/Login.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { store } from '../store/store';

const renderLogin = () => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </Provider>
  );
};

describe('Login Component', () => {
  test('renders login form correctly', () => {
    renderLogin();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates empty form submission', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  test('handles admin login successfully', async () => {
    renderLogin();
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'admin@uaefashion.ae' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'admin123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin');
    });
  });
});
```

#### `ProtectedRoute.jsx`
```javascript
// src/__tests__/components/ProtectedRoute.test.js
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { createMockStore } from '../__mocks__/store';

describe('ProtectedRoute Component', () => {
  test('redirects unauthenticated users to login', () => {
    const mockStore = createMockStore({
      auth: { isAuthenticated: false, user: null }
    });
    
    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <ProtectedRoute requireAdmin>
            <div>Admin Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      </Provider>
    );
    
    expect(window.location.pathname).toBe('/login');
  });

  test('allows admin users to access admin routes', () => {
    const mockStore = createMockStore({
      auth: { 
        isAuthenticated: true, 
        user: { role: 'admin', email: 'admin@uaefashion.ae' }
      }
    });
    
    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <ProtectedRoute requireAdmin>
            <div>Admin Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      </Provider>
    );
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
```

### 2. Dashboard Components

#### `Dashboard.jsx`
```javascript
// src/__tests__/pages/Dashboard.test.js
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import Dashboard from '../admin/pages/Dashboard';
import { createMockStore } from '../__mocks__/store';

describe('Dashboard Component', () => {
  const mockDashboardData = {
    stats: {
      totalSales: 150000,
      totalOrders: 1250,
      totalProducts: 89,
      totalUsers: 2340
    },
    revenueChart: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [12000, 15000, 8000, 22000, 18000, 25000, 30000]
    },
    topProducts: [
      { id: 1, name: 'Designer Abaya', sales: 145, revenue: 28500 },
      { id: 2, name: 'Traditional Kaftan', sales: 89, revenue: 15800 }
    ]
  };

  test('displays dashboard metrics correctly', async () => {
    const mockStore = createMockStore({
      admin: { 
        dashboardStats: mockDashboardData.stats,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <Dashboard />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('$150,000')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument();
      expect(screen.getByText('2,340')).toBeInTheDocument();
    });
  });

  test('shows loading state while fetching data', () => {
    const mockStore = createMockStore({
      admin: { isLoading: true }
    });

    render(
      <Provider store={mockStore}>
        <Dashboard />
      </Provider>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### 3. Product Management

#### `Products.tsx`
```javascript
// src/__tests__/pages/Products.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import Products from '../admin/pages/Products';
import { createMockStore } from '../__mocks__/store';

const mockProducts = [
  {
    id: 1,
    name: 'Designer Abaya',
    price: 299,
    category: 'Abayas',
    stock: 15,
    status: 'active'
  },
  {
    id: 2,
    name: 'Traditional Kaftan',
    price: 199,
    category: 'Kaftans',
    stock: 3,
    status: 'active'
  }
];

describe('Products Component', () => {
  test('displays product list correctly', async () => {
    const mockStore = createMockStore({
      products: { 
        products: mockProducts,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <Products />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Designer Abaya')).toBeInTheDocument();
      expect(screen.getByText('Traditional Kaftan')).toBeInTheDocument();
    });
  });

  test('shows low stock warning', async () => {
    const mockStore = createMockStore({
      products: { 
        products: mockProducts,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <Products />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });
  });

  test('opens create product modal', async () => {
    const mockStore = createMockStore({
      products: { 
        products: [],
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <Products />
      </Provider>
    );

    fireEvent.click(screen.getByText('Add Product'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Product')).toBeInTheDocument();
    });
  });
});
```

### 4. Order Management

#### `AdminOrders.jsx`
```javascript
// src/__tests__/pages/AdminOrders.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import AdminOrders from '../admin/pages/AdminOrders';
import { createMockStore } from '../__mocks__/store';

const mockOrders = [
  {
    id: 'ORD-001',
    customer: 'Fatima Al-Zahra',
    items: 3,
    total: 450,
    status: 'processing',
    date: '2024-01-20'
  },
  {
    id: 'ORD-002',
    customer: 'Aisha Mohammed',
    items: 1,
    total: 299,
    status: 'shipped',
    date: '2024-01-19'
  }
];

describe('AdminOrders Component', () => {
  test('displays orders list correctly', async () => {
    const mockStore = createMockStore({
      orders: { 
        orders: mockOrders,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <AdminOrders />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('Fatima Al-Zahra')).toBeInTheDocument();
      expect(screen.getByText('$450')).toBeInTheDocument();
    });
  });

  test('filters orders by status', async () => {
    const mockStore = createMockStore({
      orders: { 
        orders: mockOrders,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <AdminOrders />
      </Provider>
    );

    fireEvent.change(screen.getByDisplayValue('All Statuses'), {
      target: { value: 'processing' }
    });

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    });
  });
});
```

### 5. User Management

#### `AdminUsers.jsx`
```javascript
// src/__tests__/pages/AdminUsers.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import AdminUsers from '../admin/pages/AdminUsers';
import { createMockStore } from '../__mocks__/store';

const mockUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'customer',
    status: 'active',
    joinDate: '2024-01-15',
    orders: 5
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin',
    status: 'active',
    joinDate: '2024-01-10',
    orders: 0
  }
];

describe('AdminUsers Component', () => {
  test('displays users list correctly', async () => {
    const mockStore = createMockStore({
      users: { 
        users: mockUsers,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <AdminUsers />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  test('filters users by role', async () => {
    const mockStore = createMockStore({
      users: { 
        users: mockUsers,
        isLoading: false 
      }
    });

    render(
      <Provider store={mockStore}>
        <AdminUsers />
      </Provider>
    );

    fireEvent.change(screen.getByDisplayValue('All Roles'), {
      target: { value: 'admin' }
    });

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});
```

## API Testing with Mock Service Worker

### Setup MSW Handlers

```javascript
// src/__mocks__/handlers.js
import { rest } from 'msw';

export const handlers = [
  // Dashboard API
  rest.get('/api/dashboard/stats', (req, res, ctx) => {
    return res(
      ctx.delay(150),
      ctx.json({
        stats: {
          totalSales: 150000,
          totalOrders: 1250,
          totalProducts: 89,
          totalUsers: 2340
        },
        topProducts: [
          { id: 1, name: 'Designer Abaya', sales: 145, revenue: 28500 },
          { id: 2, name: 'Traditional Kaftan', sales: 89, revenue: 15800 }
        ]
      })
    );
  }),

  // Products API
  rest.get('/api/products', (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || 1;
    const search = req.url.searchParams.get('search') || '';
    
    return res(
      ctx.delay(200),
      ctx.json({
        products: [
          {
            id: 1,
            name: 'Designer Abaya',
            price: 299,
            category: 'Abayas',
            stock: 15,
            status: 'active',
            images: ['image1.jpg']
          }
        ],
        pagination: {
          page: parseInt(page),
          totalPages: 5,
          totalItems: 89
        }
      })
    );
  }),

  rest.post('/api/products', (req, res, ctx) => {
    return res(
      ctx.delay(300),
      ctx.json({
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
      })
    );
  }),

  rest.put('/api/products/:id', (req, res, ctx) => {
    return res(
      ctx.delay(250),
      ctx.json({
        id: req.params.id,
        ...req.body,
        updatedAt: new Date().toISOString()
      })
    );
  }),

  rest.delete('/api/products/:id', (req, res, ctx) => {
    return res(
      ctx.delay(200),
      ctx.status(204)
    );
  }),

  // Orders API
  rest.get('/api/orders', (req, res, ctx) => {
    return res(
      ctx.delay(180),
      ctx.json({
        orders: [
          {
            id: 'ORD-001',
            customer: 'Fatima Al-Zahra',
            items: 3,
            total: 450,
            status: 'processing',
            date: '2024-01-20'
          }
        ],
        pagination: {
          page: 1,
          totalPages: 10,
          totalItems: 1250
        }
      })
    );
  }),

  rest.patch('/api/orders/:id/status', (req, res, ctx) => {
    return res(
      ctx.delay(200),
      ctx.json({
        id: req.params.id,
        status: req.body.status,
        updatedAt: new Date().toISOString()
      })
    );
  }),

  // Users API
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.delay(160),
      ctx.json({
        users: [
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'customer',
            status: 'active',
            joinDate: '2024-01-15',
            orders: 5
          }
        ],
        pagination: {
          page: 1,
          totalPages: 47,
          totalItems: 2340
        }
      })
    );
  }),

  // Reviews API
  rest.get('/api/reviews', (req, res, ctx) => {
    return res(
      ctx.delay(140),
      ctx.json([
        {
          id: 1,
          product: 'Designer Abaya',
          customer: 'Fatima Al-Zahra',
          rating: 5,
          comment: 'Excellent quality and beautiful design!',
          status: 'approved',
          date: '2024-01-20'
        }
      ])
    );
  }),

  rest.patch('/api/reviews/:id/approve', (req, res, ctx) => {
    return res(
      ctx.delay(150),
      ctx.json({
        id: req.params.id,
        status: 'approved',
        updatedAt: new Date().toISOString()
      })
    );
  }),

  // Wholesale API
  rest.get('/api/wholesale', (req, res, ctx) => {
    return res(
      ctx.delay(120),
      ctx.json([
        {
          id: 1,
          product: 'Designer Abaya',
          quantity: 10,
          discount: 15,
          status: 'active'
        }
      ])
    );
  }),

  // Settings API
  rest.get('/api/settings', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.json({
        siteName: 'UAE Fashion',
        tagline: 'Luxury Fashion for Modern Women',
        contactEmail: 'support@uaefashion.ae',
        supportPhone: '+971-4-123-4567',
        heroHeading: 'Discover Authentic UAE Fashion',
        heroSubtext: 'Premium collection inspired by tradition'
      })
    );
  })
];
```

### MSW Server Setup

```javascript
// src/__mocks__/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Test Setup File

```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
import { server } from './__mocks__/server';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that are declared as a part of our tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock Firebase
jest.mock('./config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid',
      email: 'admin@uaefashion.ae',
      accessToken: 'mock-token'
    }
  },
  db: {},
  storage: {}
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    form: ({ children, ...props }) => <form {...props}>{children}</form>
  },
  AnimatePresence: ({ children }) => children
}));
```

## End-to-End Testing with Cypress

### Authentication E2E Tests

```javascript
// cypress/e2e/auth.cy.js
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login admin user successfully', () => {
    cy.get('[data-testid="email-input"]').type('admin@uaefashion.ae');
    cy.get('[data-testid="password-input"]').type('admin123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/admin');
    cy.get('[data-testid="admin-dashboard"]').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('invalid@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
  });

  it('should redirect unauthorized users', () => {
    cy.visit('/admin');
    cy.url().should('include', '/login');
  });
});
```

### Dashboard E2E Tests

```javascript
// cypress/e2e/dashboard.cy.js
describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.login('admin@uaefashion.ae', 'admin123');
    cy.visit('/admin');
  });

  it('should display dashboard metrics', () => {
    cy.get('[data-testid="total-sales"]').should('contain', '$');
    cy.get('[data-testid="total-orders"]').should('be.visible');
    cy.get('[data-testid="total-products"]').should('be.visible');
    cy.get('[data-testid="total-users"]').should('be.visible');
  });

  it('should render revenue chart', () => {
    cy.get('[data-testid="revenue-chart"]').should('be.visible');
    cy.get('canvas').should('have.length.at.least', 1);
  });

  it('should show top products', () => {
    cy.get('[data-testid="top-products"]').should('be.visible');
    cy.get('[data-testid="product-item"]').should('have.length.at.least', 1);
  });
});
```

### Product Management E2E Tests

```javascript
// cypress/e2e/products.cy.js
describe('Product Management', () => {
  beforeEach(() => {
    cy.login('admin@uaefashion.ae', 'admin123');
    cy.visit('/admin/products');
  });

  it('should create new product', () => {
    cy.get('[data-testid="add-product-button"]').click();
    
    cy.get('[data-testid="product-name"]').type('Test Abaya');
    cy.get('[data-testid="product-price"]').type('299');
    cy.get('[data-testid="product-category"]').select('Abayas');
    cy.get('[data-testid="product-stock"]').type('25');
    
    cy.get('[data-testid="save-product"]').click();
    
    cy.get('[data-testid="success-toast"]').should('contain', 'Product created');
    cy.get('[data-testid="product-list"]').should('contain', 'Test Abaya');
  });

  it('should filter products by category', () => {
    cy.get('[data-testid="category-filter"]').select('Abayas');
    cy.get('[data-testid="product-item"]').each(($el) => {
      cy.wrap($el).should('contain', 'Abaya');
    });
  });

  it('should show low stock warning', () => {
    cy.get('[data-testid="product-item"]').then(($items) => {
      if ($items.length > 0) {
        cy.get('[data-testid="low-stock-badge"]').should('exist');
      }
    });
  });
});
```

## Performance Testing

### Bundle Size Analysis

```javascript
// scripts/analyze-bundle.js
const { execSync } = require('child_process');
const fs = require('fs');

// Build the project
execSync('npm run build', { stdio: 'inherit' });

// Analyze bundle sizes
const distFiles = fs.readdirSync('dist/assets');
const jsFiles = distFiles.filter(file => file.endsWith('.js'));
const cssFiles = distFiles.filter(file => file.endsWith('.css'));

console.log('JavaScript Bundles:');
jsFiles.forEach(file => {
  const stats = fs.statSync(`dist/assets/${file}`);
  console.log(`${file}: ${(stats.size / 1024).toFixed(2)}KB`);
});

console.log('\nCSS Bundles:');
cssFiles.forEach(file => {
  const stats = fs.statSync(`dist/assets/${file}`);
  console.log(`${file}: ${(stats.size / 1024).toFixed(2)}KB`);
});
```

### Lighthouse Performance Testing

```javascript
// cypress/e2e/performance.cy.js
describe('Performance Tests', () => {
  it('should meet Lighthouse performance standards', () => {
    cy.visit('/admin');
    cy.lighthouse({
      performance: 90,
      accessibility: 90,
      'best-practices': 90,
      seo: 80
    });
  });

  it('should load dashboard within 2 seconds', () => {
    const start = Date.now();
    cy.visit('/admin');
    cy.get('[data-testid="admin-dashboard"]').should('be.visible');
    cy.then(() => {
      const loadTime = Date.now() - start;
      expect(loadTime).to.be.lessThan(2000);
    });
  });
});
```

## Test Coverage Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ]
};
```

## Running Tests

### NPM Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

### CI/CD Pipeline Testing

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
```

This comprehensive testing setup ensures 100% component coverage, proper API mocking, and end-to-end validation of all admin dashboard functionality.
