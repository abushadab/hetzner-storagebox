# Storage Management System

A Next.js application for managing storage boxes and file storage with multi-tenant support, role-based access control, and comprehensive security features.

## Features

- **Storage Box Management**: Manage and monitor external storage boxes
- **File Storage**: Upload, download, and share files using Supabase storage
- **Multi-tenant Support**: Role-based access control (Admin, Moderator, Viewer)
- **Security**: Encrypted credentials, secure authentication
- **User Management**: Invite system, user roles, and permissions

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Authentication**: Supabase Auth with secure session management
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage & External Storage Boxes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Hetzner account (for storage box features)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd nextjs
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.template .env.local
```

4. Configure your `.env.local` file with:
   - Supabase credentials
   - Encryption key
   - Storage API credentials

5. Run the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                # Next.js app directory
│   ├── api/           # API routes
│   ├── app/           # Protected app pages
│   ├── auth/          # Authentication pages
│   └── legal/         # Legal documents
├── components/        # React components
├── lib/              # Utility functions and configurations
└── middleware.ts     # Next.js middleware for auth
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## Security

- All sensitive data is encrypted using AES-256-GCM
- Environment variables for configuration
- Role-based access control
- 2FA authentication support
- Secure session management

## License

[Add your license here]