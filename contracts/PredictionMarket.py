# { "Depends": "py-genlayer:test" }
from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone


@allow_storage
@dataclass
class Position:
    market_id: u256
    yes_shares: u256
    no_shares: u256
    yes_cost: u256
    no_cost: u256


class PredictionMarket(gl.Contract):
    factory_address: str
    positions: TreeMap[str, TreeMap[u256, Position]]
    user_market_ids: TreeMap[str, DynArray[u256]]
    claimed: TreeMap[str, TreeMap[u256, bool]]

    def __init__(self, factory_address: str) -> None:
        self.factory_address = factory_address

    def _get_market(self, market_id: u256) -> dict:
        result = gl.call_contract(
            self.factory_address,
            "get_market",
            [int(market_id)],
        )
        return result  # type: ignore

    def _update_factory_pools(
        self,
        market_id: u256,
        yes_delta: u256,
        no_delta: u256,
        volume_delta: u256,
        buyer: str,
    ) -> None:
        gl.call_contract(
            self.factory_address,
            "update_market_pools",
            [int(market_id), int(yes_delta), int(no_delta), int(volume_delta), buyer],
        )

    def _compute_shares(
        self, amount: u256, pool_in: u256, pool_out: u256
    ) -> u256:
        # Constant product: shares out = pool_out * amount / (pool_in + amount)
        if int(pool_in) + int(pool_out) == 0:
            return amount
        numerator = int(pool_out) * int(amount)
        denominator = int(pool_in) + int(amount)
        return u256(numerator // denominator)

    @gl.public.write.payable
    def buy_yes(self, market_id: u256) -> u256:
        amount = gl.message.value
        assert int(amount) > 0, "Amount must be positive"
        market = self._get_market(market_id)
        assert market, "Market not found"
        assert not market["resolved"], "Market already resolved"
        assert int(market["deadline"]) > int(datetime.now(timezone.utc).timestamp()), "Market expired"

        yes_pool = u256(market["yes_pool"])
        no_pool = u256(market["no_pool"])
        shares = self._compute_shares(amount, no_pool, yes_pool)

        buyer = str(gl.message.sender_address)
        self._ensure_position(buyer, market_id)
        pos = self.positions[buyer][market_id]
        pos.yes_shares = pos.yes_shares + shares
        pos.yes_cost = pos.yes_cost + amount
        self.positions[buyer][market_id] = pos

        self._update_factory_pools(market_id, amount, u256(0), amount, buyer)
        return shares

    @gl.public.write.payable
    def buy_no(self, market_id: u256) -> u256:
        amount = gl.message.value
        assert int(amount) > 0, "Amount must be positive"
        market = self._get_market(market_id)
        assert market, "Market not found"
        assert not market["resolved"], "Market already resolved"
        assert int(market["deadline"]) > int(datetime.now(timezone.utc).timestamp()), "Market expired"

        yes_pool = u256(market["yes_pool"])
        no_pool = u256(market["no_pool"])
        shares = self._compute_shares(amount, yes_pool, no_pool)

        buyer = str(gl.message.sender_address)
        self._ensure_position(buyer, market_id)
        pos = self.positions[buyer][market_id]
        pos.no_shares = pos.no_shares + shares
        pos.no_cost = pos.no_cost + amount
        self.positions[buyer][market_id] = pos

        self._update_factory_pools(market_id, u256(0), amount, amount, buyer)
        return shares

    @gl.public.write
    def sell_yes(self, market_id: u256, shares: u256) -> u256:
        seller = str(gl.message.sender_address)
        self._ensure_position(seller, market_id)
        pos = self.positions[seller][market_id]
        assert int(pos.yes_shares) >= int(shares), "Insufficient YES shares"

        market = self._get_market(market_id)
        assert not market["resolved"], "Market already resolved"

        yes_pool = u256(market["yes_pool"])
        no_pool = u256(market["no_pool"])
        # Inverse of buy: proceeds = yes_pool * shares / (yes_pool - shares)... use simple proportional
        proceeds = u256(int(yes_pool) * int(shares) // (int(yes_pool) + int(no_pool)))

        pos.yes_shares = pos.yes_shares - shares
        self.positions[seller][market_id] = pos

        # Transfer proceeds via native GEN
        gl.transfer(gl.Address(seller), int(proceeds))
        return proceeds

    @gl.public.write
    def sell_no(self, market_id: u256, shares: u256) -> u256:
        seller = str(gl.message.sender_address)
        self._ensure_position(seller, market_id)
        pos = self.positions[seller][market_id]
        assert int(pos.no_shares) >= int(shares), "Insufficient NO shares"

        market = self._get_market(market_id)
        assert not market["resolved"], "Market already resolved"

        yes_pool = u256(market["yes_pool"])
        no_pool = u256(market["no_pool"])
        proceeds = u256(int(no_pool) * int(shares) // (int(yes_pool) + int(no_pool)))

        pos.no_shares = pos.no_shares - shares
        self.positions[seller][market_id] = pos

        gl.transfer(gl.Address(seller), int(proceeds))
        return proceeds

    @gl.public.write
    def claim_reward(self, market_id: u256) -> u256:
        claimant = str(gl.message.sender_address)
        self._ensure_position(claimant, market_id)

        claimed_map = self.claimed.get(claimant)
        if claimed_map is not None and claimed_map.get(market_id):
            return u256(0)

        market = self._get_market(market_id)
        assert market["resolved"], "Market not yet resolved"

        pos = self.positions[claimant][market_id]
        winning_shares = u256(0)
        if market["outcome"]:
            winning_shares = pos.yes_shares
        else:
            winning_shares = pos.no_shares

        assert int(winning_shares) > 0, "No winning shares"

        yes_pool = int(market["yes_pool"])
        no_pool = int(market["no_pool"])
        total_pool = yes_pool + no_pool
        winning_pool = yes_pool if market["outcome"] else no_pool

        reward = u256(total_pool * int(winning_shares) // winning_pool) if winning_pool > 0 else u256(0)

        if self.claimed.get(claimant) is None:
            self.claimed[claimant] = TreeMap[u256, bool]()
        self.claimed[claimant][market_id] = True

        if int(reward) > 0:
            gl.transfer(gl.Address(claimant), int(reward))

        return reward

    @gl.public.view
    def get_position(self, user: str, market_id: u256) -> dict:
        user_positions = self.positions.get(user)
        if user_positions is None:
            return {"market_id": int(market_id), "yes_shares": 0, "no_shares": 0, "avg_yes_price": 0, "avg_no_price": 0}
        pos = user_positions.get(market_id)
        if pos is None:
            return {"market_id": int(market_id), "yes_shares": 0, "no_shares": 0, "avg_yes_price": 0, "avg_no_price": 0}
        return {
            "market_id": int(pos.market_id),
            "yes_shares": int(pos.yes_shares),
            "no_shares": int(pos.no_shares),
            "avg_yes_price": int(pos.yes_cost) // int(pos.yes_shares) if int(pos.yes_shares) > 0 else 0,
            "avg_no_price": int(pos.no_cost) // int(pos.no_shares) if int(pos.no_shares) > 0 else 0,
        }

    @gl.public.view
    def get_user_positions(self, user: str) -> list:
        user_markets = self.user_market_ids.get(user)
        if user_markets is None:
            return []
        result = []
        user_positions = self.positions.get(user)
        if user_positions is None:
            return []
        for mid in user_markets:
            pos = user_positions.get(mid)
            if pos is not None and (int(pos.yes_shares) > 0 or int(pos.no_shares) > 0):
                result.append({
                    "market_id": int(pos.market_id),
                    "yes_shares": int(pos.yes_shares),
                    "no_shares": int(pos.no_shares),
                    "avg_yes_price": int(pos.yes_cost) // int(pos.yes_shares) if int(pos.yes_shares) > 0 else 0,
                    "avg_no_price": int(pos.no_cost) // int(pos.no_shares) if int(pos.no_shares) > 0 else 0,
                })
        return result

    def _ensure_position(self, user: str, market_id: u256) -> None:
        if self.positions.get(user) is None:
            self.positions[user] = TreeMap[u256, Position]()
        if self.positions[user].get(market_id) is None:
            self.positions[user][market_id] = Position(
                market_id=market_id,
                yes_shares=u256(0),
                no_shares=u256(0),
                yes_cost=u256(0),
                no_cost=u256(0),
            )
        if self.user_market_ids.get(user) is None:
            self.user_market_ids[user] = DynArray[u256]()
        ids = self.user_market_ids[user]
        found = False
        for mid in ids:
            if int(mid) == int(market_id):
                found = True
                break
        if not found:
            self.user_market_ids[user].append(market_id)
