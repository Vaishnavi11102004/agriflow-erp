# AgroSeq - AgriFlow ERP

**Live Demo:** https://sprightly-meringue-c62818.netlify.app/

AgriFlow ERP (AgroSeq) is a comprehensive agricultural resource planning platform designed to bridge the gap between farmers and agricultural management authorities. It facilitates end-to-end tracking of crop lifecycles, seed procurement, farm inspections, harvest sales, and financial transactions.

## Entire Workflow & Process

The system is divided into three primary roles: **Farmer**, **Manager**, and **Super Admin**. Here is the step-by-step workflow of the entire platform:

### 1. Onboarding & Approval
* **Registration:** Farmers sign up through the public portal using their phone number and an OTP. Initially, their account is in a `pending` state.
* **Approval:** A Manager or Admin reviews the farmer's details in the Farmers Directory and approves the account. Once approved, the farmer gains full access to the portal.

### 2. Crop Management & Inspection
* **Adding Crops:** Farmers log their current crop cycles by entering the crop type, total acres, and sowing date.
* **Automated Farm Visits:** When a crop is registered, the system automatically schedules two farm visits (at Month 1 and Month 3) for the Manager. 
* **Inspections:** Managers conduct the farm visits, assess the crop's health, and log their reports back into the system to keep track of the yield progress.

### 3. Seed Procurement
* **Inventory:** The Admin manages the central seed inventory and sets the pricing.
* **Purchasing:** Farmers can browse the seed catalog and purchase seeds directly through the platform. This instantly updates the admin's stock levels and records a debit transaction in the farmer's ledger.

### 4. Grain Procurement (Sales) & Pricing
* **Market Rates:** Admins set and update daily market rates for various crops and grades. These rates are visible publicly and act as the baseline for procurement.
* **Harvest Submission:** Once the crop is harvested, the farmer submits a "Grain Sale" request, specifying the grain type, grade, and estimated good material weight.
* **Quality Check & Approval:** Managers or Admins review the harvest. They verify the final grade, adjust the good material weight if there was wastage, and approve the sale at the current market rate.
* **Financial Ledger:** Approving a grain sale automatically triggers a credit transaction in the farmer's financial ledger.

### 5. Warehouse Delivery
* **Booking Slots:** After a grain sale is approved, the farmer needs to deliver the physical grains. They can browse available warehouses and book a delivery slot, provided the warehouse has available capacity.
* **Fulfillment:** Managers confirm these booking slots. Once the grain is physically delivered, the slot is marked as completed, updating the warehouse's current load.

### 6. Financials & Profile Management
* **Ledger Visibility:** Farmers can view all their transactions (credits from grain sales, debits from seed purchases) in a transparent ledger.
* **Bank Details:** Farmers can update their profile and request changes to their bank details. To prevent fraud, any change to banking information requires explicit approval from an Admin.
* **Admin Dashboard:** Admins have a bird's-eye view of all platform analytics, total revenue, monthly sales, and system-wide operations.

## Tech Stack
- **Frontend:** React + Vite
- **Backend/Database:** Node.js, Express, PostgreSQL, Supabase
