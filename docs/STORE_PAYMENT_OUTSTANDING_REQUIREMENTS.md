# Store, Vendor Payment and Outstanding Report

## Common rules

- Every Store and Vendor Payment transaction carries `financial_year_id`.
- Document numbers are generated per financial year: `ST/FY/000001` and `VP/FY/000001`.
- All deletes are soft deletes and audited with user/date fields.
- Navigation and actions are permission-controlled.

## Vendor Master extension

- Add GST Type: `WITH_GST` or `WITHOUT_GST`.
- GSTIN remains in Vendor Master.
- A `WITH_GST` vendor enables GST percentage and shows GSTIN in Store Entry.
- A `WITHOUT_GST` vendor forces row GST percentage and GST amount to zero.

## Store Entry

Header fields:

- Auto-generated Store No
- Type: CASH or CREDIT
- Vendor Bill No (open input)
- Date
- Vendor autocomplete from Vendor Master
- Vendor GST Type and GSTIN display

Spare detail rows:

- Product Code autocomplete from Product Master
- Product Name autocomplete from Product Master
- Selecting either Code or Name fills the other product fields
- Part Number from Product Master, read-only
- HSN Code, editable and initially filled from Product Master
- Quantity, Rate, GST %, Discount %
- Row Base = Quantity × Rate
- Row Discount = Base × Discount %
- Row Taxable = Base − Discount
- Row GST = Taxable × GST % (zero for WITHOUT_GST vendor)
- Row Total = Taxable + GST

Summary:

- Taxable Amount, GST Amount, Discount Amount and Net Amount
- Add, edit, view and soft-delete Store Entries
- Once an active Vendor Payment is allocated against a CREDIT Store Entry, edit and delete are locked.

## Vendor Payment Entry

- Payment Date and Vendor autocomplete.
- Only CREDIT Store Entries with an outstanding balance are returned.
- User selects one or more bills and enters row-wise Payment Amount.
- Payment Amount must be positive and cannot exceed that Store Entry's current outstanding balance.
- Partial payments are allowed repeatedly until the Store Entry is fully tallied.
- One payment document can allocate amounts across multiple Store Entries.
- Payment history is shown below the entry area.

## Vendor-wise Outstanding Report

- CREDIT Store Entries only.
- Vendor-wise totals: Bill Count, Credit Amount, Paid Amount and Outstanding Amount.
- Filters: Custom From/To Date, Daily, Weekly and Monthly.
- Excel-compatible download uses the currently filtered rows.

## Permissions

- Store: view, create, update, delete.
- Vendor Payment: view, create, delete.
- Vendor Outstanding: view, export.
