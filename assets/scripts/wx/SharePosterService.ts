import { LevelConfig } from '../core/GameTypes';

declare const wx: any;

export type SharePosterKind = 'victory' | 'residual';

export interface SharePosterOptions {
  kind: SharePosterKind;
  level: LevelConfig;
  headline: string;
  subline: string;
  badgeText: string;
  metricText: string;
}

export class SharePosterService {
  static createPosterAsync(options: SharePosterOptions, onDone: (imageUrl?: string) => void): void {
    if (typeof wx === 'undefined' || !wx.createCanvas) {
      onDone(undefined);
      return;
    }

    try {
      const canvas = wx.createCanvas();
      canvas.width = 500;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onDone(undefined);
        return;
      }

      this.drawPoster(ctx, options);

      const tempOptions = {
        x: 0,
        y: 0,
        width: 500,
        height: 400,
        destWidth: 500,
        destHeight: 400,
        fileType: 'jpg',
        quality: 0.92,
      };

      if (canvas.toTempFilePathSync) {
        onDone(canvas.toTempFilePathSync(tempOptions));
        return;
      }

      if (canvas.toTempFilePath) {
        canvas.toTempFilePath({
          ...tempOptions,
          success: (res: { tempFilePath?: string }) => onDone(res.tempFilePath),
          fail: () => onDone(undefined),
        });
        return;
      }

      if (wx.canvasToTempFilePath) {
        wx.canvasToTempFilePath({
          ...tempOptions,
          canvas,
          success: (res: { tempFilePath?: string }) => onDone(res.tempFilePath),
          fail: () => onDone(undefined),
        });
        return;
      }
    } catch (error) {
      console.warn('[SharePosterService] Failed to create poster:', error);
    }

