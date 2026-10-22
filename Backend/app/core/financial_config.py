
from decimal import Decimal

# Currency
CURRENCY = "INR"

# Platform commission
PLATFORM_COMMISSION_RATE = Decimal("0.10")

# Demo tax applied to platform commission
COMMISSION_TAX_RATE = Decimal("0.18")

# Discount funding shares
RESTAURANT_DISCOUNT_SHARE = Decimal("1.00")
PLATFORM_DISCOUNT_SHARE = Decimal("0.00")

# Demo promotional offer
DEMO_OFFER_DISCOUNT_RATE = Decimal("0.10")
DEMO_OFFER_MAX_DISCOUNT = Decimal("100.00")

# Other restaurant-borne fees
OTHER_RESTAURANT_FEE_PER_ORDER = Decimal("0.00")

# Settlement policy
SETTLEMENT_CYCLE = "DAILY_T_PLUS_1"

# Financial reporting
REPORTING_TIMEZONE = "Asia/Kolkata"
MONEY_DECIMAL_PLACES = 2

# Orders included in demo gross sales
REVENUE_ELIGIBLE_STATUSES = ("DELIVERED",)
