import { getShared64bDataView } from '../../../../../../functions.private/shared-data-view/shared-64b-data-view.js';
import { type Encoder } from '../../../../../encoder.js';

export function encodeIntXBE(encoder: Encoder, input: bigint | number, bytes: number): void {
  const dataView: DataView = getShared64bDataView();

  dataView.setBigUint64(0, BigInt(input), true);

  for (let i: number = bytes - 1; i >= 0; i--) {
    encoder.uint8(dataView.getUint8(i));
  }
}