    onDone(undefined);
  }

  static createPoster(options: SharePosterOptions): string | undefined {
    if (typeof wx === 'undefined' || !wx.createCanvas) {
      return undefined;
    }

    try {
      const canvas = wx.createCanvas();
      canvas.width = 500;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return undefined;
      }

      this.drawPoster(ctx, options);

      if (canvas.toTempFilePathSync) {
        return canvas.toTempFilePathSync({
          x: 0,
          y: 0,
          width: 500,
          height: 400,
          destWidth: 500,
          destHeight: 400,
          fileType: 'jpg',
          quality: 0.92,
        });
      }
    } catch (error) {
      console.warn('[SharePosterService] Failed to create poster:', error);
    }

    return undefined;
  }

  static savePosterToAlbum(options: SharePosterOptions, onDone?: (ok: boolean, message: string) => void): void {
    this.createPosterAsync(options, (imageUrl) => {
      if (!imageUrl) {
        onDone?.(false, '当前环境无法生成海报');
        return;
      }
      if (typeof wx === 'undefined' || !wx.saveImageToPhotosAlbum) {
        console.log('[SharePosterService] Save poster mock:', imageUrl);
        onDone?.(true, '开发环境已生成海报');
        return;
      }
      wx.saveImageToPhotosAlbum({
        filePath: imageUrl,
        success: () => onDone?.(true, '战绩图已保存到相册'),
        fail: (err: { errMsg?: string }) => {
          const denied = err && err.errMsg && err.errMsg.indexOf('auth deny') >= 0;
          onDone?.(false, denied ? '请在微信设置中允许保存到相册' : '保存失败，请稍后再试');
        },
      });
    });
  }

  private static drawPoster(ctx: any, options: SharePosterOptions): void {
    const isResidual = options.kind === 'residual';
    const primary = isResidual ? '#FF4B3E' : '#00E5FF';
    const accent = isResidual ? '#FDE047' : '#34D399';

    // Deep-space gradient background.
    const bg = ctx.createLinearGradient(0, 0, 500, 400);
    bg.addColorStop(0, '#101E4A');
    bg.addColorStop(0.55, '#0B132B');
    bg.addColorStop(1, isResidual ? '#451A03' : '#312E81');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 500, 400);

    this.drawOrb(ctx, 88, 78, 145, '#0083B0', 0.58);
    this.drawOrb(ctx, 430, 128, 185, '#6B21A8', 0.42);
    this.drawOrb(ctx, 250, 288, 205, isResidual ? '#7C2D12' : '#00F0FF', 0.16);
    this.drawStars(ctx);

    // Card frame.
    ctx.fillStyle = 'rgba(8, 14, 36, 0.82)';
    this.roundRect(ctx, 28, 28, 444, 344, 28);
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 40, 40, 420, 320, 22);
    ctx.stroke();

    this.drawLogo(ctx, 250, 72, primary);
    this.drawIsland(ctx, 250, 204, primary, accent, isResidual);

    this.drawText(ctx, '浮岛流光', 250, 62, 24, '#FFFFFF', 'center', 'bold');
    this.drawText(ctx, 'FLOAT & FLOW', 250, 92, 13, primary, 'center', 'normal');

    this.drawBadge(ctx, 250, 126, options.badgeText, accent, isResidual ? '#451A03' : '#052E2B');
    this.drawText(ctx, options.headline, 250, 302, 27, '#FFFFFF', 'center', 'bold');
    this.drawText(ctx, options.subline, 250, 334, 17, '#CFFAFE', 'center', 'normal');
    this.drawText(ctx, options.metricText, 250, 360, 16, accent, 'center', 'bold');

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.9;
    this.roundRect(ctx, 408, 306, 42, 42, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.stroke();
    this.drawMiniQr(ctx, 429, 327, primary);
    this.drawText(ctx, '点开接光', 429, 360, 11, '#E2E8F0', 'center', 'normal');
  }

  private static drawLogo(ctx: any, x: number, y: number, color: string): void {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y + 8, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private static drawIsland(ctx: any, x: number, y: number, primary: string, accent: string, danger: boolean): void {
    const tiles = [
      [-1, 0], [0, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1],
      [0, 2],
    ];

    tiles.forEach(([tx, ty], idx) => {
      const cx = x + (tx - ty * 0.45) * 58;
      const cy = y + ty * 34;
      this.drawIsoTile(ctx, cx, cy, idx % 2 === 0 ? '#2563EB' : '#1E40AF', '#0F172A', '#60A5FA');
    });

    const line = ctx.createLinearGradient(x - 150, y + 36, x + 150, y - 14);
    line.addColorStop(0, danger ? '#FF4B3E' : '#FDE047');
    line.addColorStop(0.5, '#FFFFFF');
    line.addColorStop(1, primary);
    ctx.strokeStyle = line;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.shadowColor = primary;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(x - 132, y + 28);
    ctx.lineTo(x - 42, y + 28);
    ctx.lineTo(x + 12, y - 4);
    ctx.lineTo(x + 118, y - 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = accent;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 130, y - 4, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private static drawIsoTile(ctx: any, x: number, y: number, top: string, side: string, stroke: string): void {
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x - 38, y + 10);
    ctx.lineTo(x, y + 32);
    ctx.lineTo(x + 38, y + 10);
    ctx.lineTo(x, y + 54);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.lineTo(x + 44, y);
    ctx.lineTo(x, y + 26);
    ctx.lineTo(x - 44, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private static drawBadge(ctx: any, x: number, y: number, text: string, border: string, fill: string): void {
    ctx.fillStyle = fill;
    this.roundRect(ctx, x - 134, y - 22, 268, 44, 22);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    this.drawText(ctx, text, x, y + 6, 18, '#FFFFFF', 'center', 'bold');
  }

  private static drawMiniQr(ctx: any, x: number, y: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(x - 13, y - 13, 5, 5);
    ctx.fillRect(x + 8, y - 13, 5, 5);
    ctx.fillRect(x - 13, y + 8, 5, 5);
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }

  private static drawStars(ctx: any): void {
    for (let i = 0; i < 38; i++) {
      const x = (Math.sin(i * 17.17) + 1) * 250;
      const y = (Math.cos(i * 29.31) + 1) * 200;
      ctx.fillStyle = i % 4 === 0 ? '#00F0FF' : '#FFFFFF';
      ctx.globalAlpha = 0.45 + (i % 5) * 0.1;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private static drawOrb(ctx: any, x: number, y: number, radius: number, color: string, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static drawText(ctx: any, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign, weight: 'normal' | 'bold'): void {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${size}px sans-serif`;
    ctx.fillText(text, x, y);
  }

  private static roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
