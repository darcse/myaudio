import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { HeadfiAccessory, HeadfiAccessoryLinkedGear, HeadfiFormData, SelectedHeadfi } from '../types';

export type HeadfiFormProps = {
  selectedItem: SelectedHeadfi;
  formData: HeadfiFormData;
  setFormData: Dispatch<SetStateAction<HeadfiFormData>>;
  comboOptions: { id: string; label: string }[];
  wirelessMatchingList: { id: number; brand: string; model: string }[];
  accessories?: HeadfiAccessory[];
  linkedGear?: HeadfiAccessoryLinkedGear[];
  accessoryCacheReady?: boolean;
  onClose: () => void;
  onSave: () => Promise<number | null | void>;
  onSaved?: () => void;
  onAccessoriesMutated?: () => void;
  onAccessoryLinksCommitted?: (headfiId: number, accessoryIds: string[]) => void;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onFrGraphFileChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
};

export type HeadfiFormSectionProps = Pick<HeadfiFormProps, 'formData' | 'setFormData'>;
