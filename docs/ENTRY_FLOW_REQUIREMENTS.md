# Accura Trucking Services — Entry Flow Requirements

**Document status:** Revised draft for customer confirmation  
**Implementation status:** Implemented and verified  
**Prepared from:** User explanation, workflow spreadsheet screenshot, and service checklist photograph  
**Scope:** Job Card Entry, Work Order Entry, supporting masters, and Accounts List

---

## 1. Overall workflow

1. Supervisor creates a Job Card.
2. The system generates and stores a unique Job Card Number.
3. Supervisor reviews/edits the Job Card and approves it.
4. Approval creates exactly one linked Work Order.
5. Floor Supervisor updates the Work Order:
   - selects work type;
   - assigns a mechanic for every complaint;
   - updates complaint status/sub-status;
   - records spares used;
   - uploads the signed mandatory attachment.
6. Work Order can be approved only after the mandatory validations pass.
7. Accounts List shows the customer, vehicle, Job Card, Work Order, overall job status, and payment position.

```text
Supervisor Login
    → Job Card Draft
    → Job Card Approval
    → Work Order Auto-created
    → Floor Supervisor Work Update
    → Mandatory Attachment
    → Work Order Approval / Completion
    → Accounts List
```

Implementation commenced after this document was approved.

All Job Card, Work Order, and Payment Receipt entries store a mandatory `financial_year_id`. Document sequences are maintained independently for each Financial Year.

### 1.1 Simplicity principle

The service centre has limited manpower. The application must therefore use a short workflow with minimum clicks:

- no multi-level approval chain;
- no separate estimator or accountant approval;
- no complex invoice/ledger module in this phase;
- one Supervisor Job Card approval;
- one Floor Supervisor Work Order approval;
- one simple Receive Payment action from Accounts;
- calculations should happen automatically wherever possible.

---

## 2. Supporting masters required

### 2.1 Vehicle Master

Minimum initial fields:

- Vehicle ID — database primary key
- Vehicle Number — unique and searchable
- Customer ID — optional mapping to the owner/customer
- Status — Active/Inactive

The Vehicle Number field in Job Card is an open-input autocomplete:

- Existing match: selecting it stores `vehicle_id`.
- No match: the typed vehicle number is used to create Vehicle Master during Job Card save; the new `vehicle_id` is stored in Job Card.
- Duplicate vehicle numbers must not be created. Comparison should ignore case and unnecessary spaces.

### 2.2 Customer Master enhancement

Existing Customer Master will be used.

- Customer Name is an open-input autocomplete.
- Contact Number is also an open-input autocomplete.
- Selecting Customer Name fills Contact Number.
- Searching/selecting Contact Number shows and fills Customer Name.
- Existing selection stores `customer_id`, not only display text.
- If no customer matches, Job Card save creates the Customer Master using the typed name/contact and stores the new `customer_id`.
- Duplicate customer creation should be checked primarily by normalized contact number and secondarily by name.

### 2.3 Work Pending Sub-status Master

New master required with normal master CRUD and Active/Inactive status.

Initial values:

1. `WAIT FOR CUSTOMER APPROVAL`
2. `PARTS WAITING / UNAVAILABLE`

Work Order stores `pending_sub_status_id`.

### 2.4 UOM Master

New master required for Product/Spares mapping.

Minimum fields:

- UOM ID
- Code
- Name
- Status

### 2.5 Product Master

New master required for Work Order spares.

Minimum fields:

- Product ID
- Product/Spare Code — unique
- Product Name
- Part Number
- HSN Code — mandatory
- UOM ID — reference to UOM Master
- Default Rate — optional
- Status

All transaction rows store IDs and snapshot values required for history.

---

## 3. Job Card Entry

### 3.1 Number generation

- Job Card Number is generated only when a new Job Card is successfully created.
- It must be unique and stored in the database.
- Suggested format: `JC/2026-27/000001`.
- Number generation must be transaction-safe so two users cannot receive the same number.
- Cancelled/failed saves must not create duplicate numbers.

### 3.2 Job Card header fields

| Field | Behaviour | Stored value |
|---|---|---|
| Job Card No | Auto-generated, read-only after creation | Job Card number |
| Entry Date | Required date input | Date |
| Vehicle Number | Open input + autocomplete; creates Vehicle Master when new | `vehicle_id` |
| Customer Name | Open input + autocomplete; fills contact | `customer_id` |
| Contact Number | Open input + autocomplete; fills customer name | Same `customer_id`; contact snapshot if required |
| Driver Contact Number | Normal open input | Entered contact number |
| Current KMS | Required for next-service calculation if confirmed | Numeric value |
| Current Running Hours | Required for next-service calculation if confirmed | Numeric value |
| Average Per Day KMS Running | Open numeric input | Numeric value |
| Next Service KMS | Open numeric input | Numeric value |
| Average Per Day Hours Running | Open numeric input | Numeric value |
| Next Service Hours | Open numeric input | Numeric value |
| Next Service Days | System calculated, read-only | Calculated number of days/date as confirmed |
| Total Amount | Sum of active complaint costs, read-only | Decimal amount |
| Estimate Amount | Initially equals Total Amount, but Supervisor can edit it | Decimal amount |
| Advance Paid | Open amount input | Decimal amount |
| Balance | `Estimate Amount - Advance Paid`, read-only | Decimal amount |

