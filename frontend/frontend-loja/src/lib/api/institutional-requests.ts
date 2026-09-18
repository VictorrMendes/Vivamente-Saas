import { backFetch } from "./back-client";
import { isMockEnabled, mockInstitutionalRequestResult } from "./mocks";
import type { InstitutionalRequestInput, InstitutionalRequestResult } from "./types";

export function createInstitutionalRequest(
  input: InstitutionalRequestInput,
): Promise<InstitutionalRequestResult> {
  if (isMockEnabled()) return Promise.resolve(mockInstitutionalRequestResult());
  return backFetch<InstitutionalRequestResult>("/api/v1/public/institutional-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
