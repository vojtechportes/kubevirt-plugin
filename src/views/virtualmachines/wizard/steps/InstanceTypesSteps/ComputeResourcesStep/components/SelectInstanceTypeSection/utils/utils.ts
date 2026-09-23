import { type InstanceTypesMenuItemsData } from '@kubevirt-utils/components/AddBootableVolumeModal/components/VolumeMetadata/components/InstanceTypeDrilldownSelect/utils/types';
import { type InstanceTypeSelection } from '@virtualmachines/wizard/form/types';

import { TabKey } from './constants';

export { categoryDetailsMap } from './categoryDetails';

export const getActiveTabKey = (
  compute: InstanceTypeSelection | null,
  menuItems: InstanceTypesMenuItemsData,
): TabKey =>
  compute && (compute.type === 'user' || menuItems.userProvided.items.includes(compute.name))
    ? TabKey.Users
    : TabKey.RedHat;
