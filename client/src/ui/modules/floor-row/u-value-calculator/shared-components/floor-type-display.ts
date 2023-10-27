import { FloorType } from '../../../../../data-schemas/scenario/fabric/floor-u-value';

export function floorTypeDisplay(floorType: FloorType): string {
  switch (floorType) {
    case 'solid':
      return 'Solid floor (tables)';
    case 'solid (bs13370)':
      return 'Solid floor';
    case 'suspended':
      return 'Suspended floor';
    case 'exposed':
      return 'Exposed floor';
    case 'heated basement':
      return 'Heated basement floor';
    case 'custom':
      return 'Custom U-value';
  }
}
