# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from datetime import datetime, timezone
from dataclasses import dataclass

MAX_SOURCE_CHARS = 3000


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
    def resolve_market(self, market_id: u256) -> None:
        assert self.resolutions.get(market_id) is None, "Market already resolved"

        market_data = gl.call_contract(self.factory_address, "get_market", [int(market_id)])
        assert market_data, "Market not found"
        assert not bool(market_data.get("resolved", False)), "Market already resolved in factory"

        deadline = int(market_data.get("deadline", 0))
        now = int(datetime.now(timezone.utc).timestamp())
        assert now >= deadline, "Market deadline has not passed yet"

        question = str(market_data.get("question", ""))
        resolution_criteria = str(market_data.get("resolution_criteria", ""))
        sources_list = [str(s) for s in market_data.get("sources", [])]

        # Step 1: all validators independently fetch the sources and must produce
        # bit-identical JSON before proceeding — consensus on the raw evidence
        def fetch_sources() -> str:
            fetched = []
            for url in sources_list:
                try:
                    content = gl.get_webpage(url, mode="text")
                    fetched.append({
                        "url": url,
                        "body": str(content)[:MAX_SOURCE_CHARS],
                        "ok": True,
                    })
                except Exception:
                    fetched.append({"url": url, "body": "", "ok": False})
            return json.dumps(fetched, sort_keys=True)

        raw_evidence = gl.eq_principle_strict_eq(fetch_sources)

        # Step 2: each validator runs the LLM against the agreed evidence;
        # comparative judgment lets validators reach consensus even if phrasing differs
        def analyze() -> str:
            return gl.exec_prompt(
                f"You are a prediction market resolver. Using only the evidence provided, "
                f"determine whether this market resolves YES or NO.\n\n"
                f"Market question: {question}\n"
                f"Resolution criteria: {resolution_criteria}\n"
                f"Evidence from sources: {raw_evidence}\n\n"
                f"Respond with only the word YES or NO.",
                return_type=str,
            )

        outcome_text = gl.eq_principle_prompt_comparative_judgment(
            analyze,
            "The outputs are equivalent if they both say YES or both say NO.",
        )

        verdict = self._normalize_label(outcome_text)
        assert verdict == "YES" or verdict == "NO", "Resolver returned unsupported verdict"
        outcome = verdict == "YES"

        sources_array = DynArray[str]()
        for item in json.loads(raw_evidence):
            if isinstance(item, dict) and item.get("ok") and item.get("url"):
                sources_array.append(str(item["url"]))

        resolution = MarketResolution(
            outcome=verdict,
            confidence="1.0",
            sources=sources_array,
            reasoning=(
                f"Validators first reached strict-equality consensus on fetched evidence, "
                f"then comparative-judgment consensus on the LLM verdict: {verdict}."
            ),
            resolved_at="resolved",
        )
        self.resolutions[market_id] = resolution
        self.resolution_ids.append(market_id)

        gl.call_contract(
            self.factory_address,
            "set_market_resolved",
            [int(market_id), outcome],
        )

    def _normalize_label(self, text: str) -> str:
        normalized = text.strip().upper().strip(".!?,:;\"'")
        first_line = normalized.split("\n")[0]
        first_token = first_line.split(" ")[0]
        return first_token

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
