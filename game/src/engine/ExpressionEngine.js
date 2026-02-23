/**
 * ExpressionEngine.js — SoonFx-inspired Formula-as-Data Evaluator
 *
 * Evaluates JSON expression trees against a context object.
 * Used by HaggleManager and MarketSimulator to resolve balance formulas
 * without hardcoding numeric logic.
 *
 * SUPPORTED EXPRESSION FORMATS:
 *
 *   Literal:    42, 0.5, "hello"
 *   Reference:  { ref: "tactic.baseSuccess" }           → ctx.tactic.baseSuccess
 *   Binary:     { op: "+", args: [expr, expr] }         → sum of args
 *   N-ary:      { op: "+", args: [expr, expr, ...] }    → sum of all args
 *   Unary:      { op: "neg", value: expr }               → -value
 *   Cond:       { op: "if", cond: expr, then: expr, else: expr }
 *   Compare:    { op: ">", args: [expr, expr] }          → truthy (1/0)
 *   Clamp:      { op: "clamp", min: expr, max: expr, value: expr }
 *   MinMax:     { op: "min", args: [expr, ...] }
 *   Random:     { op: "rand" }                            → Math.random()
 *   RandRange:  { op: "rand", min: expr, max: expr }     → min + rand * (max - min)
 *   Round:      { op: "round", value: expr }
 *   Floor:      { op: "floor", value: expr }
 *   Abs:        { op: "abs", value: expr }
 *   Lerp:       { op: "lerp", a: expr, b: expr, t: expr } → a + (b - a) * t
 *
 * CONTEXT:
 *   Plain object with dot-path resolution: { tactic: { baseSuccess: 0.6 } }
 *   Accessed via { ref: "tactic.baseSuccess" } → 0.6
 *
 * SAFETY:
 *   No eval(), no Function(), no prototype access. Pure math + conditionals.
 *   Max recursion depth of 50 prevents infinite loops from malformed data.
 */

const MAX_DEPTH = 50;

/**
 * Resolve a dot-path reference in a context object.
 * e.g. resolve(ctx, "tactic.baseSuccess") → ctx.tactic.baseSuccess
 */
function resolve(ctx, path) {
    if (!path || !ctx) return 0;
    const parts = path.split('.');
    let val = ctx;
    for (const p of parts) {
        if (val == null || typeof val !== 'object') return 0;
        val = val[p];
    }
    return val ?? 0;
}

/**
 * Evaluate an expression tree against a context.
 * @param {*} expr — expression node (literal, ref, or op)
 * @param {Object} ctx — variable context
 * @param {number} depth — recursion guard
 * @returns {number|string|boolean}
 */
