import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { HeadfiFormData, SelectedHeadfi } from '../types';

export type HeadfiFormProps = {
  selectedItem: SelectedHeadfi;
  formData: HeadfiFormData;
  setFormData: Dispatch<SetStateAction<HeadfiFormData>>;
  dacAmpList: { id: number; brand: string; model: string }[];
  wirelessMatchingList: { id: number; brand: string; model: string }[];
  onClose: () => void;
  onSave: () => void;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onFrGraphFileChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
};

export type HeadfiFormSectionProps = Pick<HeadfiFormProps, 'formData' | 'setFormData'>;
