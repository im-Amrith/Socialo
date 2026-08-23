# Socialo - Community Management Platform

Socialo is a robust, responsive web application built to streamline community and facility management. It allows residents to easily report issues and track their progress, while providing administrators with a powerful dashboard to triage, assign, update, and manage SLAs for all complaints.

## Tech Stack
- **Frontend**: React (Vite), TypeScript, TailwindCSS, Zustand (State Management), React Router.
- **Backend**: FastAPI (Python), SQLAlchemy (asyncpg), Uvicorn.
- **Database**: PostgreSQL (managed via Supabase).
- **Authentication**: Supabase Auth.
- **Media Storage**: Google Drive API.
- **Notifications**: Background Tasks with Brevo HTTP API.

---

## Setup Guide

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- A Supabase Project
- A Google Cloud Project with Google Drive API enabled (and a Service Account JSON key)
- A free Brevo (Sendinblue) account for the email HTTP API

### 2. Environment Variables
Copy the provided `.env.example` to the respective backend and frontend directories.
- `backend/.env`
- `frontend/.env`

Ensure you fill in your Supabase URLs, database connection strings, and `BREVO_API_KEY`.

### 3. Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Place your Google Drive Service Account JSON key in the `backend` directory.
6. Initialize the database schema. If you have a clean PostgreSQL database, you can run the provided `schema.sql` script directly in your database console.
7. Start the server: `uvicorn main:app --reload` (Runs on port 8000)

### 4. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev` (Runs on port 5173)

---

## Database Schema Overview

The system uses a PostgreSQL database. Below is an overview of the core tables.

### `users`
Stores all registered users. Roles define permissions.
- `id` (UUID, PK)
- `auth_id` (UUID, Supabase Auth Reference)
- `email` (String)
- `name` (String)
- `role` (Enum: `ADMIN`, `RESIDENT`, `TECHNICIAN`)
- `flat_number` (String)

### `complaints`
Stores the current state of a ticket.
- `id` (UUID, PK)
- `ticket_number` (String, Unique Auto-generated)
- `resident_id` (UUID, FK -> users)
- `category` (String)
- `title` (String)
- `description` (Text)
- `photo_url` (String, Google Drive Link)
- `status` (Enum: `OPEN`, `IN_PROGRESS`, `RESOLVED`)
- `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`)
- `due_date` (Timestampz, Used for dynamic Overdue SLA calculation)

### `complaint_history`
An immutable, append-only ledger tracking all ticket mutations.
- `id` (UUID, PK)
- `complaint_id` (UUID, FK -> complaints)
- `actor_id` (UUID, FK -> users)
- `old_status`, `new_status` (Enum)
- `note` (String)
- `timestamp` (Timestampz)

### `notices`
Stores community board announcements.
- `id` (UUID, PK)
- `title`, `content` (String)
- `category` (String)
- `is_important` (Boolean, Pinned flag)
- `author_id` (UUID, FK -> users)

---

## API Documentation

The backend is built with FastAPI, which automatically generates interactive Swagger documentation. When the backend is running, you can access the full interactive API docs at:
**`http://localhost:8000/docs`**

### Key Endpoints

#### **Authentication & Users**
- `POST /api/users` - Register a new user profile in the database.
- `GET /api/users/me` - Fetch the current authenticated user's profile.
- `GET /api/users/admin/technicians` - Get all users with the `TECHNICIAN` role.

#### **Complaints (Tickets)**
- `POST /api/complaints` - (Resident) Create a new ticket. Trigger background AI categorization if title is empty.
- `GET /api/complaints` - (Resident/Admin) Fetch tickets. Admins see all; Residents see only their own.
- `GET /api/complaints/{id}` - Fetch a specific ticket and its entire history.
- `DELETE /api/complaints/{id}` - (Admin) Delete a ticket.

#### **Admin Operations (Complaints)**
- `PATCH /api/complaints/{id}/status` - Update ticket status and append to `complaint_history`. Triggers email.
- `PATCH /api/complaints/{id}/priority` - Update ticket priority and append to `complaint_history`.
- `PATCH /api/complaints/{id}/assign` - Assign a technician to a ticket.
- `PATCH /api/complaints/{id}/due_date` - Manually override the SLA due date.

#### **Community Board (Notices)**
- `GET /api/notices` - Fetch all community notices (ordered by importance and date).
- `POST /api/notices` - (Admin) Create a new notice. Triggers broadcast email to all residents.
- `DELETE /api/notices/{id}` - (Admin) Delete a notice.

#### **Media & Integrations**
- `POST /api/upload/sign` - Generate a direct upload pipeline to Google Drive.
- `POST /api/ai/triage` - Use Gemini AI to auto-generate a ticket title based on the description.
- `POST /api/ai/verify` - Use Gemini Vision AI to verify if an uploaded image is relevant to a complaint.