Validation rules:

- Entry Date, Vehicle, Customer, Contact Number, and at least one complaint are required.
- Amounts cannot be negative.
- Advance Paid cannot exceed Estimate Amount unless overpayment is explicitly allowed later.
- All references store database IDs.

### 3.3 Complaint detail table

Each Job Card contains one or more complaint rows.

| Column | Behaviour |
|---|---|
| S.No | UI-generated sequence |
| Complaint | Required open text input |
| Cost for Complaint | Required non-negative amount |
| Add Row | Adds a new editable row |
| Delete | Removes an unsaved row or soft-deletes a saved row |

Database behaviour:

- Complaints are stored in a Job Card Complaint child table.
- Existing rows deleted during edit are soft-deleted using fields such as `is_deleted`, `deleted_at`, and `deleted_by`.
- Soft-deleted rows must not return after save or browser refresh.
- Existing rows retain their IDs during update.
- Total Amount is the sum of non-deleted complaint row costs.

### 3.4 Calculations

Confirmed calculations:

```text
Total Amount    = Sum of active complaint Cost amounts
Estimate Amount = Total Amount by default; Supervisor may edit/override it
Balance         = Estimate Amount - Advance Paid
```

Simple next-service calculation:

```text
KMS Remaining   = Next Service KMS - Current KMS
KMS Days        = CEILING(KMS Remaining / Average Per Day KMS Running)

Hours Remaining = Next Service Hours - Current Running Hours
Hours Days      = CEILING(Hours Remaining / Average Per Day Hours Running)

Next Service Days = Minimum positive value of KMS Days and Hours Days
Next Service Date = Entry Date + Next Service Days
```

Rules:

- Current KMS and Next Service KMS are treated as odometer readings.
- Current Running Hours and Next Service Hours are treated as hour-meter readings.
- The system calculates both KMS-based days and Hours-based days.
- The smaller positive result is shown as Next Service Days because whichever limit arrives first requires service.
- The calculated Next Service Date is also displayed for convenience.
- If only one calculation has valid values, that result is used.
- If values are missing or average is zero, the calculation stays blank instead of showing an error.
- If a target is already crossed, Next Service Days shows `0 — Service Due`.

### 3.5 Job Card lifecycle and actions

Proposed statuses:

- `DRAFT`
- `APPROVED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED` if required later

Required actions:

- Add
- View
- Edit
- Soft delete/cancel as business rules permit
- Print
- Approve

Approval behaviour:

- Approve button appears on the Job Card edit/view page for an authorized Supervisor.
- Approval validates all mandatory details.
- Approval records approver ID and approval date/time.
- Approval creates one Work Order linked by `job_card_id`.
- Repeated clicks/retries must not create multiple Work Orders.
- After approval, the Job Card header and estimate are locked for normal users. Work progress continues through the linked Work Order.

---

## 4. Work Order Entry

### 4.1 Creation and header

- Work Order is created from an approved Job Card.
- Work Order Number is auto-generated and stored in the database.
- Suggested format: `WO/2026-27/000001`.
- It stores `job_card_id` as the primary link.

Work Order Type is required:

- `AMC`
- `WARRANTY`
- `PAID`

Read-only Job Card details shown in Work Order:

- Job Card Number
- Customer Name
- Contact Number
- Vehicle Number
- Entry Date
- Estimate Amount
- Advance Paid
- Balance

These values come through stored IDs/relationships, not repeated manual entry.

### 4.2 Complaint work-update table

All active Job Card complaints must be copied/linked into Work Order complaint rows.

| Column | Behaviour |
|---|---|
| Complaint | Comes from Job Card; read-only text |
| Mechanic | Required Employee Master autocomplete; stores `mechanic_employee_id` |
| Status | Required select: `PENDING` or `COMPLETED` |
| Pending Sub-status | Required only when Status is `PENDING`; stores sub-status ID |

Rules:

- Every complaint must have its own Mechanic and Status.
- Mechanic autocomplete shows active Employee Master records.
- When Status is `COMPLETED`, Pending Sub-status is cleared and stored as `NULL`.
- When Status is `PENDING`, Pending Sub-status is mandatory.
- Complaint status history may be added later if audit/history is required.

