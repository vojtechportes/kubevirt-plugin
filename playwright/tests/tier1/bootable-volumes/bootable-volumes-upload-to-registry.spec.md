# Software Test Description (STD): Bootable Volumes — Upload to Registry

## 1. Project Overview

- **Project Name:** KubeVirt UI — Playwright E2E Tests
- **Feature Area:** Tier1 — Bootable volumes
- **Latest version:** CNV 5.1.0
- **Latest update:** 2026-10-07
- **Document Status:** Draft

## 2. Introduction

### 2.1 Purpose

Verify the "Upload to registry" export flow for an existing bootable volume: form validation, save
behavior, modal close-on-submit, the resulting background export toast, the Kubernetes resources
created by the export (uploader Pod + credentials Secret), and RBAC-gating of the row action itself.

### 2.2 Scope

- **In-Scope:** Upload to registry modal field validation (Save enabled/disabled), submit behavior,
  modal auto-close on submit, background toast state after submit (uploading or terminal
  error/aborted), the shape of the uploader Pod and Secret created on submit (correct destination,
  volume name, export-source-kind, and secret wiring), and whether the "Upload to registry" kebab
  action is enabled/disabled based on export permissions (`useCanExport`).
- **Out-of-Scope:** Successful export (actual image push) against a real container registry — the
  uploader image/backend owns that behavior; this suite only verifies the frontend creates the right
  Pod with the right variables (CNV-95818). Also out of scope: password show/hide toggle, and Stepper
  "In progress" vs "Completed" state rendering (CNV-89815 UX items not asserted here).

## 3. Test Environment & Prerequisites

- **Environment:** OpenShift with CNV operator installed; Playwright `Tier1` project.
- **Configuration:** No special feature gates required. Uses a dummy Quay destination
  (`docker://quay.io/kubevirt-plugin-pw-tests/dummy-export:latest`) with placeholder credentials — no
  real registry access is required or exercised. Test `004` additionally requires `NON_PRIV=1` and is
  skipped otherwise.
- **Initial Setup:** Tests `001`–`003` each create their own namespace via `setupTestNamespace`, then
  create a blank DataVolume and a corresponding DataSource via the API (`createBootableVolumeViaApi`)
  to have an existing bootable volume to export. Test `004` reuses the shared non-priv test namespace
  (`testConfig.testNamespace`), which is pre-granted only the narrow `kubevirt.io:edit` ClusterRole
  (KubeVirt/CDI resources) for the non-priv user — no Pod/Secret/ServiceAccount/Role/RoleBinding create
  access. Created resources are tracked via `apiClient.trackResource(...)` for automatic cleanup where
  applicable.

---

## 4. Test Case Definitions

**Spec file:** `tests/tier1/bootable-volumes/bootable-volumes-upload-to-registry.spec.ts`
**Describe:** `Tier1 Bootable Volumes - Upload to registry` / `Tier1 Bootable Volumes - Upload to
registry is unavailable without permission` — **Tags:** `@tier1`, `@nonpriv`
**Allure:** suite `Test Virtualization Bootable volumes page`, feature `Tier 1`

---

### `001`: Save is disabled until all required fields are filled

- **Objective:** Verify the Upload to registry modal's Save button stays disabled until destination,
  username, and password are all provided.
- **Target version:** CNV 5.1.0
- **Jira References:** CNV-89946, CNV-87382, CNV-89815
- **Pre-conditions:** A bootable volume (DataVolume + DataSource) already exists in the test namespace
- **Tags:** `@nonpriv`

| Step | Action                                                           | Expected Result                                               |
| :--- | :--------------------------------------------------------------- | :------------------------------------------------------------ |
| 1    | Open the row action "Upload to registry" for the existing volume | Modal opens with all expected form fields visible             |
| 2    | Check the Save button state with an empty form                   | Save is disabled                                              |
| 3    | Fill only the registry name and check Save state                 | Save remains disabled (destination/username/password not set) |
| 4    | Fill destination, username, and password, then check Save state  | Save becomes enabled                                          |
| 5    | Cancel the modal                                                 | Modal closes without creating an export                       |

---

### `002`: Form submits successfully, creates the correct uploader Pod/Secret, closes the modal automatically, and shows an uploading or terminal toast

- **Objective:** Verify that a completed and submitted Upload to registry form creates a
  `kubevirt-disk-uploader` Pod with the correct destination/volume/export-kind args and a correctly
  wired credentials Secret, closes the modal automatically, and surfaces a background progress toast
  (or an expected terminal state given dummy credentials).
