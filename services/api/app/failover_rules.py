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
    if subscription.product != "GLOBAL":
        return False
    if subscription.failover:
        return False
    if subscription.traffic_gb is None:
        return False
    return subscription.traffic_used_gb >= float(subscription.traffic_gb)
