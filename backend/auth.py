# auth.py
# Staff accounts and access control
#
# - User registration, login, logout
# - Password hashing and JWT token issuance
# - Role definitions: Admin, Manager, Sales, Warehouse, Finance
# - Permission matrix per role (what each role can read / write)
# - Route / endpoint permission enforcement middleware
# - Create, update, deactivate staff accounts (Admin only)
# - Activity log: record who did what and when
# - Retrieve and search activity log
