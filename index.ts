import {Callbag, Source} from 'callbag';

export type Metadata = {
  source?: Metadata | Array<Metadata> | undefined;
  name: string;
  data?: string | number | object;
  timestamp?: number;
};

export default function makeShadow(
  name: string,
  sourceOrSources: Source<Metadata> | Array<Source<Metadata>>,
): Callbag<void, Metadata> {
  let sink: any;
  let metadata: any = {name};
  let firstSent = false;
  let sourceMetadata: any;
  return (type: any, data: any) => {
    if (type === 0) {
      sink = data;
      sink(0, (t: 0 | 1 | 2) => {
        if (t === 1 && !firstSent && !sourceOrSources) {
          firstSent = true;
          sink(1, metadata);
        }
        if (t === 2) sink = undefined;
      });
      if (sourceOrSources && Array.isArray(sourceOrSources)) {
        const sources = sourceOrSources;
        const n = sources.length;
        let remaining = n; // start counter
        sourceMetadata = new Array(n);
        sources.forEach((source, i) => {
          sourceMetadata[i] = undefined;
          source(0, (t: 0 | 1 | 2, d: any) => {
            if (t === 0) {
              const talkback = d;
              if (!firstSent) talkback(1);
            }
            if (t === 1) {
              const _remaining = !remaining
                ? 0
                : !sourceMetadata[i]
                ? --remaining
                : remaining;
              sourceMetadata[i] = d;
              if (_remaining === 0) {
                metadata = {
                  source: sourceMetadata,
                  name,
                  data: metadata.data,
                  timestamp: metadata.timestamp,
                };
                firstSent = true;
                if (sink) sink(1, metadata);
              }
            }
          });
        });
      } else if (sourceOrSources) {
        const source = sourceOrSources;
        source(0, (t: 0 | 1 | 2, d: any) => {
          if (t === 0) {
            const talkback = d;
            if (!firstSent) talkback(1);
          }
          if (t === 1) {
            sourceMetadata = d;
            metadata = {
              source: sourceMetadata,
              name,
              data: metadata.data,
              timestamp: metadata.timestamp,
            };
            firstSent = true;
            if (sink) sink(1, metadata);
          }
        });
      }
    }

    if (type === 1) {
      metadata = {
        source: sourceMetadata,
        name,
        data: typeof data === 'function' ? '[Function]' : data,
        timestamp: Date.now(),
      };
      if (sink) sink(1, metadata);
    }
  };
}