function evaluate(expr, ctx, depth = 0) {
    if (depth > MAX_DEPTH) {
        console.warn('[ExpressionEngine] Max depth exceeded');
        return 0;
    }

    // Literal number, string, boolean, null
    if (expr === null || expr === undefined) return 0;
    if (typeof expr === 'number') return expr;
    if (typeof expr === 'string') return expr;
    if (typeof expr === 'boolean') return expr ? 1 : 0;

    // Not an object → treat as 0
    if (typeof expr !== 'object') return 0;

    // Reference: { ref: "path.to.value" }
    if ('ref' in expr) {
        const val = resolve(ctx, expr.ref);
        return typeof val === 'boolean' ? (val ? 1 : 0) : (val ?? 0);
    }

    const op = expr.op;
    if (!op) {
        // Object without op — might be a literal wrapper
        if ('value' in expr) return evaluate(expr.value, ctx, depth + 1);
        return 0;
    }

    const d = depth + 1;

    // ── Arithmetic (n-ary) ──
    if (op === '+') {
        return (expr.args || []).reduce((sum, a) => sum + evaluate(a, ctx, d), 0);
    }
    if (op === '-') {
        const args = expr.args || [];
        if (args.length === 0) return 0;
        if (args.length === 1) return -evaluate(args[0], ctx, d);
        return args.slice(1).reduce((acc, a) => acc - evaluate(a, ctx, d), evaluate(args[0], ctx, d));
    }
    if (op === '*') {
        return (expr.args || []).reduce((prod, a) => prod * evaluate(a, ctx, d), 1);
    }
    if (op === '/') {
        const args = expr.args || [];
        if (args.length < 2) return 0;
        const divisor = evaluate(args[1], ctx, d);
        return divisor === 0 ? 0 : evaluate(args[0], ctx, d) / divisor;
    }
    if (op === '%') {
        const args = expr.args || [];
        if (args.length < 2) return 0;
        const divisor = evaluate(args[1], ctx, d);
        return divisor === 0 ? 0 : evaluate(args[0], ctx, d) % divisor;
    }

    // ── Unary ──
    if (op === 'neg') return -evaluate(expr.value, ctx, d);
    if (op === 'abs') return Math.abs(evaluate(expr.value, ctx, d));
    if (op === 'round') return Math.round(evaluate(expr.value, ctx, d));
    if (op === 'floor') return Math.floor(evaluate(expr.value, ctx, d));
    if (op === 'ceil') return Math.ceil(evaluate(expr.value, ctx, d));
    if (op === 'sqrt') return Math.sqrt(Math.max(0, evaluate(expr.value, ctx, d)));

    // ── Min / Max (n-ary) ──
    if (op === 'min') {
        const vals = (expr.args || []).map(a => evaluate(a, ctx, d));
        return vals.length > 0 ? Math.min(...vals) : 0;
    }
    if (op === 'max') {
        const vals = (expr.args || []).map(a => evaluate(a, ctx, d));
        return vals.length > 0 ? Math.max(...vals) : 0;
    }

    // ── Clamp ──
    if (op === 'clamp') {
        const val = evaluate(expr.value, ctx, d);
        const lo = evaluate(expr.min, ctx, d);
        const hi = evaluate(expr.max, ctx, d);
        return Math.max(lo, Math.min(hi, val));
    }

    // ── Comparisons → return 1 or 0 (truthy for if chains) ──
    if (op === '>' || op === 'gt') {
        return evaluate(expr.args[0], ctx, d) > evaluate(expr.args[1], ctx, d) ? 1 : 0;
    }
    if (op === '<' || op === 'lt') {
        return evaluate(expr.args[0], ctx, d) < evaluate(expr.args[1], ctx, d) ? 1 : 0;
    }
    if (op === '>=' || op === 'gte') {
        return evaluate(expr.args[0], ctx, d) >= evaluate(expr.args[1], ctx, d) ? 1 : 0;
    }
    if (op === '<=' || op === 'lte') {
        return evaluate(expr.args[0], ctx, d) <= evaluate(expr.args[1], ctx, d) ? 1 : 0;
    }
    if (op === '==' || op === 'eq') {
        return evaluate(expr.args[0], ctx, d) === evaluate(expr.args[1], ctx, d) ? 1 : 0;
    }
    if (op === '!=' || op === 'neq') {
        return evaluate(expr.args[0], ctx, d) !== evaluate(expr.args[1], ctx, d) ? 1 : 0;
    }

    // ── Logical ──
    if (op === 'and') {
        return (expr.args || []).every(a => evaluate(a, ctx, d)) ? 1 : 0;
    }
    if (op === 'or') {
        return (expr.args || []).some(a => evaluate(a, ctx, d)) ? 1 : 0;
    }
    if (op === 'not') {
        return evaluate(expr.value, ctx, d) ? 0 : 1;
    }

    // ── Conditional ──
    if (op === 'if') {
        const cond = evaluate(expr.cond, ctx, d);
        return cond ? evaluate(expr.then, ctx, d) : evaluate(expr.else ?? 0, ctx, d);
    }

    // ── Random ──
    if (op === 'rand') {
        if ('min' in expr && 'max' in expr) {
            const lo = evaluate(expr.min, ctx, d);
            const hi = evaluate(expr.max, ctx, d);
            return lo + Math.random() * (hi - lo);
        }
        return Math.random();
    }

    // ── Lerp: a + (b - a) * t ──
    if (op === 'lerp') {
        const a = evaluate(expr.a, ctx, d);
        const b = evaluate(expr.b, ctx, d);
        const t = evaluate(expr.t, ctx, d);
        return a + (b - a) * t;
    }

    // ── Power ──
    if (op === 'pow') {
        const args = expr.args || [];
        return Math.pow(evaluate(args[0], ctx, d), evaluate(args[1] ?? 2, ctx, d));
    }

    console.warn(`[ExpressionEngine] Unknown op: ${op}`);
    return 0;
}

/**
 * Batch-evaluate multiple named formulas against the same context.
 * @param {Object} formulas — { name: expression, ... }
 * @param {Object} ctx — variable context
 * @returns {Object} — { name: result, ... }
 */
function evaluateAll(formulas, ctx) {
    const results = {};
    for (const [name, expr] of Object.entries(formulas)) {
        results[name] = evaluate(expr, ctx);
    }
    return results;
}

