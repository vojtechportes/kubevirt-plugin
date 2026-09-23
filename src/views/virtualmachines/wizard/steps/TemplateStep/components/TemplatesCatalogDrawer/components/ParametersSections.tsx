import { type FC, useEffect, useMemo, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { yupResolver } from '@hookform/resolvers/yup';
import { type TemplateParameter } from '@kubevirt-ui-ext/kubevirt-api/console';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import { getParameters, replaceTemplateParameters } from '@kubevirt-utils/resources/template';
import { Button, ButtonVariant, Form, Stack, StackItem } from '@patternfly/react-core';
import {
  createParameterValueSchema,
  createTemplateParametersSchema,
} from '@virtualmachines/wizard/form/schema/template/createTemplateSchema';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import { NAME_INPUT_FIELD } from '@virtualmachines/wizard/steps/TemplateStep/components/TemplatesCatalog/utils/consts';
import { useDrawerContext } from '@virtualmachines/wizard/steps/TemplateStep/components/TemplatesCatalogDrawer/hooks/useDrawerContext';

import FieldGroup from './FieldGroup';

type ParameterDraftValues = { parameters: TemplateParameter[] };

type ParametersSectionProps = {
  onCommit: () => void;
  showValidation?: boolean;
};

const ParametersSections: FC<ParametersSectionProps> = ({ onCommit, showValidation = false }) => {
  const { t } = useKubevirtTranslation();
  const { setTemplate, template: drawerTemplate } = useDrawerContext();
  const { getValues: getTargetValues, setValue: setTargetValue } = useVMWizardForm();

  const draftParameters = useMemo(() => getParameters(drawerTemplate) ?? [], [drawerTemplate]);

  const schema = useMemo(
    () =>
      yup.object({
        parameters: createTemplateParametersSchema(t),
      }),
    [t],
  );

  const { handleSubmit } = useForm<ParameterDraftValues>({
    resolver: yupResolver(schema) as Resolver<ParameterDraftValues>,
    values: { parameters: draftParameters },
  });
  const parameters = draftParameters;
  const [lastValueInvalid, setLastValueInvalid] = useState(false);
  const [isEdit, setIsEdit] = useState<boolean>(showValidation);
  const startEditing = (): void => setIsEdit(true);

  useEffect(() => {
    if (showValidation) {
      setIsEdit(true);
    }
  }, [showValidation]);

  const commitDraft = handleSubmit(({ parameters: submittedParameters }) => {
    const committedTemplate = replaceTemplateParameters(drawerTemplate, submittedParameters);

    setTemplate(committedTemplate);
    setTargetValue(
      'template.generationRevision',
      getTargetValues('template.generationRevision') + 1,
    );
    setTargetValue('template.selectedTemplate', committedTemplate, {
      shouldValidate: true,
    });
    onCommit();
    setIsEdit(false);
  });

  return (
    <Form className="pf-v6-u-mt-lg">
      <Stack hasGutter>
        <StackItem>
          {parameters.map((parameter, index) => {
            if (!parameter.required || parameter.name === NAME_INPUT_FIELD) return null;

            return (
              <FieldGroup
                field={parameter}
                isDisabled={!isEdit}
                key={parameter.name}
                onChange={(_name, value) => {
                  setLastValueInvalid(!createParameterValueSchema(t).isValidSync(value ?? ''));
                  setTemplate(
                    replaceTemplateParameters(
                      drawerTemplate,
                      parameters.map((currentParameter, parameterIndex) =>
                        parameterIndex === index
                          ? { ...currentParameter, value }
                          : currentParameter,
                      ),
                    ),
                  );
                }}
                showError={showValidation || lastValueInvalid}
              />
            );
          })}
        </StackItem>
        <StackItem isFilled />
        <StackItem>
          <Button
            data-test="edit-parameters-button"
            isDisabled={showValidation || lastValueInvalid}
            onClick={isEdit ? commitDraft : startEditing}
            size="sm"
            variant={ButtonVariant.primary}
          >
            {isEdit ? t('Done') : t('Edit parameters')}
          </Button>
        </StackItem>
      </Stack>
    </Form>
  );
};

export default ParametersSections;
