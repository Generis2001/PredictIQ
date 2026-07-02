# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass


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
    sources: DynArray[str]
    created_at: u256


@allow_storage
@dataclass
class Position:
    yes_shares: u256
    no_shares: u256
    yes_cost: u256
    no_cost: u256
    claimed: bool


class MarketFactory(gl.Contract):
    resolver_address: str
    markets: TreeMap[u256, Market]
    market_count: u256
    trader_count: u256
    category_markets: TreeMap[str, DynArray[u256]]
    all_market_ids: DynArray[u256]
    trader_seen: TreeMap[str, bool]
    positions: TreeMap[str, TreeMap[u256, Position]]
    user_market_ids: TreeMap[str, DynArray[u256]]

    def __init__(self, resolver_address: str) -> None:
        self.resolver_address = resolver_address
        self.market_count = u256(0)
        self.trader_count = u256(0)

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

        mid = self.market_count
        liq = gl.message.value
        market = Market(
            id=mid,
            creator=str(gl.message.sender_address),
            question=question,
            resolution_criteria=resolution_criteria,
            category=category,
            deadline=deadline,
            resolved=False,
            outcome=False,
            yes_pool=liq // u256(2),
            no_pool=liq // u256(2),
            total_volume=liq,
            sources=sources,
            created_at=u256(0),
        )
        self.markets[mid] = market
        self.all_market_ids.append(mid)
        self.category_markets.get_or_insert_default(category).append(mid)
        self.market_count = mid + u256(1)
        return mid

    @gl.public.write.payable
    def buy_yes(self, market_id: u256) -> u256:
        amount = gl.message.value
        assert int(amount) > 0, "Amount must be positive"
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        assert not market.resolved, "Market already resolved"

        yes_pool = market.yes_pool
        no_pool = market.no_pool
        shares = self._compute_shares(amount, no_pool, yes_pool)

        market.yes_pool = yes_pool + amount
        market.total_volume = market.total_volume + amount
        self.markets[market_id] = market

        buyer = str(gl.message.sender_address).lower()
        self._record_position_yes(buyer, market_id, shares, amount)
        self._track_trader(buyer)
        return shares

    @gl.public.write.payable
    def buy_no(self, market_id: u256) -> u256:
        amount = gl.message.value
        assert int(amount) > 0, "Amount must be positive"
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        assert not market.resolved, "Market already resolved"

        yes_pool = market.yes_pool
        no_pool = market.no_pool
        shares = self._compute_shares(amount, yes_pool, no_pool)

        market.no_pool = no_pool + amount
        market.total_volume = market.total_volume + amount
        self.markets[market_id] = market

        buyer = str(gl.message.sender_address).lower()
        self._record_position_no(buyer, market_id, shares, amount)
        self._track_trader(buyer)
        return shares

    @gl.public.write
    def sell_yes(self, market_id: u256, shares: u256) -> u256:
        seller = str(gl.message.sender_address).lower()
        pos = self._get_or_default_position(seller, market_id)
        assert int(pos.yes_shares) >= int(shares), "Insufficient YES shares"
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        assert not market.resolved, "Market already resolved"

        yes_pool = market.yes_pool
        no_pool = market.no_pool
        total = int(yes_pool) + int(no_pool)
        proceeds = u256(int(yes_pool) * int(shares) // total) if total > 0 else u256(0)

        market.yes_pool = yes_pool - proceeds
        self.markets[market_id] = market
        pos.yes_shares = pos.yes_shares - shares
        self.positions[seller][market_id] = pos

        if int(proceeds) > 0:
            gl.message.send_tokens(gl.message.sender_address, int(proceeds))
        return proceeds

    @gl.public.write
    def sell_no(self, market_id: u256, shares: u256) -> u256:
        seller = str(gl.message.sender_address).lower()
        pos = self._get_or_default_position(seller, market_id)
        assert int(pos.no_shares) >= int(shares), "Insufficient NO shares"
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        assert not market.resolved, "Market already resolved"

        yes_pool = market.yes_pool
        no_pool = market.no_pool
        total = int(yes_pool) + int(no_pool)
        proceeds = u256(int(no_pool) * int(shares) // total) if total > 0 else u256(0)

        market.no_pool = no_pool - proceeds
        self.markets[market_id] = market
        pos.no_shares = pos.no_shares - shares
        self.positions[seller][market_id] = pos

        if int(proceeds) > 0:
            gl.message.send_tokens(gl.message.sender_address, int(proceeds))
        return proceeds

    @gl.public.write
    def claim_reward(self, market_id: u256) -> u256:
        claimant = str(gl.message.sender_address).lower()
        pos = self._get_or_default_position(claimant, market_id)
        assert not pos.claimed, "Already claimed"

        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        assert market.resolved, "Market not yet resolved"

        winning_shares = pos.yes_shares if market.outcome else pos.no_shares
        assert int(winning_shares) > 0, "No winning shares"

        yes_pool = int(market.yes_pool)
        no_pool = int(market.no_pool)
        total_pool = yes_pool + no_pool
        winning_pool = yes_pool if market.outcome else no_pool

        reward = u256(total_pool * int(winning_shares) // winning_pool) if winning_pool > 0 else u256(0)

        pos.claimed = True
        self.positions[claimant][market_id] = pos

        if int(reward) > 0:
            gl.message.send_tokens(gl.message.sender_address, int(reward))
        return reward

    @gl.public.write
    def set_resolver(self, new_resolver: str) -> None:
        assert str(gl.message.sender_address) == self.resolver_address or self.resolver_address == str(gl.message.sender_address), "Unauthorized"
        self.resolver_address = new_resolver

    @gl.public.write
    def set_market_resolved(self, market_id: u256, outcome: bool) -> None:
        assert str(gl.message.sender_address) == self.resolver_address, "Unauthorized"
        market = self.markets.get(market_id)
        assert market is not None, "Market not found"
        market.resolved = True
        market.outcome = outcome
        self.markets[market_id] = market

    @gl.public.view
    def get_market(self, market_id: u256) -> dict:
        m = self.markets.get(market_id)
        if m is None:
            return {}
        return {
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
            "resolver_address": self.resolver_address,
            "sources": list(m.sources),
            "created_at": int(m.created_at),
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
                    "resolver_address": self.resolver_address,
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
                    "resolver_address": self.resolver_address,
                    "sources": list(m.sources),
                    "created_at": int(m.created_at),
                })
        return result

    @gl.public.view
    def get_protocol_stats(self) -> dict:
        total_resolved = 0
        total_volume = 0
        for mid in self.all_market_ids:
            m = self.markets.get(mid)
            if m is not None:
                if m.resolved:
                    total_resolved += 1
                total_volume += int(m.total_volume)
        return {
            "total_markets": int(self.market_count),
            "total_volume": total_volume,
            "total_resolved": total_resolved,
            "total_traders": int(self.trader_count),
        }

    @gl.public.view
    def get_position(self, user: str, market_id: u256) -> dict:
        pos = self._get_or_default_position(user.lower(), market_id)
        return {
            "market_id": int(market_id),
            "yes_shares": int(pos.yes_shares),
            "no_shares": int(pos.no_shares),
            "avg_yes_price": int(pos.yes_cost) // int(pos.yes_shares) if int(pos.yes_shares) > 0 else 0,
            "avg_no_price": int(pos.no_cost) // int(pos.no_shares) if int(pos.no_shares) > 0 else 0,
            "claimed": bool(pos.claimed),
        }

    @gl.public.view
    def get_user_positions(self, user: str) -> list:
        user = user.lower()
        ids = self.user_market_ids.get(user)
        if ids is None:
            return []
        user_pos_map = self.positions.get(user)
        if user_pos_map is None:
            return []
        result = []
        for mid in ids:
            pos = user_pos_map.get(mid)
            if pos is not None and (int(pos.yes_shares) > 0 or int(pos.no_shares) > 0):
                result.append({
                    "market_id": int(mid),
                    "yes_shares": int(pos.yes_shares),
                    "no_shares": int(pos.no_shares),
                    "avg_yes_price": int(pos.yes_cost) // int(pos.yes_shares) if int(pos.yes_shares) > 0 else 0,
                    "avg_no_price": int(pos.no_cost) // int(pos.no_shares) if int(pos.no_shares) > 0 else 0,
                    "claimed": bool(pos.claimed),
                })
        return result

    def _compute_shares(self, amount: u256, pool_in: u256, pool_out: u256) -> u256:
        total = int(pool_in) + int(pool_out)
        if total == 0:
            return amount
        return u256(int(pool_out) * int(amount) // (int(pool_in) + int(amount)))

    def _track_trader(self, addr: str) -> None:
        if not self.trader_seen.get(addr):
            self.trader_seen[addr] = True
            self.trader_count = self.trader_count + u256(1)

    def _get_or_default_position(self, user: str, market_id: u256) -> Position:
        user_map = self.positions.get(user)
        if user_map is None:
            return Position(yes_shares=u256(0), no_shares=u256(0), yes_cost=u256(0), no_cost=u256(0), claimed=False)
        pos = user_map.get(market_id)
        if pos is None:
            return Position(yes_shares=u256(0), no_shares=u256(0), yes_cost=u256(0), no_cost=u256(0), claimed=False)
        return pos

    def _record_position_yes(self, user: str, market_id: u256, shares: u256, cost: u256) -> None:
        self.positions.get_or_insert_default(user)
        pos = self.positions[user].get(market_id)
        if pos is None:
            pos = Position(yes_shares=shares, no_shares=u256(0), yes_cost=cost, no_cost=u256(0), claimed=False)
        else:
            pos.yes_shares = pos.yes_shares + shares
            pos.yes_cost = pos.yes_cost + cost
        self.positions[user][market_id] = pos
        self._track_user_market(user, market_id)

    def _record_position_no(self, user: str, market_id: u256, shares: u256, cost: u256) -> None:
        self.positions.get_or_insert_default(user)
        pos = self.positions[user].get(market_id)
        if pos is None:
            pos = Position(yes_shares=u256(0), no_shares=shares, yes_cost=u256(0), no_cost=cost, claimed=False)
        else:
            pos.no_shares = pos.no_shares + shares
            pos.no_cost = pos.no_cost + cost
        self.positions[user][market_id] = pos
        self._track_user_market(user, market_id)

    def _track_user_market(self, user: str, market_id: u256) -> None:
        ids = self.user_market_ids.get(user)
        if ids is None:
            self.user_market_ids.get_or_insert_default(user).append(market_id)
            return
        for mid in ids:
            if int(mid) == int(market_id):
                return
        ids.append(market_id)
