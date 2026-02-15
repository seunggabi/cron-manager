#!/bin/bash

# Convert video recording to optimized GIF for README
# Usage: ./scripts/convert-to-gif.sh <input-file> [output-file] [fps] [width]

set -e

INPUT_FILE="$1"
OUTPUT_FILE="${2:-docs/demo.gif}"
FPS="${3:-10}"
WIDTH="${4:-1280}"

if [ -z "$INPUT_FILE" ]; then
  echo "Usage: $0 <input-file> [output-file] [fps] [width]"
  echo ""
  echo "Examples:"
  echo "  $0 recording.mov"
  echo "  $0 recording.mov docs/demo.gif 15 1920"
  echo ""
  exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: Input file '$INPUT_FILE' not found"
  exit 1
fi

# Create output directory if it doesn't exist
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR"

echo "Converting $INPUT_FILE to GIF..."
echo "  Output: $OUTPUT_FILE"
echo "  FPS: $FPS"
echo "  Width: $WIDTH"
echo ""

# Generate palette for better quality
PALETTE="/tmp/palette-$$.png"

echo "Step 1/3: Generating color palette..."
ffmpeg -i "$INPUT_FILE" -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos,palettegen" -y "$PALETTE" 2>&1 | grep -E "frame=|size="

echo ""
echo "Step 2/3: Converting to GIF with palette..."
ffmpeg -i "$INPUT_FILE" -i "$PALETTE" -lavfi "fps=$FPS,scale=$WIDTH:-1:flags=lanczos[x];[x][1:v]paletteuse" -y "$OUTPUT_FILE" 2>&1 | grep -E "frame=|size="

# Clean up palette
rm -f "$PALETTE"

echo ""
echo "Step 3/3: Optimizing GIF size..."
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "  File size: $FILE_SIZE"

# Optional: Use gifsicle for further optimization if available
if command -v gifsicle &> /dev/null; then
  echo "  Running gifsicle optimization..."
  gifsicle -O3 --colors 256 "$OUTPUT_FILE" -o "$OUTPUT_FILE.tmp"
  mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"
  NEW_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo "  Optimized size: $NEW_SIZE"
else
  echo "  Tip: Install gifsicle for better optimization: brew install gifsicle"
fi

echo ""
echo "✅ Conversion complete!"
echo "   Output: $OUTPUT_FILE"
echo "   Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Preview: open $OUTPUT_FILE"
