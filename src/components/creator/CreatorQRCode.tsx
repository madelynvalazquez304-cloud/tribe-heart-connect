import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, QrCode, Share2, Copy, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreatorQRCodeProps {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  themeColor?: string;
}

type Style = 'classic' | 'branded' | 'poster';

const CreatorQRCode: React.FC<CreatorQRCodeProps> = ({ username, displayName, avatarUrl, themeColor = '#E07B4C' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [style, setStyle] = useState<Style>('branded');
  const [busy, setBusy] = useState(false);

  const profileUrl = `${window.location.origin}/${username}`;

  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const size = style === 'poster' ? 1080 : 720;
      canvas.width = size;
      canvas.height = style === 'poster' ? 1350 : size;
      const ctx = canvas.getContext('2d')!;

      // Background
      if (style === 'poster') {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, themeColor);
        grad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // QR
      const qrSize = style === 'poster' ? 720 : 600;
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, profileUrl, {
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: style === 'classic' ? '#000000' : themeColor,
          light: '#ffffff',
        },
      });

      const qrX = (canvas.width - qrSize) / 2;
      const qrY = style === 'poster' ? 320 : (canvas.height - qrSize) / 2;

      // White card behind QR
      if (style === 'poster') {
        const pad = 30;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 24);
        ctx.fill();
      }
      ctx.drawImage(qrCanvas, qrX, qrY);

      // Logo in middle (branded/poster)
      if (style !== 'classic' && avatarUrl) {
        try {
          const img = await loadImage(avatarUrl);
          const logoSize = qrSize * 0.18;
          const lx = qrX + (qrSize - logoSize) / 2;
          const ly = qrY + (qrSize - logoSize) / 2;
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, lx - 8, ly - 8, logoSize + 16, logoSize + 16, 16);
          ctx.fill();
          ctx.save();
          roundRect(ctx, lx, ly, logoSize, logoSize, 12);
          ctx.clip();
          ctx.drawImage(img, lx, ly, logoSize, logoSize);
          ctx.restore();
        } catch {
          /* ignore */
        }
      }

      // Poster text
      if (style === 'poster') {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
        ctx.fillText('Support ' + displayName, canvas.width / 2, 180);
        ctx.font = '36px system-ui, -apple-system, sans-serif';
        ctx.globalAlpha = 0.85;
        ctx.fillText('Scan to visit my page', canvas.width / 2, 250);
        ctx.globalAlpha = 1;
        ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
        ctx.fillText('@' + username, canvas.width / 2, qrY + qrSize + 100);
        ctx.font = '28px system-ui, -apple-system, sans-serif';
        ctx.globalAlpha = 0.7;
        ctx.fillText(profileUrl.replace(/^https?:\/\//, ''), canvas.width / 2, qrY + qrSize + 150);
      } else if (style === 'branded') {
        ctx.fillStyle = themeColor;
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText('@' + username, canvas.width / 2, canvas.height - 30);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, username, avatarUrl, themeColor]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${username}-qr-${style}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('QR code downloaded!');
    }, 'image/png');
  };

  const copyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('QR image copied to clipboard!');
      } catch {
        toast.error('Copy not supported. Try downloading instead.');
      }
    }, 'image/png');
  };

  const shareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `${username}-qr.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${displayName} on TribeYangu`, text: profileUrl });
        } catch { /* cancelled */ }
      } else {
        navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied!');
      }
    }, 'image/png');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied!');
  };

  return (
    <Card>
      <CardHeader className="px-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <QrCode className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: themeColor }} />
          Your QR Code
        </CardTitle>
        <CardDescription className="text-xs">
          Download and share — perfect for streams, posters, business cards & social bios.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {(['branded', 'classic', 'poster'] as Style[]).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${
                style === s ? 'text-white shadow' : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
              style={style === s ? { backgroundColor: themeColor } : undefined}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative rounded-xl overflow-hidden bg-secondary/30 flex items-center justify-center p-3">
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: themeColor }} />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-lg shadow-md"
            style={{ maxHeight: style === 'poster' ? 420 : 320 }}
          />
        </div>

        <div className="text-[11px] text-muted-foreground text-center break-all">
          {profileUrl}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={download} className="gap-2 h-10 text-xs sm:text-sm text-white" style={{ backgroundColor: themeColor }}>
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button onClick={shareImage} variant="outline" className="gap-2 h-10 text-xs sm:text-sm">
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button onClick={copyImage} variant="outline" className="gap-2 h-10 text-xs sm:text-sm">
            <ImageIcon className="w-4 h-4" /> Copy image
          </Button>
          <Button onClick={copyLink} variant="outline" className="gap-2 h-10 text-xs sm:text-sm">
            <Copy className="w-4 h-4" /> Copy link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default CreatorQRCode;