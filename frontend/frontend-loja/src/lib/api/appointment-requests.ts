import { backFetch } from "./back-client";
import type { AppointmentRequestInput, AppointmentRequestResult } from "./types";

export function createAppointmentRequest(input: AppointmentRequestInput) {
  return backFetch<AppointmentRequestResult>("/api/v1/public/appointment-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
