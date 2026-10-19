# ACM Fleet Virtualization healthy inventory baseline

## Purpose and status

Companion to `acm-fleet-baseline.spec.ts`. Prepared on the current branch before the
separate inventory-sharing and timeout-handling implementation. **Not yet executed
against ACM**; VPN-machine validation is required. These are three focused regression
cases, tagged `@fleet-virtualization-acm` and `@route-virtual-machines-list`.

The suite checks actual cluster/project/name identities, exact stopped-VM counts,
and live-resource UIDs/content. It reuses the VM factory, list/search and detail
page objects, Allure helpers, and the request client's cookie/CSRF transport.
Its fixture extends `vm-list-fixture`, inheriting the shared browser contexts,
initial navigation/auth healing, runtime-error attachments, screenshots, and
test annotations. Login and configuration use the existing global setup rules.
`AcmSpokeClient` only redirects Kubernetes requests through the existing MCE
managed-spoke proxy; the standalone client has no remote-cluster parameter.

## Environment, permissions, and configuration

Run from the repository root on the VPN-connected machine with Node.js >=22,
npm >=10.9, repository dependencies, and the Playwright Chromium browser installed.
The hub console, OAuth endpoints, MCE proxy and both spokes must be reachable.

Required ACM environment:

- ACM/MCE and this branch's KubeVirt console plugin enabled on the hub, with the
  **Fleet Virtualization** perspective and Virtual machines/Navigator available.
- Two **distinct remote managed spokes**, both Available, with OpenShift
  Virtualization/CNV installed and the cluster-proxy add-on available. Neither
  variable may name the hub/local cluster. Cluster names are ManagedCluster
  resource names on the hub, not API addresses or kubeconfig context names.
- Healthy ACM search collector/indexing for VM and Namespace resources on both
  spokes. New inventory must appear within the suite's 120-second assertions.
- Existing `treeViewFolders`/group-search support enabled for the Fleet UI,
  search-language controls available, and Navigator tree visible. The suite does
  not enable feature flags or modify shared cluster/user settings.
- An English console session. The user must be able to read hub ManagedClusters,
  use ACM search and the spoke proxy, list projects/namespaces and VMs across both
  spokes, create/delete namespaces, and create/get/list/watch VMs in the fresh
  namespaces. VM detail pages also need their usual supporting-resource read
  permissions. A suitable administrator account is the simplest prerequisite;
  this suite does not test limited-user RBAC or grant permissions.
- No running VMs, storage class, PVCs, DataVolumes, guest connectivity or image
  pulls are needed: all created VMs use `runStrategy: Halted`.

Set these in the root `.env` (already ignored) or the process environment. Values
below are placeholders; do not commit environment details or session files.

```dotenv
ON_ACM=1
WEB_CONSOLE_URL=https://your-hub-console.example
ACM_SPOKE_A=your-first-managed-spoke
ACM_SPOKE_B=your-second-managed-spoke
OPENSHIFT_USERNAME=kubeadmin
OPENSHIFT_PASSWORD=your-hub-login-password
```

`WEB_CONSOLE_URL` must point at the hub console root. Use the same administrator
credentials as other E2E tests (`OPENSHIFT_USERNAME` defaults to `kubeadmin`;
`BRIDGE_KUBEADMIN_PASSWORD` is the existing password alternative). Unset `NON_PRIV`:
this baseline uses an existing administrator and does not provision users or RBAC.
The normal browser-login rule authenticates and writes the standard ignored
`.storage-states/test-state.json` and shared test configuration; sharded runs use
the existing shard-specific naming. No manual session capture or additional
ACM session variable is required. No spoke credentials, private URLs, or tokens
are embedded in tests, and no spoke kubeconfig or `oc` login is needed.

For an ordinary remote OAuth console, leave `HC_E2E` unset so the existing login
rule authenticates normally. The shared HTTP/local console login behavior remains
available for environments already configured that way. Do not run this suite
concurrently with another invocation that writes the same standard session/config
files, as with the other suites using this shared setup.

Missing configuration, failed login, unavailable or unreadable managed
clusters, missing proxy labels, or inaccessible spoke APIs fail with diagnostics;
they are not silently skipped. Preflight reads both spokes before resource
creation. API errors identify the failing spoke; resource creation failures also
surface as test setup failures. Missing UI prerequisites fail at the corresponding
control/group-search assertion. The inherited local namespace/resource check is
overridden only in the ACM fixture: it assumes a local `TEST_NS` and can run a
local janitor. ACM preflights both spokes instead. Other shared annotations and
failure diagnostics remain inherited; failed assertions still fail the tests.

