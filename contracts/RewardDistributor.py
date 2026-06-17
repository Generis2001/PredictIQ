# { "Depends": "py-genlayer:test" }
from genlayer import *
from dataclasses import dataclass


@allow_storage
@dataclass
class ClaimRecord:
    market_id: u256
    claimant: str
    amount: u256
    claimed_at: u256


class RewardDistributor(gl.Contract):
    """
    Standalone reward distributor for markets resolved through PredictIQResolver.
    Holds GEN liquidity and distributes to winners based on share proportions.
    The PredictionMarket contract handles inline claims; this contract provides
    a secondary mechanism for batch/external distribution.
    """

    factory_address: str
    prediction_market_address: str
    owner: str
    claim_records: DynArray[ClaimRecord]
    user_claims: TreeMap[str, TreeMap[u256, bool]]
    total_distributed: u256

    def __init__(
        self, factory_address: str, prediction_market_address: str
    ) -> None:
        self.factory_address = factory_address
        self.prediction_market_address = prediction_market_address
        self.owner = str(gl.message.sender_address)
        self.total_distributed = u256(0)

    @gl.public.write.payable
    def deposit(self) -> None:
        """Accept GEN deposits to fund reward payouts."""
        assert gl.message.value > u256(0), "Must deposit positive amount"

    @gl.public.write
    def distribute_reward(
        self,
        market_id: u256,
        claimant: str,
        winning_shares: u256,
        total_winning_shares: u256,
        total_pool: u256,
    ) -> u256:
        """
        Calculate and distribute reward for a winning position.
        Called by authorized contracts or owner after market resolution.
        """
        assert str(gl.message.sender_address) == self.owner or str(gl.message.sender_address) == self.prediction_market_address, "Unauthorized"
        assert int(total_winning_shares) > 0, "No winning shares in pool"

        # Verify not already claimed
        user_map = self.user_claims.get(claimant)
        if user_map is not None and user_map.get(market_id):
            return u256(0)

        reward = u256(int(total_pool) * int(winning_shares) // int(total_winning_shares))
        assert int(reward) > 0, "Reward is zero"

        if self.user_claims.get(claimant) is None:
            self.user_claims[claimant] = TreeMap[u256, bool]()
        self.user_claims[claimant][market_id] = True

        self.claim_records.append(
            ClaimRecord(
                market_id=market_id,
                claimant=claimant,
                amount=reward,
                claimed_at=u256(0),
            )
        )
        self.total_distributed = self.total_distributed + reward

        gl.transfer(gl.Address(claimant), int(reward))
        return reward

    @gl.public.view
    def has_claimed(self, claimant: str, market_id: u256) -> bool:
        user_map = self.user_claims.get(claimant)
        if user_map is None:
            return False
        return bool(user_map.get(market_id))

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
        """Owner can withdraw unneeded funds."""
        assert str(gl.message.sender_address) == self.owner, "Not owner"
        gl.transfer(gl.Address(self.owner), int(amount))
