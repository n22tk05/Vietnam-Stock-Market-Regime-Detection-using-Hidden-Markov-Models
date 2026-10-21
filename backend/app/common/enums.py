from enum import StrEnum


class UserRole(StrEnum):
    USER = "USER"
    ADMIN = "ADMIN"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class RiskAppetite(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class InvestmentHorizon(StrEnum):
    SHORT_TERM = "SHORT_TERM"
    MEDIUM_TERM = "MEDIUM_TERM"
    LONG_TERM = "LONG_TERM"


class MarketRegimeCode(StrEnum):
    BULL = "BULL"
    BEAR = "BEAR"
    SIDEWAY = "SIDEWAY"
    UNKNOWN = "UNKNOWN"


class RecommendationType(StrEnum):
    INITIAL = "INITIAL"
    RECALCULATION = "RECALCULATION"
    REBALANCE = "REBALANCE"


class RecommendationStatus(StrEnum):
    GENERATED = "GENERATED"
    CONFIRMED = "CONFIRMED"
    APPLIED = "APPLIED"
    DISMISSED = "DISMISSED"
    EXPIRED = "EXPIRED"
    FAILED = "FAILED"


class PortfolioStatus(StrEnum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class PortfolioChangeType(StrEnum):
    INITIAL = "INITIAL"
    REBALANCE = "REBALANCE"
    MANUAL_RECALCULATION = "MANUAL_RECALCULATION"


class NotificationStatus(StrEnum):
    UNREAD = "UNREAD"
    READ = "READ"
    APPLIED = "APPLIED"
    DISMISSED = "DISMISSED"


class JobStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ModelStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    UNAVAILABLE = "UNAVAILABLE"
