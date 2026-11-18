import { ProfileManager } from './ProfileManager';

declare const wx: any;

/**
 * 浮岛浮光 - 空灵八音盒与晶石合成器 (Procedural Crystal Synthesizer)
 * 基于 Web Audio / 微信原生 WebAudioContext，无需下载任何外部 MP3 资源，
 * 零延迟、零体积开销，实现纪念碑谷级空灵八音盒音效与多音阶连击反馈。
 */
export class CrystalAudioService {
  private static audioCtx: any = null;
  private static isMuted = false;
  private static currentScaleIndex = 0;
  private static lastNoteTime = 0;

  // 五声音阶 / 大调空灵音阶频率 (Hz): C5, D5, E5, G5, A5, C6, D6, E6
  private static readonly PENTATONIC_SCALE = [
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50, // C6
    1174.66, // D6
    1318.51, // E6
  ];

  private static getContext(): any {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        try {
          this.audioCtx.resume();
        } catch (_e) {
          // ignore
        }
      }
      return this.audioCtx;
    }

    try {
      if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
        this.audioCtx = wx.createWebAudioContext();
      } else if (typeof window !== 'undefined') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
    } catch (e) {
      console.warn('[CrystalAudioService] Failed to init AudioContext:', e);
    }

    return this.audioCtx;
  }

  /**
   * 播放单音阶空灵晶石音 (带有轻微二次谐波泛音，模拟八音盒与编钟共振)
   */
  public static playTone(freq: number, duration = 0.45, volume = 0.28): void {
    if (ProfileManager.isPowerSaveMode()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. 基频正弦波 (纯净晶石声)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      gain1.gain.setValueAtTime(volume, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + duration);

      // 2. 二次谐波泛音 (轻微高八度三角波，增添空灵水晶光泽感)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);

      gain2.gain.setValueAtTime(volume * 0.22, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.5);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + duration * 0.5);
    } catch (_e) {
      // 容错降级
    }
  }

  /**
   * 一指划光进阶连击音阶 (从低音 C5 到高音 C6 步步生辉)
   */
  public static playStepChime(step?: number): void {
    const now = Date.now();
    if (now - this.lastNoteTime > 1200) {
      this.currentScaleIndex = 0;
    }
    this.lastNoteTime = now;

    const idx = typeof step === 'number'
      ? step % this.PENTATONIC_SCALE.length
      : this.currentScaleIndex % this.PENTATONIC_SCALE.length;

    const freq = this.PENTATONIC_SCALE[idx];
    this.playTone(freq, 0.4, 0.25);
    this.currentScaleIndex++;
  }

  /**
   * 水晶旋转顺畅轻响 (微清脆咔嗒灵光声)
   */
  public static playRotatePlink(): void {
    this.playTone(740, 0.12, 0.18);
  }

  /**
   * 暗影碎裂 / 障碍爆破声 (清脆琉璃碎裂共振)
   */
  public static playShatterChime(): void {
    if (ProfileManager.isPowerSaveMode()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 碎裂群音：多频率交错
      [880, 1174, 1480, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);

        gain.gain.setValueAtTime(0.18, now + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.02 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.02);
        osc.stop(now + idx * 0.02 + 0.35);
      });
    } catch (_e) {
      // ignore
    }
  }

  /**
   * 圣所大复苏通关辉煌和弦琶音 (C5 -> E5 -> G5 -> C6 大三和弦天国之门)
   */
  public static playAwakeningChord(): void {
    if (ProfileManager.isPowerSaveMode()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      chord.forEach((freq, idx) => {
        const delay = idx * 0.085;
        setTimeout(() => {
          this.playTone(freq, 0.95, 0.32);
        }, delay * 1000);
      });
    } catch (_e) {
      // ignore
    }
  }

  /**
   * 重置音阶计数器
   */
  public static resetScale(): void {
    this.currentScaleIndex = 0;
  }
}