## Setup and cleanup

`acm.setup.ts` calls the existing global setup with its console-readiness,
browser-login, API-client initialization, save-config, and save-storage-state
rules. The small optional rule selection leaves the default standalone setup
unchanged. Local namespace creation, feature-setting changes and RBAC provisioning
are deliberately not selected. At the end, existing file-cleanup rules remove
the generated session and shared configuration. The shared hub namespace/cluster
cleanup rules are not run for this suite.

One worker creates a fresh random `acm-<id>` run identifier. It creates
`acm-<id>-one` and `acm-<id>-two` on **each** configured spoke: four namespaces
in total. It creates no hub resources and never adopts an existing namespace.
The same run identifier labels every namespace/VM as
`e2e.kubevirt.io/acm-baseline=<run>`; VM group label `vm.openshift.io/folder=<run>`
isolates the inventory counts from unrelated fleet VMs.

| Spoke | Namespace | VM name suffix | CPU cores | Memory |
| ----- | --------- | -------------- | --------- | ------ |
| A     | one       | shared         | 1         | 256Mi  |
| A     | two       | only-a         | 1         | 256Mi  |
| B     | one       | shared         | 2         | 512Mi  |
| B     | one       | marker-b       | 2         | 512Mi  |
| B     | two       | only-b         | 2         | 512Mi  |

All VM names are prefixed with the run identifier. The two `shared` VMs have the
**same name and namespace on different clusters**. Descriptions identify run,
spoke and project. Setup waits for namespaces to become Active and VMs to report
Stopped, and records their server-assigned UIDs. Resource identities are printed
and attached to test results for diagnosis.

Fixture teardown runs even after setup/test failures. It deletes only namespaces
whose POST succeeded in this worker, after re-reading and checking the recorded
UID and run label. Namespace DELETE carries a UID precondition, then waits for
absence. Namespace deletion removes the suite's contained VMs. Cleanup attempts
all recorded namespaces and reports failures instead of swallowing them. It does
not list/delete resources by a shared prefix, invoke the global janitor, remove
pre-existing namespaces, or clean the hub. Do not add other resources to these
temporary namespaces while the suite is running.

Force-killing the process or losing the proxy during teardown can leave resources.
If cleanup fails, use the logged run/cluster/namespace identities and verify the
ownership label **and recorded UID** before manually deleting those exact
namespaces on the corresponding spokes. Never delete all `acm-*` namespaces.

## Cases, actions, and expected results

### 1. Scope, tree selection, and Navigator transitions

1. Enter Fleet Virtualization through the UI, select All clusters and isolate the
   test group. The list has exactly five cluster/project/name identities.
2. Switch to Navigator Overview: the statuses card reports five Stopped and zero
   Error, Running or Other VMs. Switch back: path and cluster/project/group filter
   parameters are preserved and the same five identities return.
3. In the list, select Project `one` across All clusters. Exactly three VMs appear,
   including both `shared` VMs. Remove the Project filter: all five return.
4. Select spoke A in the tree. Its Cluster filter is applied and the Project filter
   is cleared. Reapply the group isolation (tree selection intentionally clears
   group selection). The list has exactly A's two VMs. Overview reports two
   Stopped; switching back preserves this scope and both identities.
5. Select project `one` under A's cluster-qualified tree node. The namespaced path
   and Project filter match. Reapply group isolation: only A/one/shared appears;
   Overview reports one Stopped. The return to the list preserves the same scope.

These are inventory/status-card assertions, not assertions that charts merely
render. Project scope excludes the other project; spoke scope excludes B's VMs.

### 2. Catalog options, project/cluster filters, and name search

1. Select A/one in the tree and isolate the group: exactly one VM appears.
2. Open the Project catalog after narrowing and add project `two`. The option is
   present and enabled, the route broadens to all namespaces, both project filters
   are set, and exactly A's two VMs appear.
3. Open the Cluster catalog and add B. Its option remains usable; both cluster
   parameters are set and all five VMs appear.
4. Remove project `one`: only the two project-two VMs remain. Remove A: only
   B/two/only-b remains. Add project `one`: B's three VMs return. Add A: all five
   return. Both catalogs therefore support broadening after restrictive filtering.
