import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjsLib from 'pdfjs-dist';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
/**
 * DownloadImageButton
 * ------------------------------------------------------------------
 * Renders the same report document to a PDF in-memory, rasterizes
 * every page with pdf.js, and stacks the pages into one tall PNG —
 * so a multi-page investigation report still downloads as a single
 * image instead of two separate page images.
 * ------------------------------------------------------------------
 */
export default function DownloadImageButton({ reportData, ReportDoc, fileName = 'investigation-report.png' }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadImage = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      // 1. Render the document to a PDF blob in-memory
      const blob = await pdf(<ReportDoc reportData={reportData} />).toBlob();
      const arrayBuffer = await blob.arrayBuffer();

      // 2. Load it with pdf.js
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      const scale = 2; // higher = sharper image
      const pageCanvases = [];
      let totalHeight = 0;
      let maxWidth = 0;

      // 3. Render every page onto its own canvas
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        pageCanvases.push(canvas);
        totalHeight += canvas.height;
        maxWidth = Math.max(maxWidth, canvas.width);
      }

      // 4. Stack every page canvas into one tall canvas, top to bottom
      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = maxWidth;
      combinedCanvas.height = totalHeight;
      const combinedCtx = combinedCanvas.getContext('2d');
      combinedCtx.fillStyle = '#FFFFFF';
      combinedCtx.fillRect(0, 0, maxWidth, totalHeight);

      let yOffset = 0;
      pageCanvases.forEach((canvas) => {
        combinedCtx.drawImage(canvas, 0, yOffset);
        yOffset += canvas.height;
      });

      // 5. Trigger the single-image download
      combinedCanvas.toBlob((imgBlob) => {
        const url = URL.createObjectURL(imgBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsGenerating(false);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate image download:', err);
      alert('Could not generate the image download. Please try again.');
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownloadImage}
      disabled={isGenerating}
      className="
        flex
        items-center
        gap-2
        px-5
        py-2.5
        bg-white/10
        text-white
        text-sm
        font-extrabold
        rounded-xl
        border
        border-white/40
        hover:bg-white/20
        transition
        uppercase
        tracking-wide
        disabled:opacity-60
        disabled:cursor-not-allowed
      "
    >
      {isGenerating ? (
        <HourglassTopRoundedIcon sx={{ fontSize: 18 }} className="animate-spin" />
      ) : (
        <ImageRoundedIcon sx={{ fontSize: 18 }} />
      )}
      {isGenerating ? 'Generating…' : 'Download Image'}
    </button>
  );
}