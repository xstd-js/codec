import { describe, expect, it } from 'vitest';
import { get_float_16 } from './get_float_16.js';

describe('get_float_16', () => {
  it('should return 0 for a float16 representation of +0', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x0000, false);
    expect(get_float_16(view, 0)).toBe(0);
  });

  it('should return -0 for a float16 representation of -0', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x8000, false);
    expect(get_float_16(view, 0)).toBe(-0);
  });

  it('should return 1 for a float16 representation of 1', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x3c00, false);
    expect(get_float_16(view, 0)).toBe(1);
  });

  it('should return -1 for a float16 representation of -1', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0xbc00, false);
    expect(get_float_16(view, 0)).toBe(-1);
  });

  it('should return Infinity for a float16 representation of positive infinity', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x7c00, false);
    expect(get_float_16(view, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('should return -Infinity for a float16 representation of negative infinity', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0xfc00, false);
    expect(get_float_16(view, 0)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('should return NaN for a float16 representation of NaN', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x7e00, false);
    expect(Number.isNaN(get_float_16(view, 0))).toBe(true);
  });

  it('should return a normalized value for a positive float16', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x3c01, false);
    expect(get_float_16(view, 0)).toBeCloseTo(1.0009765625); // 1 + 1/1024
  });

  it('should return a denormalized value for a positive float16', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x0400, false);
    expect(get_float_16(view, 0)).toBeCloseTo(6.103515625e-5); // (1/1024) * 2^-14
  });

  it('should handle little-endian format correctly', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x3c00, true); // Set little-endian value for 1
    expect(get_float_16(view, 0, true)).toBe(1);
  });

  it('should support minimum positive floating point number closest to zero', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x0001, false);
    expect(get_float_16(view, 0)).toBeCloseTo(5.960464477539063e-8);
  });

  it('should support minimum negative floating point number closest to zero', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint16(0, 0x8001, false);
    expect(get_float_16(view, 0)).toBeCloseTo(-5.960464477539063e-8);
  });
});
