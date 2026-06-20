# Mini ERP - Hackathon Project

## Business Context
Building a Mini ERP for Shiv Furniture Works.
Problem: Manual operations on Excel/WhatsApp/paper.
Solution: Centralized ERP system.

## Tech Stack
- Frontend: React + Vite + TailwindCSS
- Backend: FastAPI (Python)
- Database: PostgreSQL + SQLAlchemy + Alembic
- Auth: JWT + bcrypt

## Modules
1. Products - CRUD, stock tracking
2. Sales - orders, reservation, delivery
3. Purchase - PO, vendor, replenishment
4. Manufacturing - MO, BoM, work orders
5. Procurement Engine - auto MTS/MTO
6. Audit Logs

## Key Rules
- Always use UUID for primary keys
- Never store plain text passwords
- Every stock movement must write to stock_ledger
- Reserved qty = committed to sales/manufacturing orders
- Free to use qty = on_hand - reserved