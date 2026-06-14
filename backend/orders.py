# orders.py
# Sales order management
#
# - Create sales orders linked to customers
# - Order status transitions: draft → confirmed → picking → shipped → delivered
# - Partial fulfilment logic and remaining quantity tracking
# - Back order creation and management
# - Apply line-level and order-level discounts
# - Apply volume pricing tiers per customer
# - Generate delivery note (data for PDF)
# - Order search, filtering, and history
# - Deduct stock on order confirmation / fulfilment
