const BUFFER = /*#__PURE__*/ new ArrayBuffer(8); // 64bits
const DATA_VIEW = /*#__PURE__*/ new DataView(BUFFER);
const UINT8_VIEW = /*#__PURE__*/ new Uint8Array(BUFFER);

export function getShared64bDataView(): DataView {
  UINT8_VIEW.fill(0);
  return DATA_VIEW;
}
