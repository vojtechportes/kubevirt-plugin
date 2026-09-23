# Software Test Description (STD): VM Creation Wizard — Step Navigation Persistence

## 1. Project Overview

- **Project Name:** KubeVirt UI — Playwright E2E Tests
- **Feature Area:** Tier1 — VM creation wizard
- **Latest version:** CNV 5.1.0
- **Latest update:** 2026-09-23
- **Document Status:** Draft

## 2. Introduction

### 2.1 Purpose

Verify that jumping directly between wizard steps via the left-hand step navigation sidebar (rather
than the Back/Next footer buttons) preserves previously entered data, and that a step's navigation
link is disabled until that step becomes reachable.

### 2.2 Scope

- **In-Scope:** Custom configuration flow — jumping from Customization back to Guest OS and forward
  again via the sidebar, verifying the guest OS selection and a Description edit survive the jump.
  Create from Template flow — verifying the Review nav item is disabled before it is reached, then
  jumping from Customization back to the Template step and forward again, verifying the template
  selection survives the jump.
- **Out-of-Scope:** Back/Next footer button persistence (covered by the customization-editing
  specs); Clone flow step navigation (only 3 steps, no intermediate jump scenario); full VM
  creation.

## 3. Test Environment & Prerequisites

- **Environment:** OpenShift with CNV operator installed; Playwright `Tier1` project; kubeadmin or
  an equivalent cluster-admin session.
- **Configuration:** At least one boot volume and one template should be available; the wizard falls
  back to "No boot source" if none exist.
- **Initial Setup:** Each test creates its own namespace via `setupTestNamespace`. No VM is created;
  each test cancels the wizard at the end.

---

## 4. Test Case Definitions

**Spec file:** `tests/tier1/create-vm/create-vm-wizard-step-navigation-persistence.spec.ts`
**Describe:** `VM Creation Wizard — Step navigation sidebar preserves entered data` — **Tags:**
`@tier1`, `@catalog-wizard`, `@adminOnly`
**Allure:** suite `VM Creation Wizard`, feature `Tier 1`

---

### `001`: Custom configuration — jumping via the step nav preserves the guest OS selection and a Description edit

- **Objective:** Verify that using the step navigation sidebar to jump from Customization back to
  Guest OS, and then forward again to Customization, preserves the guest OS selection and a saved
  Description edit without using the Back/Next footer buttons.
- **Target version:** CNV 5.1.0
- **Jira References:** NO-JIRA-0
- **Pre-conditions:** None
- **Tags:** `@adminOnly`

| Step | Action                                                                                                                   | Expected Result                                                                |
| :--- | :----------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| 1    | Generate a VM name; advance through Guest OS (after the async load), Boot source, and Compute resources to Customization | Wizard reaches the Customization step                                          |
| 2    | Edit the Description to "test" and save                                                                                  | Description renders "test"                                                     |
| 3    | Use the step navigation sidebar to jump directly to the Guest OS step                                                    | Guest OS becomes the active step; the previously selected OS type is unchanged |
| 4    | Use the step navigation sidebar to jump directly to the Customization step                                               | Customization becomes the active step; the Description still shows "test"      |

---

### `002`: Create from Template — the Review nav item is disabled until reached, and jumping back preserves the template selection

- **Objective:** Verify that the Review and create step's navigation link is disabled before the
  wizard reaches it, and that jumping back to the Template step via the sidebar (and forward again)
  preserves the selected template.
- **Target version:** CNV 5.1.0
- **Jira References:** NO-JIRA-0
- **Pre-conditions:** At least one template is available in the catalog.
- **Tags:** `@adminOnly`

| Step | Action                                                                     | Expected Result                                                          |
| :--- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| 1    | Select Create from Template and generate a VM name                         | Review and create's step nav link is disabled before it is reached       |
| 2    | Click Next; select the first available template; click Next                | Wizard advances to Customization with a template selected                |
| 3    | Use the step navigation sidebar to jump directly to the Template step      | Template step becomes active; Next remains enabled (selection persisted) |
| 4    | Use the step navigation sidebar to jump directly to the Customization step | Customization becomes the active step                                    |

---

## 5. Requirements Traceability Matrix

| Jira Ticket | Test Case ID | Coverage Type    | Status    |
| ----------- | ------------ | ---------------- | --------- |
| NO-JIRA-0   | `001`        | Functional smoke | Automated |
| NO-JIRA-0   | `002`        | Functional smoke | Automated |

**Coverage Type values:**

- `Feature coverage` — test validates a feature delivered by the ticket
- `Bugfix regression guard` — test asserts the specific bug fixed by the ticket does not regress
- `Functional smoke` — test validates baseline behavior; no specific Jira ticket drives it

## 6. Approvals

- **Prepared By:** Test automation / QE
- **Reviewed By:** ******\_\_\_******
- **Approval Signature:** ******\_\_\_******
