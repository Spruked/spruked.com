#!/usr/bin/env python3
"""CALI SKG v3.0 cognitive subsystem for ORB reasoning.

This module was moved out of the Electron source tree so cognition lives in the
CALI/system layer. Electron should only adapt/dock ORB surfaces, not own ORB
cognition.
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import json
import logging
import os
import pickle
import sqlite3
import sys
import threading
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

import numpy as np

# Patterns created under NumPy 2.x may pickle the private module path
# ``numpy._core.numeric``. The active CALI runtime may use NumPy 1.x, where
# the compatible implementation lives at ``numpy.core.numeric``. Keep the
# protected vault unchanged and bridge only the deserialization namespace.
try:
    import numpy.core as _numpy_core
    import numpy.core.numeric as _numpy_core_numeric
    sys.modules.setdefault("numpy._core", _numpy_core)
    sys.modules.setdefault("numpy._core.numeric", _numpy_core_numeric)
except Exception:
    pass

try:
    import aiohttp
except Exception:
    aiohttp = None

try:
    import networkx as nx
except Exception:
    nx = None

# Torch is optional for CALI's cognition path. Keep it out of the default
# server import path because the active articulation engine is llama.cpp and
# importing the installed Torch build can crash this WSL process before the
# SKG API starts. Enable explicitly when a Torch-backed embedding operation is
# required.
torch = None
if os.getenv("CALI_ENABLE_TORCH", "0").strip() == "1":
    try:
        import torch as _torch
        torch = _torch
    except Exception:
        torch = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


logger = logging.getLogger("CALI")
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)


def r_drive_path(*parts: str) -> Path:
    root = os.getenv("ORB_R_DRIVE_ROOT")
    if not root:
        root = "/mnt/r" if os.name != "nt" else "R:/"
    return Path(root).joinpath(*parts)


class _SimpleDiGraph:
    """Fallback graph when networkx is unavailable."""

    def __init__(self) -> None:
        self._nodes: Dict[str, Dict[str, Any]] = {}
        self._edges: List[tuple[str, str, Dict[str, Any]]] = []

    def add_node(self, node_id: str, **attrs: Any) -> None:
        self._nodes[node_id] = attrs

    def add_edge(self, source: str, target: str, **attrs: Any) -> None:
        self._edges.append((source, target, attrs))

    def nodes(self) -> List[str]:
        return list(self._nodes.keys())

    def in_degree(self, node_id: str) -> int:
        return sum(1 for _, target, _ in self._edges if target == node_id)

    def number_of_nodes(self) -> int:
        return len(self._nodes)

    def number_of_edges(self) -> int:
        return len(self._edges)


class FallbackSentenceEncoder:
    """Cheap deterministic encoder when sentence-transformers is unavailable."""

    def __init__(self, dim: int = 384) -> None:
        self.dim = dim
        self._calibration_stats: Dict[str, Any] = {
            "sample_count": 0,
            "mean_norm": 0.0,
            "std_norm": 0.0,
        }

    def encode(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dim, dtype=np.float32)
        tokens = [token for token in text.lower().split() if token]
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dim
            vector[index] += 1.0

        norm = float(np.linalg.norm(vector))
        result = vector if norm == 0 else vector / norm
        self._calibration_stats["sample_count"] += 1
        n = self._calibration_stats["sample_count"]
        old_mean = self._calibration_stats["mean_norm"]
        self._calibration_stats["mean_norm"] = old_mean + (norm - old_mean) / n
        return result

    def get_calibration(self) -> Dict[str, Any]:
        return dict(self._calibration_stats)


class ReasoningMode(Enum):
    """Four philosopher logic modes plus system logics."""

    LOCKE_EMPIRICAL = auto()
    HUME_SKEPTICAL = auto()
    KANT_SYNTHETIC = auto()
    SPINOZA_MONISTIC = auto()
    INDUCTIVE_STATISTICAL = auto()
    DEDUCTIVE_LOGICAL = auto()
    INTUITIVE_HOLISTIC = auto()


class MemoryType(Enum):
    """A priori versus a posteriori memory."""

    A_PRIORI = "a_priori"
    A_POSTERIORI = "a_posteriori"


class MORBStatus(Enum):
    PENDING = "pending"
    SPAWNING = "spawning"
    ACTIVE = "active"
    EVALUATING = "evaluating"
    PASS = "pass"
    FAIL = "fail"
    ERROR = "error"
    TIMEOUT = "timeout"
    PARTIAL = "partial"
    DEFERRED = "deferred"


class TaskCategory(Enum):
    EMPIRICAL = "empirical"
    ETHICAL = "ethical"
    SYNTHETIC = "synthetic"
    ANALYTICAL = "analytical"
    DIAGNOSTIC = "diagnostic"
    STRATEGIC = "strategic"


@dataclass(frozen=True)
class PhilosophicalSeed:
    """Immutable philosopher logic configuration."""

    name: str
    logic_type: ReasoningMode
    weight_formula: str
    confidence_bias: float
    description: str
    dominance_ceiling: float = 0.45
    dominance_floor: float = 0.05
    task_affinity: Dict[TaskCategory, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "logic_type": self.logic_type.name,
            "weight_formula": self.weight_formula,
            "confidence_bias": self.confidence_bias,
            "description": self.description,
            "dominance_ceiling": self.dominance_ceiling,
            "dominance_floor": self.dominance_floor,
            "task_affinity": {key.value: value for key, value in self.task_affinity.items()},
        }


@dataclass
class LearnedPattern:
    """CALI's self-improving knowledge patterns."""

    pattern_id: str
    content: str
    reasoning_mode: ReasoningMode
    confidence: float
    truth_likelihood: float
    timestamp: datetime
    source: str
    use_count: int = 0
    last_validated: Optional[datetime] = None
    embedding: Optional[np.ndarray] = field(default=None, repr=False)
    parent_id: Optional[str] = None
    generation: int = 0
    temporal_weight: float = 1.0
    decay_rate: float = 0.001
    validation_history: List[Dict[str, Any]] = field(default_factory=list)
    domain_tags: Set[str] = field(default_factory=set)
    access_count: int = 0
    last_accessed: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.pattern_id:
            seed = f"{self.content}{self.timestamp.isoformat()}".encode("utf-8")
            self.pattern_id = hashlib.sha256(seed).hexdigest()[:16]
        if not self.domain_tags:
            self.domain_tags = self._infer_domains()

    def _infer_domains(self) -> Set[str]:
        text = self.content.lower()
        domains: Set[str] = set()
        domain_keywords = {
            "finance": {"stock", "market", "economic", "finance", "fred", "inflation", "revenue", "audit"},
            "space": {"space", "nasa", "spacex", "planet", "rocket", "astronomy", "mars"},
            "weather": {"weather", "storm", "forecast", "temperature", "hurricane", "rain"},
            "biomedical": {"medical", "disease", "clinical", "trial", "pubmed", "biology", "genome"},
            "academic": {"paper", "research", "study", "scholar", "academic"},
            "geospatial": {"map", "earthquake", "location", "geospatial", "seismic"},
            "mesh": {"node", "morb", "mesh", "topology", "heartbeat"},
            "cognitive": {"reasoning", "pattern", "knowledge", "learning", "memory"},
        }
        for domain, keywords in domain_keywords.items():
            if any(keyword in text for keyword in keywords):
                domains.add(domain)
        return domains

    def apply_temporal_decay(self, now: Optional[datetime] = None) -> float:
        now = now or datetime.now()
        age_days = (now - self.timestamp).total_seconds() / 86400
        decay = max(0.0, 1.0 - (age_days * self.decay_rate))
        self.temporal_weight = decay
        return decay

    def record_validation(self, validator: str, result: str, confidence_delta: float) -> None:
        self.validation_history.append({
            "timestamp": datetime.now().isoformat(),
            "validator": validator,
            "result": result,
            "confidence_delta": confidence_delta,
        })


@dataclass
class SwarmTask:
    """Research task for swarm orbs."""

    task_id: str
    query: str
    apis_targeted: List[Dict[str, Any]]
    priority: int
    spawn_time: datetime
    completion_callback: Optional[Callable[..., Any]] = None
    results: List[Dict[str, Any]] = field(default_factory=list)
    status: str = "pending"
    error: Optional[str] = None
    inferred_domains: List[str] = field(default_factory=list)
    domain_confidence: Dict[str, float] = field(default_factory=dict)


@dataclass
class MORBTask:
    morb_id: str
    task_type: str
    predicate: str
    target_node: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    status: MORBStatus = MORBStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    spawn_time: datetime = field(default_factory=datetime.now)
    completion_time: Optional[datetime] = None
    execution_log: List[str] = field(default_factory=list)
    evaluation_score: float = 0.0
    evaluation_details: Dict[str, Any] = field(default_factory=dict)
    retry_count: int = 0

    def __post_init__(self) -> None:
        if not self.morb_id:
            seed = f"{self.task_type}{self.target_node}{self.spawn_time.isoformat()}".encode("utf-8")
            self.morb_id = hashlib.sha256(seed).hexdigest()[:12]


@dataclass
class MeshNode:
    node_id: str
    node_type: str
    address: str
    health_status: str
    last_seen: datetime
    capabilities: List[str] = field(default_factory=list)
    load_factor: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    reliability_ema: float = 0.5
    reliability_alpha: float = 0.3
    observation_count: int = 0
    capability_inference_confidence: float = 0.0

    def update_reliability(self, success: bool) -> None:
        self.observation_count += 1
        score = 1.0 if success else 0.0
        alpha = min(0.5, self.reliability_alpha + (0.2 / max(1, self.observation_count)))
        self.reliability_ema = alpha * score + (1 - alpha) * self.reliability_ema


@dataclass
class DiagnosticReport:
    component: str
    status: str
    confidence: float
    findings: List[str] = field(default_factory=list)
    remediation: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    severity_score: float = 0.0
    is_transient: bool = False
    probe_duration_ms: float = 0.0
    previous_status: Optional[str] = None
    status_delta: str = "stable"