- **Target version:** CNV 5.1.0
- **Jira References:** CNV-89946, CNV-87382, CNV-89815, CNV-95818
- **Pre-conditions:** A bootable volume (DataVolume + DataSource) already exists in the test namespace
- **Tags:** `@nonpriv`

| Step | Action                                                                             | Expected Result                                                                                                                                                                                     |
| :--- | :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Fill the Upload to registry form with destination/username/password and click Save | Form submits without client-side validation errors                                                                                                                                                  |
| 2    | Observe the modal                                                                  | Modal (`#tab-modal`) closes automatically while the export continues in the background                                                                                                              |
| 3    | Fetch the `kubevirt-disk-uploader` Pod created in the namespace via the API        | Pod `args` include `--imagedestination <destination>`, `--volumename <volume>`, and `--export-source-kind pvc`; `ACCESS_KEY_ID`/`SECRET_KEY` env vars reference the same Secret                     |
| 4    | Fetch that Secret via the API                                                      | Secret exists, `type: Opaque`, with `accessKeyId`/`secretKey` data keys                                                                                                                             |
| 5    | Observe the resulting toast                                                        | Uploading toast is shown, **or** the export reaches a terminal `error`/`aborted` toast state because the dummy registry credentials are invalid; if still uploading, the test aborts it to clean up |

---

### `003`: "Upload to registry" action is enabled and opens the modal for a user with export permissions

- **Objective:** Verify the "Upload to registry" row kebab action is enabled (not `aria-disabled`) and
  opens the modal for a user who has the permissions `useCanExport` checks for (create on
  Pod/Secret/ServiceAccount/Role/RoleBinding).
- **Target version:** CNV 5.1.0
- **Jira References:** CNV-95818
- **Pre-conditions:** A bootable volume (DataVolume + DataSource) already exists in the test namespace;
  the acting user has export permissions in that namespace.
- **Tags:** `@nonpriv`

| Step | Action                                                       | Expected Result                                     |
| :--- | :----------------------------------------------------------- | :-------------------------------------------------- |
| 1    | Open the row kebab and check the "Upload to registry" action | Action is enabled (`aria-disabled` is not `"true"`) |
| 2    | Click the enabled action                                     | Upload to registry modal opens with its form fields |
| 3    | Cancel the modal                                             | Modal closes without creating an export             |

---

### `004`: "Upload to registry" action is disabled with a permission tooltip for a non-privileged user

- **Objective:** Verify the "Upload to registry" row kebab action is disabled and shows a "no
  permission" tooltip for a user lacking `useCanExport`'s required permissions.
- **Target version:** CNV 5.1.0
- **Jira References:** CNV-95818
- **Pre-conditions:** `NON_PRIV=1`; a bootable volume (DataVolume + DataSource) exists in the shared
  non-priv test namespace, which only grants the non-priv user the narrow `kubevirt.io:edit`
  ClusterRole (no Pod/Secret/ServiceAccount/Role/RoleBinding create access).
- **Tags:** `@nonpriv`

| Step | Action                                                       | Expected Result                                                  |
| :--- | :----------------------------------------------------------- | :--------------------------------------------------------------- |
| 1    | Open the row kebab and check the "Upload to registry" action | Action is disabled (`aria-disabled="true"`)                      |
| 2    | Hover the disabled action                                    | Tooltip reads "You don't have permission to perform this action" |

---

## 5. Requirements Traceability Matrix

| Jira Ticket | Test Case ID | Coverage Type    | Status    |
| ----------- | ------------ | ---------------- | --------- |
| CNV-89946   | `001`        | Feature coverage | Automated |
| CNV-89946   | `002`        | Feature coverage | Automated |
| CNV-89815   | `001`        | Feature coverage | Automated |
| CNV-89815   | `002`        | Feature coverage | Automated |
| CNV-87382   | `002`        | Feature coverage | Automated |
| CNV-95818   | `002`        | Feature coverage | Automated |
| CNV-95818   | `003`        | Feature coverage | Automated |
| CNV-95818   | `004`        | Feature coverage | Automated |

**Coverage Type values:**

- `Feature coverage` — test validates a feature delivered by the ticket
- `Bugfix regression guard` — test asserts the specific bug fixed by the ticket does not regress
- `Functional smoke` — test validates baseline behavior; no specific Jira ticket drives it

## 6. Approvals

- **Prepared By:** Test automation / QE
- **Reviewed By:** Vojtech Portes
- **Approval Signature:** Vojtech Portes
