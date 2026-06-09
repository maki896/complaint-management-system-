# System Architecture Specification
## Oromia Science and Technology Authority Complaint Management System

This document specifies the software architecture, logical layout, security systems, and system workflow engines of the Complaint Management System (CMS).

---

## 1. Multi-Tier Architecture Overview
The system follows a highly modular, decoupled multi-tier architecture to support high scalability, security isolation, and straightforward maintainability.

```
+-------------------------------------------------------------+
|                   1. Presentation Layer                     |
|            (React.js SPA - Runs in User Browser)            |
+-------------------------------------------------------------+
                              |
                     HTTPS / AJAX / Fetch
                              v
+-------------------------------------------------------------+
|                     2. Security Layer                       |
|           (SSL/TLS Decryption, JWT Verification)            |
+-------------------------------------------------------------+
                              |
                       Secure Payloads
                              v
+-------------------------------------------------------------+
|                    3. Application Layer                     |
|           (Node.js / Express.js Web API Server)             |
+-------------------------------------------------------------+
                              |
                     Sequelize ORM Query
                              v
+-------------------------------------------------------------+
|                      4. Database Layer                      |
|       (PostgreSQL / MySQL / SQLite + File Repository)        |
+-------------------------------------------------------------+
```

### 1.1 Presentation Layer (Client-Side)
* **Framework:** React.js (compiled via Vite)
* **Characteristics:** Single Page Application (SPA). This layer is completely stateless regarding server memory, communicating exclusively through asynchronous JSON API requests. It handles UI rendering, client-side input validations, visual status dashboards, and responsive layout adjustments (Desktop, Laptop, Tablet, Mobile).

### 1.2 Security Layer (Cross-Cutting)
* **Transport Encryption:** SSL/TLS (HTTPS) terminates at the server level, encrypting all data in transit.
* **Authentication Tokens:** Signed, stateless JSON Web Tokens (JWT) store encrypted user identities and permissions in the client's memory.
* **Request Filtration:** Proactive sanitization middleware processes incoming requests to counter common security hazards (SQL injections, Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF)).

### 1.3 Application Layer (Server-Side)
* **Platform:** Node.js with Express.js
* **Logic Handlers:** Maps incoming request routes, invokes JWT/RBAC security middlewares, executes core business logic (e.g. tracking index generation, escalation alerts), handles file stream writes via `multer`, and utilizes Sequelize ORM to coordinate database transactions.

### 1.4 Database Layer (Storage)
* **Relational Store:** PostgreSQL/MySQL (SQLite in development). Handles database integrity, indices, and transactions.
* **Evidence Repository:** Local folder storage (`backend/uploads/`) mapping secure hash-prefixed physical file paths linked to database metadata.

---

## 2. Core Security & Compliance Mechanisms

### 2.1 Role-Based Access Control (RBAC)
The system maintains five user roles, each mapping to strict permission gates enforced by authorization middleware at the REST route level:

| Feature / Action | Citizen | Staff | Officer | Dept Head | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Submit External Complaint | **Yes** | No | No | No | No |
| Submit Internal Complaint | No | **Yes** | No | No | No |
| View Personal Complaints | **Yes** | **Yes** | No | No | No |
| Manage Org Hierarchy | No | No | No | No | **Yes** |
| Create Internal Accounts | No | No | No | No | **Yes** |
| View Unassigned Queue | No | No | No | No | **Yes** |
| Route to Department | No | No | No | No | **Yes** |
| Route to Officer | No | No | No | **Yes** | No |
| Document Investigation | No | No | **Yes** | No | No |
| Submit Case Resolution | No | No | **Yes** | No | No |
| Approve Resolutions | No | No | No | **Yes** | No |
| File Case Appeal (15 days) | **Yes** | **Yes** | No | No | No |
| View System Audit Logs | No | No | No | No | **Yes** |

### 2.2 Security Auditing & Immutable Logging
* Every state transition (e.g. `Assigned` to `In Progress`), user login (success or failed), file upload, and administrative account creation automatically triggers an audit trace record.
* These records capture user ID, timestamp, transaction ID, client IP address, and details.
* The database prevents deletion or alteration of audit logs.

### 2.3 Account Lockout Guard
* Captures failed login attempts sequentially on `Users` profiles.
* After **five consecutive invalid login attempts**, the profile status shifts to `locked` and `locked_until` is set to `current_time + 15 minutes`.
* Subsequent attempts are auto-rejected until the lock time expires, thwarting brute-force security threats.

---

## 3. Workflow State Transition Engine

The lifecycle states of a complaint are strictly validated. No out-of-order transitions are allowed.

```
       +-----------+
       | Submitted |
       +-----+-----+
             | (Admin review)
             v
      +------+------+
      | Under Review|
      +------+------+
             | (Admin assign dept)
             v
        +----+-----+
        | Assigned |
        +----+-----+
             | (Dept Head assign officer)
             v
       +-----+-----+
       |In Progress| <--------------------+
       +-----+-----+                      | (Appeal or Rejection)
             | (Officer resolve)          |
             v                            |
     +-------+-------+                    |
     |Pending Approval|                   |
     +-------+-------+                    |
             | (Dept Head approve)        |
             v                            |
        +----+-----+                      |
        | Resolved | ---------------------+
        +----+-----+
             | (15 days pass or user close)
             v
         +---+----+
         | Closed |
         +--------+
```
