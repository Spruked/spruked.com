from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from cali_skg.core.cali_unified_substrate import CaliUnifiedSubstrate


class CaliUnifiedSubstrateTests(unittest.TestCase):
    def test_import_indexes_prior_conversation_and_reasoning_seed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "legacy"
            runtime = root / "cali_skg"
            source.mkdir(parents=True)

            conversation = {
                "theme": "reasoning",
                "conversations": [
                    {
                        "title": "CALI identity architecture",
                        "conversation_id": "conv-1",
                        "timestamp": 1760000000.0,
                        "segments": [
                            {
                                "core_message": "CALI is one identity expressed through Web, VIV, and Desktop ORB embodiments.",
                                "message_index": 3,
                                "context": ["prior turn", "architecture decision"],
                            }
                        ],
                    }
                ],
            }
            (source / "reasoning_vault.json").write_text(json.dumps(conversation), encoding="utf-8")

            seed = {
                "vault_name": "SeedVault_Deductive_Reasoner",
                "vault_id": "seed_deductive_reasoner",
                "category": "Logic",
                "reasoning_type": "deductive",
                "entries": [
                    {
                        "id": "logic:modus_ponens",
                        "term": "Modus Ponens",
                        "definition": "If P implies Q and P is true, Q follows.",
                    }
                ],
            }
            (source / "seed_deductive_reasoner.json").write_text(json.dumps(seed), encoding="utf-8")

            voice_bytes = b"canonical-cali-voice-test"
            (source / "cali_voice.pt").write_bytes(voice_bytes)
            source_voice_hash = hashlib.sha256(voice_bytes).hexdigest()

            substrate = CaliUnifiedSubstrate(base_path=runtime, source_path=source)
            result = substrate.bootstrap()

            self.assertGreaterEqual(result["index"]["conversation_segments"], 1)
            self.assertGreaterEqual(result["index"]["seed_entries"], 1)

            recalled = substrate.recall_prior_conversations("CALI identity Desktop", limit=3)
            self.assertTrue(recalled)
            self.assertEqual(recalled[0]["truth_status"], "historical_conversation_record")
            self.assertIn("one identity", recalled[0]["content"])

            reasoning = substrate.retrieve_reasoning_seeds("modus ponens deductive", limit=3)
            self.assertTrue(reasoning)
            self.assertEqual(reasoning[0]["reasoning_type"], "deductive")

            copied_voice = runtime / "assets" / "voice" / "cali_voice.pt"
            self.assertTrue(copied_voice.exists())
            self.assertEqual(hashlib.sha256(copied_voice.read_bytes()).hexdigest(), source_voice_hash)
            self.assertEqual(hashlib.sha256((source / "cali_voice.pt").read_bytes()).hexdigest(), source_voice_hash)


if __name__ == "__main__":
    unittest.main()
