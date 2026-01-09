# Frontend System Architecture Diagram

## Technology Stack
- **Framework**: React 19.1.0
- **Routing**: React Router DOM 7.11.0
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite 6.3.5
- **Charts**: Recharts 3.6.0
- **PDF Generation**: jsPDF + jsPDF-autotable

## Application Flow

```mermaid
graph TB
    %% Entry Points
    A[User Entry] --> B{Authentication Check}
    B -->|Not Authenticated| C[Login Page]
    B -->|Authenticated| D[Main Application]
    
    %% Main Application Layout
    D --> E[App Layout]
    E --> F[Sidebar Navigation]
    E --> G[Main Content Area]
    
    %% Sidebar Navigation
    F --> H[Dashboard]
    F --> I[Items Management]
    F --> J[Stock & Warehouse]
    F --> K[Reorder Management]
    F --> L[Purchase Orders & Suppliers]
    F --> M[GRN Management]
    F --> N[Transfers]
    F --> O[Reports]
    F --> P[Profile]
    F --> Q[Logout]
    
    %% Page Components
    G --> R[Dynamic Page Content]
    R --> S[Dashboard Component]
    R --> T[Items Component]
    R --> U[StockWarehouse Component]
    R --> V[Reorder Component]
    R --> W[PurchaseOrdersSuppliers Component]
    R --> X[GRN Component]
    R --> Y[Transfers Component]
    R --> Z[Reports Component]
    R --> AA[MyProfile Component]
    
    %% Data Layer
    S --> BB[Supabase Client]
    T --> BB
    U --> BB
    V --> BB
    W --> BB
    X --> BB
    Y --> BB
    Z --> BB
    AA --> BB
    
    %% Database Tables
    BB --> CC[items Table]
    BB --> DD[reorder_suggestions Table]
    BB --> EE[purchase_orders Table]
    BB --> FF[suppliers Table]
    BB --> GG[stock Table]
    BB --> HH[transfers Table]
    BB --> II[grn Table]
    BB --> JJ[users Table]
    
    %% Authentication Flow
    C --> KK[Supabase Auth]
    KK --> LL{Login Success}
    LL -->|Success| D
    LL -->|Failure| C
    Q --> MM[Supabase SignOut]
    MM --> C
    
    %% Component Interactions
    T --> NN[Modal Component]
    U --> NN
    V --> NN
    W --> NN
    X --> NN
    Y --> NN
    
    %% PDF Generation
    Z --> OO[jsPDF Generation]
    OO --> PP[Download Reports]
    
    %% Real-time Updates
    S -.-> QQ[30-second Auto Refresh]
    QQ --> BB
```

## Component Architecture

### 1. Core Components
- **App.jsx**: Main application router and layout manager
- **Sidebar.jsx**: Navigation component with authentication-aware menu
- **Header.jsx**: Top navigation bar (if present)
- **Modal.jsx**: Reusable modal for forms and confirmations

### 2. Page Components Structure

#### Dashboard (`/`)
- Real-time statistics fetching
- Auto-refresh every 30 seconds
- Key metrics display:
  - Total Items
  - Low Stock Alerts
  - Critical Stock
  - Pending Reorders
  - Active Suppliers
  - Expiring Soon

#### Items Management (`/items`)
- CRUD operations for inventory items
- Item categorization
- Stock level tracking
- Supplier associations

#### Stock & Warehouse (`/stock`)
- Multi-warehouse support
- Stock level monitoring
- Location-based inventory
- Stock movement tracking

#### Reorder Management (`/reorder`)
- Automated reorder suggestions
- Severity-based alerts (warning/critical)
- Reorder approval workflow
- Supplier integration

#### Purchase Orders & Suppliers (`/purchase-orders-suppliers`)
- Purchase order creation and management
- Supplier database
- PO status tracking
- Supplier performance metrics

#### GRN Management (`/grn`)
- Goods Receipt Note processing
- Delivery verification
- Stock update automation
- Quality control integration

#### Transfers (`/transfers`)
- Inter-warehouse transfers
- Transfer request workflow
- Transfer status tracking
- Inventory reconciliation

#### Reports (`/reports`)
- PDF report generation
- Data visualization with Recharts
- Custom date range filtering
- Export functionality

#### Profile (`/profile`)
- User profile management
- Authentication settings
- User preferences

## Data Flow Patterns

