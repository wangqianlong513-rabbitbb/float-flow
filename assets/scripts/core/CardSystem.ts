import { TileType } from './GameTypes';

export class CardSystem {
  private hand: TileType[] = [];
  private cursor = 0;

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

  private drawOne(): TileType {
    if (this.cursor < this.fixedHands.length) {
      return this.fixedHands[this.cursor++];
    }

    if (this.pool.length === 0) {
      return 'straight';
    }

    const randomIndex = Math.floor(Math.random() * this.pool.length);
    return this.pool[randomIndex];
  }
}
