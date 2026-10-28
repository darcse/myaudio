import type { HeadfiAccessory, HeadfiAccessoryLinkedGear } from './types';
import { headfiAccessoryOutOfCollectionLabel } from './headfiStatus';

export function accessoryIdsLinkedToGear(
  linkedGear: HeadfiAccessoryLinkedGear[],
  headfiId: number,
): string[] {
  return linkedGear.filter((row) => row.headfi_id === headfiId).map((row) => row.accessory_id);
}

export function applyGearAccessoryLinks(
  prev: HeadfiAccessoryLinkedGear[],
  headfiId: number,
  accessoryIds: string[],
  gear: { brand: string; model: string; status2: string | null },
): HeadfiAccessoryLinkedGear[] {
  const kept = prev.filter((row) => row.headfi_id !== headfiId);
  const uniqueIds = [...new Set(accessoryIds.map((id) => id.trim()).filter(Boolean))];
  const added = uniqueIds.map((accessory_id) => ({
    accessory_id,
    headfi_id: headfiId,
    brand: gear.brand,
    model: gear.model,
    status2: gear.status2,
  }));
  return [...kept, ...added];
}

export function displayLinkedAccessoriesForGear(
  headfiId: number,
  accessories: HeadfiAccessory[],
  linkedGear: HeadfiAccessoryLinkedGear[],
): { id: string; name: string; price: number | null; statusLabel: string | null }[] {
  const accessoryById = new Map(accessories.map((item) => [item.id, item]));
  return accessoryIdsLinkedToGear(linkedGear, headfiId)
    .map((id) => accessoryById.get(id))
    .filter((item): item is HeadfiAccessory => Boolean(item))
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      statusLabel: headfiAccessoryOutOfCollectionLabel(item.status),
    }));
}
