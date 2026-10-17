import { rankProducts, type RankInput } from './rank';

self.onmessage = (e: MessageEvent<RankInput>) => {
  self.postMessage(rankProducts(e.data));
};
