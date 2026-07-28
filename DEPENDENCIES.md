# Environment Setup — Dependencies

This covers everything needed to run the two trained models on another machine:

- `BertModelTrained.ipynb` — BERT-based text classifier + Logistic Regression head (SMOTE, StandardScaler)
- `speech-stress-recognition-wav2vec2__2_.ipynb` — Wav2Vec2-based speech stress classifier

## 1. Python Version
Python 3.9–3.11 recommended (matches current `transformers`/`torch` support).

## 2. Install via pip

```bash
pip install torch transformers scikit-learn imbalanced-learn \
    pandas numpy matplotlib seaborn scipy joblib \
    librosa soundfile
```

### Or with a requirements.txt

```txt
torch>=2.0
transformers>=4.30
scikit-learn>=1.2
imbalanced-learn>=0.11
pandas>=1.5
numpy>=1.23
matplotlib>=3.6
seaborn>=0.12
scipy>=1.10
joblib>=1.2
librosa>=0.10
soundfile>=0.12
```

Install with:
```bash
pip install -r requirements.txt
```

## 3. Package Breakdown by Notebook

### BertModelTrained.ipynb
| Package | Purpose |
|---|---|
| `torch` | Model backend for BERT |
| `transformers` | `AutoTokenizer`, `AutoModelForSequenceClassification` |
| `scikit-learn` | train/test split, `LogisticRegression`, `StandardScaler`, metrics |
| `imbalanced-learn` | `SMOTE` for class imbalance |
| `pandas`, `numpy` | data handling |
| `matplotlib`, `seaborn` | plots/visualization |
| `scipy` | `softmax` |
| `joblib` | saving/loading the LogisticRegression + scaler artifacts |

### speech-stress-recognition-wav2vec2__2_.ipynb
| Package | Purpose |
|---|---|
| `torch` | model backend (`nn`, `DataLoader`, etc.) |
| `transformers` | `Wav2Vec2FeatureExtractor`, `Wav2Vec2Model` |
| `librosa` | audio loading/processing |
| `soundfile` | audio file I/O backend used by librosa |
| `scikit-learn` | train/test split, classification metrics |
| `pandas`, `numpy` | data handling |
| `matplotlib`, `seaborn` | plots/visualization |

## 4. GPU Support (optional but recommended)
Both notebooks check for `cuda` and move models/tensors to GPU if available. For GPU acceleration, install the CUDA-enabled build of PyTorch matching your system instead of the CPU-only default:

```bash
# Example for CUDA 12.1 — check https://pytorch.org/get-started/locally/ for your exact version
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

If no GPU is available, the default CPU-only `torch` install works fine — the code will fall back to CPU automatically.

## 5. Files/Artifacts Needed Alongside the Environment
Besides the pip environment, make sure these are present on the target machine:
- The saved model weights/checkpoints (e.g., `.bin`/`.pt`/`.safetensors` for the BERT and Wav2Vec2 models)
- Any `joblib`-saved objects (LogisticRegression classifier, StandardScaler) for the BERT pipeline
- Tokenizer/feature-extractor config files if not re-downloading from Hugging Face Hub
- Sample/inference audio or text data, if testing

## 6. Quick Verification
After installing, verify the environment with:

```bash
python -c "import torch, transformers, sklearn, imblearn, librosa, soundfile; print('All good')"
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
```
