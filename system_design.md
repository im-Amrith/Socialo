# System Design: Socialo Community Management

This document outlines the architectural decisions and technical workflows powering the core features of the Socialo community management platform. The system is designed around a lightweight, asynchronous FastAPI backend backed by PostgreSQL (via Supabase), and a React frontend.

## 1. Complaint History Model

The complaint history system is built on an **append-only, immutable ledger pattern** to ensure complete auditability and traceability of every ticket's lifecycle.

Instead of merely overwriting the current state of a complaint, the database schema splits concerns into two tables: `complaints` (current state) and `complaint_history` (event ledger). 
- Whenever an Admin interacts with a ticket (changing status, updating priority, altering the SLA deadline, or leaving a note), a database transaction is initiated.
- The `complaints` table is updated with the new state.
- Simultaneously, a new row is inserted into `complaint_history` capturing the `complaint_id`, `actor_id` (who made the change), `old_status`, `new_status`, a context `note`, and an auto-generated `timestamp`.

**Advantages:**
This pattern guarantees that no state transition is lost. It allows the frontend to render a rich, chronological timeline of events for both the Resident and the Admin, creating transparency and accountability for community management.

## 2. Overdue Detection (SLA Management)

To manage Service Level Agreements (SLAs) without the overhead of heavy background polling or cron jobs, overdue detection is implemented via **dynamic, on-the-fly calculation** anchored by a discrete `due_date` column.

- **Assignment**: When a ticket is created or its priority is modified, a `due_date` is calculated and persisted (e.g., High Priority = 24 hours, Medium = 48 hours, Low = 72 hours). Admins are also granted the capability to manually override this `due_date` to accommodate complex issues.
- **Detection**: The system does not write an "overdue" boolean to the database. Instead, "overdue" is a derived state. When the Admin Dashboard fetches active complaints, the frontend (and backend sorting logic) compares the current UTC timestamp against the `due_date`. If `current_time > due_date` and the status is not `RESOLVED`, the ticket is flagged as overdue.
- **Surfacing**: Overdue tickets are automatically prioritized in the dashboard's sorting algorithm, bubbling them to the very top of the Admin's queue and highlighting them with a distinct red UI treatment to demand immediate attention.

## 3. Photo Handling

To maintain a lightweight database and server architecture, media handling is offloaded to a **dedicated cloud storage provider (Google Drive API)**.

- **Upload Flow**: When a Resident submits a complaint with a photo, the frontend sends the file payload to a secure FastAPI endpoint. The backend processes this file in-memory and authenticates with Google Drive using a Service Account.
- **Storage & Permissions**: The file is uploaded to a specific, isolated folder within Google Drive. The backend immediately patches the file's permissions to allow public read access, generating a permanent, direct-view URL.
- **Persistence**: Only this lightweight URL string is saved to the PostgreSQL `complaints` table under the `photo_url` column. 

**Advantages:**
This approach entirely circumvents the complexities of managing local file systems, handling block storage scaling, or bloating the PostgreSQL database with binary blobs. It also leverages Google's global CDN for fast image delivery to the frontend.

## 4. Notification Flow

The notification architecture prioritizes **non-blocking user experiences** by leveraging FastAPI's `BackgroundTasks` combined with a standard SMTP protocol.

- **Triggering**: Notifications are triggered by specific state mutations—primarily when an Admin updates a ticket's status, or when a new Community Notice is published.
- **Asynchronous Execution**: Rather than forcing the HTTP request to wait for the notoriously slow SMTP handshake and dispatch process, the API endpoint immediately returns a success response to the client. The actual email dispatch function (`email_utils.py`) is pushed to a background worker queue native to the FastAPI event loop.
- **Dispatch**: The background task constructs an HTML-formatted payload. For ticket updates, it targets the specific resident's email. For Community Notices, the system executes a lightweight database query to retrieve all active resident emails, iterates through them, and dispatches the broadcast.
- **Infrastructure**: The current implementation utilizes the **Brevo (formerly Sendinblue) HTTP API** for robust email delivery. Because many cloud hosting platforms (like Render or Heroku) actively block outbound SMTP traffic on traditional ports (465, 587) to prevent abuse, the system completely circumvents this by offloading email delivery to Brevo via standard HTTPS (Port 443). This ensures emails are consistently and securely delivered in production without relying on complex, easily-blocked SMTP configurations.
