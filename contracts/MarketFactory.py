# { "Depends": "py-genlayer:test" }
from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone


@allow_storage
@dataclass
class Market:
    id: u256
    creator: str
    question: str
    resolution_criteria: str
    category: str
    deadline: u256
    resolved: bool
    outcome: bool
    yes_pool: u256
    no_pool: u256
    total_volume: u256
    resolver_address: str
    sources: DynArray[str]
    created_at: u256


class MarketFactory(gl.Contract):
    markets: TreeMap[u256, Market]
    market_count: u256
    category_markets: TreeMap[str, DynArray[u256]]
    all_market_ids: DynArray[u256]
    trader_set: DynArray[str]
    trader_seen: TreeMap[str, bool]

    def __init__(self, resolver_address: str) -> None:
        self.market_count = u256(0)
        self.resolver_address = resolver_address

    # workaround: store resolver address as a top-level field
    resolver_address: str

    @gl.public.write.payable
    def create_market(
        self,
        question: str,
        resolution_criteria: str,
        category: str,
        deadline: u256,
        sources: DynArray[str],
    ) -> u256:
        assert len(question) >= 10, "Question too short"
        assert len(resolution_criteria) >= 20, "Resolution criteria too short"
        assert deadline > u256(int(datetime.now(timezone.utc).timestamp())), "Deadline must be in the future"

        market_id = self.market_count
        initial_liquidity = gl.message.value

        sources_stored = DynArray[str]()
        for s in sources:
            sources_stored.append(s)

        market = Market(
            id=market_id,
            creator=str(gl.message.sender_address),
            question=question,
            resolution_criteria=resolution_criteria,
            category=category,
            deadline=deadline,
            resolved=False,
            outcome=False,
            yes_pool=initial_liquidity // u256(2),
            no_pool=initial_liquidity // u256(2),
            total_volume=initial_liquidity,
            resolver_address=self.resolver_address,
            sources=sources_stored,
            created_at=u256(int(datetime.now(timezone.utc).timestamp())),
        )
        self.markets[market_id] = market
        self.all_market_ids.append(market_id)

        cat_key = category
        if self.category_markets.get(cat_key) is None:
            self.category_markets[cat_key] = DynArray[u256]()
        self.category_markets[cat_key].append(market_id)

        self.market_count = self.market_count + u256(1)
        return market_id

    @gl.public.write
    def update_market_pools(
        self,
        market_id: u256,
        yes_delta: u256,
        no_delta: u256,
        volume_delta: u256,
        buyer: str,
    ) -> None:
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        market.yes_pool = market.yes_pool + yes_delta
        market.no_pool = market.no_pool + no_delta
        market.total_volume = market.total_volume + volume_delta
        self.markets[market_id] = market

        if not self.trader_seen.get(buyer):
            self.trader_set.append(buyer)
            self.trader_seen[buyer] = True

    @gl.public.write
    def set_market_resolved(
        self, market_id: u256, outcome: bool
    ) -> None:
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        market.resolved = True
        market.outcome = outcome
        self.markets[market_id] = market

    @gl.public.view
    def get_market(self, market_id: u256) -> dict:
        market = self.markets.get(market_id)
        if market is None:
            return {}
        return {
            "id": int(market.id),
            "creator": market.creator,
            "question": market.question,
            "resolution_criteria": market.resolution_criteria,
            "category": market.category,
            "deadline": int(market.deadline),
            "resolved": market.resolved,
            "outcome": market.outcome,
            "yes_pool": int(market.yes_pool),
            "no_pool": int(market.no_pool),
            "total_volume": int(market.total_volume),
            "resolver_address": market.resolver_address,
            "sources": list(market.sources),
            "created_at": int(market.created_at),
        }

    @gl.public.view
    def get_all_markets(self) -> list:
        result = []
        for mid in self.all_market_ids:
            m = self.markets.get(mid)
            if m is not None:
                result.append({
                    "id": int(m.id),
                    "creator": m.creator,
                    "question": m.question,
                    "resolution_criteria": m.resolution_criteria,
                    "category": m.category,
                    "deadline": int(m.deadline),
                    "resolved": m.resolved,
                    "outcome": m.outcome,
                    "yes_pool": int(m.yes_pool),
                    "no_pool": int(m.no_pool),
                    "total_volume": int(m.total_volume),
                    "resolver_address": m.resolver_address,
                    "sources": list(m.sources),
                    "created_at": int(m.created_at),
                })
        return result

    @gl.public.view
    def get_markets_by_category(self, category: str) -> list:
        ids = self.category_markets.get(category)
        if ids is None:
            return []
        result = []
        for mid in ids:
            m = self.markets.get(mid)
            if m is not None:
                result.append({
                    "id": int(m.id),
                    "creator": m.creator,
                    "question": m.question,
                    "resolution_criteria": m.resolution_criteria,
                    "category": m.category,
                    "deadline": int(m.deadline),
                    "resolved": m.resolved,
                    "outcome": m.outcome,
                    "yes_pool": int(m.yes_pool),
                    "no_pool": int(m.no_pool),
                    "total_volume": int(m.total_volume),
                    "resolver_address": m.resolver_address,
                    "sources": list(m.sources),
                    "created_at": int(m.created_at),
                })
        return result

    @gl.public.view
    def get_protocol_stats(self) -> dict:
        total_markets = int(self.market_count)
        total_resolved = 0
        total_volume = 0
        for mid in self.all_market_ids:
            m = self.markets.get(mid)
            if m is not None:
                if m.resolved:
                    total_resolved += 1
                total_volume += int(m.total_volume)
        return {
            "total_markets": total_markets,
            "total_volume": total_volume,
            "total_resolved": total_resolved,
            "total_traders": len(self.trader_set),
        }

    @gl.public.view
    def get_market_count(self) -> int:
        return int(self.market_count)
