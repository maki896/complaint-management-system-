# REST API Specification
## Oromia Science and Technology Authority Complaint Management System

This document specifies the RESTful endpoints for the CMS API. All endpoints are prefixed with `/api`. Standard responses utilize JSON payloads, with secure HTTPS transport required in production.

---

## 1. Authentication Endpoints

### 1.1 Citizen Self-Registration
Allows external users (citizens) to create a new profile in the database.

* **URL:** `/api/auth/register`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "complainant@example.com",
    "password": "Password123!",
    "fullName": "Abebe Kebede",
    "gender": "Male",
    "phone": "+251912345678",
    "region": "Oromia",
    "city": "Adama",
    "woreda": "Woreda 01",
    "kebele": "Kebele 02"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully. Activation email sent.",
    "userId": 10
  }
  ```

---

### 1.2 User Login
Authenticates users of all roles (Citizen, Staff, Officer, Department Head, Administrator) and returns a signed JSON Web Token (JWT).

* **URL:** `/api/auth/login`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "complainant@example.com",
    "password": "Password123!"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsImVtYWlsIjoiY29tcGxhaW5hbnRA...",
    "user": {
      "id": 10,
      "email": "complainant@example.com",
      "fullName": "Abebe Kebede",
      "role": "citizen"
    }
  }
  ```
* **Error Response (401 Unauthorized - Account Lockout example):**
  ```json
  {
    "success": false,
    "message": "Account temporarily locked. Please try again after 15 minutes."
  }
  ```

---

### 1.3 User Profile Management
Retrieves or updates details of the currently logged-in user.

* **URL:** `/api/auth/profile`
* **Method:** `GET`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`
* **Success Response (200 OK):**
  ```json
  {
    "id": 10,
    "email": "complainant@example.com",
    "fullName": "Abebe Kebede",
    "role": "citizen",
    "phone": "+251912345678",
    "region": "Oromia",
    "city": "Adama"
  }
  ```

---

## 2. Complaint Endpoints

### 2.1 Submit a Complaint
Submits a complaint record and supports optional file evidence uploading via `multipart/form-data`.

* **URL:** `/api/complaints/submit`
* **Method:** `POST`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
* **Request Payload (Form-Data):**
  * `category`: `"environmental"`
  * `description`: `"Heavy smoke releasing from the textile factory behind Kebele 02 residence area."`
  * `dateOfOccurrence`: `"2026-05-24"`
  * `locationAddress`: `"Adama Textile Industrial Park"`
  * `gpsCoordinates`: `"8.5414, 39.2689"` (optional)
  * `priority`: `"high"`
  * `confidentiality`: `"public"`
  * `files`: `[Binary Uploads]` (optional files array, max 25MB each)
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Complaint logged successfully.",
    "trackingNumber": "CMS-2026-00042",
    "complaintId": 15
  }
  ```

---

### 2.2 Track Complaint Progress
Guest or complainant tracking endpoint to monitor live timeline of a complaint using its tracking reference number.

* **URL:** `/api/complaints/track/:tracking_number`
* **Method:** `GET`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "complaint": {
      "trackingNumber": "CMS-2026-00042",
      "category": "environmental",
      "status": "assigned",
      "priority": "high",
      "dateOfOccurrence": "2026-05-24",
      "locationAddress": "Adama Textile Industrial Park",
      "created_at": "2026-05-24T16:34:00.000Z",
      "timeline": [
        { "status": "submitted", "timestamp": "2026-05-24T16:34:00.000Z" },
        { "status": "under_review", "timestamp": "2026-05-24T16:35:10.000Z" },
        { "status": "assigned", "timestamp": "2026-05-24T16:37:30.000Z", "department": "Environmental Law Enforcement Monitoring & Control" }
      ],
      "evidence": [
        { "fileName": "smoke_photo.png", "fileType": "image/png", "fileSize": 102450 }
      ]
    }
  }
  ```

---

### 2.3 Assign Complaint to Department
Enables Administrators or Reviewers to route a submitted complaint to an organizational department and set a resolution deadline.

* **URL:** `/api/complaints/:id/assign-dept`
* **Method:** `PATCH`
* **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Request Body:**
  ```json
  {
    "departmentId": 3,
    "deadline": "2026-06-15"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Complaint successfully routed to department."
  }
  ```

---

### 2.4 Assign Complaint to Officer
Enables Department Heads to assign an received complaint to an individual Complaint Officer.

* **URL:** `/api/complaints/:id/assign-officer`
* **Method:** `PATCH`
* **Headers:** `Authorization: Bearer <DEPT_HEAD_JWT_TOKEN>`
* **Request Body:**
  ```json
  {
    "officerId": 8,
    "instructions": "Please conduct an on-site audit of the factory emission filters immediately."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Complaint successfully assigned to officer."
  }
  ```

---

### 2.5 Log Investigation Steps
Allows assigned Complaint Officers to record chronological investigation progress and findings.

* **URL:** `/api/complaints/:id/investigate`
* **Method:** `POST`
* **Headers:** `Authorization: Bearer <OFFICER_JWT_TOKEN>`, `Content-Type: multipart/form-data`
* **Request Payload (Form-Data):**
  * `activityDescription`: `"Conducted on-site inspection of Adama Textile Industrial Park."`
  * `findings`: `"Discovered that the main carbon filter unit was undergoing maintenance without a secondary backup system."`
  * `files`: `[Binary Uploads]` (optional investigation attachments)
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Investigation progress log recorded successfully."
  }
  ```

