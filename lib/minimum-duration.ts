export const MINIMUM_SIGNAL_ANALYSIS_MS = 800;

export function waitForSignalAnalysis(
  milliseconds = MINIMUM_SIGNAL_ANALYSIS_MS
) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}
