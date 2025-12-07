import { getShared64bDataView } from '../../../../../../functions.private/shared-data-view/shared-64b-data-view.js';
import { type Decoder } from '../../../../../decoder.js';

export function decodeUintXBE(decoder: Decoder, bytes: number): bigint {
  const dataView: DataView = getShared64bDataView();

  for (let i: number = bytes - 1; i >= 0; i--) {
    dataView.setUint8(i, decoder.uint8());
  }

  return dataView.getBigUint64(0, true);
}