---

### 2.6 Submit Resolution Decision
Allows assigned Complaint Officers to record their final resolution and submit it to the Department Head for review.

* **URL:** `/api/complaints/:id/resolve`
* **Method:** `PATCH`
* **Headers:** `Authorization: Bearer <OFFICER_JWT_TOKEN>`, `Content-Type: multipart/form-data`
* **Request Payload (Form-Data):**
  * `resolutionSummary`: `"The textile company was issued a formal administrative warning and fined 150,000 ETB for emissions violation during filter maintenance."`
  * `actionsTaken`: `"Fined company and scheduled a follow-up inspection in 14 days."`
  * `files`: `[Binary Resolution Letter PDF]` (optional file)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Resolution submitted successfully and is pending Department Head approval."
  }
  ```

---

### 2.7 Approve/Reject Resolution
Allows Department Heads to review the resolution, approving it to close the complaint, or rejecting it to send the case back for further investigation.

* **URL:** `/api/complaints/:id/approve-resolution`
* **Method:** `PATCH`
* **Headers:** `Authorization: Bearer <DEPT_HEAD_JWT_TOKEN>`
* **Request Body:**
  ```json
  {
    "decision": "approve", // or "reject"
    "feedback": "Approved. Excellent work on issuing the fine."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Resolution approved. Complaint status updated to 'resolved'."
  }
  ```

---

### 2.8 Submit Appeal
Allows complainants to appeal a resolved or rejected decision within 15 days of the resolution.

* **URL:** `/api/complaints/:id/appeal`
* **Method:** `POST`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`
* **Request Body:**
  ```json
  {
    "reason": "The factory continues to emit heavy smoke during night shifts despite the warning. The fine was insufficient."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Appeal successfully filed. Case reopened for executive review."
  }
  ```

---

## 3. Administrative & Reporting Endpoints

### 3.1 Create Internal User Account
Allows Administrators to create staff, officer, and department head credentials.

* **URL:** `/api/admin/users/create`
* **Method:** `POST`
* **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Request Body:**
  ```json
  {
    "email": "officer.yared@oromia.gov.et",
    "fullName": "Yared Tolosa",
    "role": "officer",
    "employeeId": "EMP-082",
    "departmentId": 3,
    "gender": "Male",
    "phone": "+251911998877",
    "region": "Oromia",
    "city": "Addis Ababa",
    "woreda": "Woreda 04",
    "kebele": "Kebele 10"
  }
  ```
* **Success Response (210 Created):**
  ```json
  {
    "success": true,
    "message": "Internal user account created successfully.",
    "tempPassword": "TempPasswordX98!"
  }
  ```

---

### 3.2 Fetch Audit Trail Logs
Allows Administrators to retrieve the complete audit logs of all user actions.

* **URL:** `/api/admin/audit-logs`
* **Method:** `GET`
* **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "logs": [
      {
        "id": 104,
        "timestamp": "2026-05-24T16:37:30.000Z",
        "ipAddress": "192.168.1.15",
        "action": "ASSIGN_COMPLAINT_DEPT",
        "targetId": "15",
        "details": "Admin assigned complaint CMS-2026-00042 to department ID 3",
        "User": {
          "fullName": "System Admin",
          "email": "admin@oromia.gov.et"
        }
      }
    ]
  }
  ```

---

### 3.3 Dashboard Performance Reports
Aggregates statistical figures by department, category, and status.

* **URL:** `/api/reports/dashboard`
* **Method:** `GET`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "stats": {
      "totalComplaints": 425,
      "pendingCount": 18,
      "resolvedCount": 387,
      "backlogCount": 20,
      "categoryStats": [
        { "category": "environmental", "count": 142 },
        { "category": "service_delivery", "count": 201 }
      ],
      "resolutionRate": "91.06%"
    }
  }
  ```
