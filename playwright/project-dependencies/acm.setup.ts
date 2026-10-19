import { EnvVariables } from '@/utils/env-variables';
import { getStorageStatePath } from '@/utils/storage-state';
import type { FullConfig } from '@playwright/test';

import globalSetup from './global.setup';
import { RuleEngine } from './rule-engine';
import { getFilesTeardownRules } from './rule-engine/teardown-rules-files';

/** Select existing lifecycle rules; ACM owns its spoke resources in its fixture. */
export default async function acmSetup(config: FullConfig) {
  for (const name of ['ON_ACM', 'WEB_CONSOLE_URL', 'ACM_SPOKE_A', 'ACM_SPOKE_B']) {
    if (!process.env[name]?.trim()) {
      throw new Error(
        `ACM baseline prerequisite missing: set ${name}. See acm-fleet-baseline.spec.md.`,
      );
    }
  }
  if (
    !EnvVariables.isSkipBrowserLogin &&
    !process.env.OPENSHIFT_PASSWORD &&
    !process.env.BRIDGE_KUBEADMIN_PASSWORD
  ) {
    throw new Error(
      'ACM baseline requires the usual OPENSHIFT_PASSWORD (or BRIDGE_KUBEADMIN_PASSWORD) for console login.',
    );
  }
  if (EnvVariables.isNonPrivUser) {
    throw new Error(
      'ACM baseline requires an existing administrator account; unset NON_PRIV. It does not provision users or RBAC.',
    );
  }
  const setupRuleIds = [
    'wait-for-console-ready',
    'browser-login',
    'init-api-client',
    'save-config',
    'save-storage-state',
  ];
  await globalSetup(config, setupRuleIds);
  if (!getStorageStatePath()) {
    throw new Error(
      'ACM baseline needs the standard authenticated storage state; global setup did not produce it.',
    );
  }
  // Reuse only the cleanup for files written by the shared setup, never hub resources.
  return async () => {
    const rules = getFilesTeardownRules().filter((rule) =>
      ['cleanup-storage-state', 'cleanup-test-config'].includes(rule.id),
    );
    await new RuleEngine().runTeardown(rules, {
      testNamespace: EnvVariables.testNamespace,
      useSharding: EnvVariables.isSharded,
      shardIndex: EnvVariables.shardIndex,
      shouldCleanupClusterResources: false,
    });
  };
}
