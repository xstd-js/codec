import { getShared64bDataView } from '../../../../../../functions.private/shared-data-view/shared-64b-data-view.js';
import { type Decoder } from '../../../../../decoder.js';

export function decodeUintXLE(decoder: Decoder, bytes: number): bigint {
  const dataView: DataView = getShared64bDataView();

  for (let i: number = 0; i < bytes; i++) {
    dataView.setUint8(i, decoder.uint8());
  }

  return dataView.getBigUint64(0, true);
}
