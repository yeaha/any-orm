'use strict';

var _ = require('underscore');
var util = require('util');

var Expr = exports.Expr = function(expr) {
    if (expr instanceof Expr) {
        expr = Expr.toString();
    }

    this.expr = expr;
};

Expr.prototype.toString = function() {
    return this.expr;
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

var Adapter = exports.Adapter = function(dsn, options) {
};

Adapter.prototype.quoteIdentifier = function(identifier) {
    return identifier;
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

var Select = exports.Select = function(adapter, table) {
    this._adapter = adapter;
    this._table = table;

    this.reset();
};

Select.prototype.reset = function() {
    this._clause = {
        columns: [],
        where: [],
        group: {},
        order: [],
        limit: 0,
        offset: 0
    };

    return this;
};

Select.prototype.setColumns = function(columns) {
    if (columns !== undefined) {
        if (columns == '*') {
            this._clause.columns = [];
        } else {
            this._clause.columns = _.isArray(columns) ? columns : Array.prototype.slice.call(arguments);
        }
    }

    return this;
};

Select.prototype.where = function(where, values) {
    values = (values === undefined)
           ? []
           : (_.isArray(values) ? values : Array.prototype.slice.call(arguments, 1));

    this._clause.where.push([where, values]);

    return this;
};

Select.prototype.whereIn = function(column, relation) {
    this._whereInclude(column, relation, true);
    return this;
};

Select.prototype.whereNotIn = function(column, relation) {
    this._whereInclude(column, relation, true);
    return this;
};

Select.prototype.group = function(columns, having, values) {
    columns = _.isArray(columns) ? columns : [columns];

    values = (values === undefined)
           ? []
           : (_.isArray(values) ? values : Array.prototype.slice.call(arguments, 2));

    this._clause.group = {
        columns: columns,
        having: having,
        values: values
    };

    return this;
};

// select.order('foo')
//     => ORDER BY `foo`
//
// select.order('foo desc') // WRONG!!!
//     => ORDER BY `foo desc`
//
// select.order({column: 'bar', sort: 'desc'})
//     => ORDER BY `bar` DESC
//
// select.order('foo', {column: 'bar', sort: 'desc'})
//     => ORDER BY `foo`, `bar` DESC
//
// select.order('foo', {column: 'bar', sort: 'desc'}, new Expr('baz asc'))
//     => order by `foo`, `bar` DESC, baz asc
Select.prototype.order = function(expression) {
    var args = _.isArray(expression) ? expression : Array.prototype.slice.call(arguments);
    var adapter = this._adapter;

    this._clause.order = _.map(args, function(expression) {
        if (expression instanceof Expr) {
            return expression.toString();
        }

        if (_.isString(expression)) {
            return adapter.quoteIdentifier(expression);
        }

        if (_.isObject(expression) && expression.column) {
            var column = adapter.quoteIdentifier(expression.column);
            var sort = (expression.sort && expression.sort.toUpperCase() == 'DESC') ? 'DESC' : '';

            return sort ? (column+' '+sort) : column;
        }

        throw new Error('Invalid order by expression!');
    });

    return this;
};

Select.prototype.limit = function(count) {
    count = Math.abs(count >> 0);

    this._clause.limit = count;
    return this;
};

Select.prototype.offset = function(count) {
    count = Math.abs(count >> 0);

    this._clause.offset = count;
    return this;
};

Select.prototype.compile = function() {
    var adapter = this._adapter;
    var text = 'SELECT ';
    var values = [];

    var columns = _.map(this._clause.columns, adapter.quoteIdentifier.bind(adapter)).join(', ') || '*';
    text += columns;

    var from = this._compileFrom();
    text += ' FROM '+ from.text;
    if (from.values.length) {
        values.push.apply(values, from.values);
    }

    var where = this._compileWhere();
    if (where.text) {
        text += ' WHERE '+ where.text;

        if (where.values.length) {
            values.push.apply(values, where.values);
        }
    }

    var group = this._compileGroup();
    if (group.text) {
        text += ' '+group.text;

        if (group.values.length) {
            values.push.apply(values, group.values);
        }
    }

    if (this._clause.order.length) {
        text += ' ORDER BY '+(this._clause.order.join(', '));
    }

    if (this._clause.limit) {
        text += ' LIMIT '+this._clause.limit;
    }

    if (this._clause.offset) {
        text += ' OFFSET '+this._clause.offset;
    }

    return {
        text: text,
        values: values
    };
};

Select.prototype.setProcessor = function(processor) {
    this._processor = processor;
    return this;
};

Select.prototype.query = function() {};
Select.prototype.get = function() {};
Select.prototype.getOne = function() {};
Select.prototype.count = function() {};

Select.prototype._whereInclude = function(column, relation, include) {
    var text = [];
    var values = [];

    column = this._adapter.quoteIdentifier(column);

    if (relation instanceof Select) {
        var query = relation.compile();

        text = query.text;
        values = query.values;
    } else if (_.isArray(relation)) {
        _.each(relation, function(value) {
            text.push('?');
            values.push(value);
        });

        text = text.join(', ');
    } else {
        throw new Error('Invalid relation');
    }

    var expr = include
             ? util.format('%s IN (%s)', column, text)
             : util.format('%s NOT IN (%s)', column, text);

    this._clause.where.push([expr, values]);
    return this;
};

Select.prototype._compileFrom = function() {
    var text, values = [];
    var relation = this._table;

    if (relation instanceof Select) {
        var query = relation.compile();
        var name = this._adapter.quoteIdentifier(_.uniqueId('t_'));

        text = util.format('(%s) AS %s', query.text, name);
        values = query.values;
    } else if (relation instanceof Expr) {
        text = relation.toString();
    } else {
        text = this._adapter.quoteIdentifier(relation);
    }

    return {
        text: text,
        values: values
    };
};

Select.prototype._compileWhere = function() {
    var text = [];
    var values = [];

    _.each(this._clause.where, function(where) {
        text.push(where[0]);

        if (where[1].length) {
            values.push.apply(values, where[1]);
        }
    });

    text = text.length
          ? '('+ text.join(') AND (') +')'
         : '';

    return {
        text: text,
        values: values
    }
};

Select.prototype._compileGroup = function() {
    var adapter = this._adapter;
    var expression = this._clause.group;
    var text = '';
    var values = [];

    do {
        if (!expression.columns || !expression.columns.length) {
            break;
        }

        var columns = _.map(expression.columns, adapter.quoteIdentifier.bind(adapter)).join(', ');
        text = 'GROUP BY '+ columns;

        if (!expression.having) {
            break;
        }

        text += ' HAVING '+ expression.having;

        values = expression.values;
    } while (false);

    return {
        text: text,
        values: values
    }
};