import { type FC } from 'react';
import { Controller } from 'react-hook-form';

import { type InstanceTypeSize } from '@kubevirt-utils/components/AddBootableVolumeModal/components/VolumeMetadata/components/InstanceTypeDrilldownSelect/utils/types';
import { logITFlowEvent } from '@kubevirt-utils/extensions/telemetry/telemetry';
import { INSTANCETYPE_SELECTED } from '@kubevirt-utils/extensions/telemetry/utils/constants';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import InstanceTypeSizeDropdown from '@virtualmachines/wizard/steps/InstanceTypesSteps/ComputeResourcesStep/components/SelectInstanceTypeSection/components/RedHatProvidedInstanceTypesSection/components/InstanceTypeSizeMenu/InstanceTypeSizeDropdown/InstanceTypeSizeDropdown';

type InstanceTypeSizeMenuProps = {
  instanceTypeSizes: InstanceTypeSize[];
};

const InstanceTypeSizeMenu: FC<InstanceTypeSizeMenuProps> = ({ instanceTypeSizes }) => {
  const { control } = useVMWizardForm();

  if (!instanceTypeSizes) return null;

  return (
    <div className="instance-type-series-menu-card__size-dropdown">
      <Controller
        control={control}
        name="instanceType.compute"
        render={({ field: { onChange, ref: _ref, value } }) => {
          const selectedSeries = value?.type === 'redhat' ? value.series : '';
          const selectedSize = value?.type === 'redhat' ? value.size : '';

          return (
            <InstanceTypeSizeDropdown
              onSizeSelect={(size: string) => {
                if (size === selectedSize) return;

                onChange({
                  name: selectedSeries ? `${selectedSeries}.${size}` : size,
                  series: selectedSeries,
                  size,
                  type: 'redhat',
                });
                logITFlowEvent(INSTANCETYPE_SELECTED, null, {
                  selectedInstanceType: selectedSeries ? `${selectedSeries}.${size}` : size,
                });
              }}
              selectedSize={selectedSize}
              seriesName={selectedSeries}
              sizes={instanceTypeSizes}
            />
          );
        }}
      />
    </div>
  );
};

export default InstanceTypeSizeMenu;
