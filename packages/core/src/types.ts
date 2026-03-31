export type Category = "pii" | "secret" | "credential" | "token";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Detection {
  type: string;
  category: Category;
  severity: Severity;
  start: number;
  end: number;
  message: string;
}

export type Detector = (text: string) => Detection[];

export interface DetectorInfo {
  name: string;
  description: string;
  detector: Detector;
  enabled: boolean;
}

export interface ScanResult {
  detections: Detection[];
  scannedAt: number;
  textLength: number;
}

export interface ScanOptions {
  /** Detector names to enable. If undefined, all detectors run. */
  enabledDetectors?: string[];
  /** Minimum severity to report. */
  minSeverity?: Severity;
}