### 1. Authentication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant L as Login Page
    participant S as Supabase Auth
    participant A as App
    
    U->>L: Enter credentials
    L->>S: Authenticate request
    S-->>L: Auth token
    L->>A: Redirect with token
    A->>S: Validate token
    S-->>A: User data
    A->>U: Show dashboard
```

### 2. Data Fetching Pattern
```mermaid
sequenceDiagram
    participant C as Component
    participant SC as Supabase Client
    participant DB as Database
    participant UI as UI Update
    
    C->>SC: Query request
    SC->>DB: SQL Query
    DB-->>SC: Data response
    SC-->>C: Processed data
    C->>UI: Render update
```

### 3. Real-time Updates
```mermaid
sequenceDiagram
    participant D as Dashboard
    participant T as Timer (30s)
    participant S as Supabase
    participant UI as UI Refresh
    
    loop Every 30 seconds
        T->>D: Trigger fetch
        D->>S: Fetch latest data
        S-->>D: Updated statistics
        D->>UI: Re-render components
    end
```

## State Management
- **Local State**: useState hooks for component-level state
- **Authentication**: Supabase auth session management
- **Data Caching**: Component-level data caching with refresh intervals
- **Real-time**: Polling-based updates for dashboard metrics

## Security Features
- Supabase Row Level Security (RLS)
- JWT-based authentication
- Route protection for authenticated pages
- Environment variable configuration for API keys

## Performance Optimizations
- Component-based lazy loading potential
- Efficient data fetching with specific queries
- Auto-refresh intervals for real-time data
- PDF generation on-demand

## Integration Points
- **Backend API**: Supabase REST API
- **Authentication**: Supabase Auth service
- **File Storage**: Supabase Storage (if used)
- **Real-time**: Supabase Realtime subscriptions (potential enhancement)

This architecture provides a scalable, maintainable frontend system with clear separation of concerns and efficient data management patterns.

# System Operation Flow

## User Journey Scenarios

### 1. Complete Inventory Management Workflow

```mermaid
journey
    title Inventory Manager Daily Workflow
    section Morning Check
      Login to System: 5: User
      View Dashboard: 5: User
      Check Stock Alerts: 4: User
      Review Critical Items: 5: User
    section Stock Management
      Update Stock Levels: 4: User
      Process Reorders: 4: User
      Create Purchase Orders: 3: User
    section Daily Operations
      Receive Goods (GRN): 4: User
      Process Transfers: 3: User
      Generate Reports: 4: User
```

### 2. Real-time Data Flow Demonstration

```mermaid
graph LR
    %% User Interaction Flow
    A[User Action] --> B[Component Event Handler]
    B --> C[State Update]
    C --> D[UI Re-render]
    
    %% Data Synchronization
    E[Database Change] --> F[Supabase Trigger]
    F --> G[Real-time Subscription]
    G --> H[Component Update]
    H --> D
    
    %% Auto-refresh Mechanism
    I[30-Second Timer] --> J[Fetch Latest Data]
    J --> K[Compare with Local State]
    K --> L{Data Changed?}
    L -->|Yes| M[Update UI]
    L -->|No| N[Skip Update]
    M --> D
```

### 3. Purchase Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Pending Approval: Submit PO
    Pending Approval --> Approved: Manager Approval
    Pending Approval --> Rejected: Manager Rejection
    Approved --> Sent to Supplier: Send PO
    Sent to Supplier --> Partially Received: Some Items Delivered
    Sent to Supplier --> Fully Received: All Items Delivered
    Partially Received --> Fully Received: Remaining Items Delivered
    Fully Received --> Completed: GRN Processed
    Rejected --> Draft: Edit & Resubmit
    Completed --> [*]
```

## Interactive Component Flow

### Dashboard Real-time Updates

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant Timer
    participant Supabase
    participant Database
    
    Note over User, Database: Initial Page Load
    User->>Dashboard: Navigate to Dashboard
    Dashboard->>Supabase: Fetch initial data
    Supabase->>Database: Query all tables
    Database-->>Supabase: Return statistics
    Supabase-->>Dashboard: Processed data
    Dashboard->>User: Display metrics
    
    Note over User, Database: Real-time Updates
    loop Every 30 seconds
        Timer->>Dashboard: Trigger refresh
        Dashboard->>Supabase: Fetch latest data
        Supabase->>Database: Query updated stats
        Database-->>Supabase: New data
        Supabase-->>Dashboard: Updated metrics
        Dashboard->>User: Update UI without refresh
    end