Overall Job Status derivation:

```text
All complaints COMPLETED       → COMPLETED
All complaints PENDING         → PENDING
Mix of PENDING and COMPLETED    → PARTIALLY COMPLETED
```

### 4.3 Spares Used detail table

Work Order contains an Add Row/Delete Row child table.

| Column | Source/behaviour |
|---|---|
| Spare Code | Product Master autocomplete |
| Name | Product Master autocomplete |
| Part Number | Auto-filled from selected Product |
| HSN Code | Auto-filled; mandatory |
| UOM | Auto-filled from Product → UOM mapping |
| Qty | Required positive numeric input |
| Rate | Required non-negative amount; Product default may prefill it |
| Total | Read-only: `Qty × Rate` |

Autocomplete rules:

- User can search using Spare Code or Product Name.
- Selecting either one fills Product ID, Code, Name, Part Number, HSN, UOM ID/name, and default Rate.
- Transaction row stores `product_id` and `uom_id` plus appropriate snapshot values.
- Saved rows deleted on edit follow the same soft-delete behaviour as complaint rows.

### 4.4 Mandatory attachment and approval

- Work Order edit page contains Attachment upload.
- The signed Job Card/work hard copy attachment is mandatory before Work Order approval.
- Allowed file types and size will follow the common application upload policy.
- Approval must fail with a clear validation message when attachment is missing.
- Approval also fails if:
  - Work Order Type is missing;
  - any complaint has no mechanic;
  - any complaint has no status;
  - a pending complaint has no pending sub-status;
  - a spare row has no Product/HSN/UOM/Qty/Rate.
- Approval records approver and date/time.
- Pending or partially completed complaints are allowed during approval because the service centre has limited manpower and work may wait for customer/parts.
- Approval means the Floor Supervisor has verified the current work update; it does not falsely mark every complaint as completed.
- Complaint progress remains editable after approval until every complaint becomes completed.
- The linked Job Card becomes `IN_PROGRESS` when the approved Work Order still contains pending complaints.
- The linked Job Card automatically becomes `COMPLETED` when every complaint becomes completed.
- To keep the process simple, no second approval is required when later complaint updates complete the job.

### 4.5 Work Order lifecycle and actions

Proposed statuses:

- `DRAFT`
- `IN_PROGRESS`
- `PARTIALLY_COMPLETED`
- `COMPLETED`
- `APPROVED`
- `CANCELLED` if required later

Required actions:

- Auto-create from Job Card approval
- View
- Edit
- Delete/cancel according to status
- Print
- Approve

---

## 5. Accounts List

Accounts is a derived list plus a lightweight payment-receipt action. It is not a full accounting, invoice, ledger, or voucher module.

### 5.1 Columns

- Customer Name
- Vehicle Number
- Contact Number
- Job Card Number
- Work Order Number
- Job Status
- Payment Status
- Estimate Amount
- Advance Paid
- Balance
- Receive Payment action

Recommended additional list behaviour:

- Search by customer, contact, vehicle, Job Card, or Work Order number
- Filter by Job Status
- Filter by Payment Status
- Date range filter
- Pagination
- View links to Job Card and Work Order
- Export can be added if required

### 5.2 Job Status

Job Status is derived from Work Order complaint statuses:

- `PENDING`
- `PARTIALLY COMPLETED`
- `COMPLETED`

If no Work Order exists yet, Job Status can show `JOB CARD CREATED` or `AWAITING APPROVAL` based on Job Card status.

### 5.3 Payment Status

Payment totals use the Job Card advance plus simple Accounts receipts:

```text
Total Paid = Job Card Advance Paid + Sum of non-deleted Payment Receipts
Balance    = Estimate Amount - Total Paid

Balance <= 0                       → 100% PAID
Total Paid <= 0 and Balance > 0    → 100% PENDING
Total Paid > 0 and Balance > 0     → PARTIALLY PAID
```

Displayed amounts:

- Estimate Amount
- Advance Paid
- Additional Amount Received
- Total Paid
- Balance

### 5.4 Simple Receive Payment action

Accounts List contains one `Receive Payment` button per Job Card/Work Order.

The small payment modal contains only:

- Receipt Date — defaults to today
- Amount Received — required
- Payment Mode — `CASH`, `UPI`, `CARD`, `BANK TRANSFER`, or `OTHER`
- Reference Number — optional
- Remarks — optional

Rules:

- Multiple partial receipts are allowed.
- Each receipt stores its own ID and the related `job_card_id`/`work_order_id`.
- Amount must be greater than zero.
- Amount cannot exceed the current Balance unless overpayment is enabled later.
- Saving immediately recalculates Total Paid, Balance, and Payment Status.
- A small receipt history can be viewed from the same Accounts row.
- Wrong receipts are soft-deleted by an authorized user; there is no complex reversal/voucher workflow in this phase.

