import { describe, it, expect } from 'vitest';
import {
  snowflakeId,
  compactSnowflakeId,
  extractTimestamp,
  isSnowflakeId,
} from '../snowflake-id';

describe('Snowflake ID', () => {
  describe('snowflakeId', () => {
    it('should generate ID with correct format', () => {
      const id = snowflakeId();
      // Format: YYYYMMDD-HHmmss-<random>
      expect(id).toMatch(/^\d{8}-\d{6}-[a-z0-9]{6}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = snowflakeId();
      const id2 = snowflakeId();
      expect(id1).not.toBe(id2);
    });

    it('should support custom random length', () => {
      const id = snowflakeId(8);
      expect(id).toMatch(/^\d{8}-\d{6}-[a-z0-9]{8}$/);
    });

    it('should be sortable by timestamp', () => {
      const id1 = snowflakeId();
      // Wait a bit to ensure different timestamp
      const wait = () => new Promise(resolve => setTimeout(resolve, 1100));
      return wait().then(() => {
        const id2 = snowflakeId();
        expect(id1 < id2).toBe(true);
      });
    });
  });

  describe('compactSnowflakeId', () => {
    it('should generate compact ID with correct format', () => {
      const id = compactSnowflakeId();
      // Format: YYYYMMDDHHmmss<random>
      expect(id).toMatch(/^\d{14}[a-z0-9]{6}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = compactSnowflakeId();
      const id2 = compactSnowflakeId();
      expect(id1).not.toBe(id2);
    });

    it('should support custom random length', () => {
      const id = compactSnowflakeId(8);
      expect(id).toMatch(/^\d{14}[a-z0-9]{8}$/);
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from standard format', () => {
      const id = '20240215-163045-a1b2c3';
      const timestamp = extractTimestamp(id);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp?.getFullYear()).toBe(2024);
      expect(timestamp?.getMonth()).toBe(1); // 0-indexed
      expect(timestamp?.getDate()).toBe(15);
      expect(timestamp?.getHours()).toBe(16);
      expect(timestamp?.getMinutes()).toBe(30);
      expect(timestamp?.getSeconds()).toBe(45);
    });

    it('should extract timestamp from compact format', () => {
      const id = '20240215163045a1b2c3';
      const timestamp = extractTimestamp(id);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp?.getFullYear()).toBe(2024);
      expect(timestamp?.getMonth()).toBe(1);
      expect(timestamp?.getDate()).toBe(15);
    });

    it('should return null for invalid ID', () => {
      const timestamp = extractTimestamp('invalid-id');
      expect(timestamp).toBeNull();
    });

    it('should extract timestamp from generated ID', () => {
      const before = new Date();
      const id = snowflakeId();
      const after = new Date();

      const extracted = extractTimestamp(id);
      expect(extracted).toBeInstanceOf(Date);
      expect(extracted!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(extracted!.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('isSnowflakeId', () => {
    it('should validate standard format', () => {
      expect(isSnowflakeId('20240215-163045-a1b2c3')).toBe(true);
      expect(isSnowflakeId('20240215-163045-abc123')).toBe(true);
    });

    it('should validate compact format', () => {
      expect(isSnowflakeId('20240215163045a1b2c3')).toBe(true);
      expect(isSnowflakeId('20240215163045abc123')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isSnowflakeId('invalid')).toBe(false);
      expect(isSnowflakeId('2024-02-15')).toBe(false);
      expect(isSnowflakeId('20240215-163045')).toBe(false);
      expect(isSnowflakeId('')).toBe(false);
    });

    it('should validate generated IDs', () => {
      const id1 = snowflakeId();
      const id2 = compactSnowflakeId();
      expect(isSnowflakeId(id1)).toBe(true);
      expect(isSnowflakeId(id2)).toBe(true);
    });
  });

  describe('Real-world usage', () => {
    it('should create sortable IDs across multiple generations', () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(snowflakeId());
      }

      const sorted = [...ids].sort();
      expect(sorted).toEqual(ids);
    });

    it('should maintain sorting even with random suffix', () => {
      const id1 = snowflakeId();
      const wait = () => new Promise(resolve => setTimeout(resolve, 1100));

      return wait().then(() => {
        const id2 = snowflakeId();
        const id3 = snowflakeId();

        const ids = [id3, id1, id2];
        const sorted = [...ids].sort();

        expect(sorted[0]).toBe(id1);
        expect(sorted[1]).toBe(id2);
        expect(sorted[2]).toBe(id3);
      });
    });
  });
});
