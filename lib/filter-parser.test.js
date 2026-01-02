/**
 * Tests for FilterParser
 *
 * Issue #1: tn --filter fails with three AND conditions
 * https://github.com/callumalpass/tasknotes-cli/issues/1
 */

const FilterParser = require('./filter-parser');

describe('FilterParser', () => {
  let parser;

  beforeEach(() => {
    parser = new FilterParser();
  });

  describe('basic parsing', () => {
    it('should parse a single condition', () => {
      const result = parser.parse('status:in-progress');

      expect(result.type).toBe('group');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('condition');
      expect(result.children[0].property).toBe('status');
      expect(result.children[0].value).toBe('in-progress');
    });

    it('should parse two AND conditions', () => {
      const result = parser.parse('status:in-progress AND priority:high');

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('and');
      expect(result.children).toHaveLength(2);
      expect(result.children[0].type).toBe('condition');
      expect(result.children[1].type).toBe('condition');
    });
  });

  describe('Issue #1: three AND conditions with mixed property types', () => {
    /**
     * Issue #1 reports that combining three AND conditions fails:
     * - Two array-based properties (projects, contexts)
     * - One string-based property (status)
     *
     * The root cause is that parseAndExpression creates a nested binary tree
     * instead of a flat list of children. For example:
     *
     * A AND B AND C becomes:
     *   { children: [{ children: [A, B] }, C] }
     *
     * instead of:
     *   { children: [A, B, C] }
     *
     * This causes the backend to fail processing the nested group structure.
     */

    it('should produce flat children array for three AND conditions', () => {
      const result = parser.parse(
        "project:'Newsletter Project' AND status:in-progress AND contexts:energy-high"
      );

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('and');

      // CRITICAL: All three conditions should be direct children of the root group
      // This test will FAIL with the current implementation because it creates
      // a nested structure: { children: [{ children: [cond1, cond2] }, cond3] }
      expect(result.children).toHaveLength(3);

      // All children should be conditions, not nested groups
      result.children.forEach((child, index) => {
        expect(child.type).toBe('condition');
      });
    });

    it('should produce flat children array for three AND conditions with explicit contains operator', () => {
      const result = parser.parse(
        "projects:contains:'Newsletter Project' AND contexts:contains:energy-high AND status:in-progress"
      );

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('and');
      expect(result.children).toHaveLength(3);

      // All children should be conditions, not nested groups
      result.children.forEach((child) => {
        expect(child.type).toBe('condition');
      });
    });

    it('should produce flat children array for four AND conditions', () => {
      const result = parser.parse(
        "project:'Test' AND status:in-progress AND contexts:work AND priority:high"
      );

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('and');
      expect(result.children).toHaveLength(4);

      result.children.forEach((child) => {
        expect(child.type).toBe('condition');
      });
    });

    it('should handle the exact query from issue #1', () => {
      // This is the exact failing query from the bug report
      const result = parser.parse(
        "project:'Newsletter Project' AND status:in-progress AND contexts:energy-high"
      );

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('and');
      expect(result.children).toHaveLength(3);

      // Verify all three conditions are present and are direct children
      const properties = result.children.map(c => c.property);
      expect(properties).toContain('projects');
      expect(properties).toContain('status');
      expect(properties).toContain('contexts');

      // Verify none of the children are nested groups
      result.children.forEach((child) => {
        expect(child.type).not.toBe('group');
      });
    });
  });

  describe('OR conditions should also be flat', () => {
    it('should produce flat children array for three OR conditions', () => {
      const result = parser.parse(
        'status:done OR status:in-progress OR status:todo'
      );

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('or');
      expect(result.children).toHaveLength(3);

      result.children.forEach((child) => {
        expect(child.type).toBe('condition');
      });
    });
  });

  describe('nested groups with parentheses should remain nested', () => {
    it('should correctly handle parenthesized expressions', () => {
      // (A OR B) AND C should create a proper nested structure
      const result = parser.parse(
        '(status:done OR status:in-progress) AND priority:high'
      );

      expect(result.type).toBe('group');
      expect(result.conjunction).toBe('and');
      expect(result.children).toHaveLength(2);

      // First child should be a group (the parenthesized expression)
      expect(result.children[0].type).toBe('group');
      expect(result.children[0].conjunction).toBe('or');

      // Second child should be a condition
      expect(result.children[1].type).toBe('condition');
    });
  });
});
