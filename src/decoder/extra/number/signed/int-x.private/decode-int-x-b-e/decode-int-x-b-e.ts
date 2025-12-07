import { getShared64bDataView } from '../../../../../../functions.private/shared-data-view/shared-64b-data-view.js';
import { type Decoder } from '../../../../../decoder.js';

export function decodeIntXBE(decoder: Decoder, bytes: number): bigint {
  const dataView: DataView = getShared64bDataView();

  for (let i: number = bytes - 1; i >= 0; i--) {
    dataView.setInt8(i, decoder.uint8());
  }

  let value: bigint = dataView.getBigUint64(0, true);

  const shift: bigint = BigInt(bytes - 1) * 8n;
  const max: bigint = 0x80n << shift;

  if (value >= max) {
    value -= 0x100n << shift;
  }

  return value;
}
