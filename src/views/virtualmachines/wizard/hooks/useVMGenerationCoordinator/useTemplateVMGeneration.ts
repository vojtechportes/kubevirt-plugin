import { useCallback, useEffect, useRef } from 'react';
import isEqual from 'lodash/isEqual';

import { DEFAULT_NAMESPACE } from '@kubevirt-utils/constants/constants';
import { logTemplateFlowEvent } from '@kubevirt-utils/extensions/telemetry/telemetry';
import {
  CUSTOMIZE_VM_BUTTON_CLICKED,
  CUSTOMIZE_VM_FAILED,
} from '@kubevirt-utils/extensions/telemetry/utils/constants';
import { logVMCreationFailedFromTemplate } from '@kubevirt-utils/extensions/telemetry/vm-creation';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import useKubevirtUserSettings from '@kubevirt-utils/hooks/useKubevirtUserSettings/useKubevirtUserSettings';
import { USER_SETTINGS_KEYS } from '@kubevirt-utils/hooks/useKubevirtUserSettings/utils/const';
import { getResourceKey } from '@kubevirt-utils/resources/shared';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import { useVMWizardState } from '@virtualmachines/wizard/state/useVMWizardState';
import { getFirstUnfulfilledRequiredParameter } from '@virtualmachines/wizard/steps/TemplateStep/components/TemplatesCatalogDrawer/utils/utils';
import {
  getVMObjectFromTemplate,
  resolveVMFromTemplate,
} from '@virtualmachines/wizard/steps/TemplateStep/hooks/utils';

import { type GeneratedVMDraft, type GenerationScope, type TemplateVMGeneration } from './types';
import useTemplateRequest from './useTemplateRequest';
import { getTemplateGenerationSource } from './utils/getTemplateGenerationSource';

type UseTemplateVMGenerationArgs = GeneratedVMDraft & GenerationScope;

const useTemplateVMGeneration = ({
  cluster,
  creationMethod,
  isCurrentGeneratedDraft,
  project,
  publishGeneratedVM,
}: UseTemplateVMGenerationArgs): TemplateVMGeneration => {
  const { t } = useKubevirtTranslation();
  const { setIsTemplateDrawerOpen: setDrawerOpen, setTemplateProcessError: setProcessError } =
    useVMWizardState();
  const { getValues, setValue } = useVMWizardForm();
  const [authorizedSSHKeys] = useKubevirtUserSettings(USER_SETTINGS_KEYS.ssh, cluster);
  const authorizedSSHKeysRef = useRef(authorizedSSHKeys);
  const { isTemplateGenerating, runTemplateRequest } = useTemplateRequest({
    cluster,
    creationMethod,
    project,
  });

  useEffect(() => {
    authorizedSSHKeysRef.current = authorizedSSHKeys;
  }, [authorizedSSHKeys]);

  const failTemplateGeneration = useCallback(
    (message: string): false => {
      setProcessError(message);
      setDrawerOpen(true);

      return false;
    },
    [setDrawerOpen, setProcessError],
  );

  const ensureTemplateDraft = useCallback((): Promise<boolean> => {
    const values = getValues();
    const namespace = values.deployment.project || DEFAULT_NAMESPACE;
    const source = getTemplateGenerationSource(values, authorizedSSHKeys?.[namespace]);
    if (!source || !values.template.selectedTemplate) return Promise.resolve(false);

    setProcessError(null);
    const templateSource = {
      generationRevision: values.template.generationRevision,
      templateKey: getResourceKey(values.template.selectedTemplate),
    };
    if (isCurrentGeneratedDraft(templateSource)) return Promise.resolve(true);

    const processingTemplate = values.template.selectedTemplate;

    const missingParameter = getFirstUnfulfilledRequiredParameter(processingTemplate);

    if (missingParameter) {
      return Promise.resolve(
        failTemplateGeneration(
          t('{{name}} must be filled in to continue.', { name: missingParameter.name }),
        ),
      );
    }

    return runTemplateRequest(source, async (isCurrentRequest): Promise<boolean> => {
      setProcessError(null);
      logTemplateFlowEvent(CUSTOMIZE_VM_BUTTON_CLICKED, values.template.selectedTemplate);

      const isSourceCurrent = (): boolean => {
        const currentValues = getValues();
        const currentNamespace = currentValues.deployment.project || DEFAULT_NAMESPACE;
        return (
          isCurrentRequest() &&
          isEqual(
            getTemplateGenerationSource(
              currentValues,
              authorizedSSHKeysRef.current?.[currentNamespace],
            ),
            source,
          )
        );
      };

      try {
        const { additionalObjects, vm } = await resolveVMFromTemplate(
          processingTemplate,
          namespace,
          values.deployment.cluster,
          values.deployment.name,
        );

        const generatedVM = getVMObjectFromTemplate({
          description: values.deployment.description,
          folder: values.deployment.folder,
          namespace,
          selectedTemplate: values.template.selectedTemplate,
          sshSecretName: authorizedSSHKeys?.[namespace],
          vm,
        });

        if (!isSourceCurrent()) return false;

        publishGeneratedVM(generatedVM, templateSource);
        setValue('customization.templateAdditionalObjects', additionalObjects);

        return true;
      } catch (error) {
        if (!isSourceCurrent()) return false;

        logTemplateFlowEvent(CUSTOMIZE_VM_FAILED, values.template.selectedTemplate);
        logVMCreationFailedFromTemplate(values.template.selectedTemplate, error);
        return failTemplateGeneration((error as Error)?.message ?? String(error));
      }
    });
  }, [
    authorizedSSHKeys,
    failTemplateGeneration,
    getValues,
    isCurrentGeneratedDraft,
    publishGeneratedVM,
    runTemplateRequest,
    setProcessError,
    setValue,
    t,
  ]);

  return { ensureTemplateDraft, isTemplateGenerating };
};

export default useTemplateVMGeneration;
