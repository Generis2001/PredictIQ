# { "Depends": "py-genlayer:test" }
from genlayer import *
import json
from dataclasses import dataclass
from datetime import datetime, timezone


@allow_storage
@dataclass
class MarketResolution:
    outcome: str
    confidence: str
    sources: DynArray[str]
    reasoning: str
    resolved_at: str


class PredictIQResolver(gl.Contract):
    resolutions: TreeMap[u256, MarketResolution]
    resolution_ids: DynArray[u256]
    factory_address: str
    authorized_callers: DynArray[str]
    owner: str

    def __init__(self, factory_address: str) -> None:
        self.factory_address = factory_address
        self.owner = str(gl.message.sender_address)
        self.authorized_callers.append(str(gl.message.sender_address))

    @gl.public.write
    def add_authorized_caller(self, caller: str) -> None:
        assert str(gl.message.sender_address) == self.owner, "Not owner"
        self.authorized_callers.append(caller)

    @gl.public.write
    def resolve_market(
        self,
        market_id: u256,
        question: str,
        resolution_criteria: str,
        sources: DynArray[str],
    ) -> None:
        sources_mem = gl.storage.copy_to_memory(sources)

        def leader_fn() -> str:
            evidence_parts = []
            for url in sources_mem:
                try:
                    response = gl.nondet.web.get(url)
                    content = response.body.decode("utf-8")[:3000]
                    evidence_parts.append(f"[{url}]\n{content}")
                except Exception:
                    evidence_parts.append(f"[{url}]\n(Could not fetch)")

            evidence = "\n\n---\n\n".join(evidence_parts) if evidence_parts else "(No sources provided)"

            prompt = f"""You are an impartial AI resolver for a prediction market.

QUESTION: {question}

RESOLUTION CRITERIA: {resolution_criteria}

EVIDENCE GATHERED:
{evidence}

INSTRUCTIONS:
1. Carefully read the resolution criteria.
2. Analyze the evidence gathered from the provided sources.
3. Determine whether the event described resolves as YES or NO based strictly on the criteria.
4. Assign a confidence score between 0.0 and 1.0 (1.0 = completely certain).
5. If evidence is insufficient or ambiguous, still make a determination but reflect that in the confidence score.
6. List only the URLs that were actually useful as evidence.

Respond ONLY with valid JSON in this exact format:
{{"outcome": "YES" or "NO", "confidence": 0.0 to 1.0, "sources_used": ["url1", "url2"], "reasoning": "detailed step-by-step explanation of your determination"}}"""

            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        def validator_fn(leaders_result) -> bool:
            if not isinstance(leaders_result, gl.vm.Return):
                return False
            try:
                validator_result_raw = leader_fn()
                validator_data = json.loads(validator_result_raw)
                leader_data = json.loads(leaders_result.calldata)
                return leader_data.get("outcome") == validator_data.get("outcome")
            except Exception:
                return False

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = json.loads(raw)

        sources_array = DynArray[str]()
        for s in result.get("sources_used", []):
            if isinstance(s, str):
                sources_array.append(s)

        resolution = MarketResolution(
            outcome=str(result.get("outcome", "NO")),
            confidence=str(result.get("confidence", 0.5)),
            sources=sources_array,
            reasoning=str(result.get("reasoning", "")),
            resolved_at=datetime.now(timezone.utc).isoformat(),
        )
        self.resolutions[market_id] = resolution

        found = False
        for mid in self.resolution_ids:
            if int(mid) == int(market_id):
                found = True
                break
        if not found:
            self.resolution_ids.append(market_id)

        # Notify factory of outcome
        outcome_bool = result.get("outcome", "NO") == "YES"
        gl.call_contract(
            self.factory_address,
            "set_market_resolved",
            [int(market_id), outcome_bool],
        )

    @gl.public.view
    def get_resolution(self, market_id: u256) -> dict:
        res = self.resolutions.get(market_id)
        if res is None:
            return {}
        return {
            "outcome": res.outcome,
            "confidence": res.confidence,
            "sources": list(res.sources),
            "reasoning": res.reasoning,
            "resolved_at": res.resolved_at,
        }

    @gl.public.view
    def get_all_resolutions(self) -> list:
        result = []
        for mid in self.resolution_ids:
            res = self.resolutions.get(mid)
            if res is not None:
                result.append({
                    "market_id": int(mid),
                    "resolution": {
                        "outcome": res.outcome,
                        "confidence": res.confidence,
                        "sources": list(res.sources),
                        "reasoning": res.reasoning,
                        "resolved_at": res.resolved_at,
                    },
                })
        return result

    @gl.public.view
    def is_resolved(self, market_id: u256) -> bool:
        return self.resolutions.get(market_id) is not None

    @gl.public.view
    def resolution_count(self) -> int:
        return len(self.resolution_ids)
