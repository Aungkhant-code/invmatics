# notifications.py
# Alerts and notification delivery
#
# - Send low stock email alert (triggered when stock falls below reorder point)
# - Send in-app low stock notification
# - Send overdue payment email alert to relevant staff
# - Send in-app overdue payment notification
# - Notification queue / deduplication (avoid repeat alerts for the same event)
# - Mark notifications as read
# - Retrieve unread notifications per user
