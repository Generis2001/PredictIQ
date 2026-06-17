# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass


@allow_storage
@dataclass
class ClaimRecord:
    market_id: u256
    claimant: str
    amount: u256


class RewardDistributor(gl.Contract):
    owner: str
    factory_address: str
    claim_records: DynArray[ClaimRecord]
    user_claims: TreeMap[str, TreeMap[u256, bool]]
    total_distributed: u256

    def __init__(self, factory_address: str) -> None:
        self.factory_address = factory_address
        self.owner = str(gl.message.sender_address)
        self.total_distributed = u256(0)

    @gl.public.write.payable
    def deposit(self) -> None:
        assert int(gl.message.value) > 0, "Must deposit positive amount"

    @gl.public.write
    def distribute_reward(
        self,
        market_id: u256,
        claimant: str,
        winning_shares: u256,
        total_winning_shares: u256,
        total_pool: u256,
    ) -> u256:
        assert str(gl.message.sender_address) == self.owner, "Unauthorized"
        assert int(total_winning_shares) > 0, "No winning shares in pool"

        user_map = self.user_claims.get(claimant)
        if user_map is not None and user_map.get(market_id):
            return u256(0)

        reward = u256(int(total_pool) * int(winning_shares) // int(total_winning_shares))
        assert int(reward) > 0, "Reward is zero"

        self.user_claims.get_or_insert_default(claimant)[market_id] = True
        self.claim_records.append(ClaimRecord(
            market_id=market_id,
            claimant=claimant,
            amount=reward,
        ))
        self.total_distributed = self.total_distributed + reward

        gl.message.send_tokens(Address(claimant), int(reward))
        return reward

    @gl.public.view
    def has_claimed(self, claimant: str, market_id: u256) -> bool:
        user_map = self.user_claims.get(claimant)
        if user_map is None:
            return False
        result = user_map.get(market_id)
        return bool(result) if result is not None else False

    @gl.public.view
    def get_total_distributed(self) -> int:
        return int(self.total_distributed)

    @gl.public.view
    def get_claim_history(self) -> list:
        result = []
        for record in self.claim_records:
            result.append({
                "market_id": int(record.market_id),
                "claimant": record.claimant,
                "amount": int(record.amount),
            })
        return result

    @gl.public.write
    def withdraw_excess(self, amount: u256) -> None:
        assert str(gl.message.sender_address) == self.owner, "Not owner"
        gl.message.send_tokens(gl.message.sender_address, int(amount))
