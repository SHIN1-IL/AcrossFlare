from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class FailoverSubscription:
    id: str
    product: str
    traffic_used_gb: float
    traffic_gb: float | None
    failover: bool
    expires_at: datetime
    uuid: str
    xui_email: str


def should_failover(subscription: FailoverSubscription) -> bool:
    """Quota use never switches a customer onto spare nodes.

    Spare nodes are a manual outage tool. Automatic failover stays off.
    The argument stays so callers and tests keep a single signature.
    """
    del subscription
    return False