5. Submit `name:<run>-shared` in the existing search input. Exactly the two shared
   VMs remain, each with its own cluster-qualified link. No standalone advanced
   search grammar, saved-search, sort, or column-management tests are duplicated.

### 3. Same-named VM live details on both spokes

For A/one/shared, then B/one/shared:

1. Open the cluster-qualified VM link from the group-isolated fleet list. The
   detail route contains that cluster, namespace, and name.
2. Overview shows the expected name, Stopped state, and distinguishing CPU/memory
   (A: 1 CPU/256 MiB; B: 2 CPU/512 MiB).
3. YAML displays a VirtualMachine with the exact UID recorded from that spoke at
   creation, plus name, namespace, distinguishing description, Halted strategy,
   CPU cores and guest memory. This validates the actual resource content even
   though names and namespaces collide.
4. Configuration > Details shows that spoke's description and CPU/memory. Return
   through the Fleet UI to repeat for the other spoke.

The detail case reads the existing Monaco editor model, as existing editor
helpers do. It does not save YAML, edit a VM, or count/require particular requests.

## Explicit exclusions and known limitations

- **All-clusters + selected-namespace Navigator Overview remains a coverage gap.**
  In this branch the top Project picker is disabled at All clusters (tooltip:
  “Project can be selected only at a cluster level”). A list Project filter can
  select namespaces across clusters, but Overview derives namespace from the
  route and does not consume that Project filter. The baseline therefore tests
  this combination in the list, and tests namespaced Overview on a selected
  spoke. It does not manufacture an unsupported route or claim this combination
  is verified. On the VPN machine, manually confirm the current product boundary
  and record whether all-cluster namespaced Overview is expected/supported in the
  installed build; additional automated coverage needs that scope decision.
- Group isolation intentionally limits status counts to the five seeded VMs.
  Unfiltered whole-fleet totals, namespace-only collisions within one cluster,
  every namespace/cluster combination, pagination at scale, and data churn during
  assertions are excluded. Both spokes are exercised in filters and live details;
  Overview scope transitions use A as the representative spoke.
- ACM search is eventually consistent. A healthy environment must index new VMs
  and namespaces within 120 seconds. Index delays beyond that, expired sessions,
  unavailable spokes, or missing group search fail visibly and need environment
  investigation. No delays/errors are injected or mocked.
- No inventory sharing implementation, stale-data banner, timeout fallback,
  Retry, request counting, duplicate-request assertion, or full-page error
  contract. No production change, standalone test behavior change, CI job,
  migrations, VM lifecycle, guest console, metrics/observability accuracy, or
  comprehensive detail-tab coverage.

## Run on the VPN machine

After setting the usual login variables and the two spoke names, run from repository root:

```bash
npx playwright test --config=playwright/acm.playwright.config.ts --project=ACM
```

The dedicated config inherits existing browser/report/assertion settings, selects
only this spec, uses one worker and zero retries, and selects the existing
authentication/configuration setup rules through `acm.setup.ts`. The ACM fixture
owns the spoke resource lifecycle; the existing rules own login/session files.
Do not run
this through the standalone runner or add tier tags to the spec: it is opt-in and
does not run under the existing Gating/Tier projects. For headed debugging, use
`HEADED=1` with the same command in Bash.

Existing HTML/JUnit/artifact output stays under `playwright/test-results/`. Inspect
the resource attachment and assertion diagnostics when reporting a VPN run.
Manually verify the first run's Fleet/tree/menu/editor locators, search-index
readiness, status-count displays, both live detail resources, and successful
cleanup on both spokes. Static validation cannot establish those outcomes.

Local checks that do **not** execute E2E tests or contact clusters:

```bash
npm run check-types:playwright
npx playwright test --config=playwright/acm.playwright.config.ts --project=ACM --list
npx prettier playwright/acm.playwright.config.ts playwright/project-dependencies/acm.setup.ts playwright/src/clients/acm-spoke-client.ts playwright/src/fixtures/acm-fleet-data.ts playwright/src/fixtures/acm-fleet-fixture.ts playwright/src/page-objects/vm/acm-fleet-page.ts playwright/tests/virtual-machines/list/acm-fleet-baseline.spec.ts playwright/tests/virtual-machines/list/acm-fleet-baseline.spec.md --check
```