/**
 * Validate an expression tree (check for malformed nodes).
 * Returns array of warning strings, empty = valid.
 */
function validate(expr, path = 'root', depth = 0) {
    const warnings = [];
    if (depth > MAX_DEPTH) {
        warnings.push(`${path}: exceeds max depth`);
        return warnings;
    }
    if (expr === null || expr === undefined || typeof expr === 'number' ||
        typeof expr === 'string' || typeof expr === 'boolean') {
        return warnings; // Literals are always valid
    }
    if (typeof expr !== 'object') {
        warnings.push(`${path}: unexpected type ${typeof expr}`);
        return warnings;
    }
    if ('ref' in expr) {
        if (typeof expr.ref !== 'string') {
            warnings.push(`${path}.ref: must be a string`);
        }
        return warnings;
    }
    if (!expr.op) {
        if ('value' in expr) return validate(expr.value, `${path}.value`, depth + 1);
        warnings.push(`${path}: object has no 'op' or 'ref'`);
        return warnings;
    }
    // Validate args for ops that need them
    const opsNeedingArgs = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '!=', 'gt', 'lt', 'gte', 'lte', 'eq', 'neq', 'and', 'or', 'min', 'max', 'pow'];
    if (opsNeedingArgs.includes(expr.op) && !Array.isArray(expr.args)) {
        warnings.push(`${path}: op '${expr.op}' requires 'args' array`);
    }
    if (expr.op === 'if' && !('cond' in expr)) {
        warnings.push(`${path}: op 'if' requires 'cond'`);
    }
    if (expr.op === 'clamp' && !('value' in expr)) {
        warnings.push(`${path}: op 'clamp' requires 'value', 'min', 'max'`);
    }
    // Recurse into children
    if (Array.isArray(expr.args)) {
        expr.args.forEach((a, i) => {
            warnings.push(...validate(a, `${path}.args[${i}]`, depth + 1));
        });
    }
    for (const key of ['value', 'cond', 'then', 'else', 'min', 'max', 'a', 'b', 't']) {
        if (key in expr && typeof expr[key] === 'object' && expr[key] !== null) {
            warnings.push(...validate(expr[key], `${path}.${key}`, depth + 1));
        }
    }
    return warnings;
}

/**
 * Pretty-print an expression as a human-readable string.
 * Used for CMS display and debugging.
 */
function stringify(expr) {
    if (expr === null || expr === undefined) return '0';
    if (typeof expr === 'number') return String(expr);
    if (typeof expr === 'string') return `"${expr}"`;
    if (typeof expr === 'boolean') return expr ? 'true' : 'false';
    if (typeof expr !== 'object') return '?';

    if ('ref' in expr) return `$${expr.ref}`;

    const op = expr.op;
    if (!op) return 'value' in expr ? stringify(expr.value) : '?';

    // Binary/n-ary infix
    const infixOps = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '!='];
    if (infixOps.includes(op) && expr.args) {
        return `(${expr.args.map(a => stringify(a)).join(` ${op} `)})`;
    }

    if (op === 'if') return `(${stringify(expr.cond)} ? ${stringify(expr.then)} : ${stringify(expr.else ?? 0)})`;
    if (op === 'clamp') return `clamp(${stringify(expr.value)}, ${stringify(expr.min)}, ${stringify(expr.max)})`;
    if (op === 'min') return `min(${(expr.args || []).map(stringify).join(', ')})`;
    if (op === 'max') return `max(${(expr.args || []).map(stringify).join(', ')})`;
    if (op === 'round') return `round(${stringify(expr.value)})`;
    if (op === 'abs') return `abs(${stringify(expr.value)})`;
    if (op === 'neg') return `-(${stringify(expr.value)})`;
    if (op === 'lerp') return `lerp(${stringify(expr.a)}, ${stringify(expr.b)}, ${stringify(expr.t)})`;
    if (op === 'rand') return 'min' in expr ? `rand(${stringify(expr.min)}, ${stringify(expr.max)})` : 'rand()';
    if (op === 'pow') return `pow(${(expr.args || []).map(stringify).join(', ')})`;
    if (op === 'and') return `(${(expr.args || []).map(stringify).join(' && ')})`;
    if (op === 'or') return `(${(expr.args || []).map(stringify).join(' || ')})`;
    if (op === 'not') return `!${stringify(expr.value)}`;

    return `${op}(?)`;
}

export const ExpressionEngine = {
    evaluate,
    evaluateAll,
    validate,
    stringify,
    resolve,
};
