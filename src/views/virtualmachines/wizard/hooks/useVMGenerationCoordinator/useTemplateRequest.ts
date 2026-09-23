import { useCallback, useEffect, useRef, useState } from 'react';
import isEqual from 'lodash/isEqual';

import { type GenerationScope } from './types';

type ActiveTemplateRequest = {
  promise: Promise<boolean>;
  source: unknown;
  token: object;
};

type TemplateRequestTask = (isCurrentRequest: () => boolean) => Promise<boolean>;

type TemplateRequest = {
  isTemplateGenerating: boolean;
  runTemplateRequest: (source: unknown, task: TemplateRequestTask) => Promise<boolean>;
};

const useTemplateRequest = ({
  cluster,
  creationMethod,
  project,
}: GenerationScope): TemplateRequest => {
  const activeRequestRef = useRef<ActiveTemplateRequest | null>(null);
  const mountedRef = useRef(true);
  const scopeRef = useRef({ cluster, creationMethod, project });
  const [isTemplateGenerating, setIsTemplateGenerating] = useState(false);

  useEffect(() => {
    if (!isEqual(scopeRef.current, { cluster, creationMethod, project })) {
      scopeRef.current = { cluster, creationMethod, project };
      activeRequestRef.current = null;
      setIsTemplateGenerating(false);
    }
  }, [cluster, creationMethod, project]);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      activeRequestRef.current = null;
    };
  }, []);

  const runTemplateRequest = useCallback(
    (source: unknown, task: TemplateRequestTask): Promise<boolean> => {
      const activeRequest = activeRequestRef.current;
      if (activeRequest && isEqual(activeRequest.source, source)) return activeRequest.promise;

      const token = {};
      const isCurrentRequest = (): boolean =>
        mountedRef.current && activeRequestRef.current?.token === token;
      const promise = task(isCurrentRequest).finally(() => {
        if (activeRequestRef.current?.token === token) {
          activeRequestRef.current = null;
          if (mountedRef.current) setIsTemplateGenerating(false);
        }
      });

      activeRequestRef.current = { promise, source, token };
      setIsTemplateGenerating(true);

      return promise;
    },
    [],
  );

  return { isTemplateGenerating, runTemplateRequest };
};

export default useTemplateRequest;
