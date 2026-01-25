# 🐯 Kotaro-Engine Progress Report (2026/01/25)

## 1. Status Summary
- **Current Phase:** Phase 3: UI Integration (UI統合フェーズ)
- **Focus:** Frontend/Backend Integration & Workflow Optimization
- **Date:** 2026/01/25

## 2. Daily Code Review

### Backend (`kotaro_api.py`)
- **Status:** Stable (V4.2 Logic)
- **Architecture:** Unified API server using LMDeploy (Qwen2-VL-2B-Instruct).
- **Issues:**
    - `call_kotaro_generation_v3` function name remains despite V4 logic (Technical Debt).
    - `requirements-kotaro.txt` is missing `openai` dependency despite usage in `kotaro_api.py`.
    - `requirements-kotaro.txt` contains legacy `ollama` dependency which conflicts with the current LMDeploy architecture.

### Frontend (`next-app/`)
- **TextEditor.tsx:**
    - AI Generation (`generateKotaroComment`) is fully functional and connected to `/generate`.
    - Auto-generation on load works correctly.
- **ImageEditor.tsx:**
    - **Critical Gap:** Context Menu "Generate AI Comment" is implemented as a placeholder (`console.log`).
    - This disconnect prevents the desired "Crop -> Generate" workflow.
    - Cameko Search and Fact Check integrations are present via API routes.

### Vision Core (`vision_core.py`)
- **Status:** Standalone / Isolated
- **Model:** MiniCPM-V 2.6 (int4 optimized for RTX 4060).
- **Risk:** "Split Brain" architecture. The Main API uses Qwen2-VL, while this specialized vision module is not yet connected to the inference pipeline.

### Scoring Logic (`kotaro_scoring_v4.py`)
- **Status:** V4.3 Logic / V4.6.1 Patch
- **Benchmark:** As noted in `V4_7_BENCHMARK_REPORT.md`, there is a significant imbalance favoring P11 (Flat/Close) and P12 (Flat/Scene), with emotional patterns (P01-P05) being under-represented.

## 3. Risks & Issues
1.  **Vision Model Split:** Maintaining two vision models (Qwen vs MiniCPM) increases resource usage and complexity. Decision needed on unification.
2.  **Scoring Imbalance:** Current logic suppresses "Emotional" outputs, leading to generic comments.
3.  **Dependency Management:** `requirements.txt` needs cleanup (remove `ollama`, add `openai/lmdeploy`).

## 4. Next Steps
1.  **UI Integration:** Implement `onGenerateComment` in `ImageEditor.tsx` (Connect to `TextEditor`'s generation logic or shared hook).
2.  **Backend Cleanup:** Update `requirements-kotaro.txt` and refactor function names.
3.  **Vision Strategy:** Determine if `vision_core.py` should replace Qwen in `kotaro_api.py` or serve as a second opinion (Ensemble).
