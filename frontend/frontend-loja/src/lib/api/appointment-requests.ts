import { backFetch } from "./back-client";
import { isMockEnabled, mockAppointmentRequestResult } from "./mocks";
import type { AppointmentRequestInput, AppointmentRequestResult } from "./types";

export function createAppointmentRequest(
  input: AppointmentRequestInput,
): Promise<AppointmentRequestResult> {
  if (isMockEnabled()) return Promise.resolve(mockAppointmentRequestResult());
  return backFetch<AppointmentRequestResult>("/api/v1/public/appointment-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
