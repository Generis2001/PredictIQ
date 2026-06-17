# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from dataclasses import dataclass


@allow_storage
@dataclass
class MarketResolution:
    outcome: str
    confidence: str
    sources: DynArray[str]
    reasoning: str
    resolved_at: str


class PredictIQResolver(gl.Contract):
    factory_address: str
    owner: str
    resolutions: TreeMap[u256, MarketResolution]
    resolution_ids: DynArray[u256]

    def __init__(self, factory_address: str) -> None:
        self.factory_address = factory_address
        self.owner = str(gl.message.sender_address)

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
                    response = gl.get_webpage(url, mode="text")
                    evidence_parts.append(f"[{url}]\n{response[:3000]}")
                except Exception:
                    evidence_parts.append(f"[{url}]\n(Could not fetch)")

            evidence = "\n\n---\n\n".join(evidence_parts) if evidence_parts else "(No sources provided)"

            prompt = f"""You are an impartial AI resolver for a prediction market.

QUESTION: {question}

RESOLUTION CRITERIA: {resolution_criteria}

EVIDENCE GATHERED:
{evidence}

INSTRUCTIONS:
Determine whether the event resolves YES or NO based strictly on the resolution criteria.
Assign a confidence score 0.0–1.0. List only URLs that were actually useful.

Respond ONLY with valid JSON:
{{"outcome": "YES" or "NO", "confidence": 0.0-1.0, "sources_used": ["url1"], "reasoning": "step-by-step explanation"}}"""

            result = gl.exec_prompt(prompt)
            parsed = json.loads(result)
            return json.dumps(parsed, sort_keys=True)

        def validator_fn(leaders_result) -> bool:
            if not isinstance(leaders_result, gl.vm.Return):
                return False
            try:
                validator_raw = leader_fn()
                validator_data = json.loads(validator_raw)
                leader_data = json.loads(leaders_result.calldata)
                return leader_data.get("outcome") == validator_data.get("outcome")
            except Exception:
                return False

        raw = gl.eq_principle_strict_eq(leader_fn)
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
            resolved_at="resolved",
        )
        self.resolutions[market_id] = resolution

        already_recorded = False
        for mid in self.resolution_ids:
            if int(mid) == int(market_id):
                already_recorded = True
                break
        if not already_recorded:
            self.resolution_ids.append(market_id)

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
        count = 0
        for _ in self.resolution_ids:
            count += 1
        return count
