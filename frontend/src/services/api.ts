import { apiFetch } from "@/config/api";

export interface ScreeningResult {
  riskLevel: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Healthy' | 'Elevated OA Risk' | 'Normal' | 'Elevated OA-related movement pattern' | 'Normal pattern';
  riskScore: number; // 0 to 1
  confidence: number;
  evidence?: { feature: string, value: number, contribution: number }[];
}

export interface MovementLabFrame {
  frameIndex: number;
  leftKneeAngle: number;
  rightKneeAngle: number;
  leftHipAngle: number;
  rightHipAngle: number;
  timestamp: number;
  symmetry: number;
}

export const api = {
  analyzeCamera: async (file: File): Promise<ScreeningResult> => {
    const formData = new FormData();
    formData.append("video", file);

    const res = await apiFetch("/api/analyze/camera", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to analyze camera data");
    }

    const data = await res.json();
    return {
      riskLevel: data.camera_class,
      riskScore: data.camera_risk,
      confidence: data.confidence,
      evidence: data.evidence
    };
  },

  analyzeIMU: async (files: File[]): Promise<ScreeningResult> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append("files", file);
    });

    const res = await apiFetch("/api/analyze/imu", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to analyze IMU data");
    }

    const data = await res.json();
    return {
      riskLevel: data.imu_class,
      riskScore: data.imu_risk,
      confidence: data.confidence,
    };
  },

  analyzeCameraJoint: async (joint: string, payload: Record<string, number[]>): Promise<ScreeningResult> => {
    let bodyPayload = {};
    if (joint === 'knee') {
      bodyPayload = {
        left_knee_angles: payload.left || [],
        right_knee_angles: payload.right || []
      };
    } else {
      bodyPayload = {
        joint_angles: payload
      };
    }

    const res = await apiFetch(`/api/analyze/camera/${joint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to analyze live camera data");
    }
    const data = await res.json();
    return {
      riskLevel: data.camera_class,
      riskScore: data.camera_risk,
      confidence: data.confidence,
      evidence: data.evidence
    };
  },


  analyzeLiveCamera: async (leftAngles: number[], rightAngles: number[]): Promise<ScreeningResult> => {
    const res = await apiFetch("/api/analyze/camera/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        left_knee_angles: leftAngles,
        right_knee_angles: rightAngles
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to analyze live camera data");
    }
    const data = await res.json();
    return {
      riskLevel: data.camera_class,
      riskScore: data.camera_risk,
      confidence: data.confidence,
      evidence: data.evidence
    };
  },
  // Mock functions to prevent build errors on other legacy pages
  uploadVideo: async (file: File): Promise<string> => {
    return 'VID-' + Math.random().toString(36).substring(7);
  },
  getAnalysisProgress: async (videoId: string, onProgress: (stage: string) => void): Promise<void> => {
    onProgress('Video uploaded');
  },
  getScreeningResult: async (patientId: string): Promise<any> => {
    return null;
  },
  getMovementLabData: async (patientId: string): Promise<any[]> => {
    return [];
  }
};