```

### Multi-step Workflow: Stock Reorder Process

```mermaid
flowchart TD
    A[Low Stock Detected] --> B{Stock Level}
    B -->|Warning| C[Create Reorder Suggestion]
    B -->|Critical| D[Urgent Reorder Alert]
    
    C --> E[Manager Review]
    D --> E
    
    E --> F{Approval Decision}
    F -->|Approved| G[Create Purchase Order]
    F -->|Rejected| H[Cancel Reorder]
    
    G --> I[Select Supplier]
    I --> J[Send PO to Supplier]
    J --> K[Await Delivery]
    
    K --> L[Goods Received]
    L --> M[Process GRN]
    M --> N[Update Stock Levels]
    N --> O[Reorder Complete]
    
    H --> P[Update Item Status]
    P --> Q[Monitor Stock]
```

## Component Interaction Patterns

### Modal-based CRUD Operations

```mermaid
graph TB
    A[Main Page] --> B[Add/Edit Button]
    B --> C[Open Modal]
    C --> D[Form Component]
    D --> E[Validation]
    E --> F{Valid Data?}
    F -->|No| G[Show Errors]
    G --> D
    F -->|Yes| H[Submit to Supabase]
    H --> I{API Success?}
    I -->|No| J[Show Error Message]
    I -->|Yes| K[Close Modal]
    K --> L[Refresh Data]
    L --> A
    J --> D
```

### Navigation State Management

```mermaid
stateDiagram-v2
    [*] --> Login
    Login --> Dashboard: Auth Success
    Dashboard --> Items: Click Items
    Dashboard --> Stock: Click Stock
    Dashboard --> Reorder: Click Reorder
    Dashboard --> POs: Click POs
    Dashboard --> GRN: Click GRN
    Dashboard --> Transfers: Click Transfers
    Dashboard --> Reports: Click Reports
    Dashboard --> Profile: Click Profile
    
    Items --> Dashboard: Click Dashboard
    Stock --> Dashboard: Click Dashboard
    Reorder --> Dashboard: Click Dashboard
    POs --> Dashboard: Click Dashboard
    GRN --> Dashboard: Click Dashboard
    Transfers --> Dashboard: Click Dashboard
    Reports --> Dashboard: Click Dashboard
    Profile --> Dashboard: Click Dashboard
    
    Dashboard --> Login: Logout
    Items --> Login: Logout
    Stock --> Login: Logout
    Reorder --> Login: Logout
    POs --> Login: Logout
    GRN --> Login: Logout
    Transfers --> Login: Logout
    Reports --> Login: Logout
    Profile --> Login: Logout
```

## Performance & User Experience Flow

### Loading States and Error Handling

```mermaid
graph LR
    A[User Action] --> B[Show Loading State]
    B --> C[API Call]
    C --> D{Response}
    D -->|Success| E[Update Data]
    D -->|Error| F[Show Error Message]
    E --> G[Hide Loading]
    F --> G
    G --> H[Updated UI]
```

### Data Caching Strategy

```mermaid
graph TB
    A[Component Mount] --> B[Check Local Cache]
    B --> C{Cache Valid?}
    C -->|Yes| D[Show Cached Data]
    C -->|No| E[Fetch from API]
    E --> F[Update Cache]
    F --> G[Show Fresh Data]
    D --> H[Background Refresh]
    H --> I[Update Cache if Changed]
    I --> J[Update UI if Needed]
    G --> K[Set Cache Timer]
    K --> L[Auto-expire Cache]
```

## System Response Time Flow

```mermaid
gantt
    title System Response Timeline
    dateFormat X
    axisFormat %s
    
    section User Interaction
    Click Action    :0, 0.1s
    Component Update :0.1, 0.2s
    
    section API Communication
    API Request     :0.2, 0.4s
    Database Query  :0.4, 0.8s
    Response Return :0.8, 1.0s
    
    section UI Updates
    State Update    :1.0, 1.1s
    Re-render       :1.1, 1.3s
    User Sees Result :1.3, 1.3s
```

This comprehensive flow demonstrates how the system operates in real-world scenarios, showing the complete user journey from login through various inventory management operations, with emphasis on real-time data updates and smooth user experience.
