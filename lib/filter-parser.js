/**
 * Advanced filter parser for TaskNotes CLI
 * Converts human-readable filter expressions to TaskNotes FilterQuery objects
 * 
 * Syntax examples:
 * - priority:high
 * - status:in-progress AND tags:urgent
 * - (due:before:2025-08-20 OR tags:urgent) AND priority:high
 * - title:contains:"meeting notes"
 * - timeEstimate:greater-than:60
 */

class FilterParser {
  constructor() {
    // Property aliases for user-friendly syntax
    this.propertyAliases = {
      'tag': 'tags',
      'context': 'contexts', 
      'project': 'projects',
      'created': 'file.ctime',
      'modified': 'file.mtime',
      'completed': 'completedDate',
      'estimate': 'timeEstimate'
    };

    // Operator aliases for user-friendly syntax
    this.operatorAliases = {
      'equals': 'is',
      'not-equals': 'is-not',
      'before': 'is-before',
      'after': 'is-after',
      'on-or-before': 'is-on-or-before',
      'on-or-after': 'is-on-or-after',
      'greater-than': 'is-greater-than',
      'less-than': 'is-less-than',
      'empty': 'is-empty',
      'not-empty': 'is-not-empty',
      'checked': 'is-checked',
      'not-checked': 'is-not-checked'
    };

    // Valid properties and their types
    this.validProperties = {
      'title': 'text',
      'status': 'select', 
      'priority': 'select',
      'tags': 'select',
      'contexts': 'select', 
      'projects': 'select',
      'due': 'date',
      'scheduled': 'date',
      'completedDate': 'date',
      'file.ctime': 'date',
      'file.mtime': 'date',
      'archived': 'boolean',
      'timeEstimate': 'numeric',
      'recurrence': 'special',
      'status.isCompleted': 'boolean'
    };

    this.validOperators = [
      'is', 'is-not', 'contains', 'does-not-contain',
      'is-before', 'is-after', 'is-on-or-before', 'is-on-or-after',
      'is-empty', 'is-not-empty', 'is-checked', 'is-not-checked',
      'is-greater-than', 'is-less-than'
    ];
  }

  /**
   * Parse a filter expression into a FilterQuery object
   */
  parse(expression) {
    if (!expression || !expression.trim()) {
      throw new Error('Filter expression cannot be empty');
    }

    try {
      const tokens = this.tokenize(expression);
      const ast = this.parseExpression(tokens);
      return this.astToFilterQuery(ast);
    } catch (error) {
      throw new Error(`Filter parsing error: ${error.message}`);
    }
  }

  /**
   * Tokenize the input expression
   */
  tokenize(expression) {
    const tokens = [];
    let i = 0;
    
    while (i < expression.length) {
      const char = expression[i];
      
      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      
      // Handle parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: char, value: char });
        i++;
        continue;
      }
      
      // Handle quoted strings
      if (char === '"' || char === "'") {
        const quote = char;
        let value = '';
        i++; // Skip opening quote
        
        while (i < expression.length && expression[i] !== quote) {
          if (expression[i] === '\\' && i + 1 < expression.length) {
            i++; // Skip escape character
            value += expression[i];
          } else {
            value += expression[i];
          }
          i++;
        }
        
        if (i >= expression.length) {
          throw new Error('Unterminated quoted string');
        }
        
        i++; // Skip closing quote
        tokens.push({ type: 'STRING', value });
        continue;
      }
      
      // Handle words (identifiers, operators, values)
      if (/[a-zA-Z0-9_.-]/.test(char)) {
        let value = '';
        while (i < expression.length && /[a-zA-Z0-9_.-]/.test(expression[i])) {
          value += expression[i];
          i++;
        }
        
        const upperValue = value.toUpperCase();
        if (upperValue === 'AND' || upperValue === 'OR') {
          tokens.push({ type: 'LOGICAL', value: upperValue.toLowerCase() });
        } else {
          tokens.push({ type: 'IDENTIFIER', value });
        }
        continue;
      }
      
      // Handle colons
      if (char === ':') {
        tokens.push({ type: 'COLON', value: ':' });
        i++;
        continue;
      }
      
      throw new Error(`Unexpected character: ${char}`);
    }
    
