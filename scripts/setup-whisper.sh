#!/usr/bin/env bash
#
# Builds whisper.cpp and downloads a model for local, offline transcription.
#
# Everything lands in .whisper/ (gitignored). Re-running is cheap: an existing
# build and an already-downloaded model are left alone.
#
#   npm run whisper:setup                      # default model (base.en)
#   WHISPER_MODEL_NAME=small.en npm run whisper:setup
#
# Model sizes, roughly: tiny.en 75MB · base.en 148MB · small.en 488MB ·
# medium.en 1.5GB · large-v3 3.1GB. Bigger is more accurate and slower; pick
# what the host has RAM for, then point WHISPER_MODEL at it in .env.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WHISPER_DIR="$REPO_ROOT/.whisper"
SRC_DIR="$WHISPER_DIR/whisper.cpp"
MODEL_NAME="${WHISPER_MODEL_NAME:-base.en}"
MODEL_FILE="$WHISPER_DIR/models/ggml-${MODEL_NAME}.bin"

for tool in git cmake ffmpeg curl; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done

mkdir -p "$WHISPER_DIR/models"

if [ ! -d "$SRC_DIR/.git" ]; then
  echo "==> Cloning whisper.cpp"
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp "$SRC_DIR"
fi

BIN="$SRC_DIR/build/bin/whisper-cli"
if [ ! -x "$BIN" ]; then
  echo "==> Building whisper.cpp (this takes a few minutes)"
  cmake -B "$SRC_DIR/build" -S "$SRC_DIR" -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_EXAMPLES=ON
  cmake --build "$SRC_DIR/build" --config Release -j "$(nproc)" --target whisper-cli
fi
[ -x "$BIN" ] || { echo "Build finished but $BIN is missing" >&2; exit 1; }

if [ ! -f "$MODEL_FILE" ]; then
  echo "==> Downloading model ggml-${MODEL_NAME}.bin"
  curl -fL --progress-bar \
    -o "$MODEL_FILE" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${MODEL_NAME}.bin"
fi

cat <<EOF

whisper.cpp is ready.

  binary  $BIN
  model   $MODEL_FILE

Both paths are the defaults the app looks for, so no .env change is needed unless
you move them or want a different model:

  WHISPER_BIN="$BIN"
  WHISPER_MODEL="$MODEL_FILE"
EOF