class AdaptiveCochlearProcessor:
    """Human-like hearing simulation."""

    def __init__(self, sample_rate: int = 16000) -> None:
        self.sample_rate = sample_rate
        self.frequency_bands = 24
        self.temporal_window = 0.025
        self.attention_focus = None
        self.center_freqs = self._bark_scale(100, 8000, self.frequency_bands)

    def _bark_scale(self, f_min: float, f_max: float, n_bands: int) -> np.ndarray:
        bark_min = 13 * np.arctan(0.00076 * f_min) + 3.5 * np.arctan((f_min / 7500) ** 2)
        bark_max = 13 * np.arctan(0.00076 * f_max) + 3.5 * np.arctan((f_max / 7500) ** 2)
        barks = np.linspace(bark_min, bark_max, n_bands)
        return 7500 * np.tan(barks / 13)

    def process_audio(self, audio_signal: np.ndarray) -> Dict[str, Any]:
        normalized = np.asarray(audio_signal, dtype=np.float32).flatten()
        if normalized.size == 0:
            normalized = np.zeros(1, dtype=np.float32)

        features = {
            "spectral_envelope": self._extract_envelope(normalized).tolist(),
            "temporal_modulation": self._temporal_fine_structure(normalized).tolist(),
            "attention_salience": self._compute_salience(normalized),
            "phonetic_cues": self._extract_phonetics(normalized),
            "timestamp": datetime.now().isoformat(),
        }
        return features

    def _extract_envelope(self, signal: np.ndarray) -> np.ndarray:
        spectrum = np.fft.fft(signal)
        half = (np.arange(len(signal)) < len(signal) / 2).astype(np.float32)
        analytic = np.abs(np.fft.ifft(spectrum * half))
        decimation = max(1, int(self.sample_rate / 20))
        return analytic[::decimation][:100]

    def _temporal_fine_structure(self, signal: np.ndarray) -> np.ndarray:
        window = signal[: min(len(signal), 2048)]
        corr = np.correlate(window, window, mode="full")
        center = len(corr) // 2
        return corr[center : center + 100]

    def _compute_salience(self, signal: np.ndarray) -> float:
        energy = float(np.sum(signal ** 2))
        return float(np.clip((energy / (len(signal) + 1e-10)) * 1000, 0, 1))

    def _extract_phonetics(self, signal: np.ndarray) -> Dict[str, Any]:
        zero_crossings = int(np.sum(np.diff(np.signbit(signal)) != 0))
        return {
            "voicing_probability": float(np.clip(1 - (zero_crossings / max(len(signal), 1)), 0, 1)),
            "plosive_detected": zero_crossings > 25,
            "formant_frequencies": self.center_freqs[:4].tolist(),
        }