    return tokens;
  }

  /**
   * Parse expression into AST
   */
  parseExpression(tokens) {
    return this.parseOrExpression(tokens);
  }

  parseOrExpression(tokens) {
    let left = this.parseAndExpression(tokens);

    // Collect all OR conditions into a flat array
    const children = [left];

    while (tokens.length > 0 && tokens[0].type === 'LOGICAL' && tokens[0].value === 'or') {
      tokens.shift(); // consume OR
      const right = this.parseAndExpression(tokens);
      children.push(right);
    }

    // If only one condition, return it directly (no group needed)
    if (children.length === 1) {
      return children[0];
    }

    // Return a flat group with all conditions as direct children
    return { type: 'group', conjunction: 'or', children };
  }

  parseAndExpression(tokens) {
    let left = this.parsePrimaryExpression(tokens);

    // Collect all AND conditions into a flat array
    const children = [left];

    while (tokens.length > 0 && tokens[0].type === 'LOGICAL' && tokens[0].value === 'and') {
      tokens.shift(); // consume AND
      const right = this.parsePrimaryExpression(tokens);
      children.push(right);
    }

    // If only one condition, return it directly (no group needed)
    if (children.length === 1) {
      return children[0];
    }

    // Return a flat group with all conditions as direct children
    return { type: 'group', conjunction: 'and', children };
  }

  parsePrimaryExpression(tokens) {
    if (tokens.length === 0) {
      throw new Error('Unexpected end of expression');
    }
    
    const token = tokens[0];
    
    // Handle parentheses
    if (token.type === '(') {
      tokens.shift(); // consume (
      const expr = this.parseOrExpression(tokens);
      
      if (tokens.length === 0 || tokens[0].type !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      
      tokens.shift(); // consume )
      return expr;
    }
    
    // Handle condition (property:operator:value)
    if (token.type === 'IDENTIFIER') {
      return this.parseCondition(tokens);
    }
    
    throw new Error(`Unexpected token: ${token.value}`);
  }

  parseCondition(tokens) {
    if (tokens.length < 3) {
      throw new Error('Incomplete condition');
    }
    
    const property = tokens.shift().value;
    
    if (tokens[0].type !== 'COLON') {
      throw new Error('Expected colon after property');
    }
    tokens.shift(); // consume :
    
    const operatorOrValue = tokens.shift().value;
    
    // Check if there's another colon (property:operator:value format)
    if (tokens.length > 0 && tokens[0].type === 'COLON') {
      tokens.shift(); // consume :
      
      let value;
      if (tokens.length > 0) {
        const valueToken = tokens.shift();
        value = valueToken.type === 'STRING' ? valueToken.value : valueToken.value;
      } else {
        throw new Error('Expected value after operator');
      }
      
      return this.createCondition(property, operatorOrValue, value);
    } else {
      // property:value format (infer operator)
      return this.createCondition(property, null, operatorOrValue);
    }
  }

  createCondition(property, operator, value) {
    // Resolve property alias
    const resolvedProperty = this.propertyAliases[property] || property;
    
    if (!this.validProperties[resolvedProperty]) {
      throw new Error(`Unknown property: ${property}`);
    }
    
    // Infer operator if not provided
    if (!operator) {
      const propertyType = this.validProperties[resolvedProperty];
      if (propertyType === 'text') {
        operator = 'contains';
      } else if (propertyType === 'select') {
        // For array properties like tags, contexts, projects, use 'contains'
        if (['tags', 'contexts', 'projects'].includes(resolvedProperty)) {
          operator = 'contains';
        } else {
          operator = 'is';
        }
      } else if (propertyType === 'date') {
        operator = 'is';
      } else if (propertyType === 'boolean') {
        operator = value === 'true' ? 'is-checked' : 'is-not-checked';
        value = null; // Boolean operators don't need values
      } else if (propertyType === 'numeric') {
        operator = 'is';
      } else {
        operator = 'is';
      }
    }
    
    // Resolve operator alias
    const resolvedOperator = this.operatorAliases[operator] || operator;
    
    if (!this.validOperators.includes(resolvedOperator)) {
      throw new Error(`Unknown operator: ${operator}`);
    }
    
    // Convert value to appropriate type
    let convertedValue = value;
    const propertyType = this.validProperties[resolvedProperty];
    
    if (propertyType === 'numeric' && value !== null) {
      convertedValue = parseFloat(value);
      if (isNaN(convertedValue)) {
        throw new Error(`Invalid numeric value: ${value}`);
      }
    } else if (propertyType === 'boolean') {
      convertedValue = null; // Boolean operators don't use values
    }
    
    return {
      type: 'condition',
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      property: resolvedProperty,
      operator: resolvedOperator,
      value: convertedValue
    };
  }

  astToFilterQuery(ast) {
    const query = {
      type: 'group',
      id: `root_${Date.now()}`,
      conjunction: 'and',
      children: []
    };
    
    if (ast.type === 'condition') {
      query.children = [ast];
    } else if (ast.type === 'group') {
      query.conjunction = ast.conjunction;
      query.children = ast.children;
    }
    
    return query;
  }

  /**
   * Get help text for filter syntax
   */
  getHelpText() {
    return `
Filter Syntax:
  
Basic conditions:
  property:value              - Simple equality (infers operator)
  property:operator:value     - Explicit operator
  
Properties:
  title, status, priority, tags, contexts, projects
  due, scheduled, completed, created, modified
  archived, estimate, recurrence
  
Operators:
  Text: contains, does-not-contain
  Comparison: is, is-not, before, after, on-or-before, on-or-after
  Numeric: greater-than, less-than
  Existence: empty, not-empty
  Boolean: checked, not-checked
  
Logical operators:
  AND, OR
  
Grouping:
  Use parentheses: (condition1 OR condition2) AND condition3
  
Examples:
  priority:high
  status:in-progress AND tags:urgent
  (due:before:2025-08-20 OR tags:urgent) AND priority:high
  title:contains:"meeting notes"
  estimate:greater-than:60
  archived:not-checked AND status:not:done
    `.trim();
  }
}

module.exports = FilterParser;