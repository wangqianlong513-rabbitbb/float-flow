import { TileType } from './GameTypes';

export class CardSystem {
  private hand: TileType[] = [];
  private cursor = 0;
  private misses: Partial<Record<TileType, number>> = {};

  constructor(
    private readonly pool: TileType[],
    private readonly handSize: number,
    private readonly fixedHands: TileType[] = [],
  ) {}

  drawInitial(): TileType[] {
    this.hand = [];
    for (let i = 0; i < this.handSize; i++) {
      this.hand.push(this.drawOne());
    }
    return this.getHand();
  }

  getHand(): TileType[] {
    return [...this.hand];
  }

  setHand(hand: TileType[]): TileType[] {
    this.hand = [...hand];
    return this.getHand();
  }

  consume(index: number): TileType[] {
    if (index < 0 || index >= this.hand.length) {
      return this.getHand();
    }
    this.hand[index] = this.drawOne();
    return this.getHand();
  }

  redrawAll(): TileType[] {
    for (let i = 0; i < this.hand.length; i++) {
      this.hand[i] = this.drawOne();
    }
    return this.getHand();
  }

  unlockFourthSlot(): TileType[] {
    this.hand.push(this.drawOne());
    return this.getHand();
  }

  drawRescueCard(): TileType[] {
    const drawn = this.drawOne();
    if (this.hand.length < 4) {
      this.hand.push(drawn);
    } else {
      const index = Math.floor(Math.random() * this.hand.length);
      this.hand[index] = drawn;
    }
    return this.getHand();
  }

  refreshRandomCard(): TileType[] {
    if (this.hand.length === 0) {
      this.hand.push(this.drawOne());
      return this.getHand();
    }
    const index = Math.floor(Math.random() * this.hand.length);
    this.hand[index] = this.drawOne();
    return this.getHand();
  }

  returnTileToHand(index: number, tileType: TileType): TileType[] {
    if (this.cursor > 0 && this.cursor <= this.fixedHands.length) {
      this.cursor--;
    }
    if (index >= 0 && index < this.hand.length) {
      this.hand[index] = tileType;
    } else {
      this.hand.push(tileType);
    }
    return this.getHand();
  }

  private drawOne(): TileType {
    if (this.cursor < this.fixedHands.length) {
      return this.fixedHands[this.cursor++];
    }

    if (this.pool.length === 0) {
      return 'straight';
    }

    const randomIndex = this.pickWeightedIndex();
    const drawn = this.pool[randomIndex];
    this.updateMissProtection(drawn);
    return drawn;
  }

  private pickWeightedIndex(): number {
    let total = 0;
    const weights = this.pool.map((type) => {
      const missBonus = Math.min(4, this.misses[type] || 0);
      const isConnector = type === 'straight' || type === 'curve' || type === 'cross' || type === 'universal';
      const weight = 1 + missBonus * (isConnector ? 0.35 : 0.18);
      total += weight;
      return weight;
    });

    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        return i;
      }
    }
    return Math.max(0, weights.length - 1);
  }

  private updateMissProtection(drawn: TileType): void {
    const tracked: TileType[] = ['straight', 'curve', 'cross', 'universal'];
    for (const type of tracked) {
      this.misses[type] = type === drawn ? 0 : (this.misses[type] || 0) + 1;
    }
  }
}
