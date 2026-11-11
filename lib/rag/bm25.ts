import { BM25_B, BM25_EPSILON, BM25_K1 } from "./notebook";

/**
 * Port of the notebook's BM25 keyword index: rank_bm25 0.2.2 `BM25Okapi` with its defaults
 * (k1 1.5, b 0.75, epsilon 0.25) and the notebook's `tokenize()`. Arithmetic follows the Python
 * operation order so scores match; tests/notebook-parity.test.ts checks values computed by rank_bm25.
 */

/**
 * Notebook: re.findall(r"\w+", unicodedata.normalize("NFKC", text).lower()).
 * Python's Unicode \w is letters, numbers and the underscore.
 */
export function tokenize(text: string): string[] {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+/gu) ?? []
  );
}

export class BM25Okapi {
  readonly corpusSize: number;
  readonly avgdl: number;
  private readonly docLen: number[] = [];
  private readonly docFreqs: Map<string, number>[] = [];
  private readonly idf = new Map<string, number>();

  constructor(corpus: string[][]) {
    // BM25._initialize
    const nd = new Map<string, number>(); // word -> number of documents with word (insertion-ordered, like a dict)
    let numDoc = 0;
    for (const document of corpus) {
      this.docLen.push(document.length);
      numDoc += document.length;
      const frequencies = new Map<string, number>();
      for (const word of document) frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
      this.docFreqs.push(frequencies);
      for (const word of frequencies.keys()) nd.set(word, (nd.get(word) ?? 0) + 1);
    }
    this.corpusSize = corpus.length;
    this.avgdl = numDoc / this.corpusSize;

    // BM25Okapi._calc_idf
    let idfSum = 0;
    const negativeIdfs: string[] = [];
    for (const [word, freq] of nd) {
      const idf = Math.log(this.corpusSize - freq + 0.5) - Math.log(freq + 0.5);
      this.idf.set(word, idf);
      idfSum += idf;
      if (idf < 0) negativeIdfs.push(word);
    }
    const averageIdf = idfSum / this.idf.size;
    const eps = BM25_EPSILON * averageIdf;
    for (const word of negativeIdfs) this.idf.set(word, eps);
  }

  /** BM25Okapi.get_scores: one score per document, in corpus order. */
  getScores(query: string[]): Float64Array {
    const score = new Float64Array(this.corpusSize);
    for (const q of query) {
      const idf = this.idf.get(q) ?? 0;
      for (let i = 0; i < this.corpusSize; i++) {
        const qFreq = this.docFreqs[i].get(q) ?? 0;
        // idf * (q_freq * (k1 + 1) / (q_freq + k1 * (1 - b + b * doc_len / avgdl)))
        score[i] +=
          idf *
          ((qFreq * (BM25_K1 + 1)) /
            (qFreq + BM25_K1 * (1 - BM25_B + (BM25_B * this.docLen[i]) / this.avgdl)));
      }
    }
    return score;
  }
}
