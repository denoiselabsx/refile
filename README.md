
# ReFile — Frontend

A modern web application for file-based AI automation and community-driven command presets. Built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **Convex**.

A [Denoise Labs](https://denoiselabs.com) product.

## Features

- **AI File Automation**: Upload files and receive AI-generated Linux commands to process them.
- **Preset Library**: Browse, search, and use community-contributed command presets for image, video, audio, and PDF processing.
- **Preset Creation**: Authenticated users can create, edit, and share their own processing presets.
- **Google Authentication**: Secure login via Google OAuth.
- **User Dashboard**: Manage your uploads, view recent prompts, and track processing status.
- **Like & Save Presets**: Like and save your favorite presets for quick access.
- **Responsive UI**: Clean, modern interface with dark mode support.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Lucide Icons
- **Backend API**: FastAPI (expected, based on API calls)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Google OAuth via Arctic
- **State Management**: React Context API
- **Other**: PostCSS, Shadcn UI, clsx, tailwind-merge

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm, yarn, pnpm, or bun
- Supabase project (for database and authentication)
- Backend API (FastAPI or compatible)

### Installation

1. **Clone the repository:**
	```bash
	git clone <repo-url>
	cd refile-frontend
	```

2. **Install dependencies:**
	```bash
	npm install
	# or
	yarn install
	```

3. **Configure environment variables:**
	- Create a `.env` file in the root with your Supabase and API credentials:
	  ```
	  NEXT_PUBLIC_API_URL=http://localhost:8000
	  SUPABASE_URL=your_supabase_url
	  SUPABASE_ANON_KEY=your_supabase_anon_key
	  ```

4. **Run the development server:**
	```bash
	npm run dev
	```
	Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

- Run the SQL scripts in `src/db/schema.sql` and `src/db/add-foreign-keys.sql` on your Supabase/Postgres instance.
- (Optional) Seed with sample presets using `src/db/sample-presets.sql`.

## Project Structure

- `src/app/` — Next.js app directory (pages, API routes, layouts)
- `src/components/` — Reusable React components (UI, file upload, AI response, etc.)
- `src/contexts/` — React context providers (auth, etc.)
- `src/db/` — Database helpers, SQL schema, and sample data
- `src/services/` — API service functions for backend communication
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utility functions and server-side logic
- `public/` — Static assets

## Usage

- **Upload files** and enter a prompt to get AI-generated commands and processed results.
- **Browse and use presets** for common file operations.
- **Create and share your own presets** (requires Google login).
- **Like, save, and manage** your favorite presets.

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements and bug fixes.

## License

[MIT](LICENSE)