class SoftMaxAdvisorySKG:
    """Confidence arbitration across multiple reasoning outputs."""

    def __init__(self) -> None:
        self.temperature = 1.0
        self.confidence_history: deque[Dict[str, Any]] = deque(maxlen=100)

    def compute_verdict(self, reasoning_outputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not reasoning_outputs:
            return {
                "verdict": "insufficient_data",
                "confidence": 0.0,
                "truth_likelihood": 0.0,
            }

        raw_scores = np.array([item.get("raw_confidence", 0.5) for item in reasoning_outputs], dtype=np.float32)
        shifted = raw_scores - np.max(raw_scores)
        exp_scores = np.exp(shifted / max(self.temperature, 1e-6))
        weights = exp_scores / np.sum(exp_scores)

        weighted_truth = sum(item.get("truth_estimate", 0.5) * weight for item, weight in zip(reasoning_outputs, weights))
        weighted_accuracy = sum(item.get("accuracy", 0.5) * weight for item, weight in zip(reasoning_outputs, weights))

        variance = float(np.var(raw_scores))
        tension_detected = variance > 0.1
        final_confidence = min(weighted_accuracy, 0.75) if tension_detected else weighted_accuracy

        mean_score = float(np.mean(raw_scores))
        outliers = [
            item
            for item in reasoning_outputs
            if abs(item.get("raw_confidence", 0.5) - mean_score) > 0.3
        ]

        advisory = {
            "verdict": "consensus" if not outliers else "disagreement_detected",
            "confidence": float(final_confidence),
            "truth_likelihood": float(weighted_truth),
            "weights": weights.tolist(),
            "outlier_count": len(outliers),
            "tension_detected": tension_detected,
            "recommendation": "proceed" if final_confidence > 0.6 else "reevaluate",
            "timestamp": datetime.now().isoformat(),
        }
        self.confidence_history.append(advisory)
        return advisory


class BulkMirrorCache:
    MANIFEST_PATH = r_drive_path("manifests", "research_api_manifest.json")
    BULK_MIRRORS_ROOT = r_drive_path("datasets", "bulk_mirrors")
    MAX_CACHE_AGE_HOURS = 24
    MAX_CACHE_FILE_SIZE_BYTES = 2_000_000
    MAX_CACHE_FILES_PER_CATEGORY = 50
    RELEVANCE_DECAY_HOURS = 72

    def __init__(self) -> None:
        self.manifest: Dict[str, Any] = {}
        self.api_map: Dict[str, Dict[str, Any]] = {}
        self.category_map: Dict[str, str] = {}
        self._access_log: deque[Dict[str, Any]] = deque(maxlen=1000)
        self._load_manifest()

    def _load_manifest(self) -> None:
        if not self.MANIFEST_PATH.exists():
            logger.debug("BulkMirrorCache manifest not found at %s", self.MANIFEST_PATH)
            return
        try:
            self.manifest = json.loads(self.MANIFEST_PATH.read_text(encoding="utf-8"))
            for api in self.manifest.get("apis", []):
                api_id = api.get("id", "")
                if not api_id:
                    continue
                self.api_map[api_id] = api
                hint = api.get("storage_hint", "")
                if hint:
                    self.category_map[api_id] = hint
            logger.info("BulkMirrorCache loaded %d API entries", len(self.api_map))
        except Exception as exc:
            logger.warning("BulkMirrorCache manifest load failed: %s", exc)

    def write(self, api_id: str, data: Any, query: str = "") -> Optional[Path]:
        hint = self.category_map.get(api_id)
        if hint:
            mirror_dir = Path(hint)
        else:
            entry = self.api_map.get(api_id, {})
            mirror_dir = self.BULK_MIRRORS_ROOT / entry.get("category", "misc")

        try:
            mirror_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_query = "".join(c if c.isalnum() or c in "-_" else "_" for c in query[:30])
            filename = f"{api_id}_{safe_query}_{timestamp}.json" if safe_query else f"{api_id}_{timestamp}.json"
            file_path = mirror_dir / filename
            payload = json.dumps(
                {
                    "api_id": api_id,
                    "query": query,
                    "fetched_at": datetime.now().isoformat(),
                    "data": data,
                    "access_count": 0,
                    "last_accessed": datetime.now().isoformat(),
                    "relevance_score": 0.5,
                },
                ensure_ascii=False,
                default=str,
            )
            if len(payload.encode("utf-8")) <= self.MAX_CACHE_FILE_SIZE_BYTES:
                file_path.write_text(payload, encoding="utf-8")
                self._prune_category_if_needed(mirror_dir)
                return file_path
        except Exception as exc:
            logger.warning("BulkMirrorCache write failed for %s: %s", api_id, exc)
        return None

    def _prune_category_if_needed(self, category_dir: Path) -> None:
        json_files = list(category_dir.glob("*.json"))
        if len(json_files) <= self.MAX_CACHE_FILES_PER_CATEGORY:
            return
        scored_files: List[tuple[float, Path]] = []
        for file_path in json_files:
            try:
                data = json.loads(file_path.read_text(encoding="utf-8"))
                access_count = data.get("access_count", 0)
                last_accessed = datetime.fromisoformat(
                    data.get("last_accessed", data.get("fetched_at", "2000-01-01"))
                )
                age_hours = (datetime.now() - last_accessed).total_seconds() / 3600
                relevance = data.get("relevance_score", 0.5)
                score = relevance * (1 + access_count) * max(0.1, 1 - age_hours / self.RELEVANCE_DECAY_HOURS)
                scored_files.append((score, file_path))
            except Exception:
                scored_files.append((0.0, file_path))
        scored_files.sort(key=lambda item: item[0])
        for _, file_path in scored_files[: len(scored_files) - self.MAX_CACHE_FILES_PER_CATEGORY]:
            try:
                file_path.unlink()
            except Exception:
                pass

    def read_category(self, category: str, max_files: int = 5) -> List[Dict[str, Any]]:
        mirror_dir = self.BULK_MIRRORS_ROOT / category
        if not mirror_dir.exists():
            return []
        results: List[Dict[str, Any]] = []
        cutoff = datetime.now() - timedelta(hours=self.MAX_CACHE_AGE_HOURS)
        json_files = sorted(mirror_dir.glob("*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
        for json_path in json_files[:max_files]:
            try:
                if datetime.fromtimestamp(json_path.stat().st_mtime) < cutoff:
                    continue
                payload = json.loads(json_path.read_text(encoding="utf-8"))
                payload["access_count"] = payload.get("access_count", 0) + 1
                payload["last_accessed"] = datetime.now().isoformat()
                json_path.write_text(json.dumps(payload, ensure_ascii=False, default=str), encoding="utf-8")
                self._access_log.append({"file": str(json_path), "time": datetime.now().isoformat()})
                results.append(payload)
            except Exception:
                continue
        return results

    def has_recent(self, category: str) -> bool:
        mirror_dir = self.BULK_MIRRORS_ROOT / category
        if not mirror_dir.exists():
            return False
        cutoff = datetime.now() - timedelta(hours=self.MAX_CACHE_AGE_HOURS)
        return any(datetime.fromtimestamp(path.stat().st_mtime) >= cutoff for path in mirror_dir.glob("*.json"))

    def get_prefetchable_apis(self) -> List[Dict[str, Any]]:
        return [api for api in self.api_map.values() if api.get("auth") in ("none", "optional_key", None)]

    def prefetch_all(self) -> int:
        ok = 0
        for api in self.get_prefetchable_apis():
            api_id = api.get("id", "")
            category = api.get("category", "misc")
            if self.has_recent(category):
                continue
            endpoints = api.get("endpoints") or {}
            first_url = next((v for v in endpoints.values() if isinstance(v, str) and "{" not in v), None)
            if not first_url:
                continue
            try:
                request = urllib.request.Request(first_url, headers={"User-Agent": "CALI-BulkMirror/4.0"})
                with urllib.request.urlopen(request, timeout=15) as response:
                    body = response.read().decode("utf-8", errors="replace")
                try:
                    data = json.loads(body)
                except json.JSONDecodeError:
                    data = {"raw_text": body[:1000]}
                self.write(api_id, data, query="prefetch")
                ok += 1
            except Exception:
                continue
        return ok

    def summarize_for_query(self, query: str, domains: List[str]) -> List[str]:
        tokens = set(query.lower().split())
        snippets: List[str] = []
        domain_to_category = {
            "finance": "financial_economic",
            "financial": "financial_economic",
            "space": "space_exploration_and_mars",
            "weather": "earth_systems_and_climate",
            "biomedical": "biomedical_and_public_health",
            "medical": "biomedical_and_public_health",
            "geospatial": "geospatial_and_regional_analysis",
            "academic": "scientific_literature_and_evidence",
            "legal": "legal_and_regulatory",
            "economics": "macro_economic_indicators",
            "macro": "macro_economic_indicators",
            "micro": "micro_economic_markets",
            "agriculture": "agriculture_food_and_water",
            "industrial": "industrial_manufacturing",
            "machine_learning": "machine_learning",
        }
        categories_to_check: Set[str] = set()
        for domain in domains:
            slug = domain.lower().replace(" ", "_")
            mapped = domain_to_category.get(slug) or domain_to_category.get(slug.split("_")[0])
            if mapped:
                categories_to_check.add(mapped)
            elif (self.BULK_MIRRORS_ROOT / slug).exists():
                categories_to_check.add(slug)

        for category in categories_to_check:
            for cached in self.read_category(category, max_files=3):
                text = self._extract_text(cached.get("data", {}))
                if text and tokens & set(text.lower().split()):
                    snippets.append(f"[{category}/{cached.get('api_id', '?')}] {text[:200]}")
        return snippets[:6]

    def weight_api_confidence(self, api_id: str, raw_quality: float) -> tuple[float, float]:
        priority_base = {"high": 0.85, "medium": 0.70, "low": 0.55}
        auth_mult = {"none": 0.90, "optional_key": 0.90, "api_key_required": 1.00}
        entry = self.api_map.get(api_id, {})
        raw = float(raw_quality) if 0.0 <= float(raw_quality) <= 1.0 else 0.5
        confidence = max(
            0.35,
            min(0.95, priority_base.get(entry.get("priority", "medium"), 0.70) * auth_mult.get(entry.get("auth", "none"), 0.90) * (0.5 + raw * 0.5)),
        )
        return round(confidence, 4), round(confidence * 0.90, 4)

    @staticmethod
    def _extract_text(data: Any) -> str:
        if isinstance(data, str):
            return data[:400]
        if isinstance(data, dict):
            for key in ("title", "description", "name", "summary", "abstract", "text", "raw_text"):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()[:400]
            parts = [str(value) for value in data.values() if isinstance(value, str) and value.strip()]
            return " ".join(parts[:3])[:400]
        if isinstance(data, list) and data:
            return BulkMirrorCache._extract_text(data[0])
        return ""


class CALISwarmOrchestrator:
    """Parallel API research orchestration."""

    DOMAIN_ALIASES = {
        "space": ["space_earth_science_imagery", "space_astronomy_physics_additional"],
        "weather": ["weather_climate_ocean_storms"],
        "biomedical": [
            "biomedical_genomics_clinical",
            "biology_genomics_life_sciences",
            "health_medicine_public_health",
        ],
        "finance": ["economics_finance_markets"],
        "academic": [
            "knowledge_graphs_and_scholarly_metadata",
            "education_learning_research",
            "machine_learning_nlp_ai_research",
        ],
        "geospatial": [
            "geospatial_mapping_earth_data",
            "geospatial_transportation_mobility",
        ],
    }

    QUERY_PARAM_HINTS = {
        "NASA_APOD": None,
        "NASA_NeoWS": None,
        "SpaceX_Launches": None,
        "NOAA_Alerts": "query",
        "OpenWeather": "q",
        "PubMed_Search": "term",
        "ClinicalTrials": "query.term",
        "AlphaVantage": "keywords",
        "FRED": "search_text",
        "SemanticScholar": "query",
        "OpenAlex": "search",
        "OpenStreetMap": "data",
        "USGS_Earthquakes": "search",
    }

    def __init__(self, api_registry_path: Path) -> None:
        self.api_registry_path = api_registry_path
        self.advanced_registry_path = api_registry_path.with_name("advanced_api_imports.json")
        self.api_registry = self._load_api_registry(api_registry_path)
        self.active_tasks: Dict[str, SwarmTask] = {}
        self.task_queue: asyncio.Queue[SwarmTask] = asyncio.Queue()
        self.task_events: Dict[str, asyncio.Event] = {}
        self.session: Optional[Any] = None
        self.max_concurrent = 5
        self._workers: List[asyncio.Task[Any]] = []

    def _load_api_registry(self, path: Path) -> Dict[str, List[Dict[str, Any]]]:
        merged_registry: Dict[str, List[Dict[str, Any]]] = {}

        for candidate in (path, self.advanced_registry_path):
            if not candidate.exists():
                continue

            with candidate.open("r", encoding="utf-8") as handle:
                raw_registry = json.load(handle)

            normalized = self._normalize_api_registry(raw_registry)
            for domain, entries in normalized.items():
                merged_registry.setdefault(domain, []).extend(entries)

        return merged_registry

    def _normalize_api_registry(self, raw_registry: Any) -> Dict[str, List[Dict[str, Any]]]:
        if not isinstance(raw_registry, dict):
            return {}

        if "domains" in raw_registry and isinstance(raw_registry["domains"], list):
            normalized: Dict[str, List[Dict[str, Any]]] = {}
            for domain_block in raw_registry["domains"]:
                domain_key = self._slugify(domain_block.get("domain") or domain_block.get("category") or "misc")
                entries = [
                    self._normalize_api_entry(item, domain_key)
                    for item in domain_block.get("entries", [])
                    if isinstance(item, dict)
                ]
                if entries:
                    normalized[domain_key] = entries
            return normalized

        if "entries" in raw_registry and isinstance(raw_registry["entries"], list):
            normalized: Dict[str, List[Dict[str, Any]]] = {}
            for item in raw_registry["entries"]:
                if not isinstance(item, dict):
                    continue
                domain_key = self._slugify(item.get("domain") or item.get("category") or "misc")
                normalized.setdefault(domain_key, []).append(self._normalize_api_entry(item, domain_key))
            return normalized

        if "apis" in raw_registry and isinstance(raw_registry["apis"], list):
            normalized: Dict[str, List[Dict[str, Any]]] = {}
            for item in raw_registry["apis"]:
                if not isinstance(item, dict):
                    continue
                domain_key = self._slugify(item.get("category") or raw_registry.get("category") or "advanced_api_imports")
                normalized.setdefault(domain_key, []).append(self._normalize_api_entry(item, domain_key))
            return normalized

        normalized: Dict[str, List[Dict[str, Any]]] = {}
        for domain_key, entries in raw_registry.items():
            if not isinstance(entries, list):
                continue
            slug = self._slugify(domain_key)
            normalized[slug] = [
                self._normalize_api_entry(item, slug)
                for item in entries
                if isinstance(item, dict)
            ]
        return normalized

    def _normalize_api_entry(self, api_entry: Dict[str, Any], fallback_domain: str) -> Dict[str, Any]:
        normalized = dict(api_entry)
        endpoint = normalized.get("endpoint") or normalized.get("reference_url")

        if not endpoint and isinstance(normalized.get("endpoints"), dict):
            endpoint = next(
                (
                    value
                    for value in normalized["endpoints"].values()
                    if isinstance(value, str) and value
                ),
                "",
            )

        normalized["endpoint"] = endpoint or ""
        normalized["domain"] = self._slugify(normalized.get("domain") or normalized.get("category") or fallback_domain)
        normalized["name"] = normalized.get("name") or normalized.get("provider") or "unknown"
        return normalized

    def _resolve_domain_keys(self, requested_domains: List[str]) -> List[str]:
        resolved: List[str] = []
        available = list(self.api_registry.keys())

        for domain in requested_domains:
            slug = self._slugify(domain)
            if slug in self.DOMAIN_ALIASES:
                resolved.extend(self.DOMAIN_ALIASES[slug])
                continue
            if slug in self.api_registry:
                resolved.append(slug)
                continue

            fuzzy_matches = [candidate for candidate in available if slug in candidate or candidate in slug]
            resolved.extend(fuzzy_matches[:3])

        if not resolved:
            return []

        ordered: List[str] = []
        for domain in resolved:
            if domain not in ordered:
                ordered.append(domain)
        return ordered

    @staticmethod
    def _slugify(value: str) -> str:
        lowered = str(value or "").strip().lower()
        cleaned = []
        previous_underscore = False
        for char in lowered:
            if char.isalnum():
                cleaned.append(char)
                previous_underscore = False
            elif not previous_underscore:
                cleaned.append("_")
                previous_underscore = True

        return "".join(cleaned).strip("_") or "misc"

    async def initialize(self) -> None:
        if self.session is None and aiohttp is not None:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                headers={"User-Agent": "CALI-Orb-Research/3.0"},
            )

        if not self._workers:
            self._workers = [
                asyncio.create_task(self._swarm_worker(index), name=f"cali-swarm-{index}")
                for index in range(self.max_concurrent)
            ]

    async def _swarm_worker(self, index: int) -> None:
        while True:
            task = await self.task_queue.get()
            try:
                await self._execute_swarm_task(task)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                task.status = "failed"
                task.error = str(exc)
                logger.warning("Swarm worker %s failed task %s: %s", index, task.task_id, exc)
            finally:
                event = self.task_events.get(task.task_id)
                if event:
                    event.set()
                self.task_queue.task_done()

    async def spawn_research_orbs(self, query: str, domains: List[str]) -> str:
        task_id = hashlib.sha256(f"{query}{datetime.now().isoformat()}".encode("utf-8")).hexdigest()[:12]
        targeted_apis: List[Dict[str, Any]] = []
        resolved_domains = self._resolve_domain_keys(domains) or domains
        for domain in resolved_domains:
            targeted_apis.extend(self.api_registry.get(domain, []))

        if not targeted_apis:
            for entries in self.api_registry.values():
                targeted_apis.extend(entries[:1])

        task = SwarmTask(
            task_id=task_id,
            query=query,
            apis_targeted=targeted_apis[:10],
            priority=5,
            spawn_time=datetime.now(),
        )
        self.active_tasks[task_id] = task
        self.task_events[task_id] = asyncio.Event()
        await self.task_queue.put(task)
        logger.info("Spawned research orbs for task %s: %s APIs", task_id, len(task.apis_targeted))
        return task_id

    async def _execute_swarm_task(self, task: SwarmTask) -> None:
        task.status = "active"

        async def fetch_api(api_config: Dict[str, Any]) -> Dict[str, Any]:
            try:
                url, params = self._build_request(api_config, task.query)
                data = await self._request_data(url, params=params, headers=api_config.get("headers"))
                return {
                    "api": api_config.get("name", "unknown"),
                    "domain": api_config.get("domain", "unknown"),
                    "data": data,
                    "timestamp": datetime.now().isoformat(),
                    "confidence": self._assess_data_quality(data),
                }
            except Exception as exc:
                return {
                    "api": api_config.get("name", "unknown"),
                    "domain": api_config.get("domain", "unknown"),
                    "error": str(exc),
                    "timestamp": datetime.now().isoformat(),
                }

        results = await asyncio.gather(*(fetch_api(api) for api in task.apis_targeted))
        task.results = [result for result in results if result]
        task.status = "complete"
        if task.completion_callback:
            task.completion_callback(task)
        logger.info("Swarm task %s complete: %s results", task.task_id, len(task.results))

    def _build_request(self, api_config: Dict[str, Any], query: str) -> tuple[str, Dict[str, Any]]:
        endpoint = api_config.get("endpoint", "")
        if "{query}" in endpoint:
            endpoint = endpoint.format(query=urllib.parse.quote(query))

        params = dict(api_config.get("params", {}))
        rendered_params: Dict[str, Any] = {}
        for key, value in params.items():
            if isinstance(value, str):
                rendered_params[key] = value.format(query=query)
            else:
                rendered_params[key] = value

        hint = self.QUERY_PARAM_HINTS.get(api_config.get("name"))
        if query and hint and hint not in rendered_params:
            rendered_params[hint] = query

        api_key_env = api_config.get("api_key_env")
        api_key_param = api_config.get("api_key_param")
        if api_key_env and api_key_param:
            api_key = os.getenv(api_key_env)
            if api_key:
                rendered_params[api_key_param] = api_key

        if api_config.get("name") == "OpenStreetMap" and "data" in rendered_params:
            rendered_params["data"] = rendered_params["data"].format(query=query)

        return endpoint, rendered_params

    async def _request_data(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        if self.session is not None:
            async with self.session.get(url, params=params or {}, headers=headers) as response:
                text = await response.text()
                return self._decode_response(text, response.headers.get("Content-Type", ""))

        return await asyncio.to_thread(self._urllib_fetch, url, params or {}, headers or {})

    def _urllib_fetch(self, url: str, params: Dict[str, Any], headers: Dict[str, str]) -> Any:
        query_string = urllib.parse.urlencode(params, doseq=True)
        full_url = f"{url}?{query_string}" if query_string else url
        request = urllib.request.Request(full_url, headers=headers or {"User-Agent": "CALI-Orb-Research/3.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8", errors="replace")
            content_type = response.headers.get("Content-Type", "")
        return self._decode_response(body, content_type)

    def _decode_response(self, payload: str, content_type: str) -> Any:
        if "json" in content_type.lower():
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                return {"raw_text": payload[:2000]}

        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            pass

        try:
            root = ET.fromstring(payload)
            return self._xml_to_dict(root)
        except ET.ParseError:
            return {"raw_text": payload[:2000]}

    def _xml_to_dict(self, node: ET.Element) -> Any:
        children = list(node)
        if not children:
            return node.text or ""

        result: Dict[str, Any] = {}
        for child in children:
            value = self._xml_to_dict(child)
            if child.tag in result:
                existing = result[child.tag]
                if not isinstance(existing, list):
                    result[child.tag] = [existing]
                result[child.tag].append(value)
            else:
                result[child.tag] = value
        return result

    def _assess_data_quality(self, data: Any) -> float:
        if not data:
            return 0.0
        if isinstance(data, dict):
            total = max(len(data), 1)
            present = len([value for value in data.values() if value not in (None, "", [], {})])
            return min(1.0, present / total)
        if isinstance(data, list):
            return min(1.0, len(data) / 10.0)
        return 0.5

    async def ingest_results(self, task_id: str) -> Dict[str, Any]:
        task = self.active_tasks.get(task_id)
        if task is None:
            return {"error": "Task not found"}

        event = self.task_events.get(task_id)
        if event is not None:
            await event.wait()

        return {
            "task_id": task_id,
            "sources_queried": len(task.apis_targeted),
            "successful_returns": len([result for result in task.results if "data" in result]),
            "key_findings": self._extract_findings(task.results),
            "confidence_aggregate": float(
                np.mean([result.get("confidence", 0.5) for result in task.results if "confidence" in result])
            )
            if task.results
            else 0.0,
            "ingestion_timestamp": datetime.now().isoformat(),
            "ready_for_voice": True,
            "status": task.status,
            "error": task.error,
        }

    def _extract_findings(self, results: List[Dict[str, Any]]) -> List[str]:
        findings: List[str] = []
        for result in results:
            data = result.get("data")
            if not data:
                continue

            source = result.get("api", "unknown source")
            summary = self._summarize_payload(data)
            if summary:
                findings.append(f"From {source}: {summary}")

        return findings[:5]

    def _summarize_payload(self, data: Any) -> Optional[str]:
        if isinstance(data, dict):
            for key in ("title", "name", "headline", "message", "description"):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()[:180]

            for key in ("results", "data", "items", "studies"):
                nested = data.get(key)
                if isinstance(nested, list) and nested:
                    return f"{len(nested)} records found"

            return f"{len(data)} fields returned"

        if isinstance(data, list):
            return f"{len(data)} records found"

        if isinstance(data, str) and data.strip():
            return data.strip()[:180]

        return None

    async def close(self) -> None:
        for worker in self._workers:
            worker.cancel()

        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers = []

        if self.session is not None:
            await self.session.close()
            self.session = None


class CALISKG:
    """CALI: Cognitively Aligned Linear Intelligence."""

    PHILOSOPHER_SEEDS = {
        "locke": PhilosophicalSeed(
            name="John Locke",
            logic_type=ReasoningMode.LOCKE_EMPIRICAL,
            weight_formula="sensory_evidence * reliability",
            confidence_bias=0.7,
            description="All knowledge comes from sensory experience. Tabula rasa.",
        ),
        "hume": PhilosophicalSeed(
            name="David Hume",
            logic_type=ReasoningMode.HUME_SKEPTICAL,
            weight_formula="impression_strength * constant_conjunction",
            confidence_bias=0.4,
            description="Causal connections are habits of mind, not necessary truths.",
        ),
        "kant": PhilosophicalSeed(
            name="Immanuel Kant",
            logic_type=ReasoningMode.KANT_SYNTHETIC,
            weight_formula="a_priori_categories * empirical_intuitions",
            confidence_bias=0.8,
            description="Knowledge requires both a priori forms and a posteriori content.",
        ),
        "spinoza": PhilosophicalSeed(
            name="Baruch Spinoza",
            logic_type=ReasoningMode.SPINOZA_MONISTIC,
            weight_formula="geometric_necessity * adequate_ideas",
            confidence_bias=0.9,
            description="God and Nature are one substance. Geometric method.",
        ),
    }

    SYSTEM_LOGICS = {
        "inductive": ReasoningMode.INDUCTIVE_STATISTICAL,
        "deductive": ReasoningMode.DEDUCTIVE_LOGICAL,
        "intuitive": ReasoningMode.INTUITIVE_HOLISTIC,
    }

    DEFAULT_A_PRIORI_ENTRIES = [
        {"content": "Identity is stable enough for reasoning when a subject remains itself."},
        {"content": "A contradiction cannot be true in the same respect at the same time."},
        {"content": "Causes and effects should be tested against observation before certainty is claimed."},
        {"content": "Time orders experience, and experience refines judgment."},
    ]

    DOMAIN_HINTS = {
        "space": {"space", "astronomy", "rocket", "planet", "nasa", "spacex", "asteroid"},
        "weather": {"weather", "storm", "forecast", "temperature", "hurricane", "rain"},
        "biomedical": {"medical", "disease", "clinical", "trial", "pubmed", "biology"},
        "finance": {"stock", "market", "economic", "finance", "fred", "inflation"},
        "academic": {"paper", "research", "study", "scholar", "academic", "openalex"},
        "geospatial": {"map", "earthquake", "location", "geospatial", "seismic"},
    }

    def __init__(self, system_path: Path, partition_size_gb: int = 20) -> None:
        self.instance_id = os.getenv("ORB_INSTANCE_ID", "wsl").strip() or "wsl"
        self.shared_mesh_root = os.getenv("ORB_SHARED_MESH_ROOT")
        self.system_path = Path(system_path).expanduser().resolve()
        self.partition_size = partition_size_gb * 1024 * 1024 * 1024
        self.cali_root = self.system_path / "CALI_System"
        self.SUBSTRATE_ROOT = Path(os.getenv("CALI_SUBSTRATE_ROOT", self.system_path / "substrate")).expanduser()
        self.COGNITIVE_SEED_ROOT = Path(
            os.getenv("CALI_COGNITIVE_SEED_ROOT", self.cali_root / "memory" / "cognitive_seeds")
        ).expanduser()
        self._initialize_system_structure()

        self.device = self._resolve_device()
        self.vram_gb = 6 if torch is not None and hasattr(torch, "cuda") and torch.cuda.is_available() else 0
        self.encoder = self._initialize_encoder()
        self.encoder_backend = type(self.encoder).__name__

        self.cochlea = AdaptiveCochlearProcessor()
        self.advisory = SoftMaxAdvisorySKG()
        self.swarm = CALISwarmOrchestrator(self.cali_root / "config" / "api_registry.json")
        self.bulk_mirror = BulkMirrorCache()

        self.a_priori_vault = self._initialize_vault(MemoryType.A_PRIORI)
        self.a_posteriori_vault = self._initialize_vault(MemoryType.A_POSTERIORI)

        self.kg = nx.DiGraph() if nx is not None else _SimpleDiGraph()
        self._build_core_cognition_graph()
        self._inject_substrate_knowledge()
        self._load_cognitive_seed_vaults()

        self.db_lock = threading.Lock()
        self.patterns_db = sqlite3.connect(self.cali_root / "memory" / "patterns.db", check_same_thread=False)
        self._initialize_patterns_db()

        self.voice_config = {
            "engine": "kokoro",
            "speaker_id": "am_echo",
            "backup_engine": "text",
            "backup_voice": "none",
            "speed": 1.05,
            "pitch": 0.0,
            "emotion": "thoughtful_warm",
            "gpu_accelerated": str(self.device) == "cuda",
        }

        self.current_reasoning_mode = ReasoningMode.KANT_SYNTHETIC
        self.confidence_threshold = 0.75
        self.interaction_count = 0
        self.orb_state = {
            "skin": "WORKORB21600",
            "swarm_visible": False,
            "desktop_access": True,
            "browser_access": True,
            "voice_active": True,
            "morb_deployment_enabled": False,
            "mesh_traversal_enabled": False,
            "diagnostic_tier": "standard",
            "llm_local_model": os.getenv("CALI_OLLAMA_MODEL_NAME", "llama3.2:1b"),
            "llm_local_endpoint": os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        }

        logger.info("CALI SKG initialized | Device: %s | Partition: %sGB", self.device, partition_size_gb)

    def _initialize_system_structure(self) -> None:
        for relative in (
            "memory/a_priori",
            "memory/a_posteriori",
            "memory/patterns",
            "config",
            "cache",
            "logs",
            "voice_cache",
            "swarm_results",
        ):
            (self.cali_root / relative).mkdir(parents=True, exist_ok=True)

    def _resolve_device(self) -> Any:
        if torch is None:
            return "cpu"
        if hasattr(torch, "cuda") and torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")

    def _initialize_encoder(self) -> Any:
        if SentenceTransformer is None:
            logger.warning("sentence-transformers unavailable; using fallback encoder")
            return FallbackSentenceEncoder()

        cache_dir = self.cali_root / "cache" / "sentence_transformers"
        cache_dir.mkdir(parents=True, exist_ok=True)
        allow_download = os.getenv("CALI_ALLOW_MODEL_DOWNLOAD", "0").strip().lower() in {"1", "true", "yes", "on"}

        kwargs = {
            "device": str(self.device),
            "cache_folder": str(cache_dir),
        }

        if not allow_download:
            kwargs["local_files_only"] = True

        try:
            return SentenceTransformer("all-MiniLM-L6-v2", **kwargs)
        except TypeError:
            kwargs.pop("local_files_only", None)
            try:
                return SentenceTransformer("all-MiniLM-L6-v2", **kwargs)
            except Exception as exc:
                logger.warning("SentenceTransformer init failed (%s); using fallback encoder", exc)
                return FallbackSentenceEncoder()
        except Exception as exc:
            logger.warning("SentenceTransformer init failed (%s); using fallback encoder", exc)
            return FallbackSentenceEncoder()

    def _initialize_vault(self, vault_type: MemoryType) -> Dict[str, Any]:
        vault_path = self.cali_root / "memory" / vault_type.value
        vault_file = vault_path / "vault.jsonl"
        entries = self._load_vault_entries(vault_file)

        if vault_type == MemoryType.A_PRIORI and not entries:
            entries = [dict(item) for item in self.DEFAULT_A_PRIORI_ENTRIES]
            with vault_file.open("w", encoding="utf-8") as handle:
                for entry in entries:
                    handle.write(json.dumps(entry) + "\n")

        return {
            "type": vault_type,
            "path": vault_file,
            "entries": entries,
            "immutable": vault_type == MemoryType.A_PRIORI,
        }

    def _load_vault_entries(self, vault_file: Path) -> List[Dict[str, Any]]:
        if not vault_file.exists():
            return []

        entries: List[Dict[str, Any]] = []
        with vault_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    logger.warning("Skipping malformed vault entry in %s", vault_file)
        return entries

    def _initialize_patterns_db(self) -> None:
        with self.db_lock:
            cursor = self.patterns_db.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS patterns (
                    id TEXT PRIMARY KEY,
                    content TEXT,
                    reasoning_mode TEXT,
                    confidence REAL,
                    truth_likelihood REAL,
                    timestamp TEXT,
                    source TEXT,
                    use_count INTEGER,
                    last_validated TEXT,
                    embedding BLOB
                )
                """
            )
            self.patterns_db.commit()

    def _build_core_cognition_graph(self) -> None:
        self.kg.add_node("cali_identity", type="cognitive_entity", name="CALI", stability="immutable")

        for seed_id, seed in self.PHILOSOPHER_SEEDS.items():
            self.kg.add_node(f"seed_{seed_id}", type="philosophical_logic", seed_data=seed.to_dict())
            self.kg.add_edge("cali_identity", f"seed_{seed_id}", weight=0.25, relation="reasons_with")

        self.kg.add_node("vault_a_priori", type="memory", mutability="immutable", access="direct")
        self.kg.add_node("vault_a_posteriori", type="memory", mutability="append_only", access="experiential")
        self.kg.add_node("acp_cochlea", type="perception", modality="auditory", human_like=True)
        self.kg.add_node("softmax_advisory", type="meta_cognition", function="confidence_arbitration")
        self.kg.add_node("swarm_orchestrator", type="action", modality="research", visual_metaphor="orb_swarm")
        self.kg.add_node("voice_synthesis", type="expression", primary=True, fallback="text")

        for node in (
            "vault_a_priori",
            "vault_a_posteriori",
            "acp_cochlea",
            "softmax_advisory",
            "swarm_orchestrator",
            "voice_synthesis",
        ):
            self.kg.add_edge("cali_identity", node, weight=0.9, relation="embodies")

    def reason(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.interaction_count += 1
        context = context or {}
        core_mind_outputs: List[Dict[str, Any]] = []

        for seed in self.PHILOSOPHER_SEEDS.values():
            core_mind_outputs.append(self._apply_philosophical_logic(query, seed, context))

        system_logic_outputs = [
            self._apply_inductive_logic(query, context, core_mind_outputs),
            self._apply_deductive_logic(query, context, core_mind_outputs),
            self._apply_intuitive_logic(query, context, core_mind_outputs),
        ]

        advisory = self.advisory.compute_verdict(core_mind_outputs)
        advisory["system_logic_guidance"] = system_logic_outputs
        weights = list(advisory.get("weights") or [])
        top_index = max(range(len(core_mind_outputs)), key=lambda index: weights[index] if index < len(weights) else 0.0)
        leading_mind = str(core_mind_outputs[top_index]["philosopher"])
        response_text = self._formulate_response(query, advisory, core_mind_outputs)
        core_four_decision = {
            "leading_mind": leading_mind,
            "leading_mind_index": top_index,
            "synthesis": response_text,
            "final_response": response_text,
            "authority": "core_four",
            "softmax_role": "advisory_only",
        }

        self._store_experience(query, core_mind_outputs + system_logic_outputs, advisory)
        self._remember_pattern(
            content=f"{query} -> {response_text}",
            reasoning_mode=self._resolve_top_reasoning_mode(advisory, core_mind_outputs),
            confidence=advisory["confidence"],
            truth_likelihood=advisory["truth_likelihood"],
            source="internal_reasoning",
        )

        return {
            "query": query,
            "core_minds": {str(item["philosopher"]).split()[-1].lower(): item for item in core_mind_outputs},
            "system_logic_evaluation": {str(item["system_logic"]): item for item in system_logic_outputs},
            "softmax_advisory": advisory,
            "core_four_decision": core_four_decision,
            "philosophical_reasoning": core_mind_outputs,
            "advisory_verdict": advisory,
            "recommended_response": response_text,
            "voice_ready": True,
            "timestamp": datetime.now().isoformat(),
        }

    def _apply_philosophical_logic(
        self,
        query: str,
        seed: PhilosophicalSeed,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        evidence = self._retrieve_a_posteriori(query, limit=5)
        a_priori = self._retrieve_a_priori(query)

        if seed.logic_type == ReasoningMode.LOCKE_EMPIRICAL:
            confidence = seed.confidence_bias * min(1.0, len(evidence) / 4 if evidence else 0.35)
        elif seed.logic_type == ReasoningMode.HUME_SKEPTICAL:
            has_causal_language = any(word in query.lower() for word in ("cause", "because", "therefore"))
            confidence = seed.confidence_bias * (0.5 if has_causal_language else 0.95)
        elif seed.logic_type == ReasoningMode.KANT_SYNTHETIC:
            synthesis = len(a_priori) + len(evidence)
            confidence = seed.confidence_bias * min(1.0, max(synthesis, 1) / 4)
        else:
            confidence = seed.confidence_bias * (1.0 if a_priori else 0.6)

        return {
            "philosopher": seed.name,
            "logic_type": seed.logic_type.name,
            "raw_confidence": float(np.clip(confidence, 0, 1)),
            "truth_estimate": float(np.clip(confidence * 0.9, 0, 1)),
            "accuracy": float(np.clip(confidence, 0, 1)),
            "reasoning_trace": f"{seed.name} reasoning applied with {seed.weight_formula}",
            "evidence_count": len(evidence),
            "context_keys": list(context.keys())[:5],
        }

    def _apply_inductive_logic(self, query: str, context: Dict[str, Any], core_outputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        patterns = self._retrieve_patterns(query, limit=5)
        confidence = 0.6 + (0.08 * len(patterns)) if patterns else 0.5
        return {
            "system_logic": "inductive",
            "logic_type": ReasoningMode.INDUCTIVE_STATISTICAL.name,
            "raw_confidence": float(min(0.9, confidence)),
            "truth_estimate": float(min(0.85, confidence)),
            "accuracy": float(min(0.9, confidence)),
            "pattern_count": len(patterns),
            "evaluated_core_minds": [item["philosopher"] for item in core_outputs],
        }

    def _apply_deductive_logic(self, query: str, context: Dict[str, Any], core_outputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        premises = self._retrieve_a_priori(query)
        confidence = 0.9 if premises else 0.4
        return {
            "system_logic": "deductive",
            "logic_type": ReasoningMode.DEDUCTIVE_LOGICAL.name,
            "raw_confidence": confidence,
            "truth_estimate": confidence,
            "accuracy": confidence,
            "premise_count": len(premises),
            "evaluated_core_minds": [item["philosopher"] for item in core_outputs],
        }

    def _apply_intuitive_logic(self, query: str, context: Dict[str, Any], core_outputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        query_embedding = np.asarray(self.encoder.encode(query), dtype=np.float32)
        patterns = self._retrieve_patterns(query, limit=10)

        similarity_scores: List[float] = []
        for pattern in patterns:
            if pattern.embedding is None:
                continue
            similarity_scores.append(self._cosine_similarity(query_embedding, pattern.embedding))

        similarity = max(similarity_scores) if similarity_scores else 0.45
        confidence = float(np.clip(0.55 + (similarity * 0.35), 0, 0.92))
        return {
            "system_logic": "intuitive",
            "logic_type": ReasoningMode.INTUITIVE_HOLISTIC.name,
            "raw_confidence": confidence,
            "truth_estimate": float(np.clip(confidence * 0.95, 0, 1)),
            "accuracy": confidence,
            "gestalt_match": "holistic_similarity_detected",
            "similarity": similarity,
            "evaluated_core_minds": [item["philosopher"] for item in core_outputs],
        }

    def _retrieve_a_priori(self, query: str) -> List[str]:
        return self._retrieve_vault_matches(self.a_priori_vault["entries"], query, limit=3)

    def _retrieve_a_posteriori(self, query: str, limit: int = 5) -> List[str]:
        return self._retrieve_vault_matches(self.a_posteriori_vault["entries"], query, limit=limit)

    def _retrieve_vault_matches(
        self,
        entries: List[Dict[str, Any]],
        query: str,
        limit: int,
    ) -> List[str]:
        ranked: List[tuple[float, str]] = []
        for entry in entries:
            content = str(entry.get("content", ""))
            score = self._score_text_match(query, content)
            if score > 0:
                ranked.append((score, content))
        ranked.sort(key=lambda item: item[0], reverse=True)
        return [content for _, content in ranked[:limit]]

    def _retrieve_patterns(self, query: str, limit: int = 5) -> List[LearnedPattern]:
        with self.db_lock:
            cursor = self.patterns_db.cursor()
            cursor.execute(
                "SELECT * FROM patterns WHERE content LIKE ? ORDER BY confidence DESC LIMIT ?",
                (f"%{query}%", limit),
            )
            rows = cursor.fetchall()
        return [self._row_to_pattern(row) for row in rows]

    def _row_to_pattern(self, row: Any) -> LearnedPattern:
        embedding = pickle.loads(row[9]) if row[9] is not None else None
        return LearnedPattern(
            pattern_id=row[0],
            content=row[1],
            reasoning_mode=ReasoningMode[row[2]],
            confidence=row[3],
            truth_likelihood=row[4],
            timestamp=datetime.fromisoformat(row[5]),
            source=row[6],
            use_count=row[7],
            last_validated=datetime.fromisoformat(row[8]) if row[8] else None,
            embedding=embedding,
        )

    def _remember_pattern(
        self,
        content: str,
        reasoning_mode: ReasoningMode,
        confidence: float,
        truth_likelihood: float,
        source: str,
    ) -> None:
        timestamp = datetime.now()
        embedding = pickle.dumps(np.asarray(self.encoder.encode(content), dtype=np.float32))
        pattern = LearnedPattern(
            pattern_id="",
            content=content,
            reasoning_mode=reasoning_mode,
            confidence=confidence,
            truth_likelihood=truth_likelihood,
            timestamp=timestamp,
            source=source,
            last_validated=timestamp,
        )

        with self.db_lock:
            cursor = self.patterns_db.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO patterns (
                    id, content, reasoning_mode, confidence, truth_likelihood,
                    timestamp, source, use_count, last_validated, embedding
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    pattern.pattern_id,
                    pattern.content,
                    pattern.reasoning_mode.name,
                    pattern.confidence,
                    pattern.truth_likelihood,
                    pattern.timestamp.isoformat(),
                    pattern.source,
                    pattern.use_count,
                    pattern.last_validated.isoformat() if pattern.last_validated else None,
                    embedding,
                ),
            )
            self.patterns_db.commit()

    def _store_experience(self, query: str, reasoning: List[Dict[str, Any]], advisory: Dict[str, Any]) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "reasoning_summary": [
                str(item.get("philosopher") or item.get("system_logic") or "unknown")
                for item in reasoning
            ],
            "advisory_confidence": advisory["confidence"],
            "content": f"Query: {query} | Confidence: {advisory['confidence']:.2f}",
        }
        self.a_posteriori_vault["entries"].append(entry)
        with self.a_posteriori_vault["path"].open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")

    def _resolve_top_reasoning_mode(
        self,
        advisory: Dict[str, Any],
        reasoning: List[Dict[str, Any]],
    ) -> ReasoningMode:
        weights = advisory.get("weights") or []
        if not weights:
            return ReasoningMode.KANT_SYNTHETIC

        top_index = int(np.argmax(weights))
        top_logic = reasoning[top_index].get("logic_type", ReasoningMode.KANT_SYNTHETIC.name)
        return ReasoningMode[top_logic]

    def _formulate_response(
        self,
        query: str,
        advisory: Dict[str, Any],
        reasoning: List[Dict[str, Any]],
    ) -> str:
        confidence = advisory["confidence"]

        if confidence > 0.8:
            certainty = "I am confident that"
        elif confidence > 0.6:
            certainty = "I believe that"
        elif confidence > 0.4:
            certainty = "It seems possible that"
        else:
            certainty = "I am uncertain, but consider that"

        if advisory.get("weights"):
            top_index = int(np.argmax(advisory["weights"]))
            top_reasoning = reasoning[top_index]
            philosopher = top_reasoning["philosopher"]
            clause = f"{philosopher} offers the strongest frame for '{query}'."
        else:
            clause = f"further investigation is needed for '{query}'."

        if advisory.get("tension_detected"):
            clause += " Internal disagreement is high, so confidence is temporarily capped while more evidence accumulates."

        return f"{certainty} {clause}"

    async def hear(self, audio_signal: np.ndarray) -> Dict[str, Any]:
        features = self.cochlea.process_audio(audio_signal)
        should_respond = features["attention_salience"] > 0.3
        return {
            "perceptual_features": features,
            "understood": should_respond,
            "attention_level": features["attention_salience"],
            "ready_for_reasoning": should_respond,
        }

    async def research(self, query: str, domains: Optional[List[str]] = None) -> Dict[str, Any]:
        if not self.swarm.api_registry and self.swarm.api_registry_path.exists():
            self.swarm.api_registry = self.swarm._load_api_registry(self.swarm.api_registry_path)

        if not self.swarm.api_registry:
            return {
                "task_id": None,
                "research_synthesis": {"error": "No API registry loaded"},
                "voice_response": "I do not have a research registry configured yet.",
                "swarm_visual_state": "idle",
                "timestamp": datetime.now().isoformat(),
            }

        selected_domains = domains or self._infer_domains(query)

        mirror_snippets: List[str] = []
        bulk_mirror = getattr(self, "bulk_mirror", None)
        if bulk_mirror and hasattr(bulk_mirror, "summarize_for_query"):
            mirror_snippets = bulk_mirror.summarize_for_query(query, selected_domains)
            if mirror_snippets:
                logger.info("BulkMirror cache hit for query '%s': %d snippets", query[:50], len(mirror_snippets))

        await self.swarm.initialize()
        self.set_orb_state("swarm_visible", True)
        task_id = await self.swarm.spawn_research_orbs(query, selected_domains)
        synthesis = await self.swarm.ingest_results(task_id)

        if mirror_snippets:
            existing = synthesis.get("key_findings") or []
            synthesis["key_findings"] = [f"[CACHED] {s}" for s in mirror_snippets[:2]] + existing
            synthesis["bulk_mirror_hits"] = len(mirror_snippets)

        swarm_task = self.swarm.active_tasks.get(task_id)
        raw_results = swarm_task.results if swarm_task else []
        synthesis["domains"] = selected_domains
        self._store_research_return(query, synthesis, raw_results)

        learning_loop = getattr(self, "learning_loop", None)
        if learning_loop and hasattr(learning_loop, "queue_observation"):
            learning_loop.queue_observation({
                "type": "research_result",
                "query": query,
                "synthesis": synthesis,
                "domains": selected_domains,
            })

        voice_response = self._articulate_research(synthesis)
        self.set_orb_state("swarm_visible", False)
        return {
            "task_id": task_id,
            "domains": selected_domains,
            "research_synthesis": synthesis,
            "voice_response": voice_response,
            "swarm_visual_state": "ingested",
            "bulk_mirror_snippets": mirror_snippets,
            "timestamp": datetime.now().isoformat(),
        }

    def _infer_domains(self, query: str) -> List[str]:
        lowered = query.lower()
        matches = [
            domain
            for domain, keywords in self.DOMAIN_HINTS.items()
            if any(keyword in lowered for keyword in keywords)
        ]
        return matches or list(self.DOMAIN_HINTS.keys())[:2]

    def _articulate_research(self, synthesis: Dict[str, Any]) -> str:
        findings = synthesis.get("key_findings", [])
        count = synthesis.get("successful_returns", 0)

        if not findings:
            return "I've searched the available sources, but found no definitive information on that topic."

        intro = f"I've consulted {count} sources. "
        body = " ".join(findings[:3])
        return intro + body

    def _store_research_return(
        self,
        query: str,
        synthesis: Dict[str, Any],
        raw_results: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        entry = {
            "type": "research_return",
            "query": query,
            "synthesis": synthesis,
            "raw_result_count": len(raw_results or []),
            "timestamp": datetime.now().isoformat(),
        }
        self.a_posteriori_vault["entries"].append({"content": json.dumps(entry), **entry})
        with self.a_posteriori_vault["path"].open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")

    # ── MORB DEPLOYMENT API ──────────────────────────────────────────────────

    def deploy_morb(
        self,
        task_type: str,
        predicate: str,
        target_node: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.orb_state.get("morb_deployment_enabled", False):
            return {"error": "MORB deployment disabled in orb_state", "morb_id": None}
        bridge = getattr(self, "morb_bridge", None)
        if bridge is None:
            return {"error": "MORB deployment bridge unavailable", "morb_id": None}
        result = bridge.deploy_morb(task_type, predicate, target_node, parameters)
        learning_loop = getattr(self, "learning_loop", None)
        if learning_loop and hasattr(learning_loop, "queue_observation"):
            learning_loop.queue_observation({"type": "morb_result", "morb_result": result})
        return result

    def deploy_morb_swarm(
        self,
        task_type: str,
        predicate: str,
        target_nodes: List[str],
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.orb_state.get("morb_deployment_enabled", False):
            return {"error": "MORB deployment disabled in orb_state", "swarm_id": None}
        bridge = getattr(self, "morb_bridge", None)
        if bridge is None:
            return {"error": "MORB deployment bridge unavailable", "swarm_id": None}
        return bridge.deploy_morb_swarm(task_type, predicate, target_nodes, parameters)

    def get_morb_status(self) -> Dict[str, Any]:
        bridge = getattr(self, "morb_bridge", None)
        return bridge.get_morb_status() if bridge else {"error": "MORB deployment bridge unavailable"}

    # ── MESH TRAVERSAL API ───────────────────────────────────────────────────

    def discover_mesh_nodes(self, force_rescan: bool = False, incremental: bool = False) -> List[Dict[str, Any]]:
        if not self.orb_state.get("mesh_traversal_enabled", False):
            return []
        traverser = getattr(self, "mesh_traverser", None)
        if traverser is None:
            return []
        nodes = traverser.discover_nodes(force_rescan=force_rescan, incremental=incremental)
        return [
            {
                "node_id": n.node_id,
                "node_type": n.node_type,
                "address": n.address,
                "health_status": n.health_status,
                "last_seen": n.last_seen.isoformat(),
                "capabilities": n.capabilities,
                "load_factor": n.load_factor,
                "reliability_ema": getattr(n, "reliability_ema", None),
            }
            for n in nodes
        ]

    def probe_mesh_node(self, node_id: str) -> Dict[str, Any]:
        traverser = getattr(self, "mesh_traverser", None)
        return traverser.probe_node_health(node_id) if traverser else {"error": "mesh traverser unavailable"}

    def get_mesh_topology(self) -> Dict[str, Any]:
        traverser = getattr(self, "mesh_traverser", None)
        return traverser.get_mesh_topology() if traverser else {"error": "mesh traverser unavailable"}

    def route_mesh_task(self, task_payload: Dict[str, Any], target_node: str) -> Dict[str, Any]:
        traverser = getattr(self, "mesh_traverser", None)
        return traverser.route_task(task_payload, target_node) if traverser else {"error": "mesh traverser unavailable"}

    # ── DIAGNOSTIC API ────────────────────────────────────────────────────────

    def run_diagnostics(self, tier: str = "standard") -> Dict[str, Any]:
        diagnostic_system = getattr(self, "diagnostic_system", None)
        if diagnostic_system and hasattr(diagnostic_system, "full_system_probe"):
            return diagnostic_system.full_system_probe(tier=tier)
        return {
            "tier": tier,
            "status": "limited",
            "components": {
                "vaults": {
                    "a_priori_entries": len(self.a_priori_vault["entries"]),
                    "a_posteriori_entries": len(self.a_posteriori_vault["entries"]),
                },
                "knowledge_graph": {
                    "nodes": self.kg.number_of_nodes(),
                    "edges": self.kg.number_of_edges(),
                },
                "encoder": {"backend": self.encoder_backend},
            },
            "timestamp": datetime.now().isoformat(),
        }

    def get_diagnostic_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        diagnostic_system = getattr(self, "diagnostic_system", None)
        if diagnostic_system and hasattr(diagnostic_system, "get_probe_history"):
            return diagnostic_system.get_probe_history(limit=limit)
        return []

    # ── LEARNING API ──────────────────────────────────────────────────────────

    def run_learning_prune(self) -> Dict[str, Any]:
        learning_loop = getattr(self, "learning_loop", None)
        if learning_loop and hasattr(learning_loop, "run_aggressive_prune"):
            return learning_loop.run_aggressive_prune()
        return self.self_prune()

    def get_learning_stats(self) -> Dict[str, Any]:
        learning_loop = getattr(self, "learning_loop", None)
        if learning_loop and hasattr(learning_loop, "get_learning_stats"):
            return learning_loop.get_learning_stats()
        return {
            "patterns": self._pattern_count(),
            "a_priori_entries": len(self.a_priori_vault["entries"]),
            "a_posteriori_entries": len(self.a_posteriori_vault["entries"]),
            "associations_guarded": 0,
            "noise_filtered": 0,
            "protected_patterns": 0,
        }

    def _pattern_count(self) -> int:
        with self.db_lock:
            cursor = self.patterns_db.cursor()
            cursor.execute("SELECT COUNT(*) FROM patterns")
            row = cursor.fetchone()
        return int(row[0] if row else 0)

    def speak(self, text: str, emotion: str = "thoughtful_warm") -> Dict[str, Any]:
        settings = dict(self.voice_config)
        emotion_profiles = {
            "thoughtful_warm": {"speed": 0.95, "pitch": 0.1, "emotion": "warm_contemplative"},
            "analytical": {"speed": 0.9, "pitch": 0.0, "emotion": "precise_clear"},
            "uncertain": {"speed": 0.85, "pitch": -0.05, "emotion": "hesitant_exploring"},
            "confident": {"speed": 1.0, "pitch": 0.15, "emotion": "assured_measured"},
        }

        if emotion in emotion_profiles:
            settings.update(emotion_profiles[emotion])

        output_path = self.cali_root / "voice_cache" / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        synthesis_package = {
            "text": text,
            "voice_config": settings,
            "output_path": str(output_path),
            "audio_url": None,
            "gpu_accelerated": str(self.device) == "cuda",
            "timestamp": datetime.now().isoformat(),
            "primary_modality": "voice",
            "fallback_modality": "text",
            "note": "CALI cognition is text-only here; website speech is synthesized by the Next/CALI Kokoro runtime.",
        }
        meta_path = output_path.with_suffix(".json")
        meta_path.write_text(json.dumps(synthesis_package, indent=2), encoding="utf-8")
        return synthesis_package

    def _background_prefetch(self) -> None:
        bulk_mirror = getattr(self, "bulk_mirror", None)
        if bulk_mirror is None or not hasattr(bulk_mirror, "prefetch_all"):
            return
        try:
            count = bulk_mirror.prefetch_all()
            logger.info("Bulk mirror prefetch complete: %d endpoints seeded", count)
        except Exception as exc:
            logger.warning("Bulk mirror prefetch failed: %s", exc)

    def _load_substrate_domain_knowledge(self) -> List[Dict[str, Any]]:
        entries: List[Dict[str, Any]] = []
        if not self.SUBSTRATE_ROOT.exists():
            logger.debug("SUBSTRATE_ROOT not found: %s", self.SUBSTRATE_ROOT)
            return entries

        for csv_path in self.SUBSTRATE_ROOT.rglob("*.csv"):
            try:
                with csv_path.open(newline="", encoding="utf-8") as fh:
                    reader = csv.DictReader(fh)
                    for row in reader:
                        content = self._csv_row_to_content(row, csv_path)
                        if not content:
                            continue
                        entries.append({
                            "type": "substrate_domain_knowledge",
                            "source": str(csv_path.relative_to(self.SUBSTRATE_ROOT)),
                            "domain": csv_path.parent.name,
                            "content": content,
                            "row_id": row.get("id") or row.get("name") or "",
                        })
            except Exception as exc:
                logger.warning("Failed to load substrate CSV %s: %s", csv_path, exc)

        logger.info("Substrate domain knowledge loaded: %d entries from %s", len(entries), self.SUBSTRATE_ROOT)
        return entries

    @staticmethod
    def _csv_row_to_content(row: Dict[str, Any], csv_path: Path) -> str:
        priority = [
            row.get("name") or "",
            row.get("description") or "",
            row.get("keywords") or "",
            row.get("semantic_tags") or "",
            row.get("category") or "",
            row.get("implications") or "",
            row.get("implications_for_assets") or "",
            row.get("edge_case_handling") or "",
            row.get("example_metric_or_standard") or "",
            row.get("cross_domain_links") or "",
        ]
        parts = [p.replace(",", " ").strip() for p in priority if p.strip()]
        return " | ".join(parts) if parts else ""

    def _inject_substrate_knowledge(self) -> None:
        entries = self._load_substrate_domain_knowledge()
        if not entries:
            return

        self.a_priori_vault["entries"].extend(entries)

        for entry in entries:
            node_id = f"substrate_{entry['row_id'] or hash(entry['content'])}"
            self.kg.add_node(
                node_id,
                type="substrate_domain_knowledge",
                domain=entry.get("domain", "unknown"),
                source=entry.get("source", ""),
            )
            self.kg.add_edge("cali_identity", node_id, weight=0.6, relation="domain_knowledge")
            self.kg.add_edge("vault_a_priori", node_id, weight=0.8, relation="seeded_from")

        logger.info(
            "Injected %d substrate entries into a_priori vault and KG (%d nodes total)",
            len(entries),
            self.kg.number_of_nodes(),
        )

    def _load_cognitive_seed_vaults(self) -> None:
        if not self.COGNITIVE_SEED_ROOT.exists():
            logger.debug("Cognitive seed root not found (%s) - skipping", self.COGNITIVE_SEED_ROOT)
            return

        vault_files = sorted(self.COGNITIVE_SEED_ROOT.glob("*_vault.json"))
        if not vault_files:
            logger.debug("No cognitive seed vaults found in %s", self.COGNITIVE_SEED_ROOT)
            return

        total_entries = 0
        for vault_file in vault_files:
            try:
                vault_data = json.loads(vault_file.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("Failed to read cognitive vault %s: %s", vault_file.name, exc)
                continue

            category = vault_data.get("category", vault_file.stem.replace("_vault", ""))
            sem_tags = vault_data.get("semantic_tags", category)
            source_id = f"cognitive_seed_{category}"

            for conv in vault_data.get("conversations", []):
                relevance = conv.get("relevance_score", 0)
                for seg_idx, segment in enumerate(conv.get("segments", [])):
                    text = segment.get("text", "").strip()
                    if not text:
                        continue

                    density = segment.get("density_score", 0)
                    row_id = f"cog_{category[:8]}_{abs(hash(text)) % 0xFFFFF:05x}_{seg_idx}"
                    entry = {
                        "type": "cognitive_seed",
                        "source": str(vault_file.relative_to(self.COGNITIVE_SEED_ROOT)),
                        "domain": "cognitive_layer",
                        "cognitive_category": category,
                        "semantic_tags": sem_tags,
                        "content": text,
                        "row_id": row_id,
                        "relevance_score": relevance,
                        "density_score": density,
                        "conversation_title": conv.get("title", ""),
                    }
                    self.a_priori_vault["entries"].append(entry)

                    node_weight = 0.85 if density >= 4 else 0.65
                    self.kg.add_node(
                        row_id,
                        type="cognitive_seed",
                        domain="cognitive_layer",
                        category=category,
                        source=source_id,
                    )
                    self.kg.add_edge("cali_identity", row_id, weight=node_weight, relation="cognitive_layer")
                    self.kg.add_edge("vault_a_priori", row_id, weight=0.80, relation="seeded_from")
                    total_entries += 1

        logger.info(
            "Cognitive seed vaults loaded: %d segments from %d files into a_priori vault",
            total_entries,
            len(vault_files),
        )

    def self_prune(self) -> Dict[str, Any]:
        cutoff = (datetime.now() - timedelta(days=30)).isoformat()
        with self.db_lock:
            cursor = self.patterns_db.cursor()
            cursor.execute(
                "DELETE FROM patterns WHERE timestamp < ? AND confidence < 0.3",
                (cutoff,),
            )
            removed = cursor.rowcount
            self.patterns_db.commit()
            cursor.execute("VACUUM")
            self.patterns_db.commit()

        orphaned = [node for node in self.kg.nodes() if self.kg.in_degree(node) == 0 and node != "cali_identity"]
        for node in orphaned:
            self.kg.add_edge("cali_identity", node, weight=0.3, relation="repaired_connection")

        logger.info("Self-pruning complete. Removed %s stale patterns.", removed)
        return {
            "removed_patterns": removed,
            "repaired_nodes": orphaned,
            "timestamp": datetime.now().isoformat(),
        }

    def set_orb_state(self, setting: str, value: Any) -> bool:
        if setting not in self.orb_state:
            return False
        self.orb_state[setting] = value
        logger.info("Orb state updated: %s = %s", setting, value)
        return True

    def get_status(self) -> Dict[str, Any]:
        audio_status = {"error": "audio_runtime unavailable"}
        try:
            from audio_runtime import AudioRuntime  # type: ignore

            if hasattr(self, "audio_runtime") and self.audio_runtime:
                audio_status = self.audio_runtime.get_status()
            else:
                audio_status = AudioRuntime(str(self.cali_root)).get_status()
        except Exception as exc:
            audio_status = {"error": str(exc)}

        voice_status = {"error": "voice_engine_manager unavailable"}
        try:
            from voice_engine_manager import get_voice_manager  # type: ignore

            voice_status = get_voice_manager().get_status()
        except Exception as exc:
            voice_status = {"error": str(exc)}

        llm_status = {
            "connected": False,
            "ready": False,
            "model": str(self.orb_state.get("llm_local_model") or os.getenv("CALI_OLLAMA_MODEL_NAME", "llama3.2:1b")).strip() or "llama3.2:1b",
            "endpoint": str(self.orb_state.get("llm_local_endpoint") or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).strip() or "http://127.0.0.1:11434",
            "available_models": [],
            "status_code": 0,
            "error": "not_checked",
        }
        try:
            from llm_client import _probe_local_llm_health  # type: ignore

            llm_status = _probe_local_llm_health(
                endpoint=self.orb_state.get("llm_local_endpoint"),
                model=self.orb_state.get("llm_local_model"),
            )
            llm_status["connected"] = bool(llm_status.get("connected", llm_status.get("ready")))
        except Exception as exc:
            llm_status["error"] = str(exc)
            llm_status["connected"] = False
            llm_status["ready"] = False

        diagnostic_system = getattr(self, "diagnostic_system", None)
        diagnostic_summary = (
            diagnostic_system.probe_history[-1]
            if diagnostic_system and getattr(diagnostic_system, "probe_history", None)
            else {"error": "no_history"}
        )

        return {
            "identity": "CALI - Cognitively Aligned Linear Intelligence",
            "instance_id": self.instance_id,
            "version": "4.0.0",
            "device": str(self.device),
            "vram_gb": self.vram_gb,
            "system_path": str(self.system_path),
            "cali_root": str(self.cali_root),
            "shared_mesh_root": self.shared_mesh_root,
            "partition_bytes": self.partition_size,
            "philosophical_seeds": list(self.PHILOSOPHER_SEEDS.keys()),
            "a_priori_entries": len(self.a_priori_vault["entries"]),
            "a_posteriori_entries": len(self.a_posteriori_vault["entries"]),
            "knowledge_graph_nodes": self.kg.number_of_nodes(),
            "knowledge_graph_edges": self.kg.number_of_edges(),
            "interaction_count": self.interaction_count,
            "orb_state": self.orb_state,
            "voice_primary": True,
            "acp_active": True,
            "swarm_ready": True,
            "encoder_backend": self.encoder_backend,
            "audio_runtime": audio_status,
            "voice_engine_manager": voice_status,
            "llm_status": llm_status,
            "morb_status": self.get_morb_status(),
            "mesh_status": self.get_mesh_topology(),
            "learning_stats": self.get_learning_stats(),
            "last_diagnostic": diagnostic_summary,
        }

    async def aclose(self) -> None:
        learning_loop = getattr(self, "learning_loop", None)
        if learning_loop and hasattr(learning_loop, "stop_background_learning"):
            learning_loop.stop_background_learning()

        try:
            if self.swarm.session is not None or self.swarm._workers:
                await self.swarm.close()
        except Exception as exc:
            logger.warning("Failed to close swarm session cleanly: %s", exc)

        with self.db_lock:
            if self.patterns_db:
                self.patterns_db.close()
                self.patterns_db = None

    def close(self) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(self.aclose())
            return

        loop.create_task(self.aclose())

    @staticmethod
    def _score_text_match(query: str, content: str) -> float:
        query_tokens = {token for token in query.lower().split() if token}
        content_tokens = {token for token in content.lower().split() if token}
        if not query_tokens or not content_tokens:
            return 0.0
        overlap = query_tokens & content_tokens
        if not overlap:
            return 0.0
        return len(overlap) / len(query_tokens | content_tokens)

    @staticmethod
    def _cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
        left_norm = float(np.linalg.norm(left))
        right_norm = float(np.linalg.norm(right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return float(np.dot(left, right) / (left_norm * right_norm))


__all__ = [
    "CALISKG",
    "CALISwarmOrchestrator",
    "SoftMaxAdvisorySKG",
    "AdaptiveCochlearProcessor",
    "PhilosophicalSeed",
    "LearnedPattern",
    "SwarmTask",
    "ReasoningMode",
    "MemoryType",
]
