# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
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
    def resolve_market(
        self,
        market_id: u256,
        question: str,
        resolution_criteria: str,
        sources: DynArray[str],
    ) -> None:
        sources_mem = gl.storage.copy_to_memory(sources)

        def fetch_sources() -> str:
            fetched_sources = []
            for url in sources_mem:
                try:
                    response = gl.get_webpage(url, mode="text")
                    fetched_sources.append({
                        "url": url,
                        "body": str(response)[:MAX_SOURCE_CHARS],
                        "ok": True,
                    })
                except Exception:
                    fetched_sources.append({
                        "url": url,
                        "body": "",
                        "ok": False,
                    })
            return json.dumps(fetched_sources, sort_keys=True)

        raw_sources = gl.eq_principle_strict_eq(fetch_sources)
        fetched = json.loads(raw_sources)
        result = self._resolve_from_evidence(resolution_criteria, fetched)

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
        gl.call_contract(
            self.factory_address,
            "set_market_resolved",
            [int(market_id), str(result.get("outcome", "NO")) == "YES"],
        )

        already_recorded = False
        for mid in self.resolution_ids:
            if int(mid) == int(market_id):
                already_recorded = True
                break
        if not already_recorded:
            self.resolution_ids.append(market_id)

    def _resolve_from_evidence(self, resolution_criteria: str, fetched: list) -> dict:
        criteria = resolution_criteria.lower()
        evidence = ""
        sources_used = []
        for item in fetched:
            if isinstance(item, dict) and item.get("ok"):
                body = str(item.get("body", ""))
                evidence += "\n" + body.lower()
                url = item.get("url")
                if isinstance(url, str):
                    sources_used.append(url)

        yes_terms = self._extract_terms(criteria, "yes terms:")
        no_terms = self._extract_terms(criteria, "no terms:")

        yes_match = self._all_terms_match(evidence, yes_terms)
        no_match = self._all_terms_match(evidence, no_terms)

        if len(yes_terms) == 0 and len(no_terms) == 0:
            return {
                "outcome": "NO",
                "confidence": "0.0",
                "sources_used": sources_used,
                "reasoning": (
                    "No automatic resolution was performed. Add deterministic criteria using "
                    "'YES terms:' and optional 'NO terms:' so validators can verify the "
                    "same evidence and reach strict equality consensus."
                ),
            }

        if yes_match and not no_match:
            return {
                "outcome": "YES",
                "confidence": "1.0",
                "sources_used": sources_used,
                "reasoning": "Validators agreed on the fetched evidence and all required YES terms were present.",
            }

        return {
            "outcome": "NO",
            "confidence": "1.0" if no_match else "0.5",
            "sources_used": sources_used,
            "reasoning": "Validators agreed on the fetched evidence and the deterministic YES rule was not satisfied.",
        }

    def _extract_terms(self, criteria: str, marker: str) -> list:
        marker_index = criteria.find(marker)
        if marker_index < 0:
            return []
        value = criteria[marker_index + len(marker):]
        stop_markers = [" yes terms:", " no terms:"]
        for stop in stop_markers:
            stop_index = value.find(stop)
            if stop_index > 0:
                value = value[:stop_index]
        terms = []
        for raw_term in value.split(","):
            term = raw_term.strip().strip(".;: \n\t\"'")
            if len(term) > 0:
                terms.append(term)
        return terms

    def _all_terms_match(self, evidence: str, terms: list) -> bool:
        if len(terms) == 0:
            return False
        for term in terms:
            if term not in evidence:
                return False
        return True

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
