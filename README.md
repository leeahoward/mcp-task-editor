# mcp Task Editor

A comprehensive task and request management application built with Next.js 15, TypeScript, and Tailwind CSS. This application provides a user-friendly interface for managing project requests and their associated tasks with advanced features like search, filtering, sorting, and bulk operations.

## Features

### 📋 Request Management
- **Create, edit, and delete requests** with detailed descriptions
- **View request summaries** with completion statistics
- **Multi-select and bulk delete** for efficient management
- **Request completion tracking** with percentage indicators

### ✅ Task Management
- **Comprehensive task CRUD operations** within requests
- **Task status tracking** (done/approved states)
- **Task details and completion notes**
- **Individual task editing** with validation

### 🔍 Advanced Search & Filtering
- **Full-text search** across requests and tasks
- **Filter by completion status** (completed/pending)
- **Filter by task states** (done/approved)
- **Real-time search** with instant results

### 📊 Sorting & Pagination
- **Sort by multiple criteria**: request ID, completion percentage, task count, original request
- **Ascending/descending order** options
- **Paginated results** with customizable page sizes
- **Navigation controls** with page indicators

### 🔒 Data Integrity
- **File-based data storage** with JSON format
- **Atomic operations** with file locking
- **Automatic backups** with corruption recovery
- **Data validation** using Zod schemas
- **Checksum verification** for integrity

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd mcp-task-editor
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Start the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000) - you'll be automatically redirected to `/requests`

## Usage Guide

### Managing Requests

#### Creating a New Request
1. Navigate to the requests page (auto-redirect from root)
2. Click "Create New Request" 
3. Fill in the request details:
   - **Original Request**: Brief description of the request
   - **Split Details**: Detailed breakdown or additional information
   - **Completed**: Mark as completed if applicable
4. Click "Save" to create the request

#### Viewing and Editing Requests
- **Request List**: View all requests with completion statistics
- **Individual Request**: Click on a request ID to view detailed information
- **Edit Request**: Use the edit button to modify request details
- **Delete Request**: Use single or bulk delete options

#### Bulk Operations
1. **Select Multiple Requests**: Use checkboxes to select requests
2. **Bulk Delete**: Click "Delete Selected" to remove multiple requests
3. **Select All**: Use the header checkbox to select/deselect all visible requests

### Managing Tasks

#### Creating Tasks
1. Open a specific request
2. Navigate to the tasks section
3. Click "Add New Task"
4. Fill in task details:
   - **Title**: Short task description
   - **Description**: Detailed task information
   - **Status**: Set done/approved states
   - **Completed Details**: Add completion notes

#### Task Operations
- **Edit Tasks**: Click edit to modify task information
- **Mark as Done**: Update task completion status
- **Approve Tasks**: Mark tasks as approved
- **Delete Tasks**: Remove individual tasks

### Search and Filtering

#### Search Functionality
- **Global Search**: Use the search bar to find requests/tasks by content
- **Search Scope**: Searches across request descriptions, task titles, and IDs
- **Real-time Results**: Results update as you type

#### Filtering Options
- **Completion Status**: Filter by completed/pending requests
- **Task States**: Filter by presence of done/approved tasks
- **Combined Filters**: Use multiple filters simultaneously

#### Sorting
- **Sort Criteria**: Request ID, completion percentage, task count, original request
- **Sort Order**: Ascending or descending
- **Persistent Settings**: Sort preferences are maintained during session

### Data Management

#### Backup System
- **Automatic Backups**: Created before each data modification
- **Backup Rotation**: Maintains 10 most recent backups
- **Corruption Recovery**: Automatic restoration from valid backups
- **Manual Backup**: Force backup creation when needed

#### Data Integrity
- **File Locking**: Prevents concurrent modification conflicts
- **Validation**: All data validated against schemas before saving
- **Checksums**: Verify data integrity on read operations
- **Error Recovery**: Graceful handling of data corruption

## API Endpoints

### Requests API
- `GET /api/requests` - List requests with search/filter/pagination
- `POST /api/requests` - Create new request
- `GET /api/requests/[id]` - Get specific request
- `PUT /api/requests/[id]` - Update request
- `DELETE /api/requests/[id]` - Delete request

### Tasks API
- `GET /api/requests/[id]/tasks` - List tasks for request
- `POST /api/requests/[id]/tasks` - Create new task
- `GET /api/requests/[id]/tasks/[taskId]` - Get specific task
- `PUT /api/requests/[id]/tasks/[taskId]` - Update task
- `DELETE /api/requests/[id]/tasks/[taskId]` - Delete task

### Statistics API
- `GET /api/stats` - Get application statistics

## Development

### Project Structure
```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API route handlers
│   ├── requests/          # Request management pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
├── services/             # Business logic (TasksDataService)
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── schemas/              # Zod validation schemas
└── __tests__/            # Test suites
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

### Testing
- **Framework**: Vitest with ESM support
- **Coverage**: @vitest/coverage-v8
- **Test Types**: Unit tests, integration tests, API tests
- **Run Tests**: `npm test` or `npm run test:coverage`

## Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Validation**: Zod schemas
- **File Operations**: fs-extra with file locking
- **Testing**: Vitest, jsdom, @testing-library/jest-dom
- **Development**: ESLint, TypeScript strict mode

## Data Storage

The application uses a file-based storage system with `tasks.json` containing all requests and tasks. The data structure follows a strict schema with automatic validation and backup systems for reliability.

## Contributing

1. Follow TypeScript best practices
2. Use Zod for data validation
3. Write tests for new features
4. Update documentation for significant changes
5. Follow the established code style

## License

[Add your license information here]