---

## 6. Proposed database relationships

```text
customers (1) ──────── (many) vehicles
customers (1) ──────── (many) job_cards
vehicles  (1) ──────── (many) job_cards

job_cards (1) ──────── (many) job_card_complaints
job_cards (1) ──────── (one)  work_orders

work_orders (1) ────── (many) work_order_complaints
job_card_complaints (1) ─ (one) work_order_complaints
employees (1) ──────── (many) work_order_complaints as mechanic
work_pending_sub_statuses (1) ─ (many) work_order_complaints

work_orders (1) ────── (many) work_order_spares
products (1) ───────── (many) work_order_spares
uoms (1) ───────────── (many) products / work_order_spares
work_orders (1) ────── (many) work_order_attachments
job_cards  (1) ─────── (many) payment_receipts
```

Every main and detail table should include standard audit fields:

- `created_at`, `created_by`
- `updated_at`, `updated_by`
- soft-delete fields where applicable
- approval fields on approvable headers

---

## 7. Permissions and responsibility

Suggested new permission groups:

### Job Card

- `JOB_CARD_VIEW`
- `JOB_CARD_CREATE`
- `JOB_CARD_UPDATE`
- `JOB_CARD_DELETE`
- `JOB_CARD_PRINT`
- `JOB_CARD_APPROVE`

### Work Order

- `WORK_ORDER_VIEW`
- `WORK_ORDER_UPDATE`
- `WORK_ORDER_DELETE`
- `WORK_ORDER_PRINT`
- `WORK_ORDER_APPROVE`

### Accounts

- `ACCOUNTS_VIEW`
- `PAYMENT_RECEIVE`
- `PAYMENT_DELETE`
- `ACCOUNTS_EXPORT` if export is approved

### New Masters

- Vehicle, Product, UOM, and Pending Sub-status CRUD permissions

Supervisor and Floor Supervisor roles can be created/configured through the existing Role & Permission system.

---

## 8. Transaction and data-safety requirements

- Job Card and automatically created Vehicle/Customer must save in one database transaction.
- Job Card approval and Work Order creation must save in one database transaction.
- Work Order header, complaint updates, spares, and attachments must remain consistent if any validation/save fails.
- All generated numbers need database-level uniqueness.
- Approval endpoints must be idempotent.
- Child-row deletion must be soft delete and must remain hidden after refresh.
- Financial calculations must also run on the backend; frontend calculations are only for immediate display.
- IDs are the authoritative stored relationships; names/numbers are display values.

---

## 9. Decisions applied in this revision

The following decisions are now included:

1. Estimate Amount is editable by the Supervisor. Total complaint cost remains visible as the calculated reference.
2. Next Service Days uses the earlier of KMS-based and running-hours-based service due days.
3. Work Order may be approved while complaints are Pending/Partially Completed, provided every pending complaint has a pending sub-status and the mandatory attachment is uploaded.
4. Work updates remain editable after approval until all complaints are completed; no second approval is introduced.
5. Accounts includes a simple Receive Payment modal and receipt history, without a full accounting module.
6. Payment Status uses Advance + additional receipts.
7. The overall design prioritizes fewer screens and fewer approval clicks for a small workforce.

## 10. Remaining confirmation before implementation

Please confirm the following points:

To avoid unnecessary complexity, the implementation will use these defaults unless you request a change:

1. Job Card Number: `JC/2026-27/000001`.
2. Work Order Number: `WO/2026-27/000001`.
3. Job Card includes Current KMS and Current Running Hours.
4. Next KMS/Next Hours are treated as absolute meter targets.
5. Job Card normal editing is locked after approval.
6. Approved Work Orders cannot be deleted; they remain editable only for complaint progress and payment-independent work updates until completion.
7. Multiple PDF/JPG/PNG attachments are supported, maximum 5 MB each; at least one is mandatory for Work Order approval.
8. Vehicle Master initially includes Vehicle Number, Model, Chassis Number, Customer, and Status. Sale Date is optional.
9. Job Card print follows the photographed Accura Service Checklist style; Work Order gets a clean matching service-work print.

---

## 11. Acceptance summary

Implementation can start after approval of this document and answers to the confirmation items. The approved phase will contain:

- four supporting masters: Vehicle, Pending Sub-status, UOM, Product;
- Job Card list/add/edit/view/print/approve and child complaint maintenance;
- automatic Customer/Vehicle master creation with ID storage;
- Work Order auto-creation and list/edit/view/print/approve;
- mechanic/status tracking by complaint;
- spares-used detail maintenance;
- mandatory attachment validation;
- Accounts list with job/payment status and simple Receive Payment/history;
- RBAC permissions, audit fields, transactions, soft deletes, and backend validations.
