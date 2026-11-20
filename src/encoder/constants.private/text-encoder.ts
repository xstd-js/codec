/**
 * Shared `TextEncoder` instance: `encode` is stateless, so a single one is enough.
 */
export const TEXT_ENCODER: TextEncoder = /*#__PURE__*/ new TextEncoder();
